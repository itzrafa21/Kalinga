import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import {
    accessRightsForRole,
    findTeamMembership,
    hasModuleAccess,
    moduleIdForPath,
    normalizeAccessRights,
} from "./org-team.js";

const memory = new Map();
const liveInflight = new Map();
const softRefreshStarted = new Set();
const SESSION_CACHE_PREFIX = "kalinga-org-session:";
const LAST_AUTH_UID_KEY = "kalinga-org-session:lastAuthUid";
/** Soft-refresh live rights only after this window — nav uses cache. */
const SESSION_SOFT_REFRESH_MS = 5 * 60 * 1000;

function identityUid(user) {
    if (!user) return "";
    if (typeof user.authUid === "string" && user.authUid) return user.authUid;
    return user.uid || "";
}

function sessionCacheKey(authUid) {
    return `${SESSION_CACHE_PREFIX}${authUid}`;
}

function serializeSession(session) {
    if (!session) return null;
    return {
        authUid: session.authUid,
        orgId: session.orgId,
        isOwner: Boolean(session.isOwner),
        status: session.status || "active",
        role: session.member?.role || null,
        accessRights: session.isOwner
            ? null
            : normalizeAccessRights(session.accessRights || {}),
        cachedAt: Date.now(),
    };
}

export function readCachedOrgSession(authUid) {
    if (!authUid) {
        try {
            authUid = localStorage.getItem(LAST_AUTH_UID_KEY) || "";
        } catch {
            authUid = "";
        }
    }
    if (!authUid) return null;
    try {
        const raw = localStorage.getItem(sessionCacheKey(authUid));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.orgId || !parsed?.authUid) return null;
        return {
            authUid: parsed.authUid,
            orgId: parsed.orgId,
            isOwner: Boolean(parsed.isOwner),
            status: parsed.status || "active",
            member: parsed.role ? { role: parsed.role } : null,
            accessRights: parsed.isOwner
                ? null
                : normalizeAccessRights(parsed.accessRights || {}),
            fromCache: true,
            cachedAt: parsed.cachedAt || 0,
        };
    } catch {
        return null;
    }
}

export function writeCachedOrgSession(session) {
    if (!session?.authUid) return;
    try {
        localStorage.setItem(LAST_AUTH_UID_KEY, session.authUid);
        localStorage.setItem(
            sessionCacheKey(session.authUid),
            JSON.stringify(serializeSession(session))
        );
    } catch (err) {
        console.warn("[WARN] writeCachedOrgSession:", err);
    }
}

export function clearOrgSessionCache(authUid) {
    try {
        if (authUid) {
            localStorage.removeItem(sessionCacheKey(authUid));
            const last = localStorage.getItem(LAST_AUTH_UID_KEY);
            if (last === authUid) localStorage.removeItem(LAST_AUTH_UID_KEY);
        } else {
            const last = localStorage.getItem(LAST_AUTH_UID_KEY);
            if (last) localStorage.removeItem(sessionCacheKey(last));
            localStorage.removeItem(LAST_AUTH_UID_KEY);
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(SESSION_CACHE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            }
        }
    } catch (err) {
        console.warn("[WARN] clearOrgSessionCache:", err);
    }
    clearOrgSession(authUid);
}

export function applyCachedDenyAttributes(session) {
    if (!session || session.isOwner) {
        ["missions", "history", "volunteers", "donations", "account"].forEach(
            (moduleId) => {
                document.documentElement.removeAttribute(`data-deny-${moduleId}`);
            }
        );
        document.documentElement.setAttribute("data-org-owner", "1");
        return;
    }
    document.documentElement.setAttribute("data-org-owner", "0");
    ["missions", "history", "volunteers", "donations", "account"].forEach(
        (moduleId) => {
            if (sessionCan(session, moduleId)) {
                document.documentElement.removeAttribute(`data-deny-${moduleId}`);
            } else {
                document.documentElement.setAttribute(`data-deny-${moduleId}`, "1");
            }
        }
    );
}

