import { db } from "./firebase.js";
import { getAuth, signOut } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    ORG_CACHE_KEYS,
    NAV_FRESH_MS,
    readOrgCache,
    writeOrgCache,
    isOrgCacheFresh,
    invalidateOrgCache,
} from "./org-data-cache.js";

const orgProfileMemory = new Map();
const orgProfileInflight = new Map();

/**
 * Load organizations/{uid} once per navigation window.
 * Shared by verification, sidebar, and page scripts.
 */
export async function getOrgProfileOnce(uid, { force = false } = {}) {
    if (!uid) return null;

    if (!force) {
        const mem = orgProfileMemory.get(uid);
        if (mem && Date.now() - mem.at < NAV_FRESH_MS) {
            return mem.data;
        }
        if (isOrgCacheFresh(uid, ORG_CACHE_KEYS.ORG_DOC)) {
            const entry = readOrgCache(uid, ORG_CACHE_KEYS.ORG_DOC);
            if (entry?.payload) {
                orgProfileMemory.set(uid, {
                    data: entry.payload,
                    at: entry.cachedAt || Date.now(),
                });
                return entry.payload;
            }
        }
    }

    if (!force && orgProfileInflight.has(uid)) {
        return orgProfileInflight.get(uid);
    }

    const promise = (async () => {
        const snap = await getDoc(doc(db, "organizations", uid));
        if (!snap.exists()) {
            orgProfileMemory.set(uid, { data: null, at: Date.now() });
            return null;
        }
        const data = snap.data();
        writeOrgCache(uid, ORG_CACHE_KEYS.ORG_DOC, data);
        const displayName =
            organizationDisplayNameFromData(data) || "";
        writeOrgCache(uid, ORG_CACHE_KEYS.SIDEBAR, {
            displayName: displayName || "Organization",
            orgData: data,
        });
        orgProfileMemory.set(uid, { data, at: Date.now() });
        return data;
    })().finally(() => {
        orgProfileInflight.delete(uid);
    });

    orgProfileInflight.set(uid, promise);
    return promise;
}

export function invalidateOrgProfileCache(uid) {
    if (!uid) return;
    orgProfileMemory.delete(uid);
    orgProfileInflight.delete(uid);
    invalidateOrgCache(uid, ORG_CACHE_KEYS.ORG_DOC);
    invalidateOrgCache(uid, ORG_CACHE_KEYS.SIDEBAR);
}

export const ORG_VERIFICATION_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    DEACTIVATED: "deactivated",
};

const ORG_LOGIN_PATH = "/organization/login";

function hasVerifiedHistory(data) {
    return Boolean(data?.verifiedAt || data?.previouslyVerified === true);
}

/** @returns {boolean} */
export function isOrgVerified(data) {
    if (!data) return false;
    const status = String(data.verificationStatus || "").toLowerCase();
    if (
        status === ORG_VERIFICATION_STATUS.REJECTED ||
        status === ORG_VERIFICATION_STATUS.DEACTIVATED
    ) {
        return false;
    }
    if (data.verified === true) return true;
    if (status === ORG_VERIFICATION_STATUS.APPROVED) return true;
    if (status === ORG_VERIFICATION_STATUS.PENDING || data.verified === false) {
        return false;
    }
    // Organizations registered before verification was added
    return true;
}

export function getOrgVerificationKey(data) {
    if (!data) return "unknown";
    if (isOrgVerified(data)) return "verified";
    const status = String(data.verificationStatus || "").toLowerCase();
    if (status === ORG_VERIFICATION_STATUS.DEACTIVATED) return "deactivated";
    // Legacy: deactivate previously wrote "rejected" while keeping verifiedAt
    if (status === ORG_VERIFICATION_STATUS.REJECTED) {
        return hasVerifiedHistory(data) ? "deactivated" : "rejected";
    }
    return "pending";
}

export function getOrgVerificationLabel(data) {
    const key = getOrgVerificationKey(data);
    if (key === "verified") return "Verified";
    if (key === "deactivated") return "Deactivated";
    if (key === "rejected") return "Rejected";
    return "Pending approval";
}

