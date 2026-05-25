import { db } from "./firebase.js";
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
} from "firebase/firestore";
import { resolveMissionIdFromApplication } from "./application-storage.js";
import { computeMissionDurationHours } from "./platform-config.js";

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
    const refs = [doc(db, "missions", missionId)];
    if (oid) {
        refs.unshift(
            doc(db, "organizations", oid, "missions", missionId),
            doc(db, "organizations", oid, "history", missionId)
        );
    }
    for (const ref of refs) {
        try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
                return normalizeMissionDoc(snap.data(), oid || orgId);
            }
        } catch (err) {
            console.warn("[WARN] volunteer-stats fetch:", ref.path, err);
        }
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

    try {
        const globalSnap = await getDoc(doc(db, "missions", missionId));
        if (globalSnap.exists()) {
            const data = globalSnap.data();
            addHint(data.orgId || data.organizationId);
            if (isMissionDataCompleted(data)) {
                return normalizeMissionDoc(data);
            }
        }
    } catch (err) {
        console.warn("[WARN] volunteer-stats global:", missionId, err);
    }

    for (const oid of hints) {
        const mission = await fetchMissionDoc(oid, missionId);
        if (mission) return mission;
    }

    try {
        const globalSnap = await getDoc(doc(db, "missions", missionId));
        if (globalSnap.exists()) {
            return normalizeMissionDoc(globalSnap.data());
        }
    } catch {
        /* ignore */
    }

    return null;
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

/** Global completed missions + hours (all orgs), aligned with mobile profile. */
export async function computeGlobalVolunteerStats(
    userId,
    coordinatorOrgId = null
) {
    const hoursByMission = new Map();
    const orgHints = await collectOrgIdHints(userId, coordinatorOrgId);
    const hintList = [...orgHints];

    const recordMission = async (missionId, orgId, data, mission) => {
        if (!missionId || hoursByMission.has(missionId)) return;
        const hours = mission
            ? hoursFromApplicationOrMission(data, mission)
            : await resolveMissionDurationHours(
                  missionId,
                  orgId || mission?.orgId || "",
                  hintList
              );
        hoursByMission.set(missionId, hours);
    };

    try {
        const ledgerSnap = await getDocs(
            collection(db, "users", userId, "pointsLedger")
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
            await recordMission(missionId, orgId, data, mission);
        }
    } catch (err) {
        console.warn("[WARN] pointsLedger stats:", err);
    }

    const processApplicationDoc = async (docSnap) => {
        const data = docSnap.data();
        const pathUserId =
            data.userId || userIdFromApplicationPath(docSnap.ref.path);
        if (pathUserId !== userId) return;
        if (!isParticipationStatus(data.status)) return;

        let missionId = resolveMissionIdFromApplication(
            data,
            docSnap.ref.path
        );
        if (!missionId && docSnap.id) {
            missionId = docSnap.id;
        }
        if (!missionId || hoursByMission.has(missionId)) return;

        const orgId = data.orgId || data.organizationId || "";
        const mission = await fetchMissionDocExpanded(
            missionId,
            orgId,
            hintList
        );

        if (!applicationCountsAsCompleted(data, mission)) return;

        await recordMission(missionId, orgId, data, mission);
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        await Promise.all(
            cgSnap.docs.map((docSnap) => processApplicationDoc(docSnap))
        );
    } catch (err) {
        console.warn("[WARN] collectionGroup applications stats:", err);
    }

    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        await Promise.all(
            appsSnap.docs.map((docSnap) => processApplicationDoc(docSnap))
        );
    } catch (err) {
        console.warn("[WARN] users applications stats:", err);
    }

    let totalHours = 0;
    for (const hours of hoursByMission.values()) {
        totalHours += hours;
    }

    return {
        missionsCompleted: hoursByMission.size,
        totalHours: Math.round(totalHours * 10) / 10,
    };
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