export function revealOrgPageContent() {
    document.documentElement.removeAttribute("data-org-access-boot");
}

/**
 * Resolve the organization context for the signed-in user.
 * Owners: orgId === auth uid, full access.
 * Team users: orgId === owner uid, accessRights from org_members/{id}/access_rights.
 * Cache-first by default. Pass force:true only when rights must be revalidated.
 */
export async function resolveOrgSession(user, { force = false } = {}) {
    const uid = identityUid(user);
    if (!uid) return null;

    if (!force) {
        if (memory.has(uid)) return memory.get(uid);
        const cached = readCachedOrgSession(uid);
        if (cached && cached.authUid === uid) {
            memory.set(uid, cached);
            return cached;
        }
    }

    if (liveInflight.has(uid)) {
        return liveInflight.get(uid);
    }

    const promise = (async () => {
        const ownSnap = await getDoc(doc(db, "organizations", uid));
        if (ownSnap.exists()) {
            const session = {
                authUid: uid,
                orgId: uid,
                isOwner: true,
                member: null,
                accessRights: null,
                status: "active",
            };
            memory.set(uid, session);
            writeCachedOrgSession(session);
            return session;
        }

        const membership = await findTeamMembership(user);
        if (!membership?.orgId) {
            memory.set(uid, null);
            clearOrgSessionCache(uid);
            return null;
        }

        const member = membership.member || {};
        const hasSavedRights =
            member.accessRights &&
            typeof member.accessRights === "object" &&
            Object.keys(member.accessRights).length > 0;

        const session = {
            authUid: uid,
            orgId: membership.orgId,
            isOwner: false,
            member,
            accessRights: hasSavedRights
                ? normalizeAccessRights(member.accessRights)
                : accessRightsForRole(member.role || "staff"),
            status: member.status || "active",
        };
        memory.set(uid, session);
        writeCachedOrgSession(session);
        return session;
    })().finally(() => {
        liveInflight.delete(uid);
    });

    liveInflight.set(uid, promise);
    return promise;
}

/**
 * Non-blocking revalidation when cache is stale. Deduped across page scripts.
 */
export function softRefreshOrgSession(
    user,
    pathname = window.location.pathname,
    { force = false } = {}
) {
    const uid = identityUid(user);
    if (!uid) return;

    if (!force) {
        const cached = readCachedOrgSession(uid) || memory.get(uid);
        const age = Date.now() - (Number(cached?.cachedAt) || 0);
        if (cached && age < SESSION_SOFT_REFRESH_MS) return;
    }
    if (softRefreshStarted.has(uid)) return;
    softRefreshStarted.add(uid);

    void resolveOrgSession(user, { force: true })
        .then((live) => {
            if (!live) {
                clearOrgSessionCache(uid);
                window.location.href = "/organization/login";
                return;
            }
            if (live.status === "disabled") {
                clearOrgSessionCache(live.authUid);
                window.location.href = "/organization/login";
                return;
            }
            writeCachedOrgSession(live);
            applyCachedDenyAttributes(live);

            const moduleId = moduleIdForPath(pathname);
            if (
                (moduleId === "users" ||
                    pathname.startsWith("/organization/users")) &&
                !live.isOwner
            ) {
                blockPageContent();
                return;
            }
            if (moduleId && !sessionCan(live, moduleId)) {
                blockPageContent();
            }
        })
        .catch((err) => {
            console.warn("[WARN] softRefreshOrgSession:", err);
        })
        .finally(() => {
            softRefreshStarted.delete(uid);
        });
}

export function clearOrgSession(uid) {
    if (uid) memory.delete(uid);
    else memory.clear();
}

export function sessionCan(session, moduleId, permissionId = null) {
    if (!session) return false;
    if (session.status === "disabled") return false;
    if (session.isOwner) return true;
    if (!moduleId) return true;
    if (!permissionId) return hasModuleAccess(session.accessRights, moduleId);
    return session.accessRights?.[moduleId]?.[permissionId] === true;
}

