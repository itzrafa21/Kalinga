import { auth, db } from "./firebase";
import {
    collection,
    getDocs,
    query,
    doc,
    deleteDoc,
    setDoc,
    updateDoc,
    getDoc,
    where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { computeMissionPointsPayload } from "./mission-type-points.js";
import { awardMissionPoints } from "./volunteer-recognition.js";

let CURRENT_USER = null;
let allDashboardMissions = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }

    console.log("[SUCCESS] User logged in:", user.uid);
    CURRENT_USER = user;

    initMissionFilters();
    await loadMissions(user);

    setInterval(async () => {
        if (CURRENT_USER) {
            await updateMissionStatuses(CURRENT_USER);
            await loadMissions(CURRENT_USER);
        }
    }, 1 * 60 * 1000);
});

async function updateMissionStatuses(user) {
    try {
        console.log("[INFO] Updating mission statuses...");

        const missionsRef = collection(db, "organizations", user.uid, "missions");
        const snapshot = await getDocs(missionsRef);

        let updatedCount = 0;

        for (const docSnap of snapshot.docs) {
            const mission = docSnap.data();
            const missionId = docSnap.id;

            if (mission.status === "Pending" || mission.status === "pending") {
                continue;
            }

            const newStatus = calculateMissionStatus(mission);

            if (newStatus === "Completed") {
                await closePendingApplicationsForMission(missionId);
            }

            if (newStatus !== mission.status) {
                console.log(
                    `[INFO] Updating mission ${missionId}: ${mission.status} → ${newStatus}`
                );

                await updateDoc(
                    doc(db, "organizations", user.uid, "missions", missionId),
                    {
                        status: newStatus,
                        lastStatusUpdate: new Date(),
                    }
                );

                try {
                    await updateDoc(doc(db, "missions", missionId), {
                        status: newStatus,
                        lastStatusUpdate: new Date(),
                    });
                } catch (error) {
                    console.log("[WARNING] Could not update global mission:", error);
                }

                updatedCount++;
            }
        }

        console.log(`[SUCCESS] Updated ${updatedCount} mission statuses`);
    } catch (error) {
        console.error("[ERROR] Error updating mission statuses:", error);
    }
}

function calculateMissionStatus(mission) {
    const now = new Date();
    const startDate = mission.date;
    const endDate = mission.endDate || mission.date;
    const startTime = mission.startTime;
    const endTime = mission.endTime;

    if (!startDate || !endDate || !startTime || !endTime) {
        return mission.status;
    }

    try {
        let missionDateTime;
        let endDateTime;

        if (startTime.includes("AM") || startTime.includes("PM")) {
            missionDateTime = parse12HourTime(startDate, startTime);
        } else {
            missionDateTime = new Date(`${startDate}T${startTime}`);
        }

        if (endTime.includes("AM") || endTime.includes("PM")) {
            endDateTime = parse12HourTime(endDate, endTime);
        } else {
            endDateTime = new Date(`${endDate}T${endTime}`);
        }

        if (endDateTime < missionDateTime) {
            endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
        }

        if (now < missionDateTime) return "Open";
        if (now >= missionDateTime && now <= endDateTime) return "Ongoing";
        return "Completed";
    } catch (error) {
        console.error("[ERROR] Error calculating mission status:", error);
        return mission.status;
    }
}

async function closePendingApplicationsForMission(missionId) {
    const reason =
        "Mission has ended. This application was closed automatically.";
    const payload = {
        status: "closed",
        closedAt: new Date(),
        closeReason: reason,
        updatedAt: new Date(),
    };

    try {
        const subSnap = await getDocs(
            collection(db, "missions", missionId, "applications")
        );
        for (const appDoc of subSnap.docs) {
            if ((appDoc.data().status || "").toLowerCase() !== "pending") continue;
            await updateDoc(appDoc.ref, payload);
        }
    } catch (e) {
        console.warn("[WARNING] close pending subcollection apps", missionId, e);
    }

    try {
        const rootQ = query(
            collection(db, "applications"),
            where("missionId", "==", missionId)
        );
        const rootSnap = await getDocs(rootQ);
        for (const appDoc of rootSnap.docs) {
            if ((appDoc.data().status || "").toLowerCase() !== "pending") continue;
            await updateDoc(appDoc.ref, payload);
        }
    } catch (e) {
        console.warn("[WARNING] close pending root apps", missionId, e);
    }
}

