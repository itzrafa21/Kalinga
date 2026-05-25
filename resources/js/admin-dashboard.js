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
    collectionGroup,
} from "firebase/firestore";
import { computeMissionPointsPayload } from "./mission-type-points.js";
import {
    loadPlatformConfig,
    getMissionTypes,
    getLevelForPoints,
    computeMissionDurationHours,
} from "./platform-config.js";
import {
    computeGlobalVolunteerStats,
    readStoredProfileStats,
    buildGlobalVolunteerStatsIndex,
} from "./volunteer-stats.js";

let allAdminMissions = [];
let allAdminVolunteers = [];
const missionDurationHoursCache = new Map();
let adminMissionsPageSize = 10;
let adminMissionsCurrentPage = 1;
let activityChart = null;
let missionTypesChart = null;

const MISSION_TYPE_CHART_COLORS = [
    "#667eea",
    "#f093fb",
    "#4facfe",
    "#43e97b",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#64748b",
    "#ec4899",
];

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
    initializeActivityChart();
    initializeMissionTypesChart();
}

function normalizeMissionTypeKey(raw) {
    const value = String(raw ?? "").trim();
    return value || "";
}

function missionTypeMatchesConfig(typeKey, configType) {
    if (!typeKey || !configType) return false;
    const name = String(configType.name ?? "").trim();
    const id = String(configType.id ?? "").trim();
    return typeKey === name || (id && typeKey === id);
}

async function fetchMissionTypeCounts(configuredTypes) {
    const counts = new Map();
    configuredTypes.forEach((type) => {
        counts.set(type.name, 0);
    });

    const seenMissionIds = new Set();

    const addMission = (data, docId) => {
        if (!docId || seenMissionIds.has(docId)) return;
        seenMissionIds.add(docId);

        const typeKey = normalizeMissionTypeKey(data.type || data.missionType);
        if (!typeKey) return;

        const matchedType = configuredTypes.find((type) =>
            missionTypeMatchesConfig(typeKey, type)
        );
        if (!matchedType) return;

        counts.set(matchedType.name, (counts.get(matchedType.name) || 0) + 1);
    };

    try {
        const submissionsSnap = await getDocs(
            collection(db, "mission_submissions")
        );
        submissionsSnap.docs.forEach((docSnap) =>
            addMission(docSnap.data(), docSnap.id)
        );
    } catch (err) {
        console.warn("[WARN] mission_submissions for type chart:", err);
    }

    try {
        const missionsSnap = await getDocs(collection(db, "missions"));
        missionsSnap.docs.forEach((docSnap) =>
            addMission(docSnap.data(), docSnap.id)
        );
    } catch (err) {
        console.warn("[WARN] missions collection for type chart:", err);
    }

    return counts;
}

function buildMissionTypeChartData(counts, configuredTypes) {
    const activeTypes = configuredTypes.filter((type) => type.active !== false);

    if (activeTypes.length === 0) {
        return {
            labels: ["No mission types in platform config"],
            data: [1],
            colors: ["#e5e7eb"],
        };
    }

    const entries = activeTypes.map((type) => ({
        label: type.name,
        count: counts.get(type.name) || 0,
    }));

    const withMissions = entries.filter((entry) => entry.count > 0);

    if (withMissions.length === 0) {
        return {
            labels: ["No missions yet"],
            data: [1],
            colors: ["#e5e7eb"],
        };
    }

    return {
        labels: withMissions.map((entry) => entry.label),
        data: withMissions.map((entry) => entry.count),
        colors: withMissions.map(
            (_, index) =>
                MISSION_TYPE_CHART_COLORS[index % MISSION_TYPE_CHART_COLORS.length]
        ),
    };
}

function toJsDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getLastSixMonthBuckets() {
    const buckets = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleString("en-US", { month: "short" }),
            missions: 0,
            volunteers: 0,
        });
    }
    return buckets;
}

function incrementActivityBucket(buckets, dateValue, field) {
    const date = toJsDate(dateValue);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket[field] += 1;
}

function applicationActivityDate(data) {
    return (
        data?.approvedAt ||
        data?.appliedAt ||
        data?.createdAt ||
        data?.updatedAt ||
        null
    );
}

