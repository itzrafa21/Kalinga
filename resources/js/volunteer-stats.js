import { db } from "./firebase.js";
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import {
    applicationDedupeKey,
    resolveMissionIdFromApplication,
} from "./application-storage.js";
import {
    computeMissionDurationHours,
    loadPlatformConfig,
} from "./platform-config.js";

const missionHoursCache = new Map();

function isParticipationStatus(status) {
    const s = (status || "").toLowerCase();
    return (
        s === "approved" ||
        s === "accepted" ||
        s === "completed"
    );
}

function isMissionDataCompleted(mission) {
    if (!mission) return false;
    const st = (mission.status || "").toLowerCase();
    return (
        st === "completed" ||
        mission.movedToHistoryAt != null ||
        mission.pointsAwarded === true
    );
}

function normalizeMissionDoc(data, fallbackOrgId = "") {
    return {
        ...data,
        missionName:
            data.missionName || data.name || data.title || "Mission",
        orgId:
            data.orgId || data.organizationId || fallbackOrgId || "",
    };
}

async function fetchMissionDoc(orgId, missionId) {
    const oid = String(orgId || "").trim();
    const refs = [];
    if (oid) {
        refs.push(
            doc(db, "organizations", oid, "missions", missionId),
            doc(db, "organizations", oid, "history", missionId)
        );
    }
    refs.push(
        doc(db, "mission_submissions", missionId),
        doc(db, "missions", missionId)
    );

    const results = await Promise.all(
        refs.map(async (ref) => {
            try {
                const snap = await getDoc(ref);
                return snap.exists() ? snap : null;
            } catch (err) {
                console.warn("[WARN] volunteer-stats fetch:", ref.path, err);
                return null;
            }
        })
    );

    for (const snap of results) {
        if (snap) return normalizeMissionDoc(snap.data(), oid || orgId);
    }
    return null;
}

async function fetchMissionDocExpanded(missionId, primaryOrgId, orgHints = []) {
    const hints = new Set();
    const addHint = (id) => {
        const s = String(id || "").trim();
        if (s) hints.add(s);
    };
    addHint(primaryOrgId);
    for (const h of orgHints) addHint(h);

    let globalData = null;
    try {
        const globalSnap = await getDoc(doc(db, "missions", missionId));
        if (globalSnap.exists()) {
            globalData = globalSnap.data();
            addHint(globalData.orgId || globalData.organizationId);
            if (isMissionDataCompleted(globalData)) {
                return normalizeMissionDoc(globalData);
            }
        }
    } catch (err) {
        console.warn("[WARN] volunteer-stats global:", missionId, err);
    }

    const hintList = [...hints];
    if (hintList.length) {
        const found = await Promise.all(
            hintList.map((oid) => fetchMissionDoc(oid, missionId))
        );
        const mission = found.find(Boolean);
        if (mission) return mission;
    }

    return globalData ? normalizeMissionDoc(globalData) : null;
}

function userIdFromApplicationPath(refPath = "") {
    const parts = refPath.split("/");
    if (parts[0] === "users" && parts[2] === "applications") {
        return parts[1];
    }
    return "";
}

function hoursFromApplicationOrMission(data, mission) {
    const fromApp = Number(
        data?.durationHours ?? data?.missionDurationHours ?? data?.hours
    );
    if (Number.isFinite(fromApp) && fromApp > 0) return fromApp;
    if (!mission) return 0;
    const stored = Number(mission.durationHours);
    if (Number.isFinite(stored) && stored > 0) return stored;
    return computeMissionDurationHours(mission) || 0;
}

export function readStoredProfileStats(userData = {}) {
    const missionFields = [
        "missionsCompleted",
        "missions_completed",
        "completedMissions",
        "missionCount",
    ];
    const hourFields = [
        "totalVolunteerHours",
        "hoursVolunteered",
        "volunteerHours",
        "totalHours",
        "hours",
    ];
    let missionsCompleted = 0;
    let totalHours = 0;
    for (const key of missionFields) {
        missionsCompleted = Math.max(
            missionsCompleted,
            Number(userData[key]) || 0
        );
    }
    for (const key of hourFields) {
        totalHours = Math.max(totalHours, Number(userData[key]) || 0);
    }
    return { missionsCompleted, totalHours };
}

function applicationCountsAsCompleted(data, mission) {
    if ((data?.status || "").toLowerCase() === "completed") return true;
    if (data?.missionCompleted === true || data?.attended === true) {
        return true;
    }
    return isMissionDataCompleted(mission);
}

