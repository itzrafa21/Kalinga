import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import {
    STORAGE_MISSIONS_SUB,
    STORAGE_APPLICATIONS_ROOT,
    STORAGE_USERS_SUB,
    STORAGE_ORG_ROSTER,
    getApplicationDocRef,
    loadOrgApplications,
    applicationDedupeKey,
    syncMissionVolunteerRoster,
} from "./application-storage.js";
import {
    ORG_CACHE_KEYS,
    readOrgCache,
    writeOrgCache,
    isOrgCacheStale,
    invalidateOrgCache,
    missionDetailCacheKey,
    isLoadingTableHtml,
    tableHtmlForCache,
} from "./org-data-cache.js";

const userProfileCache = new Map();
let cachedOrgMissionById = null;
let cachedOrgMissionOrgId = null;

async function fetchUserFieldsForVolunteer(userId) {
    if (!userId) return {};
    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) return {};
        const u = snap.data();
        return {
            name: u.name || u.displayName || "",
            email: u.email || "",
            phone: u.phone || u.mobileNumber || u.mobile || "",
            occupation: u.occupation || "",
        };
    } catch (e) {
        console.warn("[WARNING] Could not load users/", userId, e);
        return {};
    }
}

async function prefetchUserProfiles(userIds) {
    const missing = [
        ...new Set(
            userIds.filter((id) => id && !userProfileCache.has(id))
        ),
    ];
    if (missing.length === 0) return;

    await Promise.all(
        missing.map(async (userId) => {
            const fields = await fetchUserFieldsForVolunteer(userId);
            userProfileCache.set(userId, fields);
        })
    );
}

function getCachedUserProfile(userId) {
    return userId ? userProfileCache.get(userId) || {} : {};
}

function showVolunteerTableLoading() {
    if (!volunteerTable) return;
    volunteerTable.innerHTML = `
        <tr class="missions-loading-row">
            <td colspan="4">
                <div class="missions-loading">
                    <div class="missions-loading-spinner" aria-hidden="true"></div>
                    <span>Loading volunteers…</span>
                </div>
            </td>
        </tr>`;
}