function isCountableVolunteerApplication(data) {
    const status = String(data?.status || "pending").toLowerCase();
    return status !== "rejected" && status !== "closed";
}

async function fetchMissionMonthlyCounts(buckets) {
    const seenMissionIds = new Set();

    const addMission = (docId, data) => {
        if (docId && seenMissionIds.has(docId)) return;
        if (docId) seenMissionIds.add(docId);
        incrementActivityBucket(
            buckets,
            data?.submittedAt || data?.createdAt || data?.updatedAt,
            "missions"
        );
    };

    try {
        const submissionsSnap = await getDocs(collection(db, "mission_submissions"));
        submissionsSnap.docs.forEach((docSnap) =>
            addMission(docSnap.id, docSnap.data())
        );
    } catch (err) {
        console.warn("[WARN] mission_submissions for activity chart:", err);
    }

    try {
        const missionsSnap = await getDocs(collection(db, "missions"));
        missionsSnap.docs.forEach((docSnap) =>
            addMission(docSnap.id, docSnap.data())
        );
    } catch (err) {
        console.warn("[WARN] missions collection for activity chart:", err);
    }
}

async function fetchVolunteerMonthlyCounts(buckets) {
    const seenApplications = new Set();

    const addApplication = (docSnap) => {
        const data = docSnap.data();
        if (!isCountableVolunteerApplication(data)) return;
        const path = docSnap.ref?.path || docSnap.id;
        if (seenApplications.has(path)) return;
        seenApplications.add(path);
        incrementActivityBucket(
            buckets,
            applicationActivityDate(data),
            "volunteers"
        );
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        cgSnap.docs.forEach(addApplication);
    } catch (err) {
        console.warn("[WARN] collectionGroup(applications) for activity chart:", err);
    }

    if (seenApplications.size === 0) {
        try {
            const missionsSnap = await getDocs(collection(db, "missions"));
            for (const missionDoc of missionsSnap.docs) {
                const appsSnap = await getDocs(
                    collection(db, "missions", missionDoc.id, "applications")
                );
                appsSnap.docs.forEach(addApplication);
            }
        } catch (err) {
            console.warn("[WARN] missions/*/applications for activity chart:", err);
        }
    }

    if (seenApplications.size === 0) {
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            for (const userDoc of usersSnap.docs) {
                const appsSnap = await getDocs(
                    collection(db, "users", userDoc.id, "applications")
                );
                appsSnap.docs.forEach(addApplication);
            }
        } catch (err) {
            console.warn("[WARN] users/*/applications for activity chart:", err);
        }
    }

    if (seenApplications.size === 0) {
        try {
            const orgUserIds = await getOrganizationUserIds();
            const usersSnap = await getDocs(collection(db, "users"));
            usersSnap.docs.forEach((userDoc) => {
                const data = userDoc.data();
                if (!isVolunteerUserDoc(data, orgUserIds)) return;
                incrementActivityBucket(
                    buckets,
                    data.createdAt || data.registeredAt || data.updatedAt,
                    "volunteers"
                );
            });
        } catch (err) {
            console.warn("[WARN] volunteer registrations for activity chart:", err);
        }
    }
}

async function fetchActivityAnalyticsData() {
    const buckets = getLastSixMonthBuckets();
    await Promise.all([
        fetchMissionMonthlyCounts(buckets),
        fetchVolunteerMonthlyCounts(buckets),
    ]);
    return buckets;
}

function updateActivityChart(buckets) {
    if (!activityChart) return;
    activityChart.data.labels = buckets.map((b) => b.label);
    activityChart.data.datasets[0].data = buckets.map((b) => b.missions);
    activityChart.data.datasets[1].data = buckets.map((b) => b.volunteers);
    activityChart.update();
}

async function refreshActivityChart() {
    try {
        const buckets = await fetchActivityAnalyticsData();
        updateActivityChart(buckets);
        console.log("[SUCCESS] Activity analytics loaded:", buckets);
    } catch (err) {
        console.error("[ERROR] Activity analytics:", err);
    }
}