async function resolveMissionDurationHours(missionId, orgId, orgHints = []) {
    if (missionHoursCache.has(missionId)) {
        return missionHoursCache.get(missionId);
    }
    const mission = await fetchMissionDocExpanded(missionId, orgId, orgHints);
    let hours = 0;
    if (mission) {
        const stored = Number(mission.durationHours);
        hours = Number.isFinite(stored) && stored > 0
            ? stored
            : computeMissionDurationHours(mission);
    }
    missionHoursCache.set(missionId, hours);
    return hours;
}

export async function collectOrgIdHints(userId, coordinatorOrgId = null) {
    const hints = new Set();
    if (coordinatorOrgId) hints.add(coordinatorOrgId);

    try {
        const ledgerSnap = await getDocs(
            collection(db, "users", userId, "pointsLedger")
        );
        ledgerSnap.docs.forEach((d) => {
            const data = d.data();
            const oid = data.orgId || data.organizationId;
            if (oid) hints.add(oid);
        });
    } catch (err) {
        console.warn("[WARN] ledger org hints:", err);
    }

    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        appsSnap.docs.forEach((d) => {
            const data = d.data();
            const oid = data.orgId || data.organizationId;
            if (oid) hints.add(oid);
        });
    } catch (err) {
        console.warn("[WARN] user applications org hints:", err);
    }

    return hints;
}

function directHoursFromRecord(data) {
    const fromApp = Number(
        data?.durationHours ?? data?.missionDurationHours ?? data?.hours
    );
    return Number.isFinite(fromApp) && fromApp > 0 ? fromApp : 0;
}

async function loadUserScopedApplicationDocs(userId) {
    const docs = [];
    const seen = new Set();

    const pushUnique = (snap) => {
        if (!snap?.docs) return;
        snap.docs.forEach((docSnap) => {
            const key = docSnap.ref?.path || docSnap.id;
            if (!key || seen.has(key)) return;
            seen.add(key);
            docs.push(docSnap);
        });
    };

    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        pushUnique(appsSnap);
    } catch (err) {
        console.warn("[WARN] users applications stats:", err);
    }

    // Prefer indexed userId query over scanning every applications subcollection.
    try {
        const scopedSnap = await getDocs(
            query(
                collectionGroup(db, "applications"),
                where("userId", "==", userId)
            )
        );
        pushUnique(scopedSnap);
    } catch (err) {
        console.warn("[WARN] scoped collectionGroup applications stats:", err);
    }

    return docs;
}

/** Global completed missions + hours (all orgs), aligned with mobile profile. */
export async function computeGlobalVolunteerStats(
    userId,
    coordinatorOrgId = null
) {
    const hoursByMission = new Map();
    const orgHints = new Set();
    if (coordinatorOrgId) orgHints.add(coordinatorOrgId);

    const pending = [];

    const queueHours = (missionId, hours) => {
        if (!missionId || hoursByMission.has(missionId)) return;
        hoursByMission.set(missionId, Number(hours) || 0);
    };

    const queueOrQueue = (missionId, orgId, data) => {
        if (!missionId || hoursByMission.has(missionId)) return;
        if (orgId) orgHints.add(orgId);
        const direct = directHoursFromRecord(data);
        if (direct > 0) {
            queueHours(missionId, direct);
            return;
        }
        pending.push({ missionId, orgId: orgId || "", data });
    };

    const [ledgerSnap, applicationDocs] = await Promise.all([
        getDocs(collection(db, "users", userId, "pointsLedger")).catch(
            (err) => {
                console.warn("[WARN] pointsLedger stats:", err);
                return { docs: [] };
            }
        ),
        loadUserScopedApplicationDocs(userId),
    ]);

    for (const ledgerDoc of ledgerSnap.docs || []) {
        const data = ledgerDoc.data() || {};
        queueOrQueue(
            ledgerDoc.id,
            data.orgId || data.organizationId || "",
            data
        );
    }

    await Promise.all(
        applicationDocs.map(async (docSnap) => {
            const data = docSnap.data() || {};
            const pathUserId =
                data.userId || userIdFromApplicationPath(docSnap.ref.path);
            if (pathUserId && pathUserId !== userId) return;
            if (!isParticipationStatus(data.status)) return;

            let missionId = resolveMissionIdFromApplication(
                data,
                docSnap.ref.path
            );
            if (!missionId && docSnap.id) missionId = docSnap.id;
            if (!missionId || hoursByMission.has(missionId)) return;

            const orgId = data.orgId || data.organizationId || "";
            const direct = directHoursFromRecord(data);
            const completedLocally =
                (data?.status || "").toLowerCase() === "completed" ||
                data?.missionCompleted === true ||
                data?.attended === true;

            if (completedLocally) {
                if (orgId) orgHints.add(orgId);
                if (direct > 0) {
                    queueHours(missionId, direct);
                    return;
                }
                queueOrQueue(missionId, orgId, data);
                return;
            }

            // Approved/accepted: confirm the mission is completed before counting.
            const mission = await fetchMissionDocExpanded(
                missionId,
                orgId,
                [...orgHints]
            );
            if (!applicationCountsAsCompleted(data, mission)) return;
            if (orgId) orgHints.add(orgId);
            const hours = hoursFromApplicationOrMission(data, mission);
            if (hours > 0) queueHours(missionId, hours);
            else queueOrQueue(missionId, orgId, data);
        })
    );

    const hintList = [...orgHints];
    await Promise.all(
        pending.map(async ({ missionId, orgId, data }) => {
            if (hoursByMission.has(missionId)) return;
            const hours = await resolveMissionDurationHours(
                missionId,
                orgId,
                hintList
            );
            queueHours(missionId, hours || directHoursFromRecord(data));
        })
    );

    return finalizeHoursMap(hoursByMission);
}