async function enrichVolunteersFromProfiles(volunteers) {
    const ids = [
        ...new Set(
            volunteers
                .filter((v) => {
                    if (!v.userId) return false;
                    const needsName =
                        !v.name || v.name === "N/A" || v.name.includes("…");
                    const needsEmail = !v.email || v.email === "N/A";
                    const needsPhone = !v.phone || v.phone === "N/A";
                    return needsName || needsEmail || needsPhone;
                })
                .map((v) => v.userId)
        ),
    ];
    await prefetchUserProfiles(ids);

    for (const v of volunteers) {
        if (!v.userId) continue;
        const p = getCachedUserProfile(v.userId);
        if (!v.name || v.name === "N/A" || v.name.includes("…")) {
            v.name = p.name || v.name;
        }
        if (!v.email || v.email === "N/A") {
            v.email = p.email || v.email;
        }
        if (!v.phone || v.phone === "N/A") {
            v.phone = p.phone || v.phone;
        }
        if (!v.occupation || v.occupation === "N/A") {
            v.occupation = p.occupation || v.occupation;
        }
        if (!v.name || v.name === "N/A") {
            v.name = `User ${v.userId.slice(0, 8)}…`;
        }
    }
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getAppliedDate(volunteer) {
    const raw = volunteer.appliedAt;
    if (!raw) return null;
    if (typeof raw.toDate === "function") return raw.toDate();
    if (raw.seconds != null) return new Date(raw.seconds * 1000);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function filterVolunteersByPeriod(volunteers, period) {
    if (!period || period === "all") return volunteers;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return volunteers.filter((v) => {
        const applied = getAppliedDate(v);
        if (!applied) {
            return period === "all" || period === "older" || period === "this_month";
        }

        if (period === "this_month") {
            return applied >= thisMonthStart;
        }
        if (period === "last_month") {
            return applied >= lastMonthStart && applied < thisMonthStart;
        }
        if (period === "older") {
            return applied < lastMonthStart;
        }
        return true;
    });
}

function groupVolunteersByApplicant(applications) {
    const byUser = new Map();

    for (const app of applications) {
        const key = app.userId || app.email || app.id;
        if (!byUser.has(key)) {
            byUser.set(key, {
                userId: app.userId || "",
                name: app.name,
                email: app.email,
                phone: app.phone,
                occupation: app.occupation,
                applications: [],
            });
        }
        const entry = byUser.get(key);
        entry.applications.push(app);
        // keep best profile fields
        if (app.name && app.name !== "N/A") entry.name = app.name;
        if (app.email && app.email !== "N/A") entry.email = app.email;
    }

    return Array.from(byUser.values()).map((a) => {
        const statuses = a.applications.map((x) =>
            (x.status || "").toLowerCase()
        );
        let summaryStatus = "approved";
        if (statuses.some((s) => s === "pending")) summaryStatus = "pending";
        else if (statuses.every((s) => s === "rejected")) summaryStatus = "rejected";
        else if (statuses.some((s) => s === "rejected")) summaryStatus = "mixed";

        return {
            ...a,
            missionCount: a.applications.length,
            summaryStatus,
        };
    });
}

function applyVolunteerFilters() {
    const period = filterSelect.value;
    const term = searchInput.value.toLowerCase().trim();

    let list = allApplicants.map((a) => ({
        ...a,
        // use latest application date for period filter
        appliedAt: a.applications.reduce((latest, app) => {
            const d = getAppliedDate(app);
            if (!d) return latest;
            return !latest || d > latest ? d : latest;
        }, null),
    }));

    list = filterVolunteersByPeriod(list, period);

    if (term) {
        list = list.filter(
            (a) =>
                (a.name && a.name.toLowerCase().includes(term)) ||
                (a.email && a.email.toLowerCase().includes(term))
        );
    }

    volunteerCurrentPage = 1;
    displayVolunteers(list);
    updateVolunteerCounts(list);
}

const AUTO_CLOSE_REASON =
    "Mission has ended. This application was closed automatically.";

function parseMissionEndDateTime(mission) {
    const endDate = mission.endDate || mission.date;
    const endTime = mission.endTime;
    if (!endDate || !endTime) return null;

    if (endTime.includes("AM") || endTime.includes("PM")) {
        const [time, period] = endTime.split(" ");
        const [hours, minutes] = time.split(":");
        let hour24 = parseInt(hours, 10);
        if (period === "AM") {
            if (hour24 === 12) hour24 = 0;
        } else if (period === "PM") {
            if (hour24 !== 12) hour24 += 12;
        }
        return new Date(
            `${endDate}T${String(hour24).padStart(2, "0")}:${minutes}`
        );
    }
    return new Date(`${endDate}T${endTime}`);
}

function isMissionCompleted(mission) {
    if (!mission) return false;
    const status = (mission.status || "").toLowerCase();
    if (status === "completed") return true;

    const end = parseMissionEndDateTime(mission);
    return end ? Date.now() > end.getTime() : false;
}

async function autoClosePendingApplications(orgMissionById) {
    let closedCount = 0;

    for (const [missionId, mission] of orgMissionById) {
        if (!isMissionCompleted(mission)) continue;

        const pending = allVolunteers.filter(
            (v) =>
                v.missionId === missionId &&
                (v.status || "").toLowerCase() === "pending"
        );

        for (const volunteer of pending) {
            try {
                await updateDoc(getApplicationDocRef(volunteer), {
                    status: "closed",
                    closedAt: new Date(),
                    closeReason: AUTO_CLOSE_REASON,
                    updatedAt: new Date(),
                });

                volunteer.status = "closed";
                volunteer.closeReason = AUTO_CLOSE_REASON;
                closedCount++;
            } catch (err) {
                console.error(
                    "[ERROR] auto-close application",
                    volunteer.id,
                    err
                );
            }
        }
    }

    if (closedCount > 0) {
        console.log(
            `[INFO] Auto-closed ${closedCount} pending application(s) for completed missions`
        );
    }
}

function missionHasAutoAccept(mission) {
    return mission?.autoAcceptVolunteers === true;
}

async function syncApplicationStatusToCopies(volunteer, missionId, payload, orgId) {
    if (!volunteer.userId) return;

    try {
        if (
            volunteer.storage === STORAGE_USERS_SUB ||
            volunteer.storage === STORAGE_ORG_ROSTER
        ) {
            const missionSnap = await getDocs(
                query(
                    collection(db, "missions", missionId, "applications"),
                    where("userId", "==", volunteer.userId)
                )
            );
            for (const mDoc of missionSnap.docs) {
                await updateDoc(mDoc.ref, payload);
            }
        } else {
            const userSnap = await getDocs(
                query(
                    collection(db, "users", volunteer.userId, "applications"),
                    where("missionId", "==", missionId)
                )
            );
            for (const uDoc of userSnap.docs) {
                await updateDoc(uDoc.ref, payload);
            }
        }
    } catch (syncErr) {
        console.warn("[WARN] sync application status:", syncErr);
    }

    const resolvedOrgId =
        orgId ||
        volunteer.orgId ||
        allMissions.find((m) => m.id === missionId)?.orgId ||
        currentUser?.uid;
    await syncMissionVolunteerRoster(
        resolvedOrgId,
        missionId,
        volunteer.userId,
        payload.status,
        { ...volunteer, ...payload },
        { applicationId: volunteer.id }
    );
}

async function autoAcceptPendingApplications(orgMissionById) {
    let acceptedCount = 0;

    for (const [missionId, mission] of orgMissionById) {
        if (!missionHasAutoAccept(mission)) continue;
        if (isMissionCompleted(mission)) continue;

        const pending = allVolunteers.filter(
            (v) =>
                v.missionId === missionId &&
                (v.status || "").toLowerCase() === "pending"
        );

        for (const volunteer of pending) {
            try {
                const payload = {
                    status: "approved",
                    approvedAt: new Date(),
                    updatedAt: new Date(),
                };

                await updateDoc(getApplicationDocRef(volunteer), payload);
                await syncApplicationStatusToCopies(
                    volunteer,
                    missionId,
                    payload,
                    mission.orgId || currentUser?.uid
                );

                volunteer.status = "approved";
                acceptedCount++;
            } catch (err) {
                console.error(
                    "[ERROR] auto-accept application",
                    volunteer.id,
                    err
                );
            }
        }
    }

    if (acceptedCount > 0) {
        console.log(
            `[INFO] Auto-accepted ${acceptedCount} pending application(s) for auto-accept missions`
        );
    }
}

// Elements
const volunteerTable = document.getElementById("volunteerTableBody");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const modalBody = document.getElementById("modalBody");

let allVolunteers = [];
let allApplicants = []; // one entry per userId
let allMissions = [];
let currentUser = null;
let volunteerPageSize = 10;
let volunteerCurrentPage = 1;

let rejectModalContext = { applicationId: null, missionId: null };

function getVolunteerStatusSuccessCopy(status) {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
        return {
            title: "Application approved",
            message: "The volunteer application was approved successfully.",
        };
    }
    if (s === "rejected") {
        return {
            title: "Application rejected",
            message: "The volunteer application was rejected.",
        };
    }
    return {
        title: "Status updated",
        message: `Volunteer application ${s} successfully.`,
    };
}

function openVolunteerStatusSuccessModal(status) {
    const overlay = document.getElementById("volunteerStatusSuccessModal");
    const titleEl = document.getElementById("volunteerStatusSuccessTitle");
    const messageEl = document.getElementById("volunteerStatusSuccessMessage");
    if (!overlay || !titleEl || !messageEl) return;

    const copy = getVolunteerStatusSuccessCopy(status);
    titleEl.textContent = copy.title;
    messageEl.textContent = copy.message;

    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.getElementById("volunteerStatusSuccessOk")?.focus();
}

function closeVolunteerStatusSuccessModal() {
    const overlay = document.getElementById("volunteerStatusSuccessModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
}

(function initVolunteerStatusSuccessModal() {
    const overlay = document.getElementById("volunteerStatusSuccessModal");
    if (!overlay) return;

    const close = () => closeVolunteerStatusSuccessModal();

    document.getElementById("volunteerStatusSuccessOk")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
})();

function openRejectModal(applicationId, missionId) {
    rejectModalContext = { applicationId, missionId };
    const overlay = document.getElementById("rejectReasonModal");
    const textarea = document.getElementById("rejectReasonInput");
    const err = document.getElementById("rejectReasonError");
    if (!overlay || !textarea) return;
    textarea.value = "";
    if (err) err.textContent = "";
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    textarea.focus();
}

function closeRejectModal() {
    const overlay = document.getElementById("rejectReasonModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
    rejectModalContext = { applicationId: null, missionId: null };
}

function confirmRejectFromModal() {
    const textarea = document.getElementById("rejectReasonInput");
    const err = document.getElementById("rejectReasonError");
    const trimmed = (textarea?.value || "").trim();
    if (!trimmed) {
        if (err) err.textContent = "A rejection reason is required.";
        textarea?.focus();
        return;
    }
    if (err) err.textContent = "";
    const { applicationId, missionId } = rejectModalContext;
    if (!applicationId || !missionId) return;
    closeRejectModal();
    updateApplicationStatus(applicationId, missionId, "rejected", {
        rejectionReason: trimmed,
    });
}

(function initRejectReasonModal() {
    const overlay = document.getElementById("rejectReasonModal");
    if (!overlay) return;
    document.getElementById("rejectModalCancel")?.addEventListener("click", closeRejectModal);
    document.getElementById("rejectModalConfirm")?.addEventListener("click", confirmRejectFromModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeRejectModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) closeRejectModal();
    });
})();

async function loadSidebarUser(user) {
    try {
        const orgSnap = await getDoc(doc(db, "organizations", user.uid));
        const data = orgSnap.exists() ? orgSnap.data() : {};

        const displayName =
            (data.name && String(data.name).trim()) ||
            (data.orgName && String(data.orgName).trim()) ||
            user.displayName ||
            user.email ||
            "Organization";

        const sidebarNameEl = document.getElementById("sidebarUserName");
        const sidebarInitialEl = document.getElementById("sidebarUserInitial");
        const avatarWrap = document.querySelector(".sidebar-user-avatar");
        const avatarImg = document.getElementById("sidebarUserAvatarImg");

        if (sidebarNameEl) sidebarNameEl.textContent = displayName;
        if (sidebarInitialEl) {
            const ch = String(displayName).trim().charAt(0);
            sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
        }

        if (avatarWrap && avatarImg) {
            const pic = data.profilePictureBase64 || data.profilePictureURL || "";
            if (pic) {
                avatarImg.src = pic;
                avatarWrap.classList.add("has-photo");
            } else {
                avatarImg.removeAttribute("src");
                avatarWrap.classList.remove("has-photo");
            }
        }
    } catch (err) {
        console.error("[ERROR] loadSidebarUser:", err);
    }
}
// Wait for authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("[WARNING] No user authenticated, redirecting to login");
        window.location.href = "/organization/login";
        return;
    }
    
    currentUser = user;

    const cached = readOrgCache(user.uid, ORG_CACHE_KEYS.VOLUNTEERS);
    if (cached) {
        allVolunteers = cached.payload.allVolunteers || [];
        allApplicants = groupVolunteersByApplicant(allVolunteers);
        const cachedHtml = cached.payload.tableHtml || "";
        if (
            volunteerTable &&
            cachedHtml &&
            !isLoadingTableHtml(cachedHtml)
        ) {
            volunteerTable.innerHTML = cachedHtml;
            applyVolunteerPagination();
        } else {
            applyVolunteerFilters();
        }
        initVolunteerPaginationControls();
    } else {
        showVolunteerTableLoading();
    }

    void loadSidebarUser(user);

    const stillShowingLoading =
        volunteerTable && isLoadingTableHtml(volunteerTable.innerHTML);

    await loadVolunteers({
        refresh: stillShowingLoading || !cached,
        background: Boolean(cached) && !stillShowingLoading,
    });

    if (
        cached &&
        !stillShowingLoading &&
        isOrgCacheStale(user.uid, ORG_CACHE_KEYS.VOLUNTEERS)
    ) {
        void loadVolunteers({ refresh: true, background: true });
    }
});