function initializeActivityChart() {
    const activityEl = document.getElementById("activityChart");
    if (!activityEl || activityChart) return;

    const buckets = getLastSixMonthBuckets();

    activityChart = new Chart(activityEl.getContext("2d"), {
        type: "line",
        data: {
            labels: buckets.map((b) => b.label),
            datasets: [
                {
                    label: "Missions",
                    data: buckets.map(() => 0),
                    borderColor: "#667eea",
                    backgroundColor: "rgba(102, 126, 234, 0.1)",
                    tension: 0.4,
                },
                {
                    label: "Volunteers",
                    data: buckets.map(() => 0),
                    borderColor: "#f093fb",
                    backgroundColor: "rgba(240, 147, 251, 0.1)",
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "top",
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
        },
    });
}

function initializeMissionTypesChart(initialData = null) {
    const missionTypesEl = document.getElementById("missionTypesChart");
    if (!missionTypesEl) return;

    const chartData =
        initialData ||
        buildMissionTypeChartData(new Map(), getMissionTypes(false));

    if (missionTypesChart) {
        missionTypesChart.data.labels = chartData.labels;
        missionTypesChart.data.datasets[0].data = chartData.data;
        missionTypesChart.data.datasets[0].backgroundColor = chartData.colors;
        missionTypesChart.update();
        return;
    }

    missionTypesChart = new Chart(missionTypesEl.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    data: chartData.data,
                    backgroundColor: chartData.colors,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                },
            },
        },
    });
}

async function refreshMissionTypesChart() {
    try {
        await loadPlatformConfig();
        const configuredTypes = getMissionTypes(false);
        const counts = await fetchMissionTypeCounts(configuredTypes);
        const chartData = buildMissionTypeChartData(counts, configuredTypes);
        initializeMissionTypesChart(chartData);
        console.log(
            "[SUCCESS] Mission type chart loaded from platform config:",
            Object.fromEntries(counts)
        );
    } catch (err) {
        console.error("[ERROR] loading mission type chart:", err);
    }
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
        await loadDashboardStats();
        await refreshMissionTypesChart();
        await refreshActivityChart();

        console.log("[SUCCESS] Dashboard data loaded from Firebase");
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

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function isVolunteerUserDoc(data, orgUserIds = null) {
    const role = String(data?.role || "").toLowerCase();
    if (role === "volunteer") return true;
    if (role === "admin" || role === "organization" || role === "org") return false;
    if (orgUserIds && data?.uid && orgUserIds.has(data.uid)) return false;
    return true;
}

async function getOrganizationUserIds() {
    try {
        const orgSnap = await getDocs(collection(db, "organizations"));
        return new Set(orgSnap.docs.map((d) => d.id));
    } catch {
        return new Set();
    }
}

function mergeApplicationVolunteerProfile(map, userId, appData) {
    if (!userId) return;
    const existing = map.get(userId) || {
        name: "",
        email: "",
        phone: "",
        applicationCount: 0,
    };
    map.set(userId, {
        ...existing,
        name:
            appData.displayName ||
            appData.name ||
            existing.name,
        email: appData.email || existing.email,
        phone:
            appData.mobileNumber ||
            appData.phone ||
            appData.mobile ||
            existing.phone,
        applicationCount: existing.applicationCount + 1,
    });
}

async function discoverVolunteersFromApplications() {
    const profileByUserId = new Map();

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        for (const appDoc of cgSnap.docs) {
            mergeApplicationVolunteerProfile(
                profileByUserId,
                appDoc.data().userId,
                appDoc.data()
            );
        }
    } catch (err) {
        console.warn("[WARN] collectionGroup(applications) for admin volunteers:", err);
    }

    if (profileByUserId.size === 0) {
        try {
            const missionsSnap = await getDocs(collection(db, "missions"));
            for (const missionDoc of missionsSnap.docs) {
                const appsSnap = await getDocs(
                    collection(db, "missions", missionDoc.id, "applications")
                );
                for (const appDoc of appsSnap.docs) {
                    mergeApplicationVolunteerProfile(
                        profileByUserId,
                        appDoc.data().userId,
                        appDoc.data()
                    );
                }
            }
        } catch (err) {
            console.warn("[WARN] missions/*/applications scan for admin volunteers:", err);
        }
    }

  if (profileByUserId.size === 0) {
        try {
            const orgSnap = await getDocs(collection(db, "organizations"));
            for (const orgDoc of orgSnap.docs) {
                const missionsSnap = await getDocs(
                    collection(db, "organizations", orgDoc.id, "missions")
                );
                for (const missionDoc of missionsSnap.docs) {
                    const rosterSnap = await getDocs(
                        collection(
                            db,
                            "organizations",
                            orgDoc.id,
                            "missions",
                            missionDoc.id,
                            "volunteers"
                        )
                    );
                    for (const rosterDoc of rosterSnap.docs) {
                        const data = rosterDoc.data();
                        mergeApplicationVolunteerProfile(
                            profileByUserId,
                            data.userId || rosterDoc.id,
                            data
                        );
                    }
                }
            }
        } catch (err) {
            console.warn("[WARN] org mission rosters scan for admin volunteers:", err);
        }
    }

    const entries = [];
    for (const [userId, profile] of profileByUserId) {
        let data = { ...profile };
        try {
            const userSnap = await getDoc(doc(db, "users", userId));
            if (userSnap.exists()) {
                data = { ...userSnap.data(), ...profile };
            }
        } catch {
            /* use application profile only */
        }
        entries.push({ id: userId, data });
    }
    return entries;
}

