import { auth, db } from "./firebase.js";
import { 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    where,
    getDoc,
    addDoc,
    setDoc,
    serverTimestamp,
    deleteField,
} from "firebase/firestore";
import { computeMissionPointsPayload } from "./mission-type-points.js";

let allAdminMissions = [];
let adminMissionsPageSize = 10;
let adminMissionsCurrentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    console.log("[INFO] DOM Content Loaded - Initializing admin dashboard...");
    checkAdminAuth();

    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            adminLogout();
        });
    }
});

// Check if user is authenticated as admin
function checkAdminAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) { 
            // Check if user is admin
            if (user.email.includes('@admin.kalinga.com') || user.email.includes('admin@')) {
                console.log("[SUCCESS] Admin authenticated:", user.email);
                const email = user.email;
                document.getElementById('adminEmail').textContent = email;
                const sidebarEmail = document.getElementById('adminEmailSidebar');
                if (sidebarEmail) sidebarEmail.textContent = email;
                
                // Initialize dashboard
                initializeDashboard();
                loadDashboardData();
                setupEventListeners();
            } else {
                console.log("[ERROR] Access denied. Admin credentials required.");
                alert('Access denied. Admin credentials required.');
                window.location.href = '/admin/login';
            }
        } else {
            console.log("[ERROR] No admin user found. Redirecting to login.");
            alert('Please login as admin.');
            window.location.href = '/admin/login';
        }
    });
}

function initializeDashboard() {
    initializeCharts();
}

function showTab(tabName) {
    console.log("[INFO] showTab called with:", tabName);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        console.log("[INFO] Hiding tab:", tab.id);
    });
    
    document.querySelectorAll('[data-tab]').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        console.log("[INFO] Showing tab:", selectedTab.id);
    } else {
        console.error("[ERROR] Tab content not found:", `${tabName}-tab`);
    }
    
    const selectedNavLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedNavLink) {
        selectedNavLink.classList.add('active');
    }

    const topbarTitle = document.getElementById('topbarTitle');
    const pageTitles = {
        dashboard: 'Dashboard',
        organizations: 'Organizations',
        missions: 'Missions',
        volunteers: 'Volunteers',
    };
    if (topbarTitle) {
        topbarTitle.textContent = pageTitles[tabName] || tabName;
    }

    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'organizations':
            loadOrganizationsData();
            break;
        case 'missions':
            loadMissionsData();
            break;
        case 'volunteers':
            loadVolunteersData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}


async function loadOrganizationsData() {
    try {
        const snapshot = await getDocs(collection(db, "organizations"));
        const tbody = document.getElementById("organizationsTableBody");
        if (!tbody) return;

        if (snapshot.empty) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="text-center">No organizations found</td></tr>';
            return;
        }

        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) =>
            String(a.name || a.orgName || "").localeCompare(
                String(b.name || b.orgName || ""),
                undefined,
                { sensitivity: "base" }
            )
        );

        tbody.innerHTML = list
            .map((org) => {
                const name = org.name || org.orgName || "Unnamed organization";
                const email = org.email || "—";
                const phone = org.phone || "—";
                const location =
                    [org.address, org.city, org.state, org.country]
                        .filter(Boolean)
                        .join(", ") || "Not specified";
                const verified = org.verified === true;
                const statusLabel = verified ? "Verified" : "Registered";
                const statusClass = verified ? "bg-success" : "bg-secondary";

                return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>${location}</td>
                    <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-info" onclick="viewOrganization('${org.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>`;
            })
            .join("");

        console.log("[SUCCESS] Organizations loaded from Firebase");
    } catch (error) {
        console.error("Error loading organizations:", error);
        const tbody = document.getElementById("organizationsTableBody");
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="text-center text-danger">Error loading organizations</td></tr>';
        }
    }
}

function getVisibleAdminMissionRows() {
    const tbody = document.getElementById("missionsTableBody");
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll("tr.admin-mission-row")).filter(
        (tr) => tr.style.display !== "none"
    );
}

