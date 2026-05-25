import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
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
    STORAGE_MISSIONS_SUB,
    STORAGE_USERS_SUB,
    inferMissionIdForOrg,
    applicationBelongsToOrg,
    resolveMissionIdFromApplication,
} from "./application-storage.js";
import { computeMissionDurationHours } from "./platform-config.js";
import {
    computeGlobalVolunteerStats,
    readStoredProfileStats,
    collectOrgIdHints,
} from "./volunteer-stats.js";

let applicantUserId = null;
let coordinatorOrgId = null;
let orgMissionById = new Map();
let historyMissionIds = new Set();
let applicantApplications = [];
let volunteerStats = {
    missionsCompleted: 0,
    totalHours: 0,
    volunteerLevel: "",
    totalPoints: 0,
};
const missionHoursCache = new Map();

function getUserIdFromUrl() {
    return new URLSearchParams(window.location.search).get("userId");
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatMissionDate(mission) {
    if (!mission) return "—";
    const raw = mission.date || mission.endDate;
    if (!raw) return "—";
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    let d;
    if (typeof raw.toDate === "function") d = raw.toDate();
    else if (raw.seconds != null) d = new Date(raw.seconds * 1000);
    else d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function truncateDescription(text, maxLen = 160) {
    const s = String(text ?? "").trim();
    if (!s) return "—";
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}…`;
}

function isApprovedStatus(status) {
    const s = (status || "").toLowerCase();
    return s === "approved" || s === "accepted";
}

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

/** Mission is finished: in org history, marked completed, or moved to history. */
function isMissionCompleted(missionId) {
    if (historyMissionIds.has(missionId)) return true;
    const mission = orgMissionById.get(missionId);
    if (!mission) return false;
    const st = (mission.status || "").toLowerCase();
    return st === "completed" || mission.movedToHistoryAt != null;
}

function missionBelongsToOrg(mission, orgId) {
    if (!mission || !orgId) return false;
    const oid = mission.orgId || mission.organizationId || "";
    return !oid || oid === orgId;
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
                const data = snap.data();
                if (ref.path.includes("/history/")) {
                    historyMissionIds.add(missionId);
                }
                return normalizeMissionDoc(data, oid || orgId);
            }
        } catch (err) {
            console.warn("[WARN] fetchMissionDoc:", ref.path, err);
        }
    }
    return null;
}

/** Try global mission + every known org (history/missions) — completed docs often live only under org. */
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
        console.warn("[WARN] fetchMissionDocExpanded global:", missionId, err);
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

function applicationCountsAsCompleted(data, mission, missionId, orgMissionMap) {
    if ((data?.status || "").toLowerCase() === "completed") return true;
    if (data?.missionCompleted === true || data?.attended === true) {
        return true;
    }
    if (mission && isMissionDataCompleted(mission)) return true;
    if (orgMissionMap && missionId && orgMissionMap.has(missionId)) {
        const m = orgMissionMap.get(missionId);
        const st = (m?.status || "").toLowerCase();
        if (st === "completed" || m?.movedToHistoryAt != null) return true;
    }
    return false;
}

async function resolveMissionDurationHours(missionId, orgId, orgHints = []) {
    if (missionHoursCache.has(missionId)) {
        return missionHoursCache.get(missionId);
    }
    let mission = orgMissionById.get(missionId);
    if (!mission) {
        mission = await fetchMissionDocExpanded(missionId, orgId, orgHints);
        if (mission) orgMissionById.set(missionId, mission);
    }
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

/** Profile stats after org context is loaded — matches mobile app totals. */
async function loadVolunteerStats(userId, coordinatorOrgId) {
    const defaults = {
        missionsCompleted: 0,
        totalHours: 0,
        volunteerLevel: "",
        totalPoints: 0,
    };
    try {
        const [userSnap, global] = await Promise.all([
            getDoc(doc(db, "users", userId)),
            computeGlobalVolunteerStats(userId, coordinatorOrgId),
        ]);
        const u = userSnap.exists() ? userSnap.data() : {};
        const stored = readStoredProfileStats(u);
        const appCount = Number(u.applicationCount) || 0;

        const missionsCompleted = Math.max(
            stored.missionsCompleted,
            global.missionsCompleted,
            appCount
        );
        const totalHours = Math.max(stored.totalHours, global.totalHours);

        return {
            missionsCompleted,
            totalHours,
            volunteerLevel: u.volunteerLevel || "",
            totalPoints: Number(u.totalPoints) || 0,
        };
    } catch (err) {
        console.warn("[WARN] loadVolunteerStats:", err);
        return defaults;
    }
}

/** Completed missions for this org from points ledger (authoritative after award). */
async function mergeLedgerCompletedMissions(orgId, userId) {
    const byMission = new Map(
        applicantApplications.map((a) => [a.missionId, a])
    );

    try {
        const ledgerSnap = await getDocs(
            collection(db, "users", userId, "pointsLedger")
        );
        for (const ledgerDoc of ledgerSnap.docs) {
            const data = ledgerDoc.data();
            const missionId = ledgerDoc.id;
            const ledgerOrgId = data.orgId || "";

            if (ledgerOrgId && ledgerOrgId !== orgId) continue;

            let mission = orgMissionById.get(missionId);
            if (!mission) {
                mission = await fetchMissionDoc(orgId, missionId);
                if (mission) orgMissionById.set(missionId, mission);
            }
            if (!mission || !missionBelongsToOrg(mission, orgId)) continue;

            const existing = byMission.get(missionId);
            const record = {
                orgId,
                id: existing?.id || missionId,
                userApplicationId: existing?.userApplicationId || "",
                storage: existing?.storage || STORAGE_MISSIONS_SUB,
                userId,
                name: existing?.name || "",
                email: existing?.email || "",
                phone: existing?.phone || "",
                occupation: existing?.occupation || "",
                status: "approved",
                missionId,
                missionName:
                    existing?.missionName ||
                    mission.missionName ||
                    mission.name ||
                    "Mission",
                fromPointsLedger: true,
            };
            byMission.set(missionId, record);
        }
    } catch (err) {
        console.warn("[WARN] pointsLedger:", err);
    }

    applicantApplications = Array.from(byMission.values());
}

/** All completed missions for the table (every org), same scope as mobile profile stats. */
async function mergeGlobalCompletedMissionsForTable(userId, orgId) {
    const byMission = new Map();
    for (const app of applicantApplications) {
        byMission.set(app.missionId, app);
    }

    const orgHints = await collectOrgIdHints(userId, orgId);
    const hintList = [...orgHints];

    const upsertRecord = (missionId, patch) => {
        const existing = byMission.get(missionId);
        byMission.set(missionId, {
            orgId: orgId || "",
            id: missionId,
            userApplicationId: "",
            storage: STORAGE_USERS_SUB,
            userId,
            name: "",
            email: "",
            phone: "",
            occupation: "",
            status: "approved",
            missionId,
            missionName: "Mission",
            ...existing,
            ...patch,
        });
    };

    try {
        const ledgerSnap = await getDocs(
            collection(db, "users", userId, "pointsLedger")
        );
        for (const ledgerDoc of ledgerSnap.docs) {
            const data = ledgerDoc.data();
            const missionId = ledgerDoc.id;
            const ledgerOrgId = data.orgId || data.organizationId || "";
            const mission = await fetchMissionDocExpanded(
                missionId,
                ledgerOrgId,
                hintList
            );
            if (mission) orgMissionById.set(missionId, mission);
            upsertRecord(missionId, {
                orgId: ledgerOrgId || mission?.orgId || orgId,
                missionName:
                    mission?.missionName ||
                    mission?.name ||
                    "Mission",
                fromPointsLedger: true,
                status: "approved",
            });
        }
    } catch (err) {
        console.warn("[WARN] global ledger table merge:", err);
    }

    const processApp = async (docSnap) => {
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
        if (!missionId) return;

        const appOrgId = data.orgId || data.organizationId || "";
        const mission = await fetchMissionDocExpanded(
            missionId,
            appOrgId,
            hintList
        );
        if (
            !applicationCountsAsCompleted(
                data,
                mission,
                missionId,
                orgMissionById
            )
        ) {
            return;
        }

        if (mission) orgMissionById.set(missionId, mission);

        upsertRecord(missionId, {
            orgId: appOrgId || mission?.orgId || orgId,
            userApplicationId: docSnap.id,
            id: docSnap.id,
            storage: docSnap.ref.path.startsWith("users/")
                ? STORAGE_USERS_SUB
                : STORAGE_MISSIONS_SUB,
            status: data.status || "approved",
            missionName:
                data.missionName ||
                mission?.missionName ||
                mission?.name ||
                "Mission",
            name: data.displayName || data.name || "",
            email: data.email || "",
            phone: data.mobileNumber || data.phone || data.mobile || "",
            fromGlobalTable: true,
        });
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        await Promise.all(cgSnap.docs.map((docSnap) => processApp(docSnap)));
    } catch (err) {
        console.warn("[WARN] global cg table merge:", err);
    }

    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        await Promise.all(appsSnap.docs.map((docSnap) => processApp(docSnap)));
    } catch (err) {
        console.warn("[WARN] global user apps table merge:", err);
    }

    applicantApplications = Array.from(byMission.values());
}

function getAttendedMissions() {
    return applicantApplications
        .filter((a) => {
            if (!isParticipationStatus(a.status)) return false;
            if (a.fromPointsLedger || a.fromGlobalTable) return true;
            return isMissionCompleted(a.missionId);
        })
        .map((a) => {
            const mission = orgMissionById.get(a.missionId) || {};
            return {
                ...a,
                missionName:
                    a.missionName ||
                    mission.missionName ||
                    mission.name ||
                    "Mission",
                missionDate: formatMissionDate(mission),
                missionDescription: mission.description || "",
                sortDate: mission.date || mission.endDate || "",
            };
        })
        .sort((a, b) =>
            String(b.sortDate || "").localeCompare(String(a.sortDate || ""))
        );
}

async function buildOrgMissionMap(orgId) {
    const map = new Map();
    historyMissionIds = new Set();

    const addMission = (id, data, inHistory = false) => {
        map.set(id, {
            ...data,
            missionName: data.missionName || data.name || data.title || "Mission",
            orgId: data.orgId || data.organizationId || orgId,
        });
        if (inHistory) historyMissionIds.add(id);
    };

    const [orgMissionsResult, historyResult] = await Promise.allSettled([
        getDocs(collection(db, "organizations", orgId, "missions")),
        getDocs(collection(db, "organizations", orgId, "history")),
    ]);

    if (orgMissionsResult.status === "fulfilled") {
        orgMissionsResult.value.docs.forEach((missionDoc) => {
            addMission(missionDoc.id, missionDoc.data());
        });
    } else {
        console.warn("[WARN] organizations/missions:", orgMissionsResult.reason);
    }

    if (historyResult.status === "fulfilled") {
        historyResult.value.docs.forEach((missionDoc) => {
            addMission(missionDoc.id, missionDoc.data(), true);
        });
    } else {
        console.warn("[WARN] organizations/history:", historyResult.reason);
    }

    return map;
}

function buildApplicationRecord(
    docSnap,
    data,
    missionId,
    mission,
    storage,
    userId,
    orgId
) {
    return {
        orgId: orgId || data.orgId || data.organizationId || mission?.orgId || "",
        id: docSnap.id,
        userApplicationId: data.userApplicationId || "",
        storage,
        userId: data.userId || userId,
        name: data.displayName || data.name || "",
        email: data.email || "",
        phone: data.mobileNumber || data.phone || data.mobile || "",
        occupation: data.occupation || "",
        status: data.status || "pending",
        missionId,
        missionName: data.missionName || mission?.missionName || mission?.name || "Mission",
    };
}

async function loadApplicantApplications(orgId, userId) {
    const byMission = new Map();

    const mergeApp = (missionId, record) => {
        if (!missionId || !orgMissionById.has(missionId)) return;
        const existing = byMission.get(missionId);
        if (!existing) {
            byMission.set(missionId, record);
            return;
        }
        const existingApproved = isApprovedStatus(existing.status);
        const incomingApproved = isApprovedStatus(record.status);
        if (incomingApproved && !existingApproved) {
            byMission.set(missionId, record);
            return;
        }
        if (
            incomingApproved === existingApproved &&
            record.storage === STORAGE_MISSIONS_SUB
        ) {
            byMission.set(missionId, record);
        }
    };

    try {
        const userAppsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        for (const docSnap of userAppsSnap.docs) {
            const data = docSnap.data();
            const missionId = inferMissionIdForOrg(
                data,
                orgMissionById,
                docSnap.ref.path,
                orgId
            );
            if (
                !missionId ||
                !applicationBelongsToOrg(
                    data,
                    missionId,
                    orgMissionById,
                    orgId,
                    docSnap.ref.path
                )
            ) {
                continue;
            }
            const mission = orgMissionById.get(missionId);
            mergeApp(
                missionId,
                buildApplicationRecord(
                    docSnap,
                    { ...data, userApplicationId: docSnap.id },
                    missionId,
                    mission,
                    STORAGE_USERS_SUB,
                    userId,
                    orgId
                )
            );
        }
    } catch (err) {
        console.warn("[WARN] users applications:", err);
    }

    return Array.from(byMission.values());
}

/** Org roster is the primary source on the volunteers list; merge it for the detail page. */
async function mergeApplicantFromOrgRosters(orgId, userId) {
    const byMission = new Map();
    for (const app of applicantApplications) {
        byMission.set(app.missionId, app);
    }

    const missionIdsToCheck = [...orgMissionById.keys()].filter((missionId) =>
        isMissionCompleted(missionId)
    );

    await Promise.all(
        missionIdsToCheck.map(async (missionId) => {
            const mission = orgMissionById.get(missionId);
            try {
                const rosterRef = doc(
                    db,
                    "organizations",
                    orgId,
                    "missions",
                    missionId,
                    "volunteers",
                    userId
                );
                const rosterSnap = await getDoc(rosterRef);
                let rosterData = rosterSnap.exists() ? rosterSnap.data() : null;

                if (!rosterData) {
                    const rosterQuery = await getDocs(
                        query(
                            collection(
                                db,
                                "organizations",
                                orgId,
                                "missions",
                                missionId,
                                "volunteers"
                            ),
                            where("userId", "==", userId)
                        )
                    );
                    if (!rosterQuery.empty) {
                        rosterData = rosterQuery.docs[0].data();
                    }
                }

                if (!rosterData) return;

                const rosterStatus = (rosterData.status || "approved").toLowerCase();
                if (!isApprovedStatus(rosterStatus)) return;

                const existing = byMission.get(missionId);
                const record = {
                    orgId,
                    id: existing?.id || rosterData.applicationId || "",
                    userApplicationId:
                        existing?.userApplicationId ||
                        rosterData.userApplicationId ||
                        "",
                    storage: existing?.storage || STORAGE_MISSIONS_SUB,
                    userId,
                    name:
                        existing?.name ||
                        rosterData.displayName ||
                        rosterData.name ||
                        "",
                    email: existing?.email || rosterData.email || "",
                    phone:
                        existing?.phone ||
                        rosterData.mobileNumber ||
                        rosterData.phone ||
                        "",
                    occupation: existing?.occupation || rosterData.occupation || "",
                    status: "approved",
                    missionId,
                    missionName:
                        rosterData.missionName ||
                        existing?.missionName ||
                        mission.missionName ||
                        mission.name ||
                        "Mission",
                };

                if (
                    !existing ||
                    !isApprovedStatus(existing.status) ||
                    record.storage === STORAGE_MISSIONS_SUB
                ) {
                    byMission.set(missionId, record);
                }
            } catch (err) {
                console.warn(
                    "[WARN] roster",
                    orgId,
                    missionId,
                    userId,
                    err
                );
            }
        })
    );

    applicantApplications = Array.from(byMission.values());
}

function initialsFromName(name) {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderProfile(profile) {
    const nameEl = document.getElementById("applicantName");
    const emailEl = document.getElementById("applicantEmail");
    const phoneEl = document.getElementById("applicantPhone");
    const occupationEl = document.getElementById("applicantOccupation");
    const avatarWrap = document.getElementById("applicantAvatarWrap");
    const avatarImg = document.getElementById("applicantAvatarImg");
    const avatarInitial = document.getElementById("applicantAvatarInitial");
    if (!nameEl || !emailEl || !phoneEl) return;

    const first = applicantApplications[0];
    const profileName =
        profile?.name ||
        first?.name ||
        nameEl.dataset?.fallback ||
        "Volunteer";
    const email = profile?.email || first?.email || "";
    const phone = profile?.phone || first?.phone || "";
    const occupation =
        profile?.occupation || first?.occupation || "";
    const photoUrl = profile?.photoUrl || "";

    nameEl.textContent = profileName;
    emailEl.textContent = email || "—";
    phoneEl.textContent = phone || "—";

        const levelEl = document.getElementById("applicantLevel");
        if (levelEl) {
            const level =
                volunteerStats.volunteerLevel ||
                profile?.volunteerLevel ||
                "";
            if (level) {
                levelEl.textContent = level;
                levelEl.hidden = false;
                levelEl.removeAttribute("hidden");
            } else {
                levelEl.hidden = true;
                levelEl.setAttribute("hidden", "");
            }
        }

        if (occupationEl) {
            const occ = String(occupation).trim();
            if (occ) {
                occupationEl.textContent = occ;
                occupationEl.hidden = false;
                occupationEl.removeAttribute("hidden");
            } else {
                occupationEl.textContent = "";
                occupationEl.hidden = true;
                occupationEl.setAttribute("hidden", "");
            }
        }

    if (avatarInitial) {
        avatarInitial.textContent = initialsFromName(profileName);
    }

    if (avatarWrap && avatarImg) {
        avatarImg.onerror = () => {
            console.warn("[WARN] Failed to load photoUrl image");
            avatarImg.removeAttribute("src");
            avatarImg.setAttribute("hidden", "");
            avatarWrap.classList.remove("has-photo");
        };

        if (photoUrl) {
            avatarImg.alt = profileName;
            avatarImg.removeAttribute("crossorigin");
            avatarImg.removeAttribute("referrerpolicy");
            avatarImg.src = photoUrl;
            avatarImg.removeAttribute("hidden");
            avatarWrap.classList.add("has-photo");
        } else {
            avatarImg.alt = "";
            avatarImg.removeAttribute("src");
            avatarImg.setAttribute("hidden", "");
            avatarWrap.classList.remove("has-photo");
        }
    }
}

function renderVolunteerStats() {
    const missionsEl = document.getElementById("vdMissionsCount");
    const hoursEl = document.getElementById("vdHoursCount");

    if (missionsEl) {
        missionsEl.textContent = String(volunteerStats.missionsCompleted);
    }
    if (hoursEl) {
        hoursEl.textContent = String(volunteerStats.totalHours);
    }
}

function renderAttendedMissionsTable() {
    const tbody = document.getElementById("applicantMissionsBody");
    if (!tbody) return;

    renderVolunteerStats();

    const attended = getAttendedMissions();
    const n = attended.length;

    if (n === 0) {
        tbody.innerHTML = `
            <tr>
              <td colspan="4" class="vd-empty-cell">
                <i class="bi bi-calendar-x" aria-hidden="true"></i>
                No completed missions attended yet
              </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = attended
        .map((v) => {
            const missionLink = `/missions/details?id=${encodeURIComponent(v.missionId)}`;
            const desc = truncateDescription(v.missionDescription, 120);
            const fullDesc = (v.missionDescription || "").trim();

            return `
                <tr>
                    <td class="col-mission">
                        <a href="${missionLink}" class="mission-name-link">${escapeHtml(v.missionName)}</a>
                    </td>
                    <td class="col-date"><span class="mission-date-main">${escapeHtml(v.missionDate)}</span></td>
                    <td class="col-desc mission-desc-cell" ${fullDesc ? `title="${escapeHtml(fullDesc)}"` : ""}>${escapeHtml(desc)}</td>
                    <td class="col-action">
                        <a href="${missionLink}" class="mission-action-btn">View details</a>
                    </td>
                </tr>`;
        })
        .join("");
}

/** photoUrl from users/{id} — Cloudinary (or any https) URL used as-is after normalize. */
function normalizephotoUrl(photoUrl) {
    let raw = String(photoUrl ?? "").trim();
    if (!raw) return "";

    // Protocol-relative Cloudinary URLs: //res.cloudinary.com/...
    if (raw.startsWith("//")) {
        return `https:${raw}`;
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    // Stored without protocol, e.g. res.cloudinary.com/...
    if (/cloudinary\.com/i.test(raw)) {
        return `https://${raw.replace(/^\/+/, "")}`;
    }

    return raw;
}

async function loadApplicantProfile(userId) {
    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) {
            console.warn("[WARN] users/", userId, "not found");
            return null;
        }
        const u = snap.data();
        const photoUrl = normalizephotoUrl(u.photoUrl);

        return {
            name: u.name || u.displayName || "Volunteer",
            email: u.email || "",
            phone: u.phone || u.mobileNumber || u.mobile || "",
            occupation: u.occupation || "",
            photoUrl,
        };
    } catch (err) {
        console.error("[ERROR] loadApplicantProfile:", err);
        return null;
    }
}