async function buildOrgMissionMap(orgId, { forceRefresh = false } = {}) {
    if (
        !forceRefresh &&
        cachedOrgMissionById &&
        cachedOrgMissionOrgId === orgId
    ) {
        return cachedOrgMissionById;
    }

    const map = new Map();

    const mergeMission = (id, data) => {
        const prev = map.get(id);
        map.set(id, {
            ...(prev || {}),
            ...data,
            missionName:
                data.missionName ||
                data.name ||
                data.title ||
                prev?.missionName ||
                "Mission",
            orgId: data.orgId || data.organizationId || prev?.orgId || orgId,
        });
    };

    const cachedMap = readOrgCache(orgId, ORG_CACHE_KEYS.ORG_MISSIONS_MAP);
    if (!forceRefresh && cachedMap?.payload?.entries?.length) {
        cachedMap.payload.entries.forEach(([id, data]) => mergeMission(id, data));
        cachedOrgMissionById = map;
        cachedOrgMissionOrgId = orgId;
        return map;
    }

    const [orgMissionsResult, historyResult] = await Promise.allSettled([
        getDocs(collection(db, "organizations", orgId, "missions")),
        getDocs(collection(db, "organizations", orgId, "history")),
    ]);

    if (orgMissionsResult.status === "fulfilled") {
        orgMissionsResult.value.docs.forEach((missionDoc) => {
            mergeMission(missionDoc.id, missionDoc.data());
        });
    } else {
        console.warn("[WARN] organizations/missions:", orgMissionsResult.reason);
    }

    if (historyResult.status === "fulfilled") {
        historyResult.value.docs.forEach((missionDoc) => {
            mergeMission(missionDoc.id, missionDoc.data());
        });
    } else {
        console.warn("[WARN] organizations/history:", historyResult.reason);
    }

    cachedOrgMissionById = map;
    cachedOrgMissionOrgId = orgId;

    writeOrgCache(orgId, ORG_CACHE_KEYS.ORG_MISSIONS_MAP, {
        entries: Array.from(map.entries()),
    });

    return map;
}