function applyAdminMissionsPagination() {
    const allVisible = getVisibleAdminMissionRows();
    const total = allVisible.length;
    const totalPages = Math.max(1, Math.ceil(total / adminMissionsPageSize));

    if (adminMissionsCurrentPage > totalPages) adminMissionsCurrentPage = totalPages;
    if (adminMissionsCurrentPage < 1) adminMissionsCurrentPage = 1;

    const start = (adminMissionsCurrentPage - 1) * adminMissionsPageSize;
    const end = start + adminMissionsPageSize;

    const tbody = document.getElementById("missionsTableBody");
    if (tbody) {
        tbody.querySelectorAll("tr.admin-mission-row").forEach((tr) => {
            tr.classList.remove("admin-row-paged-out");
        });
        allVisible.forEach((tr, index) => {
            if (index < start || index >= end) {
                tr.classList.add("admin-row-paged-out");
            }
        });
    }

    const prevBtn = document.getElementById("adminMissionsPrevPage");
    const nextBtn = document.getElementById("adminMissionsNextPage");
    const pageInfo = document.getElementById("adminMissionsPageInfo");
    const countEl = document.getElementById("adminMissionsCountText");

    if (prevBtn) prevBtn.disabled = adminMissionsCurrentPage <= 1 || total === 0;
    if (nextBtn) nextBtn.disabled = adminMissionsCurrentPage >= totalPages || total === 0;
    if (pageInfo) pageInfo.textContent = `Page ${adminMissionsCurrentPage} of ${totalPages}`;

    if (countEl) {
        if (total === 0) {
            countEl.textContent = "Showing 0 missions";
        } else {
            const from = start + 1;
            const to = Math.min(end, total);
            countEl.textContent =
                total === 1
                    ? "Showing 1 mission"
                    : `Showing ${from}–${to} of ${total} missions`;
        }
    }
}

function initAdminMissionsPaginationControls() {
    const sizeSelect = document.getElementById("adminMissionsPageSize");
    const prevBtn = document.getElementById("adminMissionsPrevPage");
    const nextBtn = document.getElementById("adminMissionsNextPage");

    if (sizeSelect && !sizeSelect.dataset.bound) {
        sizeSelect.dataset.bound = "1";
        sizeSelect.addEventListener("change", () => {
            adminMissionsPageSize = parseInt(sizeSelect.value, 10) || 10;
            adminMissionsCurrentPage = 1;
            applyAdminMissionsPagination();
        });
    }

    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = "1";
        prevBtn.addEventListener("click", () => {
            if (adminMissionsCurrentPage > 1) {
                adminMissionsCurrentPage--;
                applyAdminMissionsPagination();
            }
        });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = "1";
        nextBtn.addEventListener("click", () => {
            adminMissionsCurrentPage++;
            applyAdminMissionsPagination();
        });
    }
}

function filterAdminMissionsTable() {
    const tbody = document.getElementById("missionsTableBody");
    if (!tbody) return;

    const q = (document.getElementById("missionSearch")?.value || "").trim().toLowerCase();
    const filterType = (document.getElementById("missionFilter")?.value || "all").toLowerCase();

    tbody.querySelectorAll("tr.admin-mission-row").forEach((tr) => {
        const status = (tr.dataset.status || "").toLowerCase();
        const haystack = (tr.textContent || "").toLowerCase();

        let statusMatch = true;
        if (filterType === "pending") {
            statusMatch = status === "pending";
        } else if (filterType === "approved") {
            statusMatch = status === "open" || status === "approved";
        } else if (filterType === "rejected") {
            statusMatch = status === "rejected";
        } else if (filterType === "active") {
            statusMatch = status === "open" || status === "ongoing";
        } else if (filterType === "completed") {
            statusMatch = status === "completed";
        }

        const searchMatch = !q || haystack.includes(q);
        tr.style.display = statusMatch && searchMatch ? "" : "none";
        tr.classList.remove("admin-row-paged-out");
    });

    adminMissionsCurrentPage = 1;
    applyAdminMissionsPagination();
}