function setDetailLoadingVisible(visible, message = "Loading volunteer…") {
    const loading = document.getElementById("detailLoading");
    const content = document.getElementById("detailContent");
    if (loading) {
        if (visible) {
            loading.hidden = false;
            loading.removeAttribute("hidden");
            loading.innerHTML = `
                <div class="detail-loading-inner">
                    <div class="detail-loading-spinner" aria-hidden="true"></div>
                    <span>${escapeHtml(message)}</span>
                </div>`;
        } else {
            loading.hidden = true;
            loading.setAttribute("hidden", "");
            loading.innerHTML = "";
        }
    }
    if (content) {
        if (visible) {
            content.hidden = true;
            content.setAttribute("hidden", "");
        } else {
            content.hidden = false;
            content.removeAttribute("hidden");
        }
    }
}

async function initPage(user) {
    applicantUserId = getUserIdFromUrl();
    if (!applicantUserId) {
        window.location.href = "/organization/volunteers";
        return;
    }

    setDetailLoadingVisible(true);

    try {
        const [profile, missionMap] = await Promise.all([
            loadApplicantProfile(applicantUserId),
            buildOrgMissionMap(user.uid),
        ]);

        orgMissionById = missionMap;
        missionHoursCache.clear();

        applicantApplications = await loadApplicantApplications(
            user.uid,
            applicantUserId
        );
        coordinatorOrgId = user.uid;
        await mergeApplicantFromOrgRosters(user.uid, applicantUserId);
        await mergeLedgerCompletedMissions(user.uid, applicantUserId);
        await mergeGlobalCompletedMissionsForTable(
            applicantUserId,
            user.uid
        );

        volunteerStats = await loadVolunteerStats(
            applicantUserId,
            user.uid
        );

        const nameEl = document.getElementById("applicantName");
        if (nameEl && profile?.name) {
            nameEl.dataset.fallback = profile.name;
        }

        if (profile && applicantApplications.length > 0) {
            applicantApplications[0].name =
                applicantApplications[0].name || profile.name;
            applicantApplications[0].email =
                applicantApplications[0].email || profile.email;
            applicantApplications[0].phone =
                applicantApplications[0].phone || profile.phone;
            applicantApplications[0].occupation =
                applicantApplications[0].occupation || profile.occupation;
        }

        renderProfile(profile);
        renderAttendedMissionsTable();
    } catch (err) {
        console.error("[ERROR] initPage:", err);
        const loading = document.getElementById("detailLoading");
        if (loading) {
            loading.hidden = false;
            loading.removeAttribute("hidden");
            loading.innerHTML =
                '<p class="detail-loading-error">Could not load volunteer details. Please refresh the page.</p>';
        }
        const content = document.getElementById("detailContent");
        if (content) {
            content.hidden = true;
            content.setAttribute("hidden", "");
        }
        return;
    }

    setDetailLoadingVisible(false);
}

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/organization/login";
            return;
        }
        await initPage(user);
    });
});