function pushVolunteerFromApplication(
    docSnap,
    application,
    missionId,
    mission,
    storage,
    applicationUserId = null
) {
    const userId = application.userId || applicationUserId || "";
    let name = application.displayName || application.name || "";
    let email = application.email || "";
    let phone =
        application.mobileNumber ||
        application.phone ||
        application.mobile ||
        "";
    let occupation = application.occupation || "";

    if ((!name || !email) && userId) {
        const profile = getCachedUserProfile(userId);
        name = name || profile.name || "";
        email = email || profile.email || "";
        phone = phone || profile.phone || "";
        occupation = occupation || profile.occupation || "";
    }

    allVolunteers.push({
        orgId: mission?.orgId || mission?.organizationId || application.orgId || "",
        id: docSnap.id,
        storage,
        name: name || (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
        email: email || "N/A",
        phone: phone || "N/A",
        occupation: occupation || "N/A",
        status: application.status || "pending",
        appliedAt:
            application.appliedAt ||
            application.createdAt ||
            application.approvedAt ||
            null,
        missionId,
        missionName: mission?.missionName || mission?.name || "N/A",
        userId,
        rejectionReason: application.rejectionReason || "",
        closeReason: application.closeReason || "",
        userApplicationId: application.userApplicationId || "",
    });
}

function pushVolunteerFromRoster(docSnap, data, missionId, mission, orgId) {
    const userId = data.userId || docSnap.id;
    let name = data.displayName || data.name || "";
    let email = data.email || "";
    let phone = data.mobileNumber || data.phone || data.mobile || "";
    let occupation = data.occupation || "";

    if ((!name || !email) && userId) {
        const profile = getCachedUserProfile(userId);
        name = name || profile.name || "";
        email = email || profile.email || "";
        phone = phone || profile.phone || "";
        occupation = occupation || profile.occupation || "";
    }

    const appId = data.applicationId || data.userApplicationId || "";

    allVolunteers.push({
        orgId: orgId || data.orgId || mission?.orgId || mission?.organizationId || "",
        id: appId || docSnap.id,
        userApplicationId: data.userApplicationId || data.applicationId || appId,
        storage: STORAGE_ORG_ROSTER,
        name: name || (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
        email: email || "N/A",
        phone: phone || "N/A",
        occupation: occupation || "N/A",
        status: data.status || "approved",
        appliedAt: data.appliedAt || data.approvedAt || null,
        missionId,
        missionName:
            data.missionName || mission?.missionName || mission?.name || "N/A",
        userId,
        rejectionReason: data.rejectionReason || "",
        closeReason: data.closeReason || "",
    });
}

async function loadOrgMissionVolunteerRosters(orgId, orgMissionById, dedupe) {
    const missionEntries = [...orgMissionById.entries()];

    const rosterSnaps = await Promise.all(
        missionEntries.map(async ([missionId, mission]) => {
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
                return { missionId, mission, rosterSnap, error: null };
            } catch (err) {
                console.warn(
                    "[WARN] organizations/",
                    orgId,
                    "/missions/",
                    missionId,
                    "/volunteers:",
                    err
                );
                return { missionId, mission, rosterSnap: null, error: err };
            }
        })
    );

    for (const { missionId, mission, rosterSnap } of rosterSnaps) {
        if (!rosterSnap) continue;
        for (const docSnap of rosterSnap.docs) {
            const data = docSnap.data();
            const userId = data.userId || docSnap.id;
            const key = applicationDedupeKey(missionId, userId, docSnap.id);
            if (dedupe.has(key)) continue;
            dedupe.add(key);
            pushVolunteerFromRoster(
                docSnap,
                data,
                missionId,
                mission,
                orgId
            );
        }
    }
}

function shouldSkipApplicationLoad(dedupe, missionId, userId) {
    const key = applicationDedupeKey(missionId, userId, "");
    return dedupe.has(key);
}

async function loadMissionSubcollectionApplications(orgMissionById, dedupe) {
    const missionEntries = [...orgMissionById.entries()];

    const applicationSnaps = await Promise.all(
        missionEntries.map(async ([missionId, mission]) => {
            try {
                const applicationsSnapshot = await getDocs(
                    collection(db, "missions", missionId, "applications")
                );
                return { missionId, mission, applicationsSnapshot, error: null };
            } catch (missionError) {
                console.error(
                    "[ERROR] missions/",
                    missionId,
                    "/applications",
                    missionError
                );
                return { missionId, mission, applicationsSnapshot: null, error: missionError };
            }
        })
    );

    for (const { missionId, mission, applicationsSnapshot } of applicationSnaps) {
        if (!applicationsSnapshot) continue;
        for (const docSnap of applicationsSnapshot.docs) {
            const application = docSnap.data();
            const userId = application.userId || "";
            if (shouldSkipApplicationLoad(dedupe, missionId, userId)) continue;
            const key = applicationDedupeKey(missionId, userId, docSnap.id);
            dedupe.add(key);
            pushVolunteerFromApplication(
                docSnap,
                application,
                missionId,
                mission,
                STORAGE_MISSIONS_SUB
            );
        }
    }
}

function syncAllMissionsFromMap(orgMissionById) {
    allMissions = Array.from(orgMissionById.entries()).map(([id, m]) => ({
        id,
        ...m,
    }));
}

async function loadVolunteers({
    silent = false,
    refresh = true,
    background = false,
} = {}) {
    const orgId = currentUser?.uid;
    if (!orgId) return;

    const cached = readOrgCache(orgId, ORG_CACHE_KEYS.VOLUNTEERS);
    const hasCache = cached !== null;

    const stillShowingLoading =
        volunteerTable && isLoadingTableHtml(volunteerTable.innerHTML);

    if (hasCache && !refresh && !stillShowingLoading) {
        return;
    }

    if (
        hasCache &&
        !background &&
        !stillShowingLoading &&
        !isOrgCacheStale(orgId, ORG_CACHE_KEYS.VOLUNTEERS)
    ) {
        return;
    }

    if (!hasCache && !silent && !background) {
        showVolunteerTableLoading();
    }

    try {
        console.log(
            "[INFO] Loading volunteers: org mission rosters, then pending applications"
        );
        allVolunteers = [];

        const orgMissionById = await buildOrgMissionMap(orgId);
        syncAllMissionsFromMap(orgMissionById);
        console.log("[INFO] Org missions for volunteer load:", orgMissionById.size);

        const dedupe = new Set();

        const [, , orgAppsResult] = await Promise.all([
            loadOrgMissionVolunteerRosters(orgId, orgMissionById, dedupe),
            loadMissionSubcollectionApplications(orgMissionById, dedupe),
            loadOrgApplications(
                orgMissionById,
                (entry) => {
                    const userId =
                        entry.data.userId || entry.applicationUserId || "";
                    if (shouldSkipApplicationLoad(dedupe, entry.missionId, userId)) {
                        return;
                    }
                    const key = applicationDedupeKey(
                        entry.missionId,
                        userId,
                        entry.docSnap.id
                    );
                    dedupe.add(key);
                    pushVolunteerFromApplication(
                        entry.docSnap,
                        entry.data,
                        entry.missionId,
                        entry.mission,
                        entry.storage,
                        entry.applicationUserId
                    );
                },
                orgId
            ),
        ]);

        console.log("[INFO] Assigned volunteers from org rosters:", dedupe.size);
        console.log("[INFO] Application load stats:", orgAppsResult);

        await enrichVolunteersFromProfiles(allVolunteers);

        allApplicants = groupVolunteersByApplicant(allVolunteers);
        console.log(
            "[SUCCESS] Applicants:",
            allApplicants.length,
            "applications:",
            allVolunteers.length
        );
        applyVolunteerFilters();
        initVolunteerPaginationControls();

        writeOrgCache(orgId, ORG_CACHE_KEYS.VOLUNTEERS, {
            allVolunteers,
            tableHtml: tableHtmlForCache(volunteerTable?.innerHTML),
        });

        if (!background) {
            setTimeout(() => {
                void runVolunteerMaintenance(orgMissionById);
            }, 1500);
        }
    } catch (error) {
        console.error("Error loading volunteers:", error);
        allApplicants = groupVolunteersByApplicant(allVolunteers);
        applyVolunteerFilters();
    } finally {
        if (volunteerTable && isLoadingTableHtml(volunteerTable.innerHTML)) {
            applyVolunteerFilters();
        }
    }
}

async function runVolunteerMaintenance(orgMissionById) {
    try {
        await autoAcceptPendingApplications(orgMissionById);
        await autoClosePendingApplications(orgMissionById);
        allApplicants = groupVolunteersByApplicant(allVolunteers);
        applyVolunteerFilters();
    } catch (err) {
        console.warn("[WARN] volunteer maintenance:", err);
    }
}

// Update volunteer summary cards using correct IDs
function updateVolunteerCounts(volunteers) {
    console.log("[INFO] Updating volunteer counts for:", volunteers.length, "volunteers");
    
    // Count volunteers by status
    const totalVolunteers = volunteers.length;
    const pendingVolunteers = volunteers.filter(
        (v) => (v.summaryStatus || v.status || "").toLowerCase() === "pending"
    ).length;
    const approvedVolunteers = volunteers.filter(
        (v) => (v.summaryStatus || v.status || "").toLowerCase() === "approved"
    ).length;
    
    console.log("[INFO] Counts - Total:", totalVolunteers, "Pending:", pendingVolunteers, "Approved:", approvedVolunteers);
    
    // Use the correct IDs from the HTML
    const totalElement = document.getElementById("totalVolunteers");
    const pendingElement = document.getElementById("pendingVolunteers");
    const approvedElement = document.getElementById("approvedVolunteers");

    if (totalElement) {
        totalElement.textContent = totalVolunteers;
        console.log("[SUCCESS] Updated total volunteers:", totalVolunteers);
    } else {
        console.log("[ERROR] Could not find totalVolunteers element");
    }
    
    if (pendingElement) {
        pendingElement.textContent = pendingVolunteers;
        console.log("[SUCCESS] Updated pending volunteers:", pendingVolunteers);
    } else {
        console.log("[ERROR] Could not find pendingVolunteers element");
    }
    
    if (approvedElement) {
        approvedElement.textContent = approvedVolunteers;
        console.log("[SUCCESS] Updated approved volunteers:", approvedVolunteers);
    } else {
        console.log("[ERROR] Could not find approvedVolunteers element");
    }
}

function getVisibleVolunteerRows() {
    if (!volunteerTable) return [];
    return Array.from(volunteerTable.querySelectorAll("tr.volunteer-application-row"));
}

function applyVolunteerPagination() {
    const allVisible = getVisibleVolunteerRows();
    const total = allVisible.length;
    const totalPages = Math.max(1, Math.ceil(total / volunteerPageSize));

    if (volunteerCurrentPage > totalPages) volunteerCurrentPage = totalPages;
    if (volunteerCurrentPage < 1) volunteerCurrentPage = 1;

    const start = (volunteerCurrentPage - 1) * volunteerPageSize;
    const end = start + volunteerPageSize;

    allVisible.forEach((tr) => tr.classList.remove("volunteer-row-paged-out"));
    allVisible.forEach((tr, index) => {
        if (index < start || index >= end) {
            tr.classList.add("volunteer-row-paged-out");
        }
    });

    const prevBtn = document.getElementById("volunteerPrevPage");
    const nextBtn = document.getElementById("volunteerNextPage");
    const pageInfo = document.getElementById("volunteerPageInfo");

    if (prevBtn) prevBtn.disabled = volunteerCurrentPage <= 1 || total === 0;
    if (nextBtn) nextBtn.disabled = volunteerCurrentPage >= totalPages || total === 0;
    if (pageInfo) pageInfo.textContent = `Page ${volunteerCurrentPage} of ${totalPages}`;

    const countEl = document.getElementById("volunteerCountText");
    if (countEl) {
        if (total === 0) {
            countEl.textContent = "Showing 0 applications";
        } else {
            const from = start + 1;
            const to = Math.min(end, total);
            countEl.textContent =
                total === 1
                    ? "Showing 1 application"
                    : `Showing ${from}–${to} of ${total} applications`;
        }
    }
}

function initVolunteerPaginationControls() {
    const sizeSelect = document.getElementById("volunteerPageSize");
    const prevBtn = document.getElementById("volunteerPrevPage");
    const nextBtn = document.getElementById("volunteerNextPage");

    if (sizeSelect && !sizeSelect.dataset.bound) {
        sizeSelect.dataset.bound = "1";
        sizeSelect.addEventListener("change", () => {
            volunteerPageSize = parseInt(sizeSelect.value, 10) || 10;
            volunteerCurrentPage = 1;
            applyVolunteerPagination();
        });
    }

    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = "1";
        prevBtn.addEventListener("click", () => {
            if (volunteerCurrentPage > 1) {
                volunteerCurrentPage--;
                applyVolunteerPagination();
            }
        });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = "1";
        nextBtn.addEventListener("click", () => {
            volunteerCurrentPage++;
            applyVolunteerPagination();
        });
    }
}