async function loadVolunteerUserEntries() {
    const orgUserIds = await getOrganizationUserIds();
    const entries = [];
    const seenIds = new Set();

    const addEntry = (id, data) => {
        if (!id || seenIds.has(id) || orgUserIds.has(id)) return;
        if (!isVolunteerUserDoc(data, orgUserIds)) return;
        seenIds.add(id);
        entries.push({ id, data });
    };

    try {
        const roleSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "volunteer"))
        );
        roleSnap.docs.forEach((d) => addEntry(d.id, d.data()));
    } catch (err) {
        console.warn("[WARN] role=volunteer query:", err);
    }

    if (entries.length === 0) {
        try {
            const allUsersSnap = await getDocs(collection(db, "users"));
            allUsersSnap.docs.forEach((d) => addEntry(d.id, d.data()));
            console.log(
                "[INFO] Loaded users collection for volunteers:",
                allUsersSnap.size,
                "raw,",
                entries.length,
                "after filter"
            );
        } catch (err) {
            console.warn("[WARN] all users query:", err);
        }
    }

    if (entries.length === 0) {
        const fromApplications = await discoverVolunteersFromApplications();
        fromApplications.forEach(({ id, data }) => addEntry(id, data));
        console.log(
            "[INFO] Discovered volunteers from applications/rosters:",
            entries.length
        );
    }

    return entries;
}

async function getMissionDurationHoursCached(missionId) {
    if (!missionId) return 0;
    if (missionDurationHoursCache.has(missionId)) {
        return missionDurationHoursCache.get(missionId);
    }

    let hours = 0;
    try {
        const snap = await getDoc(doc(db, "missions", missionId));
        if (snap.exists()) {
            const mission = snap.data();
            hours =
                Number(mission.durationHours) ||
                computeMissionDurationHours(mission) ||
                0;
        }
    } catch (err) {
        console.warn("[WARN] Could not load mission hours for", missionId, err);
    }

    missionDurationHoursCache.set(missionId, hours);
    return hours;
}

async function countApprovedApplications(userId) {
    try {
        const appsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        return appsSnap.docs.filter((d) => {
            const status = String(d.data().status || "").toLowerCase();
            return status === "approved" || status === "accepted" || status === "completed";
        }).length;
    } catch {
        return 0;
    }
}

async function createVolunteerRow(userId, data, globalStats = null) {
    const name = data.name || data.displayName || data.fullName || "Volunteer";
    const email = data.email || "—";
    const totalPoints = Number(data.totalPoints) || 0;

    const stored = readStoredProfileStats(data);
    const global =
        globalStats || (await computeGlobalVolunteerStats(userId));

    const missionsJoined = Math.max(
        Number(data.missionsCompleted) || 0,
        stored.missionsCompleted,
        global.missionsCompleted,
        Number(data.applicationCount) || 0
    );
    const hoursVolunteered = Math.max(
        Number(data.totalVolunteerHours ?? data.hoursVolunteered) || 0,
        stored.totalHours,
        global.totalHours
    );

    const level =
        data.volunteerLevel ||
        getLevelForPoints(totalPoints).name ||
        "—";
    const badgeCount = Array.isArray(data.badges) ? data.badges.length : 0;

    return {
        id: userId,
        name,
        email,
        missionsJoined,
        hoursVolunteered,
        level,
        badgeCount,
        totalPoints,
        disabled: data.disabled === true,
        accountStatus: String(data.status || data.accountStatus || "").toLowerCase(),
    };
}

