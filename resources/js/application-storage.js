import { db } from "./firebase";
import {
    collection,
    collectionGroup,
    doc,
    getDocs,
    query,
    where,
} from "firebase/firestore";

export const STORAGE_MISSIONS_SUB = "missions_sub";
export const STORAGE_APPLICATIONS_ROOT = "applications_root";
export const STORAGE_USERS_SUB = "users_sub";

export function applicationDedupeKey(missionId, userId, applicationDocId) {
    if (userId) return `${missionId}_${userId}`;
    return `${missionId}_${applicationDocId}`;
}

export function resolveMissionIdFromApplication(data, refPath = "") {
    const fromData =
        data?.missionId || data?.mission_id || data?.missionID || null;
    if (fromData) return String(fromData);

    const parts = refPath.split("/");
    if (parts[0] === "missions" && parts[2] === "applications") {
        return parts[1];
    }
    return null;
}

function ensureMissionStub(orgMissionById, missionId, data) {
    if (orgMissionById.has(missionId)) return;
    orgMissionById.set(missionId, {
        missionName:
            data?.missionName ||
            data?.mission_name ||
            data?.title ||
            "Mission",
        name:
            data?.missionName ||
            data?.mission_name ||
            data?.title ||
            "Mission",
        orgId: data?.orgId || data?.organizationId || null,
    });
}

export function inferMissionIdForOrg(
    data,
    orgMissionById,
    refPath = "",
    orgId = null
) {
    const fromRef = resolveMissionIdFromApplication(data, refPath);
    const appOrgId = data?.orgId || data?.organizationId || null;

    if (fromRef) {
        if (orgMissionById.has(fromRef)) return fromRef;
        if (orgId && appOrgId === orgId) {
            ensureMissionStub(orgMissionById, fromRef, data);
            return fromRef;
        }
        if (refPath.startsWith("missions/") && refPath.includes("/applications/")) {
            return fromRef;
        }
    }

    const missionName = (data?.missionName || data?.mission_name || "").trim();
    if (!missionName) return null;

    for (const [id, mission] of orgMissionById) {
        const name = (mission.missionName || mission.name || "").trim();
        if (name && name === missionName) return id;
    }
    return null;
}

export function applicationBelongsToOrg(
    data,
    missionId,
    orgMissionById,
    orgId,
    refPath = ""
) {
    if (!orgId) return true;
    const appOrgId = data?.orgId || data?.organizationId || null;
    if (appOrgId === orgId) return true;
    const mission = orgMissionById.get(missionId);
    if (mission && mission.orgId === orgId) return true;
    if (
        refPath.startsWith("missions/") &&
        refPath.includes("/applications/") &&
        orgMissionById.has(missionId)
    ) {
        return true;
    }
    return false;
}

export function getApplicationDocRef(volunteer) {
    const { id, missionId, storage, userId } = volunteer;
    if (storage === STORAGE_APPLICATIONS_ROOT) {
        return doc(db, "applications", id);
    }
    if (storage === STORAGE_USERS_SUB && userId) {
        return doc(db, "users", userId, "applications", id);
    }
    return doc(db, "missions", missionId, "applications", id);
}

export async function userHasApplicationForMission(missionId, userId) {
    if (!missionId || !userId) return false;

    try {
        const missionQ = query(
            collection(db, "missions", missionId, "applications"),
            where("userId", "==", userId)
        );
        const missionSnap = await getDocs(missionQ);
        if (!missionSnap.empty) return true;
    } catch {
        /* ignore */
    }

    try {
        const userQ = query(
            collection(db, "users", userId, "applications"),
            where("missionId", "==", missionId)
        );
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) return true;
    } catch {
        /* ignore */
    }

    return false;
}

/**
 * Load applications from all `applications` subcollections (missions/*, users/*).
 */
export async function loadOrgApplications(orgMissionById, onEach, orgId = null) {
    const dedupe = new Set();
    let fromCollectionGroup = 0;
    let fromUsersFallback = 0;

    const tryPush = async (docSnap) => {
        const data = docSnap.data();
        const path = docSnap.ref.path;
        const missionId = inferMissionIdForOrg(
            data,
            orgMissionById,
            path,
            orgId
        );
        if (!missionId) return;

        if (
            !applicationBelongsToOrg(
                data,
                missionId,
                orgMissionById,
                orgId,
                path
            )
        ) {
            return;
        }

        if (
            orgId &&
            !orgMissionById.has(missionId) &&
            path.startsWith("missions/") &&
            path.includes("/applications/")
        ) {
            ensureMissionStub(orgMissionById, missionId, data);
        }

        const ownerUserId = path.startsWith("users/") ? path.split("/")[1] : "";
        const userId = data.userId || ownerUserId || "";
        const key = applicationDedupeKey(missionId, userId, docSnap.id);
        if (dedupe.has(key)) return;
        dedupe.add(key);

        let storage = STORAGE_MISSIONS_SUB;
        if (path.startsWith("users/")) {
            storage = STORAGE_USERS_SUB;
        } else if (path.startsWith("applications/")) {
            storage = STORAGE_APPLICATIONS_ROOT;
        }

        const mission = orgMissionById.get(missionId);
        await onEach({
            docSnap,
            data,
            missionId,
            mission,
            storage,
            applicationUserId: ownerUserId || userId,
        });

        if (storage === STORAGE_USERS_SUB) fromUsersFallback++;
        else fromCollectionGroup++;
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        for (const docSnap of cgSnap.docs) {
            await tryPush(docSnap);
        }
    } catch (err) {
        console.warn(
            "[WARN] collectionGroup(applications) failed, scanning users/*:",
            err
        );
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            for (const userDoc of usersSnap.docs) {
                try {
                    const appsSnap = await getDocs(
                        collection(db, "users", userDoc.id, "applications")
                    );
                    for (const appDoc of appsSnap.docs) {
                        await tryPush(appDoc);
                    }
                } catch (userAppsErr) {
                    console.warn(
                        "[WARN] users/",
                        userDoc.id,
                        "/applications",
                        userAppsErr
                    );
                }
            }
        } catch (usersErr) {
            console.error("[ERROR] loading users collection:", usersErr);
        }
    }

    return { dedupeCount: dedupe.size, fromCollectionGroup, fromUsersFallback };
}