function renderAdminMissionsTable(missions) {
    const tbody = document.getElementById("missionsTableBody");
    if (!tbody) return;

    if (!missions.length) {
        tbody.innerHTML =
            '<tr><td colspan="7" class="text-center">No missions found</td></tr>';
        applyAdminMissionsPagination();
        return;
    }

    tbody.innerHTML = missions
        .map((mission) => {
            const statusBadge = getStatusBadgeClass(mission.status);
            const normalizedStatus = (mission.status || "").toLowerCase();

            return `
                <tr class="admin-mission-row ${normalizedStatus === "pending" ? "table-warning" : ""}"
                    data-status="${normalizedStatus}">
                    <td>
                        <strong>${mission.missionName || mission.name}</strong>
                        ${normalizedStatus === "pending" ? '<br><small class="text-muted"><i class="bi bi-hourglass-split"></i> Awaiting approval</small>' : ""}
                    </td>
                    <td>${mission.orgName || "Unknown"}</td>
                    <td><span class="badge bg-info">${mission.type || "General"}</span></td>
                    <td>${mission.date || "Not set"}</td>
                    <td>${mission.location || "Not specified"}</td>
                    <td><span class="badge ${statusBadge}">${mission.status || "pending"}</span></td>
                    <td>
                        ${normalizedStatus === "pending" ? `
                            <button class="btn btn-sm btn-success me-1" onclick="approveMission('${mission.id}')" title="Approve Mission">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger me-1" onclick="rejectMission('${mission.id}')" title="Reject Mission">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-secondary" disabled title="Already ${mission.status}">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        `}
                        <button class="btn btn-sm btn-outline-info" onclick="viewMissionDetails('${mission.id}')" title="View Details">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

    adminMissionsCurrentPage = 1;
    initAdminMissionsPaginationControls();
    filterAdminMissionsTable();
}
async function loadMissionsData() {
    try {
        console.log("[INFO] Loading missions data from Firebase...");

        const missionsQuery = query(
            collection(db, "mission_submissions"),
            orderBy("submittedAt", "desc"),
            limit(100)
        );
        const missionsSnapshot = await getDocs(missionsQuery);

        if (missionsSnapshot.empty) {
            allAdminMissions = [];
            renderAdminMissionsTable([]);
            return;
        }

        allAdminMissions = missionsSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }));

        allAdminMissions.sort((a, b) => {
            const aStatus = (a.status || "").toLowerCase();
            const bStatus = (b.status || "").toLowerCase();
            if (aStatus === "pending" && bStatus !== "pending") return -1;
            if (aStatus !== "pending" && bStatus === "pending") return 1;
            return 0;
        });

        renderAdminMissionsTable(allAdminMissions);

        console.log("[SUCCESS] Missions data loaded:", allAdminMissions.length);
    } catch (error) {
        console.error("Error loading missions data:", error);
        const tbody = document.getElementById("missionsTableBody");
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="7" class="text-center text-danger">Error loading missions data</td></tr>';
        }
    }
}

async function loadDashboardData() {
    try {
        // Load dashboard stats from Firebase
        await loadDashboardStats();
        
        console.log('[SUCCESS] Dashboard data loaded from Firebase');
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Fallback to mock data
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalOrganizations').textContent = '45';
        document.getElementById('totalMissions').textContent = '89';
        document.getElementById('totalVolunteers').textContent = '567';
    }
}

async function loadDashboardStats() {
    try {
        console.log("[INFO] Loading dashboard stats from Firebase...");
        
        // Show loading state
        document.getElementById('totalUsers').textContent = '...';
        document.getElementById('totalOrganizations').textContent = '...';
        document.getElementById('totalMissions').textContent = '...';
        document.getElementById('totalVolunteers').textContent = '...';

        // Get total users count
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        document.getElementById('totalUsers').textContent = usersSnapshot.size;

        // Get total organizations count
        const orgsQuery = query(collection(db, "organizations"));
        const orgsSnapshot = await getDocs(orgsQuery);
        document.getElementById('totalOrganizations').textContent = orgsSnapshot.size;

         // Total missions = all submissions from all organizations
         const submissionsSnapshot = await getDocs(collection(db, "mission_submissions"));
        document.getElementById('totalMissions').textContent = submissionsSnapshot.size;

        // Get total volunteers count (users with volunteer role)
        const volunteersQuery = query(collection(db, "users"), where("role", "==", "volunteer"));
        const volunteersSnapshot = await getDocs(volunteersQuery);
        document.getElementById('totalVolunteers').textContent = volunteersSnapshot.size;

        console.log("[SUCCESS] Dashboard stats loaded from Firebase:", {
            users: usersSnapshot.size,
            organizations: orgsSnapshot.size,
            missions: submissionsSnapshot.size,
            volunteers: volunteersSnapshot.size
        });
    } catch (error) {
        console.error("[ERROR] Error loading dashboard stats:", error);
        // Fallback to mock data
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalOrganizations').textContent = '45';
        document.getElementById('totalMissions').textContent = '89';
        document.getElementById('totalVolunteers').textContent = '567';
    }
}

function loadVolunteersData() {
    // Mock data - replace with actual Firebase queries
    const volunteersData = [

    ];
    
    const tbody = document.getElementById('volunteersTableBody');
    tbody.innerHTML = volunteersData.map(volunteer => `
        <tr>
            <td>${volunteer.name}</td>
            <td>${volunteer.email}</td>
            <td>${volunteer.missions}</td>
            <td>${volunteer.hours}</td>
            <td><span class="badge bg-warning">${volunteer.badges} Badges</span></td>
            <td><span class="badge ${volunteer.status === 'Top Performer' ? 'bg-success' : 'bg-primary'}">${volunteer.status}</span></td>
            <td>
                <button class="btn btn-sm btn-admin" onclick="viewVolunteerProfile('${volunteer.email}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initializeCharts() {
    const activityEl = document.getElementById('activityChart');
    const missionTypesEl = document.getElementById('missionTypesChart');
    if (!activityEl || !missionTypesEl) return;

    const activityCtx = activityEl.getContext('2d');
    new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Missions',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }, {
                label: 'Volunteers',
                data: [2, 3, 20, 5, 1, 4],
                borderColor: '#f093fb',
                backgroundColor: 'rgba(240, 147, 251, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
    
    // Mission Types Chart
    const missionTypesCtx = missionTypesEl.getContext('2d');
    new Chart(missionTypesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Medical', 'Environmental', 'Outreach', 'Education'],
            datasets: [{
                data: [30, 25, 20, 25],
                backgroundColor: ['#667eea', '#f093fb', '#4facfe', '#43e97b']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

function setupEventListeners() {
    console.log("[INFO] Setting up event listeners...");
    
    // Tab navigation - use event delegation for better reliability
    document.addEventListener('click', (e) => {
        // Check if clicked element is a nav link with data-tab
        if (e.target.closest('[data-tab]')) {
            e.preventDefault();
            const link = e.target.closest('[data-tab]');
            const tabName = link.getAttribute('data-tab');
            console.log('[INFO] Tab clicked:', tabName);
            showTab(tabName);
        }
    });
    
    // Search functionality with null checks
    const orgSearch = document.getElementById("orgSearch");
    const missionSearch = document.getElementById("missionSearch");
    const volunteerSearch = document.getElementById("volunteerSearch");

    if (orgSearch) {
        orgSearch.addEventListener("input", filterOrganizations);
        console.log("[SUCCESS] Organization search listener added");
    }
    if (missionSearch) {
        missionSearch.addEventListener("input", filterMissions);
        const missionFilter = document.getElementById("missionFilter");
        if (missionFilter) {
            missionFilter.addEventListener("change", filterMissions);
        }
        console.log("[SUCCESS] Mission search listener added");
    }
    if (volunteerSearch) {
        volunteerSearch.addEventListener('input', filterVolunteers);
        console.log("[SUCCESS] Volunteer search listener added");
    }
    
    // Notification form
    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', sendNotification);
        console.log("[SUCCESS] Notification form listener added");
    }
    
    // Settings forms
    const badgeRulesForm = document.getElementById('badgeRulesForm');
    const leaderboardForm = document.getElementById('leaderboardForm');
    
    if (badgeRulesForm) {
        badgeRulesForm.addEventListener('submit', saveBadgeRules);
        console.log("[SUCCESS] Badge rules form listener added");
    }
    if (leaderboardForm) {
        leaderboardForm.addEventListener('submit', saveLeaderboardSettings);
        console.log("[SUCCESS] Leaderboard form listener added");
    }
    
    console.log("[SUCCESS] All event listeners set up successfully");
}

function openMissionDetailsModal() {
    const modal = document.getElementById("missionDetailsModal");
    const backdrop = document.getElementById("missionDetailsBackdrop");
    backdrop?.removeAttribute("hidden");
    if (modal) {
        modal.removeAttribute("hidden");
        modal.style.display = "flex";
    }
    document.body.style.overflow = "hidden";
}

function closeMissionDetailsModal() {
    const modal = document.getElementById("missionDetailsModal");
    const backdrop = document.getElementById("missionDetailsBackdrop");
    backdrop?.setAttribute("hidden", "");
    if (modal) {
        modal.setAttribute("hidden", "");
        modal.style.display = "none";
    }
    document.body.style.overflow = "";
}

function missionDetailRow(iconClass, label, value, isBadge = false) {
    const valHtml = isBadge
        ? `<span class="org-status-badge ${String(value).toLowerCase()}">${value}</span>`
        : `<span class="org-detail-row__value">${value ?? "N/A"}</span>`;
    return `
        <div class="org-detail-row">
            <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
            <div class="org-detail-row__content">
                <span class="org-detail-row__label">${label}</span>
                ${valHtml}
            </div>
        </div>`;
}

function formatMissionSubmittedAt(mission) {
    const t = mission.submittedAt;
    if (t?.toDate) return t.toDate().toLocaleString();
    if (t) return new Date(t).toLocaleString();
    return "N/A";
}
function openMissionApproveSuccessModal() {
    const overlay = document.getElementById("missionApproveSuccessModal");
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.getElementById("missionApproveSuccessOk")?.focus();
}

function closeMissionApproveSuccessModal() {
    const overlay = document.getElementById("missionApproveSuccessModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
}

(function initMissionApproveSuccessModal() {
    const overlay = document.getElementById("missionApproveSuccessModal");
    if (!overlay) return;

    const onClose = () => {
        closeMissionApproveSuccessModal();
        if (typeof loadMissionsData === "function") loadMissionsData();
    };

    document.getElementById("missionApproveSuccessOk")?.addEventListener("click", onClose);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) onClose();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) onClose();
    });
})();
window.approveMission = async function(missionId) {
    try {
        const submissionRef = doc(db, "mission_submissions", missionId);
        const submissionDoc = await getDoc(submissionRef);

        if (!submissionDoc.exists()) {
            alert("Mission submission not found.");
            return;
        }

        const submissionData = submissionDoc.data();
        const { basePoints: _legacyBase, ...submissionWithoutBase } = submissionData;
        const pointsFields = await computeMissionPointsPayload(submissionWithoutBase);
        const approvedMissionData = {
            ...submissionWithoutBase,
            ...pointsFields,
            status: "Open",
            workflowStatus: "approved",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser.email,
        };

        // Publish to live collections
        await setDoc(doc(db, "missions", missionId), approvedMissionData);
        await setDoc(
            doc(db, "organizations", submissionData.orgId, "missions", missionId),
            approvedMissionData
        );

        // Mark submission as approved
        await updateDoc(submissionRef, {
            ...pointsFields,
            basePoints: deleteField(),
            workflowStatus: "approved",
            status: "Open",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser.email,
        });

        openMissionApproveSuccessModal();
        loadMissionsData();
    } catch (error) {
        console.error("Error approving mission:", error);
        alert("Error approving mission. Please try again.");
    }
};

let pendingRejectMissionId = null;

function openMissionRejectModal(missionId) {
    pendingRejectMissionId = missionId;
    const overlay = document.getElementById("missionRejectModal");
    const textarea = document.getElementById("missionRejectReasonInput");
    const err = document.getElementById("missionRejectReasonError");
    if (!overlay || !textarea) return;
    textarea.value = "";
    if (err) err.textContent = "";
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    textarea.focus();
}

function closeMissionRejectModal() {
    const overlay = document.getElementById("missionRejectModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
    pendingRejectMissionId = null;
}

async function performMissionRejection(missionId, reason) {
    try {
        const submissionRef = doc(db, "mission_submissions", missionId);
        const submissionSnap = await getDoc(submissionRef);

        if (!submissionSnap.exists()) {
            alert("Mission submission not found.");
            return;
        }

        const submissionData = submissionSnap.data();
        const rejectionUpdate = {
            status: "rejected",
            workflowStatus: "rejected",
            rejectedAt: serverTimestamp(),
            rejectedBy: auth.currentUser.email,
            rejectionReason: reason,
        };

        await updateDoc(submissionRef, rejectionUpdate);

        if (submissionData.orgId) {
            await updateDoc(
                doc(db, "organizations", submissionData.orgId, "missions", missionId),
                rejectionUpdate
            );

            const historyRef = doc(
                db,
                "organizations",
                submissionData.orgId,
                "history",
                missionId
            );
            await setDoc(historyRef, {
                ...submissionData,
                ...rejectionUpdate,
                status: "rejected",
                movedToHistoryAt: new Date(),
            });

            await deleteDoc(
                doc(db, "organizations", submissionData.orgId, "missions", missionId)
            );
        }

        alert("[INFO] Mission rejected.");
        loadMissionsData();
    } catch (error) {
        console.error("Error rejecting mission:", error);
        alert("Error rejecting mission. Please try again.");
    }
}

(function initMissionRejectModal() {
    const overlay = document.getElementById("missionRejectModal");
    if (!overlay) return;

    document.getElementById("missionRejectCancel")?.addEventListener("click", closeMissionRejectModal);
    document.getElementById("missionRejectConfirm")?.addEventListener("click", async () => {
        const textarea = document.getElementById("missionRejectReasonInput");
        const err = document.getElementById("missionRejectReasonError");
        const trimmed = (textarea?.value || "").trim();
        if (!trimmed) {
            if (err) err.textContent = "A rejection reason is required.";
            textarea?.focus();
            return;
        }
        if (err) err.textContent = "";
        const missionId = pendingRejectMissionId;
        if (!missionId) return;
        closeMissionRejectModal();
        await performMissionRejection(missionId, trimmed);
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeMissionRejectModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            closeMissionRejectModal();
        }
    });
})();


window.rejectMission = function (missionId) {
    openMissionRejectModal(missionId);
};

        window.viewMissionDetails = async function (missionId) {
            try {
                let snap = await getDoc(doc(db, "mission_submissions", missionId));
                if (!snap.exists()) {
                    snap = await getDoc(doc(db, "missions", missionId));
                }
                if (!snap.exists()) {
                    alert("Mission not found.");
                    return;
                }
        
                const mission = snap.data();
                const statusLabel = String(mission.status || "N/A").toUpperCase();
                const body = document.getElementById("missionDetailsBody");
                if (!body) return;
        
                const rows = [
                    missionDetailRow("fa-flag", "Mission Name:", mission.missionName || mission.name),
                    missionDetailRow("fa-building", "Organization:", mission.orgName),
                    missionDetailRow("fa-tag", "Type:", mission.type),
                    missionDetailRow("fa-calendar", "Date:", mission.date),
                    missionDetailRow("fa-clock", "Time:", `${mission.startTime || "—"} – ${mission.endTime || "—"}`),
                    missionDetailRow("fa-map-marker-alt", "Location:", mission.location),
                    missionDetailRow("fa-users", "Volunteers Needed:", mission.volunteers),
                    missionDetailRow("fa-info-circle", "Status:", statusLabel, true),
                    missionDetailRow("fa-align-left", "Description:", mission.description || "—"),
                    missionDetailRow("fa-paper-plane", "Submitted:", formatMissionSubmittedAt(mission)),
                    missionDetailRow("fa-user", "Submitted By:", mission.submittedBy),
                ];
        
                if ((mission.status || "").toLowerCase() === "rejected") {
                    rows.push(
                        missionDetailRow(
                            "fa-comment-dots",
                            "Rejection Reason:",
                            mission.rejectionReason || "No reason provided"
                        )
                    );
                }
        
                body.innerHTML = rows.join("");
                openMissionDetailsModal();
            } catch (error) {
                console.error("Error viewing mission details:", error);
                alert("Error loading mission details.");
            }
        };

// Test function to debug button clicking
window.testButton = function(missionId) {
    console.log("[SUCCESS] Test button clicked for mission:", missionId);
    alert(`Test button works! Mission ID: ${missionId}`);
};


function sendNotification(e) {
    e.preventDefault();
    
    const type = document.getElementById('notificationType').value;
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    
    alert(`Notification sent!\nType: ${type}\nTitle: ${title}\nMessage: ${message}`);
    
    // Reset form
    document.getElementById('notificationForm').reset();
}

function saveBadgeRules(e) {
    e.preventDefault();
    
    const badgeName = document.getElementById('badgeName').value;
    const requiredMissions = document.getElementById('requiredMissions').value;
    const requiredHours = document.getElementById('requiredHours').value;
    
    alert(`Badge rule saved!\nBadge: ${badgeName}\nRequired Missions: ${requiredMissions}\nRequired Hours: ${requiredHours}`);
    
    // Reset form
    document.getElementById('badgeRulesForm').reset();
}

function saveLeaderboardSettings(e) {
    e.preventDefault();
    
    const scoringSystem = document.getElementById('scoringSystem').value;
    const updateFrequency = document.getElementById('updateFrequency').value;
    
    alert(`Leaderboard settings saved!\nScoring: ${scoringSystem}\nUpdate: ${updateFrequency}`);
}

// Filter functions
function filterOrganizations() {
    const q = (document.getElementById("orgSearch")?.value || "").toLowerCase().trim();
    const tbody = document.getElementById("organizationsTableBody");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = !q || text.includes(q) ? "" : "none";
    });
}