function parse12HourTime(date, time12hr) {
    const [time, period] = time12hr.split(" ");
    const [hours, minutes] = time.split(":");

    let hour24 = parseInt(hours, 10);

    if (period === "AM") {
        if (hour24 === 12) hour24 = 0;
    } else if (period === "PM") {
        if (hour24 !== 12) hour24 += 12;
    }

    return new Date(`${date}T${hour24.toString().padStart(2, "0")}:${minutes}`);
}

function escapeMissionCell(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normalizeMissionStatus(status) {
    return (status || "").toLowerCase();
}

function getMissionStatusClass(status) {
    const normalizedStatus = normalizeMissionStatus(status);
    switch (normalizedStatus) {
        case "open":
            return "mission-status--open";
        case "ongoing":
            return "mission-status--ongoing";
        case "completed":
            return "mission-status--completed";
        case "pending":
            return "mission-status--pending";
        case "rejected":
            return "mission-status--rejected";
        default:
            return "mission-status--default";
    }
}

function formatMissionDate(mission) {
    const raw = mission.date || mission.endDate;
    if (!raw) return "—";
    const d = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatLocationShort(mission) {
    const raw = String(mission.location || "").trim();
    if (!raw) return "—";
    const idx = raw.indexOf(",");
    return idx > 0 ? raw.slice(0, idx).trim() : raw;
}

function isApprovedSignupStatus(status) {
    const st = (status || "").toLowerCase();
    return st === "approved" || st === "accepted";
}

async function countApprovedForMission(missionId, orgId) {
    const keys = new Set();

    const addIfApproved = (data, docId) => {
        if (!isApprovedSignupStatus(data.status)) return;
        const u = data.userId;
        keys.add(u ? `u:${u}` : `d:${docId}`);
    };

    try {
        const sub = await getDocs(
            collection(db, "missions", missionId, "applications")
        );
        sub.forEach((d) => addIfApproved(d.data(), d.id));
    } catch {
        /* ignore */
    }

    if (orgId) {
        try {
            const rosterSnap = await getDocs(
                collection(
                    db,
                    "organizations",
                    orgId,
                    "missions",
                    missionId,
                    "volunteers"
                )
            );
            rosterSnap.forEach((d) => {
                const data = d.data();
                addIfApproved({ ...data, userId: data.userId || d.id }, d.id);
            });
        } catch {
            /* ignore */
        }
    }

    return keys.size;
}

function showMissionsLoading() {
    const tbody = document.getElementById("missionsBody");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr class="missions-loading-row">
            <td colspan="6">
                <div class="missions-loading">
                    <div class="missions-loading-spinner" aria-hidden="true"></div>
                    <span>Loading missions…</span>
                </div>
            </td>
        </tr>`;
}

function updateDashboardStats(missions) {
    const totalEl = document.getElementById("totalMissions");
    const ongoingEl = document.getElementById("ongoingMissions");
    const pendingEl = document.getElementById("pendingMissions");
    const tableCountEl = document.getElementById("missionsTableCount");

    const ongoingCount = missions.filter((m) => {
        const st = normalizeMissionStatus(m.status);
        return st === "open" || st === "ongoing";
    }).length;

    const pendingCount = missions.filter(
        (m) => normalizeMissionStatus(m.status) === "pending"
    ).length;

    if (totalEl) totalEl.textContent = String(missions.length);
    if (ongoingEl) ongoingEl.textContent = String(ongoingCount);
    if (pendingEl) pendingEl.textContent = String(pendingCount);
    if (tableCountEl) {
        tableCountEl.textContent =
            missions.length === 1 ? "1 mission" : `${missions.length} missions`;
    }
}

function renderMissionsTable(missions) {
    const tbody = document.getElementById("missionsBody");
    if (!tbody) return;

    if (missions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="missions-empty">
                        <i class="bi bi-journal-x" aria-hidden="true"></i>
                        <h4>No missions found</h4>
                        <p>Try adjusting your search or filters, or create a new mission.</p>
                        <button type="button" class="create-btn create-btn--sm" onclick="window.location.href='/missions/create'">
                            <i class="bi bi-plus-lg"></i> Create New Mission
                        </button>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = missions
        .map((m) => {
            const statusLabel = m.status || "N/A";
            const needed = Math.max(0, parseInt(m.volunteersNeeded, 10) || 0);
            const signedUp = m.signedUp ?? 0;
            const detailsUrl = `/missions/details?id=${encodeURIComponent(m.id)}`;
            const editUrl = `/missions/edit?id=${encodeURIComponent(m.id)}`;
            const autoAcceptBadge = m.autoAcceptVolunteers
                ? `<span class="mission-tag" title="Auto-accept volunteers">Auto-accept</span>`
                : "";

            return `
                <tr data-status="${escapeMissionCell(normalizeMissionStatus(statusLabel))}">
                    <td class="col-mission">
                        <a href="${detailsUrl}" class="mission-name-link">${escapeMissionCell(m.missionName || "Untitled")}</a>
                        ${autoAcceptBadge}
                        <div class="mission-location-sub">${escapeMissionCell(m.locationShort)}</div>
                    </td>
                    <td class="col-date">${escapeMissionCell(m.dateLabel)}</td>
                    <td class="col-type">${escapeMissionCell(m.type || "—")}</td>
                    <td class="col-volunteers">
                        <span class="volunteer-progress">${signedUp} / ${needed}</span>
                    </td>
                    <td class="col-status">
                        <span class="mission-status ${getMissionStatusClass(statusLabel)}">${escapeMissionCell(statusLabel)}</span>
                    </td>
                    <td class="col-actions">
                        <a href="${editUrl}" class="mission-action-btn">Edit</a>
                    </td>
                </tr>`;
        })
        .join("");
}

function applyMissionFilters() {
    const searchEl = document.getElementById("missionSearch");
    const filterEl = document.getElementById("missionStatusFilter");
    const term = (searchEl?.value || "").toLowerCase().trim();
    const statusFilter = (filterEl?.value || "all").toLowerCase();

    let list = [...allDashboardMissions];

    if (statusFilter !== "all") {
        list = list.filter(
            (m) => normalizeMissionStatus(m.status) === statusFilter
        );
    }

    if (term) {
        list = list.filter((m) => {
            const haystack = [
                m.missionName,
                m.type,
                m.locationShort,
                m.status,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(term);
        });
    }

    const tableCountEl = document.getElementById("missionsTableCount");
    if (tableCountEl) {
        tableCountEl.textContent =
            list.length === 1 ? "1 mission" : `${list.length} missions`;
    }

    renderMissionsTable(list);
}

function initMissionFilters() {
    const searchEl = document.getElementById("missionSearch");
    const filterEl = document.getElementById("missionStatusFilter");

    if (searchEl && !searchEl.dataset.bound) {
        searchEl.dataset.bound = "1";
        searchEl.addEventListener("input", applyMissionFilters);
    }

    if (filterEl && !filterEl.dataset.bound) {
        filterEl.dataset.bound = "1";
        filterEl.addEventListener("change", applyMissionFilters);
    }
}

async function buildDashboardMission(user, docSnap, today) {
    const mission = docSnap.data();
    const missionId = docSnap.id;
    const normalizedStatus = normalizeMissionStatus(mission.status);

    if (normalizedStatus === "rejected") {
        void moveMissionToHistory(user.uid, missionId, mission);
        return null;
    }

    if (shouldMoveMissionToHistory(mission, today)) {
        void moveMissionToHistory(user.uid, missionId, mission);
        return null;
    }

    const signedUp = await countApprovedForMission(missionId, user.uid);

    return {
        id: missionId,
        missionName: mission.missionName || mission.name || "Untitled",
        type: mission.type || "—",
        status: mission.status || "N/A",
        volunteersNeeded: mission.volunteers ?? 0,
        signedUp,
        dateLabel: formatMissionDate(mission),
        locationShort: formatLocationShort(mission),
        autoAcceptVolunteers: mission.autoAcceptVolunteers === true,
    };
}

async function loadMissions(user) {
    const missionsTableBody = document.getElementById("missionsBody");
    if (!missionsTableBody) return;

    showMissionsLoading();

    const missionsRef = collection(db, "organizations", user.uid, "missions");
    const missionsQuery = query(missionsRef);

    try {
        const snapshot = await getDocs(missionsQuery);
        const today = new Date();

        if (snapshot.empty) {
            allDashboardMissions = [];
            updateDashboardStats([]);
            renderMissionsTable([]);
            return;
        }

        const results = await Promise.all(
            snapshot.docs.map((docSnap) => buildDashboardMission(user, docSnap, today))
        );

        allDashboardMissions = results
            .filter(Boolean)
            .sort((a, b) =>
                String(a.dateLabel).localeCompare(String(b.dateLabel))
            );

        updateDashboardStats(allDashboardMissions);
        applyMissionFilters();

        console.log(`[SUCCESS] Loaded ${allDashboardMissions.length} missions`);
    } catch (error) {
        console.error("Error fetching missions: ", error);
        missionsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="missions-error-cell">Could not load missions. Please refresh the page.</td>
            </tr>`;
    }
}

function shouldMoveMissionToHistory(mission, today) {
    const status = normalizeMissionStatus(mission.status);
    if (status === "pending") return false;

    const endDate = mission.endDate || mission.date;
    if (!endDate || !mission.endTime) return false;

    try {
        let missionEndDateTime;

        if (mission.endTime.includes("AM") || mission.endTime.includes("PM")) {
            missionEndDateTime = parse12HourTime(endDate, mission.endTime);
        } else {
            missionEndDateTime = new Date(`${endDate}T${mission.endTime}`);
        }

        return today.getTime() > missionEndDateTime.getTime();
    } catch (error) {
        console.error("Error checking mission end time:", error);
        return false;
    }
}

function isMissionInFuture(mission) {
    if (!mission.date || !mission.startTime) return false;

    try {
        let missionStartDateTime;

        if (mission.startTime.includes("AM") || mission.startTime.includes("PM")) {
            missionStartDateTime = parse12HourTime(mission.date, mission.startTime);
        } else {
            missionStartDateTime = new Date(`${mission.date}T${mission.startTime}`);
        }

        return missionStartDateTime > new Date();
    } catch (error) {
        console.error("Error checking mission future status:", error);
        return false;
    }
}

async function moveMissionToHistory(orgId, missionId, mission) {
    try {
        const historyRef = doc(db, "organizations", orgId, "history", missionId);

        let payload = { ...mission, movedToHistoryAt: new Date() };

        try {
            const globalSnap = await getDoc(doc(db, "missions", missionId));
            if (globalSnap.exists()) {
                const globalData = globalSnap.data();
                payload = { ...mission, ...globalData, movedToHistoryAt: new Date() };
            }
        } catch (e) {
            console.warn("[WARNING] Could not read global mission for merge:", missionId, e);
        }

        if (
            (payload.missionPoints == null || payload.missionPoints === "") &&
            payload.type
        ) {
            const pointsFields = await computeMissionPointsPayload(payload);
            const { basePoints: _legacyBase, ...withoutBase } = payload;
            payload = { ...withoutBase, ...pointsFields };
        } else if (payload.basePoints != null) {
            const { basePoints: _legacyBase, ...withoutBase } = payload;
            payload = withoutBase;
        }

        await setDoc(historyRef, payload);
        await awardMissionPoints(orgId, missionId, payload);

        await deleteDoc(doc(db, "organizations", orgId, "missions", missionId));

        console.log(`[SUCCESS] Mission "${mission.missionName}" moved to history`);
    } catch (error) {
        console.error("[ERROR] Error moving mission to history:", error);
    }
}
