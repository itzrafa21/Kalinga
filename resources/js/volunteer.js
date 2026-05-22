import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import {
    STORAGE_MISSIONS_SUB,
    STORAGE_APPLICATIONS_ROOT,
    STORAGE_USERS_SUB,
    getApplicationDocRef,
    loadOrgApplications,
    applicationDedupeKey,
} from "./application-storage.js";

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

function applyVolunteerFilters() {
    const period = filterSelect.value;
    const term = searchInput.value.toLowerCase().trim();

    let list = filterVolunteersByPeriod(allVolunteers, period);

    if (term) {
        list = list.filter(
            (v) =>
                (v.name && v.name.toLowerCase().includes(term)) ||
                (v.email && v.email.toLowerCase().includes(term))
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

async function syncApplicationStatusToCopies(volunteer, missionId, payload) {
    if (!volunteer.userId) return;

    try {
        if (volunteer.storage === STORAGE_USERS_SUB) {
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
                await syncApplicationStatusToCopies(volunteer, missionId, payload);

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
    await loadSidebarUser(user);
    console.log("[SUCCESS] Logged in as:", user.uid);
    console.log("[SUCCESS] User email:", user.email);
    
    // Load missions and volunteers
    await loadMissions(user.uid);
    await loadVolunteers();
});

async function buildOrgMissionMap(orgId) {
    const map = new Map();

    const addMission = (id, data) => {
        map.set(id, {
            ...data,
            missionName: data.missionName || data.name || data.title || "Mission",
            orgId: data.orgId || data.organizationId || orgId,
        });
    };

    try {
        const missionsSnap = await getDocs(collection(db, "missions"));
        missionsSnap.docs.forEach((missionDoc) => {
            const mission = missionDoc.data();
            if (mission.orgId === orgId) {
                addMission(missionDoc.id, mission);
            }
        });
    } catch (err) {
        console.error("[ERROR] loading missions collection:", err);
    }

    try {
        const orgMissionsSnap = await getDocs(
            collection(db, "organizations", orgId, "missions")
        );
        orgMissionsSnap.docs.forEach((missionDoc) => {
            if (!map.has(missionDoc.id)) {
                addMission(missionDoc.id, missionDoc.data());
            }
        });
    } catch (err) {
        console.warn("[WARN] organizations/missions:", err);
    }

    try {
        const historySnap = await getDocs(
            collection(db, "organizations", orgId, "history")
        );
        historySnap.docs.forEach((missionDoc) => {
            if (!map.has(missionDoc.id)) {
                addMission(missionDoc.id, missionDoc.data());
            }
        });
    } catch (err) {
        console.warn("[WARN] organizations/history:", err);
    }

    return map;
}

async function pushVolunteerFromApplication(
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
        const profile = await fetchUserFieldsForVolunteer(userId);
        name = name || profile.name || "";
        email = email || profile.email || "";
        phone = phone || profile.phone || "";
        occupation = occupation || profile.occupation || "";
    }

    allVolunteers.push({
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
    });
}

async function loadMissionSubcollectionApplications(orgMissionById, dedupe) {
    for (const [missionId, mission] of orgMissionById) {
        try {
            const applicationsSnapshot = await getDocs(
                collection(db, "missions", missionId, "applications")
            );
            for (const docSnap of applicationsSnapshot.docs) {
                const application = docSnap.data();
                const userId = application.userId || "";
                const key = applicationDedupeKey(missionId, userId, docSnap.id);
                if (dedupe.has(key)) continue;
                dedupe.add(key);
                await pushVolunteerFromApplication(
                    docSnap,
                    application,
                    missionId,
                    mission,
                    STORAGE_MISSIONS_SUB
                );
            }
        } catch (missionError) {
            console.error(
                "[ERROR] missions/",
                missionId,
                "/applications",
                missionError
            );
        }
    }
}

async function loadMissions(user) {
    try {
        const orgMissionById = await buildOrgMissionMap(user);
        allMissions = Array.from(orgMissionById.entries()).map(([id, m]) => ({
            id,
            ...m,
        }));
        console.log("[SUCCESS] Org missions cached:", allMissions.length);
    } catch (error) {
        console.error("[ERROR] Error loading missions:", error);
    }
}

async function loadVolunteers() {
    try {
        console.log(
            "[INFO] Loading volunteers: missions, users, root applications, org history"
        );
        allVolunteers = [];

        const orgId = currentUser.uid;
        const orgMissionById = await buildOrgMissionMap(orgId);
        console.log("[INFO] Org missions for volunteer load:", orgMissionById.size);

        const dedupe = new Set();

        await loadMissionSubcollectionApplications(orgMissionById, dedupe);

        const loadStats = await loadOrgApplications(
            orgMissionById,
            async (entry) => {
                const userId =
                    entry.data.userId || entry.applicationUserId || "";
                const key = applicationDedupeKey(
                    entry.missionId,
                    userId,
                    entry.docSnap.id
                );
                if (dedupe.has(key)) return;
                dedupe.add(key);
                await pushVolunteerFromApplication(
                    entry.docSnap,
                    entry.data,
                    entry.missionId,
                    entry.mission,
                    entry.storage,
                    entry.applicationUserId
                );
            },
            orgId
        );
        console.log("[INFO] Application load stats:", loadStats);

        await autoAcceptPendingApplications(orgMissionById);
        await autoClosePendingApplications(orgMissionById);

        console.log("[SUCCESS] Total volunteers loaded:", allVolunteers.length);
        applyVolunteerFilters();
        initVolunteerPaginationControls();
    } catch (error) {
        console.error("Error loading volunteers:", error);
        applyVolunteerFilters();
    }
}

// Update volunteer summary cards using correct IDs
function updateVolunteerCounts(volunteers) {
    console.log("[INFO] Updating volunteer counts for:", volunteers.length, "volunteers");
    
    // Count volunteers by status
    const totalVolunteers = volunteers.length;
    const pendingVolunteers = volunteers.filter(v => (v.status || '').toLowerCase() === 'pending').length;
    const approvedVolunteers = volunteers.filter(v => (v.status || '').toLowerCase() === 'approved').length;
    
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

        await updateDoc(getApplicationDocRef(volunteer), payload);

        if (volunteer.userId) {
            try {
                if (volunteer.storage === STORAGE_USERS_SUB) {
                    const missionSnap = await getDocs(
                        query(
                            collection(
                                db,
                                "missions",
                                missionId,
                                "applications"
                            ),
                            where("userId", "==", volunteer.userId)
                        )
                    );
                    for (const mDoc of missionSnap.docs) {
                        await updateDoc(mDoc.ref, payload);
                    }
                } else {
                    const userSnap = await getDocs(
                        query(
                            collection(
                                db,
                                "users",
                                volunteer.userId,
                                "applications"
                            ),
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
        }

        if (volunteer) {
            volunteer.status = newStatus;
            if (newStatus === "rejected") {
                volunteer.rejectionReason = rejectionReason;
            }
        }

        volunteerCurrentPage = 1;
        applyVolunteerFilters();

        openVolunteerStatusSuccessModal(newStatus);
    } catch (error) {
        console.error("[ERROR] Error updating application status:", error);
        alert(`[ERROR] Failed to ${newStatus} application. Please try again.`);
    }
}

// Fixed displayVolunteers function with better styling
function displayVolunteers(volunteers) {
    if (!volunteerTable) return;

    volunteerTable.innerHTML = "";

    if (volunteers.length === 0) {
        volunteerTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No volunteers found</td></tr>`;
        volunteerCurrentPage = 1;
        applyVolunteerPagination();
        return;
    }

    volunteers.forEach((v) => {
        const row = document.createElement("tr");
        row.classList.add("volunteer-application-row");
        
        // Create action buttons with better styling
        let actionButtons = '';
        const normalizedStatus = (v.status || '').toLowerCase();
        
        if (normalizedStatus === 'pending') {
            actionButtons = `
                <button class="action-btn accept-btn" data-id="${v.id}" data-mission-id="${v.missionId}" title="Accept Application">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="action-btn reject-btn" data-id="${v.id}" data-mission-id="${v.missionId}" title="Reject Application">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else if (normalizedStatus === 'approved') {
            actionButtons = `
                <span class="status-badge approved-badge">
                    <i class="fas fa-check-circle"></i> Accepted
                </span>
            `;
        } else if (normalizedStatus === 'rejected') {
            actionButtons = `
                <span class="status-badge rejected-badge">
                    <i class="fas fa-times-circle"></i> Rejected
                </span>
            `;
        } else if (normalizedStatus === 'closed') {
            actionButtons = `
                <span class="status-badge closed-badge">
                    <i class="fas fa-ban"></i> Closed
                </span>
            `;
        } else {
            actionButtons = `
                <span class="status-badge unknown-badge">
                    <i class="fas fa-question-circle"></i> Unknown
                </span>
            `;
        }
        
        // Fixed table structure with better styling
        row.innerHTML = `
            <td>${v.name || "N/A"}</td>
            <td>${v.email || "N/A"}</td>
            <td>${v.phone || "N/A"}</td>
            <td>${v.occupation || "N/A"}</td>
            <td>${v.missionName || "N/A"}</td>
            <td><span class="status-badge ${getStatusBadgeClass(v.status)}">${getStatusIcon(v.status)} ${v.status || "N/A"}</span></td>
            <td>${actionButtons}</td>
        `;
        volunteerTable.appendChild(row);
    });

    document.querySelectorAll(".accept-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const el = e.target.closest(".accept-btn");
            if (!el?.dataset?.id) return;
            updateApplicationStatus(el.dataset.id, el.dataset.missionId, "approved");
        });
    });

    document.querySelectorAll(".reject-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const el = e.target.closest(".reject-btn");
            if (!el?.dataset?.id) return;
            openRejectModal(el.dataset.id, el.dataset.missionId);
        });
    });

    applyVolunteerPagination();
}

// Status badge class function with better styling
function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return 'pending-badge';
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

function showDetails(v) {
    const rejectedBlock =
        (v.status || "").toLowerCase() === "rejected" && (v.rejectionReason || "").trim()
            ? `<p><strong>Reason for rejection:</strong> ${escapeHtml(v.rejectionReason.trim())}</p>`
            : "";
    modalBody.innerHTML = `
        <p><strong>Name:</strong> ${escapeHtml(v.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(v.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(v.phone || "N/A")}</p>
        <p><strong>Occupation:</strong> ${escapeHtml(v.occupation || "N/A")}</p>
        <p><strong>Mission:</strong> ${escapeHtml(v.missionName || "N/A")}</p>
        <p><strong>Status:</strong> ${escapeHtml(v.status || "N/A")}</p>
        <p><strong>Applied At:</strong> ${v.appliedAt || "N/A"}</p>
        ${rejectedBlock}
    `;
    detailsModal.show();
}

searchInput.addEventListener("input", () => {
    applyVolunteerFilters();
});

filterSelect.addEventListener("change", () => {
    applyVolunteerFilters();
});