async function updateApplicationStatus(applicationId, missionId, newStatus, options = {}) {
    try {
        const rejectionReason = (options.rejectionReason || "").trim();
        console.log(`[INFO] Updating application ${applicationId} status to: ${newStatus}`);

        const volunteer = allVolunteers.find(
            (v) => v.id === applicationId && v.missionId === missionId
        );
        if (!volunteer) {
            alert("Application not found. Refresh the page and try again.");
            return;
        }

        const payload = {
            status: newStatus,
            updatedAt: new Date(),
        };

        if (newStatus === "rejected") {
            payload.rejectionReason = rejectionReason;
            payload.rejectedAt = new Date();
        }

        if (newStatus === "approved" || newStatus === "accepted") {
            payload.approvedAt = new Date();
        }

        await updateDoc(getApplicationDocRef(volunteer), payload);

        const resolvedOrgId =
            volunteer.orgId ||
            allMissions.find((m) => m.id === missionId)?.orgId ||
            currentUser?.uid;

        await syncApplicationStatusToCopies(
            volunteer,
            missionId,
            payload,
            resolvedOrgId
        );

        if (volunteer) {
            volunteer.status = newStatus;
            if (newStatus === "rejected") {
                volunteer.rejectionReason = rejectionReason;
            }
        }

        volunteerCurrentPage = 1;
        applyVolunteerFilters();

        if (currentUser?.uid) {
            writeOrgCache(currentUser.uid, ORG_CACHE_KEYS.VOLUNTEERS, {
                allVolunteers,
                tableHtml: tableHtmlForCache(volunteerTable?.innerHTML),
            });
            invalidateOrgCache(
                currentUser.uid,
                missionDetailCacheKey(volunteer.missionId)
            );
        }

        openVolunteerStatusSuccessModal(newStatus);
    } catch (error) {
        console.error("[ERROR] Error updating application status:", error);
        alert(`[ERROR] Failed to ${newStatus} application. Please try again.`);
    }
}

