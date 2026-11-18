import { initializeApp, getApps } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signOut,
    updateProfile,
} from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const TEAM_APP = "kalinga-team-create";

export const TEAM_ROLES = [
    { id: "coordinator", label: "Coordinator" },
    { id: "staff", label: "Staff" },
    { id: "viewer", label: "Viewer" },
];

/** Page modules and the rights that control them. */
export const ACCESS_MODULES = [
    {
        id: "missions",
        label: "Mission Management",
        icon: "bi-grid-1x2",
        permissions: [
            { id: "view", label: "Can view mission dashboard" },
            { id: "create", label: "Can create missions" },
            { id: "edit", label: "Can edit missions" },
            { id: "details", label: "Can open mission details" },
        ],
    },
    {
        id: "history",
        label: "History of Missions",
        icon: "bi-journal-text",
        permissions: [
            { id: "view", label: "Can view mission history" },
            { id: "details", label: "Can open past mission details" },
        ],
    },
    {
        id: "volunteers",
        label: "Volunteers",
        icon: "bi-people",
        permissions: [
            { id: "view", label: "Can view volunteers list" },
            { id: "details", label: "Can open volunteer details" },
        ],
    },
    {
        id: "donations",
        label: "Donation",
        icon: "bi-gift",
        permissions: [
            { id: "view", label: "Can view donation center" },
            { id: "create", label: "Can create campaigns" },
            { id: "edit", label: "Can edit campaigns" },
            { id: "details", label: "Can open campaign details" },
        ],
    },
    {
        id: "account",
        label: "Account",
        icon: "bi-person",
        permissions: [
            { id: "view", label: "Can view organization profile" },
            { id: "edit", label: "Can edit organization profile" },
        ],
    },
];

export function roleLabel(role) {
    return TEAM_ROLES.find((item) => item.id === role)?.label || role || "Staff";
}

export function emptyAccessRights() {
    const rights = {};
    ACCESS_MODULES.forEach((mod) => {
        rights[mod.id] = {};
        mod.permissions.forEach((perm) => {
            rights[mod.id][perm.id] = false;
        });
    });
    return rights;
}

export function normalizeAccessRights(raw) {
    const base = emptyAccessRights();
    if (!raw || typeof raw !== "object") return base;
    ACCESS_MODULES.forEach((mod) => {
        const source = raw[mod.id];
        if (!source || typeof source !== "object") return;
        mod.permissions.forEach((perm) => {
            base[mod.id][perm.id] = source[perm.id] === true;
        });
    });
    return base;
}

export function accessRightsForRole(role) {
    const rights = emptyAccessRights();
    const mark = (moduleId, permIds) => {
        permIds.forEach((permId) => {
            if (rights[moduleId]?.[permId] !== undefined) {
                rights[moduleId][permId] = true;
            }
        });
    };

    if (role === "viewer") {
        mark("missions", ["view", "details"]);
        mark("history", ["view", "details"]);
        mark("volunteers", ["view", "details"]);
        mark("donations", ["view", "details"]);
        mark("account", ["view"]);
        return rights;
    }

    if (role === "staff") {
        mark("missions", ["view", "create", "edit", "details"]);
        mark("history", ["view", "details"]);
        mark("volunteers", ["view", "details"]);
        mark("donations", ["view", "details"]);
        mark("account", ["view"]);
        return rights;
    }

    // coordinator / default: broad access except users management
    ACCESS_MODULES.forEach((mod) => {
        mod.permissions.forEach((perm) => {
            rights[mod.id][perm.id] = true;
        });
    });
    return rights;
}

export function countModulePermissions(rights, moduleId) {
    const mod = ACCESS_MODULES.find((item) => item.id === moduleId);
    if (!mod) return { enabled: 0, total: 0 };
    const total = mod.permissions.length;
    const enabled = mod.permissions.filter(
        (perm) => rights?.[moduleId]?.[perm.id] === true
    ).length;
    return { enabled, total };
}

export function hasModuleAccess(rights, moduleId) {
    const mod = ACCESS_MODULES.find((item) => item.id === moduleId);
    if (!mod) return false;
    return mod.permissions.some((perm) => rights?.[moduleId]?.[perm.id] === true);
}

export function moduleIdForPath(pathname) {
    const path = pathname || "";
    if (path.startsWith("/missions/history")) return "history";
    if (path.startsWith("/organization/volunteers")) return "volunteers";
    if (path.startsWith("/donation")) return "donations";
    if (path.startsWith("/organization/profile")) return "account";
    if (path.startsWith("/organization/users")) return "users";
    if (path.startsWith("/missions") || path.startsWith("/organization/dashboard")) {
        return "missions";
    }
    return null;
}

export function sanitizeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");
}

export function teamLoginEmail(username, orgId) {
    const user = sanitizeUsername(username);
    const orgPart = String(orgId || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 12)
        .toLowerCase();
    return `${user}.${orgPart}@team.kalinga.app`;
}