function filterMissions() {
    filterAdminMissionsTable();
}

function filterVolunteers() {
    const searchTerm = document.getElementById('volunteerSearch').value.toLowerCase();
    const filterType = document.getElementById('volunteerFilter').value;
    
    // Implement filtering logic here
    console.log(`Filtering volunteers: ${searchTerm}, type: ${filterType}`);
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'Approved': return 'bg-success';
        case 'Pending': return 'bg-warning';
        case 'Rejected': return 'bg-danger';
        case 'Active': return 'bg-primary';
        case 'Completed': return 'bg-info';
        default: return 'bg-secondary';
    }
}


// Logout function
async function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            localStorage.removeItem('adminUser');
            window.location.href = '/admin/login';
        } catch (error) {
            console.error("Error signing out:", error);
            // Still redirect even if there's an error
            localStorage.removeItem('adminUser');
            window.location.href = '/admin/login';
        }
    }
};

// Add this function to sync mission statuses from organization data
async function syncMissionStatuses() {
    try {
        console.log("[INFO] Syncing mission statuses from organization data...");
        
        // Get all organizations
        const orgsSnapshot = await getDocs(collection(db, "organizations"));
        let updatedCount = 0;
        
        for (const orgDoc of orgsSnapshot.docs) {
            const orgId = orgDoc.id;
            
            // Check organization's history subcollection
            const historyRef = collection(db, "organizations", orgId, "history");
            const historySnapshot = await getDocs(historyRef);
            
            for (const historyDoc of historySnapshot.docs) {
                const missionId = historyDoc.id;
                const historyData = historyDoc.data();
                
                // Update global missions collection if it's not marked as completed
                try {
                    const globalMissionRef = doc(db, "missions", missionId);
                    const globalMissionDoc = await getDoc(globalMissionRef);
                    
                    if (globalMissionDoc.exists()) {
                        const globalData = globalMissionDoc.data();
                        if (globalData.status !== "Completed") {
                            await updateDoc(globalMissionRef, {
                                status: "Completed",
                                completedAt: historyData.completedAt || historyData.movedToHistoryAt || new Date(),
                                movedToHistoryAt: historyData.movedToHistoryAt || new Date()
                            });
                            console.log(`[SUCCESS] Synced mission ${missionId} to Completed status`);
                            updatedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`[ERROR] Error syncing mission ${missionId}:`, error);
                }
            }
        }
        
        console.log(`[SUCCESS] Synced ${updatedCount} mission statuses`);
        
        // Reload missions data after sync
        if (updatedCount > 0) {
            await loadMissionsData();
        }
        
    } catch (error) {
        console.error("[ERROR] Error syncing mission statuses:", error);
    }
}

//Call sync function when admin dashboard loads
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/admin/login";
        return;
    }
    
    console.log("[SUCCESS] Admin logged in:", user.email);
    
    // Load initial data
    await loadMissionsData();
    await loadOrganizationsData();

    function openOrgDetailsModal() {
        const modal = document.getElementById("orgDetailsModal");
        const backdrop = document.getElementById("orgDetailsBackdrop");
        backdrop?.removeAttribute("hidden");
        if (modal) {
            modal.removeAttribute("hidden");
            modal.style.display = "flex";
        }
        document.body.style.overflow = "hidden";
    }

    document.getElementById("orgDetailsCloseBtn")?.addEventListener("click", closeOrgDetailsModal);
    document.getElementById("orgDetailsCloseX")?.addEventListener("click", closeOrgDetailsModal);
    document.getElementById("orgDetailsBackdrop")?.addEventListener("click", closeOrgDetailsModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeOrgDetailsModal();
    });

    document.getElementById("missionDetailsCloseBtn")?.addEventListener("click", closeMissionDetailsModal);
    document.getElementById("missionDetailsCloseX")?.addEventListener("click", closeMissionDetailsModal);
    document.getElementById("missionDetailsBackdrop")?.addEventListener("click", closeMissionDetailsModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMissionDetailsModal();
    });

    
    function closeOrgDetailsModal() {
        const modal = document.getElementById("orgDetailsModal");
        const backdrop = document.getElementById("orgDetailsBackdrop");
        backdrop?.setAttribute("hidden", "");
        if (modal) {
            modal.setAttribute("hidden", "");
            modal.style.display = "none";
        }
        document.body.style.overflow = "";
    }
    function orgDetailRow(iconClass, label, value, isBadge = false) {
        const valHtml = isBadge
            ? `<span class="org-status-badge ${String(value).toLowerCase()}">${value}</span>`
            : `<span class="org-detail-row__value">${value || "N/A"}</span>`;
        return `
            <div class="org-detail-row">
                <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
                <div class="org-detail-row__content">
                    <span class="org-detail-row__label">${label}</span>
                    ${valHtml}
                </div>
            </div>`;
    }
    
    window.viewOrganization = async function (orgId) {
        try {
            const snap = await getDoc(doc(db, "organizations", orgId));
            if (!snap.exists()) {
                alert("Organization not found.");
                return;
            }
            const o = snap.data();
            const statusLabel = o.verified === true ? "VERIFIED" : "REGISTERED";
    
            const body = document.getElementById("orgDetailsBody");
            if (!body) return;
    
            body.innerHTML = [
                orgDetailRow("fa-building", "Organization Name:", o.name || o.orgName),
                orgDetailRow("fa-envelope", "Email:", o.email),
                orgDetailRow("fa-phone", "Phone:", o.phone || "—"),
                orgDetailRow("fa-map-marker-alt", "Address:", o.address || "—"),
                orgDetailRow("fa-city", "City:", o.city || "—"),
                orgDetailRow("fa-map", "State / Province:", o.state || "—"),
                orgDetailRow("fa-mail-bulk", "Postal Code:", o.postalCode || "—"),
                orgDetailRow("fa-globe", "Country:", o.country || "—"),
                orgDetailRow("fa-check-circle", "Status:", statusLabel, true),
                orgDetailRow("fa-fingerprint", "Org ID:", orgId),
            ].join("");
    
            openOrgDetailsModal();
        } catch (e) {
            console.error(e);
            alert("Could not load organization.");
        }
    };
    
    //  Sync mission statuses to ensure consistency
    await syncMissionStatuses();
    
    // Set up periodic sync every 5 minutes
    setInterval(async () => {
        await syncMissionStatuses();
    }, 5 * 60 * 1000);
});