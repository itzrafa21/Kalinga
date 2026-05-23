import { db } from "./firebase.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    loadPlatformConfig,
    resolveMissionPoints,
    getLevelForPoints,
    evaluateBadgeUnlocks,
    computeMissionPointsPayload,
} from "./platform-config.js";

async function listApprovedVolunteerUserIds(orgId, missionId) {
    const userIds = new Set();

    if (orgId) {
        try {
            const rosterSnap = await getDocs(
                collection(db, "organizations", orgId, "missions", missionId, "volunteers")
            );
            rosterSnap.forEach((d) => {
                const st = (d.data().status || "").toLowerCase();
                if (st === "approved" || st === "accepted") {
                    userIds.add(d.id);
                }
            });
        } catch (err) {
            console.warn("[WARN] roster for points award:", err);
        }
    }

    if (userIds.size === 0) {
        try {
            const appsSnap = await getDocs(
                collection(db, "missions", missionId, "applications")
            );
            appsSnap.forEach((d) => {
                const data = d.data();
                const st = (data.status || "").toLowerCase();
                if ((st === "approved" || st === "accepted") && data.userId) {
                    userIds.add(data.userId);
                }
            });
        } catch (err) {
            console.warn("[WARN] applications for points award:", err);
        }
    }

    return [...userIds];
}

/**
 * Award missionPoints to approved volunteers when a mission ends.
 * Idempotent via users/{uid}/pointsLedger/{missionId}.
 */
export async function awardMissionPoints(orgId, missionId, mission) {
    if (!missionId || !mission) return;

    let missionDoc = { ...mission };
    if (
        (missionDoc.missionPoints == null || missionDoc.missionPoints === "") &&
        missionDoc.type
    ) {
        const computed = await computeMissionPointsPayload(missionDoc);
        missionDoc = { ...missionDoc, ...computed };
    }

    if (missionDoc.pointsAwarded === true) return;

    const points = resolveMissionPoints(missionDoc);
    if (!points) return;

    await loadPlatformConfig();

    const userIds = await listApprovedVolunteerUserIds(orgId, missionId);
    if (userIds.length === 0) return;

    for (const uid of userIds) {
        const ledgerRef = doc(db, "users", uid, "pointsLedger", missionId);
        const ledgerSnap = await getDoc(ledgerRef);
        if (ledgerSnap.exists()) continue;

        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        const user = userSnap.exists() ? userSnap.data() : {};

        const totalPoints = (Number(user.totalPoints) || 0) + points;
        const missionsCompleted = (Number(user.missionsCompleted) || 0) + 1;
        const level = getLevelForPoints(totalPoints);
        const badges = evaluateBadgeUnlocks({
            ...user,
            totalPoints,
            missionsCompleted,
            volunteerLevel: level.name,
        });

        await setDoc(ledgerRef, {
            missionId,
            orgId: orgId || missionDoc.orgId || "",
            points,
            awardedAt: serverTimestamp(),
        });

        await setDoc(
            userRef,
            {
                totalPoints,
                missionsCompleted,
                volunteerLevel: level.name,
                badges,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        if (orgId) {
            try {
                await setDoc(
                    doc(db, "organizations", orgId, "missions", missionId, "volunteers", uid),
                    { missionPointsAwarded: points, updatedAt: serverTimestamp() },
                    { merge: true }
                );
            } catch {
                /* mission may already be deleted from org missions */
            }
        }
    }

    const awardedUpdate = {
        pointsAwarded: true,
        pointsAwardedAt: serverTimestamp(),
        missionPoints: points,
    };

    if (orgId) {
        try {
            await updateDoc(
                doc(db, "organizations", orgId, "history", missionId),
                awardedUpdate
            );
        } catch {
            /* history doc may not exist yet */
        }
    }

    try {
        await updateDoc(doc(db, "missions", missionId), awardedUpdate);
    } catch {
        /* global mission may not exist */
    }
}