function displayVolunteers(applicants) {
    if (!volunteerTable) return;
    volunteerTable.innerHTML = "";

    if (applicants.length === 0) {
        volunteerTable.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="missions-empty">
                        <i class="bi bi-people"></i>
                        <h4>No volunteers found</h4>
                        <p>Applications will appear here when volunteers apply to your missions.</p>
                    </div>
                </td>
            </tr>`;
        volunteerCurrentPage = 1;
        applyVolunteerPagination();
        return;
    }

    applicants.forEach((a) => {
        const row = document.createElement("tr");
        row.classList.add("volunteer-application-row");

        const viewUrl = a.userId
            ? `/organization/volunteers/details?userId=${encodeURIComponent(a.userId)}`
            : "#";

        row.innerHTML = `
            <td class="col-name"><span class="volunteer-name">${escapeHtml(a.name || "N/A")}</span></td>
            <td class="col-email">${escapeHtml(a.email || "N/A")}</td>
            <td class="col-phone">${escapeHtml(a.phone || "N/A")}</td>
            <td class="col-actions">
                <a href="${viewUrl}" class="mission-action-btn">
                    <i class="bi bi-eye"></i> View details
                </a>
            </td>`;
        volunteerTable.appendChild(row);
    });

    applyVolunteerPagination();
}

// Status badge class function with better styling
function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return 'pending-badge';
        case 'mixed': return 'unknown-badge';
        case 'approved': return 'approved-badge';
        case 'rejected': return 'rejected-badge';
        case 'closed': return 'closed-badge';
        default: return 'unknown-badge';
    }
}

// Function to get status icons
function getStatusIcon(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return '<i class="fas fa-clock"></i>';
        case 'approved': return '<i class="fas fa-check-circle"></i>';
        case 'rejected': return '<i class="fas fa-times-circle"></i>';
        case 'closed': return '<i class="fas fa-ban"></i>';
        default: return '<i class="fas fa-question-circle"></i>';
    }
}

searchInput.addEventListener("input", () => {
    applyVolunteerFilters();
});

filterSelect.addEventListener("change", () => {
    applyVolunteerFilters();
});