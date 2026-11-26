/**
 * Admin portal in-memory + sessionStorage cache.
 * Initialize-once per tab/collection; skip refetch while fresh.
 */

const PREFIX = "kalinga-admin:";
export const ADMIN_FRESH_MS = 5 * 60 * 1000;
export const ADMIN_CACHE_KEYS = {
    DASHBOARD_STATS: "dashboard-stats-v3",
    ORGANIZATIONS: "organizations",
    MISSIONS: "missions",
    VOLUNTEERS: "volunteers-v3",
    CAMPAIGNS: "campaigns",
    SETTLEMENTS: "settlements",
    MISSION_TYPES: "mission-types",
    ACTIVITY: "activity",
};

const memory = new Map();
const inflight = new Map();
const tabHydrated = new Set();

function storageKey(key) {
    return `${PREFIX}${key}`;
}

function serialize(value) {
    if (value == null) return value;
    if (typeof value.toDate === "function") {
        return { __ts: value.toDate().toISOString() };
    }
    if (value instanceof Date) {
        return { __ts: value.toISOString() };
    }
    if (Array.isArray(value)) return value.map(serialize);
    if (typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
        return out;
    }
    return value;
}

function deserialize(value) {
    if (value == null) return value;
    if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.__ts === "string"
    ) {
        return value.__ts;
    }
    if (Array.isArray(value)) return value.map(deserialize);
    if (typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = deserialize(v);
        return out;
    }
    return value;
}

function getPersistentStorage() {
    try {
        if (typeof localStorage !== "undefined") return localStorage;
    } catch {
        /* ignore */
    }
    try {
        if (typeof sessionStorage !== "undefined") return sessionStorage;
    } catch {
        /* ignore */
    }
    return null;
}

export function readAdminCache(key) {
    if (!key) return null;
    const mem = memory.get(key);
    if (mem && mem.payload !== undefined) {
        return { payload: mem.payload, cachedAt: mem.cachedAt || 0 };
    }
    try {
        const storage = getPersistentStorage();
        const raw =
            storage?.getItem(storageKey(key)) ||
            sessionStorage.getItem(storageKey(key));
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || entry.payload === undefined) return null;
        const payload = deserialize(entry.payload);
        const cachedAt = entry.cachedAt || 0;
        memory.set(key, { payload, cachedAt });
        return { payload, cachedAt };
    } catch {
        return null;
    }
}

export function writeAdminCache(key, payload) {
    if (!key) return;
    const cachedAt = Date.now();
    const serialized = serialize(payload);
    memory.set(key, { payload: deserialize(serialized), cachedAt });
    try {
        const storage = getPersistentStorage();
        storage?.setItem(
            storageKey(key),
            JSON.stringify({ payload: serialized, cachedAt })
        );
    } catch (err) {
        console.warn("[WARN] admin cache write failed:", key, err);
    }
}

export function isAdminCacheFresh(key, maxAgeMs = ADMIN_FRESH_MS) {
    const entry = readAdminCache(key);
    if (!entry) return false;
    return Date.now() - entry.cachedAt <= maxAgeMs;
}

export async function adminCachedFetch(key, loader, {
    force = false,
    maxAgeMs = ADMIN_FRESH_MS,
} = {}) {
    if (!force && isAdminCacheFresh(key, maxAgeMs)) {
        return readAdminCache(key)?.payload;
    }
    if (!force && inflight.has(key)) {
        return inflight.get(key);
    }
    const promise = Promise.resolve()
        .then(() => loader())
        .then((payload) => {
            writeAdminCache(key, payload);
            return payload;
        })
        .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
}

export function invalidateAdminCache(key = null) {
    const stores = [];
    try {
        if (typeof localStorage !== "undefined") stores.push(localStorage);
    } catch {
        /* ignore */
    }
    try {
        if (typeof sessionStorage !== "undefined") stores.push(sessionStorage);
    } catch {
        /* ignore */
    }

    try {
        if (key) {
            stores.forEach((store) => store.removeItem(storageKey(key)));
            memory.delete(key);
            inflight.delete(key);
            tabHydrated.delete(key);
            return;
        }
        stores.forEach((store) => {
            for (let i = store.length - 1; i >= 0; i--) {
                const k = store.key(i);
                if (k && k.startsWith(PREFIX)) store.removeItem(k);
            }
        });
        memory.clear();
        inflight.clear();
        tabHydrated.clear();
    } catch (err) {
        console.warn("[WARN] admin cache invalidate failed:", err);
    }
}

/** Mark a UI tab as already loaded this session (initialize once). */
export function markAdminTabLoaded(tabName) {
    if (tabName) tabHydrated.add(tabName);
}

export function isAdminTabLoaded(tabName) {
    return tabHydrated.has(tabName);
}

export function clearAdminTabLoaded(tabName = null) {
    if (tabName) tabHydrated.delete(tabName);
    else tabHydrated.clear();
}