function finalizeHoursMap(hoursByMission) {
    let totalHours = 0;
    for (const hours of hoursByMission.values()) {
        totalHours += hours;
    }
    return {
        missionsCompleted: hoursByMission.size,
        totalHours: Math.round(totalHours * 10) / 10,
    };
}

/**
 * One collectionGroup scan + ledger reads for listed users (admin table).
 * @returns {Map<string, { missionsCompleted: number, totalHours: number }>}
 */
export async function buildGlobalVolunteerStatsIndex(userIds = []) {
    const filterSet =
        userIds.length > 0 ? new Set(userIds) : null;
    const hoursByUser = new Map();

    const ensureMap = (uid) => {
        if (!hoursByUser.has(uid)) hoursByUser.set(uid, new Map());
        return hoursByUser.get(uid);
    };

    const recordForUser = async (uid, missionId, orgId, data, mission) => {
        if (!uid || !missionId) return;
        const hoursByMission = ensureMap(uid);
        if (hoursByMission.has(missionId)) return;
        const hours = mission
            ? hoursFromApplicationOrMission(data, mission)
            : await resolveMissionDurationHours(missionId, orgId, []);
        hoursByMission.set(missionId, hours);
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        await Promise.all(
            cgSnap.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const uid =
                    data.userId || userIdFromApplicationPath(docSnap.ref.path);
                if (!uid || (filterSet && !filterSet.has(uid))) return;
                if (!isParticipationStatus(data.status)) return;

                let missionId = resolveMissionIdFromApplication(
                    data,
                    docSnap.ref.path
                );
                if (!missionId && docSnap.id) missionId = docSnap.id;
                if (!missionId) return;

                const orgId = data.orgId || data.organizationId || "";
                const mission = await fetchMissionDocExpanded(
                    missionId,
                    orgId,
                    []
                );
                if (!applicationCountsAsCompleted(data, mission)) return;

                await recordForUser(uid, missionId, orgId, data, mission);
            })
        );
    } catch (err) {
        console.warn("[WARN] batch collectionGroup stats:", err);
    }

    const idsToScan = filterSet ? [...filterSet] : [...hoursByUser.keys()];

    await Promise.all(
        idsToScan.map(async (uid) => {
            try {
                const hints = await collectOrgIdHints(uid);
                const hintList = [...hints];
                const ledgerSnap = await getDocs(
                    collection(db, "users", uid, "pointsLedger")
                );
                for (const ledgerDoc of ledgerSnap.docs) {
                    const data = ledgerDoc.data();
                    const missionId = ledgerDoc.id;
                    const orgId = data.orgId || data.organizationId || "";
                    const mission = await fetchMissionDocExpanded(
                        missionId,
                        orgId,
                        hintList
                    );
                    await recordForUser(uid, missionId, orgId, data, mission);
                }
            } catch (err) {
                console.warn("[WARN] batch ledger stats:", uid, err);
            }
        })
    );

    const index = new Map();
    for (const [uid, hoursByMission] of hoursByUser) {
        index.set(uid, finalizeHoursMap(hoursByMission));
    }
    for (const uid of idsToScan) {
        if (!index.has(uid)) {
            index.set(uid, { missionsCompleted: 0, totalHours: 0 });
        }
    }
    return index;
}