export function getVerificationBlockMessage(reason) {
    switch (reason) {
        case "deactivated":
            return "Your organization account has been deactivated. Please contact the administrator for assistance.";
        case "rejected":
            return "Your organization registration was not approved. Please contact the administrator for assistance.";
        case "no_profile":
            return "Organization profile not found. Please contact support.";
        default:
            return "Your organization is pending admin approval. You can sign in after an administrator verifies your account.";
    }
}

export async function fetchOrgVerification(uid) {
    const data = await getOrgProfileOnce(uid);
    if (!data) {
        return { ok: false, reason: "no_profile", data: null };
    }
    if (isOrgVerified(data)) {
        return { ok: true, reason: "verified", data };
    }
    const key = getOrgVerificationKey(data);
    if (key === "deactivated") {
        return { ok: false, reason: "deactivated", data };
    }
    if (key === "rejected") {
        return { ok: false, reason: "rejected", data };
    }
    return { ok: false, reason: "pending", data };
}

export function getVerificationBlockMessageForData(data, reason) {
    if (reason === "deactivated" && data?.rejectionReason) {
        return `Your organization account has been deactivated: ${data.rejectionReason}`;
    }
    if (reason === "rejected" && data?.rejectionReason) {
        return `Your organization registration was not approved: ${data.rejectionReason}`;
    }
    return getVerificationBlockMessage(reason);
}

/**
 * Redirects and signs out when the org is not verified. Returns true when access is allowed.
 */
export async function assertOrgVerified(user) {
    if (!user) {
        window.location.href = ORG_LOGIN_PATH;
        return false;
    }

    const email = user.email || "";
    if (
        email.includes("@admin.kalinga.com") ||
        email.includes("admin@")
    ) {
        window.location.href = "/admin/dashboard";
        return false;
    }

    try {
        const check = await fetchOrgVerification(user.uid);
        if (check.ok) return true;

        const auth = getAuth();
        try {
            await signOut(auth);
        } catch {
            /* ignore */
        }

        sessionStorage.setItem(
            "orgLoginBlockReason",
            getVerificationBlockMessageForData(check.data, check.reason)
        );
        window.location.href = ORG_LOGIN_PATH;
        return false;
    } catch (err) {
        console.error("[ERROR] org verification check:", err);
        sessionStorage.setItem(
            "orgLoginBlockReason",
            "Unable to verify your organization status. Please try again later."
        );
        window.location.href = ORG_LOGIN_PATH;
        return false;
    }
}

/** Current display name from an organizations/{id} document. */
export function organizationDisplayNameFromData(data) {
    if (!data) return "";
    return String(data.name || data.orgName || "").trim();
}

/** Live organization name from Firestore (falls back to snapshot on mission docs). */
export async function fetchOrganizationDisplayName(orgId, fallback = "") {
    if (!orgId) return fallback || "Unknown";
    try {
        const data = await getOrgProfileOnce(orgId);
        if (data) {
            const name = organizationDisplayNameFromData(data);
            if (name) return name;
        }
    } catch (err) {
        console.warn("[WARN] fetchOrganizationDisplayName:", orgId, err);
    }
    return fallback || "Unknown";
}

/** @returns {Promise<Map<string, string>>} */
export async function buildOrganizationNameMap(orgIds = []) {
    const map = new Map();
    const unique = [...new Set(orgIds.filter(Boolean))];
    await Promise.all(
        unique.map(async (orgId) => {
            const name = await fetchOrganizationDisplayName(orgId, "");
            if (name && name !== "Unknown") map.set(orgId, name);
        })
    );
    return map;
}

/** Keep mission_submissions org labels in sync after a profile rename. */
export async function syncOrganizationNameToSubmissions(orgId, orgName) {
    const trimmed = String(orgName || "").trim();
    if (!orgId || !trimmed) return;

    try {
        const snap = await getDocs(
            query(
                collection(db, "mission_submissions"),
                where("orgId", "==", orgId)
            )
        );
        if (snap.empty) return;

        await Promise.all(
            snap.docs.map((docSnap) =>
                updateDoc(docSnap.ref, { orgName: trimmed })
            )
        );
        console.log(
            "[INFO] Synced organization name on",
            snap.size,
            "mission submission(s)"
        );
    } catch (err) {
        console.warn("[WARN] syncOrganizationNameToSubmissions:", err);
    }
}