export function sessionFirstAllowedPath(session) {
    if (!session) return "/organization/login";
    if (session.isOwner) return "/organization/dashboard";

    const order = [
        ["missions", "/organization/dashboard"],
        ["history", "/missions/history"],
        ["volunteers", "/organization/volunteers"],
        ["donations", "/donation"],
        ["account", "/organization/profile"],
    ];

    for (const [moduleId, path] of order) {
        if (sessionCan(session, moduleId)) return path;
    }
    return "/organization/login";
}

/**
 * Proxy so existing page code that reads user.uid loads the organization owner's data.
 * The real Firebase Auth uid remains on user.authUid.
 */
export function asOrgActor(user, session) {
    if (!user || !session) return user;
    if (session.isOwner || session.orgId === user.uid) return user;

    return new Proxy(user, {
        get(target, prop, receiver) {
            if (prop === "uid") return session.orgId;
            if (prop === "authUid") return session.authUid || target.uid;
            const value = Reflect.get(target, prop, receiver);
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
}

/**
 * Verify auth + org access for the current path.
 * Returns { user, session, actor } on success, or null after login redirect / Access Denied.
 * Uses cached session first so navigation paints immediately; soft-refreshes in background.
 */
export async function requireOrgPageAccess(user, pathname = window.location.pathname) {
    if (!user) {
        window.location.href = "/organization/login";
        return null;
    }

    let session = await resolveOrgSession(user, { force: false });
    if (!session) {
        session = await resolveOrgSession(user, { force: true });
    }
    if (!session) {
        clearOrgSessionCache(identityUid(user));
        window.location.href = "/organization/login";
        return null;
    }

    if (session.status === "disabled") {
        clearOrgSessionCache(session.authUid);
        window.location.href = "/organization/login";
        return null;
    }

    const sessionAge = Date.now() - (Number(session.cachedAt) || 0);
    const shouldSoftRefresh =
        Boolean(session.fromCache) && sessionAge >= SESSION_SOFT_REFRESH_MS;

    writeCachedOrgSession(session);
    applyCachedDenyAttributes(session);
    if (shouldSoftRefresh) {
        softRefreshOrgSession(user, pathname, { force: true });
    }

    const moduleId = moduleIdForPath(pathname);
    const deny = () => {
        blockPageContent();
        return null;
    };

    // Users page is owner-only.
    if (moduleId === "users" || pathname.startsWith("/organization/users")) {
        if (!session.isOwner) return deny();
        revealOrgPageContent();
        return { user, session, actor: asOrgActor(user, session) };
    }

    if (moduleId && !sessionCan(session, moduleId)) {
        return deny();
    }

    // Stricter action routes
    if (pathname.startsWith("/missions/create") && !sessionCan(session, "missions", "create")) {
        return deny();
    }
    if (pathname.startsWith("/missions/edit") && !sessionCan(session, "missions", "edit")) {
        return deny();
    }
    if (
        pathname.startsWith("/donation/campaigns/create") &&
        !sessionCan(session, "donations", "create")
    ) {
        return deny();
    }
    if (
        /\/donation\/campaigns\/[^/]+\/edit/.test(pathname) &&
        !sessionCan(session, "donations", "edit")
    ) {
        return deny();
    }

    revealOrgPageContent();
    return { user, session, actor: asOrgActor(user, session) };
}

export function blockPageContent(message = "") {
    revealOrgPageContent();
    const main = document.querySelector(".org-main-content");
    if (!main) return;

    const detail = message
        ? `<p class="org-access-denied__detail">${message}</p>`
        : "";

    main.innerHTML = `
      <div class="org-access-denied" role="alert" aria-live="polite">
        <div class="org-access-denied__card">
          <h1 class="org-access-denied__title">Access Denied</h1>
          ${detail}
        </div>
      </div>
    `;
}