function missionBelongsToOrg(missionId, data, mission, orgId, orgMissionById) {
    if (!orgId || !missionId) return false;
    if (orgMissionById?.has(missionId)) return true;
    const oid =
        data?.orgId ||
        data?.organizationId ||
        mission?.orgId ||
        mission?.organizationId ||
        "";
    return oid === orgId;
}

async function recordOrgMissionHours(
    hoursByMission,
    missionId,
    data,
    orgId,
    orgMissionById
) {
    if (!missionId || hoursByMission.has(missionId)) return;

    const status = (data?.status || "approved").toLowerCase();
    if (!isParticipationStatus(status)) return;

    let mission = orgMissionById.get(missionId);
    if (!mission) {
        mission = await fetchMissionDocExpanded(missionId, orgId, [orgId]);
        if (mission) orgMissionById.set(missionId, mission);
    }

    if (!missionBelongsToOrg(missionId, data, mission, orgId, orgMissionById)) {
        return;
    }

    let hours = hoursFromApplicationOrMission(data, mission);
    if (!Number.isFinite(hours) || hours <= 0) {
        hours = await resolveMissionDurationHours(missionId, orgId, [orgId]);
    }
    if (hours > 0) {
        hoursByMission.set(missionId, hours);
    }
}

/**
 * Org-scoped volunteer hours for one user (ledger + applications + loaded rows).
 */
export async function computeOrgVolunteerHoursForUser(
    userId,
    orgId,
    orgMissionById,
    volunteerRowsForUser = []
) {
    const hoursByMission = new Map();
    if (!userId || !orgId) {
        return { totalHours: 0 };
    }

    const map = orgMissionById || new Map();

    for (const row of volunteerRowsForUser) {
        await recordOrgMissionHours(
            hoursByMission,
            row.missionId,
            row,
            orgId,
            map
        );
    }

    try {
        const ledgerSnap = await getDocs(
            collection(db, "users", userId, "pointsLedger")
        );
        for (const ledgerDoc of ledgerSnap.docs) {
            const data = ledgerDoc.data();
            const missionId = ledgerDoc.id;
            const ledgerOrgId = data.orgId || data.organizationId || "";
            if (ledgerOrgId && ledgerOrgId !== orgId) continue;
            await recordOrgMissionHours(
                hoursByMission,
                missionId,
                data,
                orgId,
                map
            );
        }
    } catch (err) {
        console.warn("[WARN] org hours ledger:", userId, err);
    }

    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        for (const docSnap of appsSnap.docs) {
            const data = docSnap.data();
            let missionId = resolveMissionIdFromApplication(
                data,
                docSnap.ref.path
            );
            if (!missionId && docSnap.id) missionId = docSnap.id;
            if (!missionId) continue;

            const appOrg = data.orgId || data.organizationId || "";
            if (appOrg && appOrg !== orgId && !map.has(missionId)) continue;

            await recordOrgMissionHours(
                hoursByMission,
                missionId,
                data,
                orgId,
                map
            );
        }
    } catch (err) {
        console.warn("[WARN] org hours user apps:", userId, err);
    }

    let totalHours = 0;
    for (const hours of hoursByMission.values()) {
        totalHours += hours;
    }

    return {
        totalHours: Math.round(totalHours * 10) / 10,
        missionsCounted: hoursByMission.size,
    };
}

/**
 * Sum org volunteer hours across all unique volunteers on the page.
 */
export async function computeOrgVolunteersTotalHours(
    orgId,
    orgMissionById,
    volunteerRows = []
) {
    if (!orgId || !volunteerRows.length) {
        return 0;
    }

    const map = orgMissionById || new Map();
    const byUser = new Map();

    for (const row of volunteerRows) {
        const uid = String(row.userId || "").trim();
        if (!uid) continue;
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid).push(row);
    }

    if (byUser.size === 0) return 0;

    await loadPlatformConfig();

    let total = 0;
    for (const [uid, rows] of byUser) {
        const { totalHours } = await computeOrgVolunteerHoursForUser(
            uid,
            orgId,
            map,
            rows
        );
        total += totalHours;
    }

    return Math.round(total * 10) / 10;
}