function teamAuth() {
    const existing = getApps().find((entry) => entry.name === TEAM_APP);
    const secondary = existing || initializeApp(app.options, TEAM_APP);
    return getAuth(secondary);
}

export async function listOrgTeam(orgId) {
    const snap = await getDocs(collection(db, "organizations", orgId, "team"));
    return snap.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) =>
            String(a.name || a.username).localeCompare(String(b.name || b.username))
        );
}

export async function createOrgTeamMember(
    orgId,
    { name, username, password, role, createdBy, accessRights }
) {
    const cleanName = String(name || "").trim();
    const cleanUsername = sanitizeUsername(username);
    const cleanPassword = String(password || "");
    const cleanRole = TEAM_ROLES.some((item) => item.id === role) ? role : "staff";
    const rights = normalizeAccessRights(
        accessRights || accessRightsForRole(cleanRole)
    );

    if (!cleanName) throw new Error("Enter the person's name.");
    if (cleanUsername.length < 3) {
        throw new Error("Username must be at least 3 characters.");
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
        throw new Error(
            "Username can only use letters, numbers, dots, dashes, and underscores."
        );
    }
    if (cleanPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
    }

    const usernameRef = doc(db, "org_team_usernames", cleanUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
        throw new Error("That username is already taken.");
    }

    const email = teamLoginEmail(cleanUsername, orgId);
    const secondary = teamAuth();
    let authUid = null;

    try {
        const cred = await createUserWithEmailAndPassword(
            secondary,
            email,
            cleanPassword
        );
        authUid = cred.user.uid;
        try {
            await updateProfile(cred.user, { displayName: cleanName });
        } catch {
            /* display name is also on the team record */
        }
        await signOut(secondary);
    } catch (error) {
        if (error?.code === "auth/email-already-in-use") {
            throw new Error(
                "That username is already linked to a login. Choose another."
            );
        }
        throw error;
    }

    const now = new Date().toISOString();
    const record = {
        name: cleanName,
        username: cleanUsername,
        email,
        role: cleanRole,
        status: "active",
        accessRights: rights,
        authUid,
        orgId,
        createdBy: createdBy || orgId,
        createdAt: now,
        updatedAt: now,
    };

    await setDoc(doc(db, "organizations", orgId, "team", authUid), record);
    await setDoc(usernameRef, {
        username: cleanUsername,
        email,
        orgId,
        authUid,
        status: "active",
        role: cleanRole,
        name: cleanName,
        accessRights: rights,
        updatedAt: now,
    });

    return { id: authUid, ...record };
}

export async function updateOrgTeamAccessRights(orgId, memberId, accessRights) {
    const rights = normalizeAccessRights(accessRights);
    const memberRef = doc(db, "organizations", orgId, "team", memberId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) throw new Error("User not found.");

    const member = memberSnap.data() || {};
    const now = new Date().toISOString();
    await updateDoc(memberRef, { accessRights: rights, updatedAt: now });

    if (member.username) {
        const usernameRef = doc(
            db,
            "org_team_usernames",
            sanitizeUsername(member.username)
        );
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists() && usernameSnap.data()?.orgId === orgId) {
            await updateDoc(usernameRef, {
                accessRights: rights,
                updatedAt: now,
            });
        }
    }

    return rights;
}

export async function setOrgTeamMemberStatus(orgId, memberId, status) {
    const next = status === "active" ? "active" : "disabled";
    const memberRef = doc(db, "organizations", orgId, "team", memberId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) throw new Error("User not found.");

    const member = memberSnap.data() || {};
    const now = new Date().toISOString();
    await updateDoc(memberRef, { status: next, updatedAt: now });

    if (member.username) {
        const usernameRef = doc(
            db,
            "org_team_usernames",
            sanitizeUsername(member.username)
        );
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists() && usernameSnap.data()?.orgId === orgId) {
            await updateDoc(usernameRef, { status: next, updatedAt: now });
        }
    }

    return next;
}

export async function lookupTeamUsername(username) {
    const clean = sanitizeUsername(username);
    if (!clean) return null;
    const snap = await getDoc(doc(db, "org_team_usernames", clean));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function findTeamMembership(user) {
    if (!user?.uid) return null;

    const email = String(user.email || "").trim().toLowerCase();
    if (!email.endsWith("@team.kalinga.app")) return null;

    const local = email.split("@")[0] || "";
    const username = local.includes(".")
        ? local.slice(0, local.lastIndexOf("."))
        : local;
    const indexed = await lookupTeamUsername(username);
    if (!indexed?.orgId) return null;

    const memberId = indexed.authUid || user.uid;
    const memberSnap = await getDoc(
        doc(db, "organizations", indexed.orgId, "team", memberId)
    );
    if (memberSnap.exists()) {
        return {
            orgId: indexed.orgId,
            member: { id: memberSnap.id, ...memberSnap.data() },
        };
    }

    return {
        orgId: indexed.orgId,
        member: { id: memberId, ...indexed },
    };
}
