const CACHE_PREFIX = "kalinga-org:";
export const LAST_ORG_UID_KEY = `${CACHE_PREFIX}lastUid`;
/** Long TTL — navigation should reuse cache; explicit invalidation refreshes data. */
const DEFAULT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export const ORG_CACHE_KEYS = {
    DASHBOARD: "dashboard",
    HISTORY: "history",
    VOLUNTEERS: "volunteers",
    PROFILE: "profile",
    SIDEBAR: "sidebar",
    ORG_MISSIONS_MAP: "org-missions-map",
};

/** Per-mission details page cache key (scoped under org uid). */
export function missionDetailCacheKey(missionId) {
    return `detail-${missionId}`;
}

/** True when cached table HTML is a loading placeholder (must not persist or restore). */
export function isLoadingTableHtml(html) {
    if (!html || typeof html !== "string") return true;
    const h = html.toLowerCase();
    return (
        h.includes("missions-loading") ||
        h.includes("missions-loading-row") ||
        h.includes("loading volunteers") ||
        h.includes("loading missions") ||
        h.includes("loading applicant")
    );
}

export function tableHtmlForCache(innerHtml) {
    const html = innerHtml || "";
    return isLoadingTableHtml(html) ? "" : html;
}

function storageKey(orgId, key) {
    return `${CACHE_PREFIX}${orgId}:${key}`;
}

function serializeValue(value) {
    if (value == null) return value;
    if (typeof value.toDate === "function") {
        return { __ts: value.toDate().toISOString() };
    }
    if (value instanceof Date) {
        return { __ts: value.toISOString() };
    }
    if (Array.isArray(value)) {
        return value.map(serializeValue);
    }
    if (typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = serializeValue(v);
        }
        return out;
    }
    return value;
}

function deserializeValue(value) {
    if (value == null) return value;
    if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.__ts === "string"
    ) {
        return value.__ts;
    }
    if (Array.isArray(value)) {
        return value.map(deserializeValue);
    }
    if (typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = deserializeValue(v);
        }
        return out;
    }
    return value;
}

export function readOrgCache(orgId, key) {
    if (!orgId || !key) return null;
    try {
        const raw = sessionStorage.getItem(storageKey(orgId, key));
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || entry.payload === undefined) return null;
        return {
            payload: deserializeValue(entry.payload),
            cachedAt: entry.cachedAt || 0,
        };
    } catch {
        return null;
    }
}

export function rememberOrgUid(orgId) {
    if (!orgId) return;
    try {
        sessionStorage.setItem(LAST_ORG_UID_KEY, orgId);
    } catch {
        /* ignore */
    }
}

export function writeOrgCache(orgId, key, payload) {
    if (!orgId || !key) return;
    rememberOrgUid(orgId);
    try {
        sessionStorage.setItem(
            storageKey(orgId, key),
            JSON.stringify({
                payload: serializeValue(payload),
                cachedAt: Date.now(),
            })
        );
    } catch (err) {
        console.warn("[WARN] org cache write failed:", key, err);
    }
}

export function isOrgCacheStale(orgId, key, maxAgeMs = DEFAULT_STALE_MS) {
    const entry = readOrgCache(orgId, key);
    if (!entry) return true;
    return Date.now() - entry.cachedAt > maxAgeMs;
}

export function invalidateOrgCache(orgId, key = null) {
    if (!orgId) return;
    try {
        if (key) {
            sessionStorage.removeItem(storageKey(orgId, key));
            return;
        }
        const prefix = storageKey(orgId, "");
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith(prefix)) {
                sessionStorage.removeItem(k);
            }
        }
    } catch (err) {
        console.warn("[WARN] org cache invalidate failed:", err);
    }
}

export function clearAllOrgCaches() {
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) {
                sessionStorage.removeItem(k);
            }
        }
    } catch (err) {
        console.warn("[WARN] clearAllOrgCaches failed:", err);
    }
}