function deriveVolunteerStatus(volunteer) {
    if (
        volunteer.disabled ||
        volunteer.accountStatus === "inactive" ||
        volunteer.accountStatus === "disabled"
    ) {
        return "Inactive";
    }
    if (volunteer.missionsJoined >= 5 || volunteer.totalPoints >= 150) {
        return "Top Performer";
    }
    return volunteer.missionsJoined > 0 ? "Active" : "Registered";
}

function getVolunteerStatusBadgeClass(status) {
    switch (status) {
        case "Top Performer":
            return "bg-success";
        case "Active":
            return "bg-primary";
        case "Registered":
            return "bg-secondary";
        case "Inactive":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
}

function renderVolunteersTable(volunteers) {
    const tbody = document.getElementById("volunteersTableBody");
    if (!tbody) return;

    if (!volunteers.length) {
        tbody.innerHTML =
            '<tr><td colspan="7" class="text-center text-muted">No volunteers found</td></tr>';
        return;
    }

    tbody.innerHTML = volunteers
        .map((volunteer) => {
            const status = deriveVolunteerStatus(volunteer);
            const statusClass = getVolunteerStatusBadgeClass(status);
            const hoursLabel =
                volunteer.hoursVolunteered > 0
                    ? `${volunteer.hoursVolunteered}h`
                    : "0h";

            return `
        <tr data-volunteer-id="${escapeHtml(volunteer.id)}" data-status="${escapeHtml(statusString(status))}">
            <td>${escapeHtml(volunteer.name)}</td>
            <td>${escapeHtml(volunteer.email)}</td>
            <td>${volunteer.missionsJoined}</td>
            <td>${hoursLabel}</td>
            <td><span class="badge bg-warning text-dark">${escapeHtml(volunteer.level)}</span></td>
            <td><span class="badge ${statusClass}">${escapeHtml(status)}</span></td>
            <td>
                <button type="button" class="btn btn-sm btn-admin" onclick="viewVolunteerProfile('${escapeHtml(volunteer.id)}')" title="View volunteer">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>`;
        })
        .join("");
}

function statusString(status) {
    return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

function adminDetailRow(iconClass, label, value, options = {}) {
    const { isBadge = false } = options;
    let valHtml;
    if (isBadge) {
        const badgeClass = getVolunteerStatusBadgeClass(value);
        valHtml = `<span class="badge ${badgeClass}">${escapeHtml(value)}</span>`;
    } else {
        valHtml = `<span class="org-detail-row__value">${escapeHtml(value ?? "N/A")}</span>`;
    }
    return `
        <div class="org-detail-row">
            <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
            <div class="org-detail-row__content">
                <span class="org-detail-row__label">${escapeHtml(label)}</span>
                ${valHtml}
            </div>
        </div>`;
}

function openVolunteerDetailsModal() {
    const modal = document.getElementById("volunteerDetailsModal");
    const backdrop = document.getElementById("volunteerDetailsBackdrop");
    backdrop?.removeAttribute("hidden");
    if (modal) {
        modal.removeAttribute("hidden");
        modal.style.display = "flex";
    }
    document.body.style.overflow = "hidden";
}

function closeVolunteerDetailsModal() {
    const modal = document.getElementById("volunteerDetailsModal");
    const backdrop = document.getElementById("volunteerDetailsBackdrop");
    backdrop?.setAttribute("hidden", "");
    if (modal) {
        modal.setAttribute("hidden", "");
        modal.style.display = "none";
    }
    document.body.style.overflow = "";
}

function initVolunteerDetailsModal() {
    document
        .getElementById("volunteerDetailsCloseBtn")
        ?.addEventListener("click", closeVolunteerDetailsModal);
    document
        .getElementById("volunteerDetailsCloseX")
        ?.addEventListener("click", closeVolunteerDetailsModal);
    document
        .getElementById("volunteerDetailsBackdrop")
        ?.addEventListener("click", closeVolunteerDetailsModal);
    document.addEventListener("keydown", (e) => {
        const modal = document.getElementById("volunteerDetailsModal");
        if (
            e.key === "Escape" &&
            modal &&
            !modal.hasAttribute("hidden")
        ) {
            closeVolunteerDetailsModal();
        }
    });
}

window.viewVolunteerProfile = async function (userId) {
    const cached = allAdminVolunteers.find((v) => v.id === userId);
    const body = document.getElementById("volunteerDetailsBody");
    if (!body) return;

    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists() && !cached) {
            alert("Volunteer not found.");
            return;
        }

        const data = snap.exists() ? snap.data() : {};
        const volunteer =
            cached || (await createVolunteerRow(userId, data));
        const status = deriveVolunteerStatus(volunteer);
        const hoursLabel =
            volunteer.hoursVolunteered > 0
                ? `${volunteer.hoursVolunteered}h`
                : "0h";

        body.innerHTML = [
            adminDetailRow("fa-user", "Name:", volunteer.name),
            adminDetailRow("fa-envelope", "Email:", volunteer.email),
            adminDetailRow("fa-bullseye", "Missions joined:", String(volunteer.missionsJoined)),
            adminDetailRow("fa-clock", "Hours volunteered:", hoursLabel),
            adminDetailRow("fa-layer-group", "Level:", volunteer.level),
            adminDetailRow("fa-star", "Total points:", String(volunteer.totalPoints)),
            adminDetailRow("fa-award", "Badges:", String(volunteer.badgeCount)),
            adminDetailRow("fa-circle-check", "Status:", status, { isBadge: true }),
            adminDetailRow("fa-fingerprint", "User ID:", userId),
        ].join("");

        openVolunteerDetailsModal();
    } catch (e) {
        console.error("[ERROR] viewVolunteerProfile:", e);
        alert("Could not load volunteer profile.");
    }
};

