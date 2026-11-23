/**
 * Canonical live mission paths under organizations/{orgId}/missions/{missionId}.
 * Top-level `missions` is legacy — do not write new data there.
 */

import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export function orgMissionDoc(orgId, missionId) {
    return doc(db, "organizations", orgId, "missions", missionId);
}

export function orgMissionHistoryDoc(orgId, missionId) {
    return doc(db, "organizations", orgId, "history", missionId);
}

export function orgMissionApplicationsCol(orgId, missionId) {
    return collection(db, "organizations", orgId, "missions", missionId, "applications");
}

export function orgMissionAnnouncementsCol(orgId, missionId) {
    return collection(db, "organizations", orgId, "missions", missionId, "announcements");
}

export function orgMissionAnnouncementDoc(orgId, missionId, announcementId) {
    return doc(
        db,
        "organizations",
        orgId,
        "missions",
        missionId,
        "announcements",
        announcementId
    );
}

export function orgMissionApplicationDoc(orgId, missionId, applicationId) {
    return doc(
        db,
        "organizations",
        orgId,
        "missions",
        missionId,
        "applications",
        applicationId
    );
}

/**
 * Parse orgId + missionId from a Firestore document path under organizations/.
 * @param {string} refPath
 * @returns {{ orgId: string, missionId: string }|null}
 */
export function parseOrgMissionPath(refPath = "") {
    const parts = String(refPath || "").split("/").filter(Boolean);
    if (
        parts[0] === "organizations" &&
        parts[2] === "missions" &&
        parts[1] &&
        parts[3]
    ) {
        return { orgId: parts[1], missionId: parts[3] };
    }
    return null;
}

/**
 * Resolve orgId for a mission id via submission, then optional collectionGroup.
 * @param {string} missionId
 * @returns {Promise<string>}
 */
export async function resolveMissionOrgId(missionId) {
    const id = String(missionId || "").trim();
    if (!id) return "";

    try {
        const subSnap = await getDoc(doc(db, "mission_submissions", id));
        if (subSnap.exists()) {
            const orgId = String(
                subSnap.data()?.orgId || subSnap.data()?.organizationId || ""
            ).trim();
            if (orgId) return orgId;
        }
    } catch (err) {
        console.warn("[WARN] resolveMissionOrgId submission:", err);
    }

    // collectionGroup by document id is unreliable (full path matching).
    // Prefer mission_submissions.orgId; callers should pass orgIdHint when known.
    return "";
}

/**
 * Load the live org mission document (and optional history fallback).
 * @param {string} missionId
 * @param {string} [orgIdHint]
 * @returns {Promise<{ orgId: string, mission: object|null, inHistory: boolean, source: string }>}
 */
export async function loadOrgMissionDocument(missionId, orgIdHint = "") {
    const id = String(missionId || "").trim();
    let orgId = String(orgIdHint || "").trim();
    if (!id) {
        return { orgId: "", mission: null, inHistory: false, source: "" };
    }
    if (!orgId) {
        orgId = await resolveMissionOrgId(id);
    }
    if (!orgId) {
        return { orgId: "", mission: null, inHistory: false, source: "" };
    }

    try {
        const liveSnap = await getDoc(orgMissionDoc(orgId, id));
        if (liveSnap.exists()) {
            return {
                orgId,
                mission: { id, ...liveSnap.data(), orgId, organizationId: orgId },
                inHistory: false,
                source: "organizations.missions",
            };
        }
    } catch (err) {
        console.warn("[WARN] loadOrgMissionDocument live:", err);
    }

    try {
        const historySnap = await getDoc(orgMissionHistoryDoc(orgId, id));
        if (historySnap.exists()) {
            return {
                orgId,
                mission: { id, ...historySnap.data(), orgId, organizationId: orgId },
                inHistory: true,
                source: "organizations.history",
            };
        }
    } catch (err) {
        console.warn("[WARN] loadOrgMissionDocument history:", err);
    }

    return { orgId, mission: null, inHistory: false, source: "" };
}