async function loadVolunteersData() {
    const tbody = document.getElementById("volunteersTableBody");
    if (!tbody) return;

    tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted">Loading volunteers…</td></tr>';

    try {
        await loadPlatformConfig();

        const userEntries = await loadVolunteerUserEntries();
        const userIds = userEntries.map(({ id }) => id);
        const statsIndex = await buildGlobalVolunteerStatsIndex(userIds);

        const volunteers = await Promise.all(
            userEntries.map(({ id, data }) =>
                createVolunteerRow(id, data, statsIndex.get(id))
            )
        );

        volunteers.sort((a, b) =>
            String(a.name).localeCompare(String(b.name), undefined, {
                sensitivity: "base",
            })
        );

        allAdminVolunteers = volunteers;
        filterVolunteers();
        console.log("[SUCCESS] Volunteers loaded:", volunteers.length);
    } catch (error) {
        console.error("[ERROR] Error loading volunteers:", error);
        tbody.innerHTML =
            '<tr><td colspan="7" class="text-center text-danger">Failed to load volunteers. Please try again.</td></tr>';
    }
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
    const volunteerFilter = document.getElementById("volunteerFilter");
    if (volunteerFilter) {
        volunteerFilter.addEventListener("change", filterVolunteers);
        console.log("[SUCCESS] Volunteer filter listener added");
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

    initVolunteerDetailsModal();
    
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
    const searchTerm = (
        document.getElementById("volunteerSearch")?.value || ""
    )
        .toLowerCase()
        .trim();
    const filterType = document.getElementById("volunteerFilter")?.value || "all";

    let filtered = allAdminVolunteers.slice();

    if (filterType === "active") {
        filtered = filtered.filter((v) => {
            const status = deriveVolunteerStatus(v);
            return status === "Active" || status === "Top Performer";
        });
    } else if (filterType === "inactive") {
        filtered = filtered.filter(
            (v) => deriveVolunteerStatus(v) === "Inactive"
        );
    } else if (filterType === "top") {
        filtered = filtered.filter(
            (v) => deriveVolunteerStatus(v) === "Top Performer"
        );
    }

    if (searchTerm) {
        filtered = filtered.filter((v) => {
            const haystack = `${v.name} ${v.email} ${v.level}`.toLowerCase();
            return haystack.includes(searchTerm);
        });
    }

    renderVolunteersTable(filtered);
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