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
    serverTimestamp
} from "firebase/firestore";

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
                document.getElementById('adminEmail').textContent = user.email;
                
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
    // Setup tab navigation
    document.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            showTab(tabName);
        });
    });
    
    // Initialize charts
    initializeCharts();
}

function showTab(tabName) {
    console.log("[INFO] showTab called with:", tabName);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        console.log("[INFO] Hiding tab:", tab.id);
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
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
    
    // Add active class to selected nav link
    const selectedNavLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedNavLink) {
        selectedNavLink.classList.add('active');
        console.log("[INFO] Activated nav link:", tabName);
    } else {
        console.error("[ERROR] Nav link not found:", tabName);
    }
    
    // Load tab-specific data
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'users':
            loadUsersData();
            break;
        case 'missions':
            loadMissionsData();
            break;
        case 'volunteers':
            loadVolunteersData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}


async function loadUsersData() {
    try {
        // Get users from Firebase
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(50));
        const usersSnapshot = await getDocs(usersQuery);
        
        const tbody = document.getElementById('usersTableBody');
        
        if (usersSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = usersSnapshot.docs.map(doc => {
            const user = doc.data();
            const userId = doc.id;
            
            return `
                <tr>
                    <td>${user.name || user.email}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.role === 'organization' ? 'bg-primary' : 'bg-success'}">${user.role || 'Volunteer'}</span></td>
                    <td>${user.location || 'Not specified'}</td>
                    <td><span class="badge ${user.verified ? 'bg-success' : 'bg-warning'}">${user.verified ? 'Verified' : 'Pending'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-admin" onclick="verifyUser('${userId}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${userId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log("[SUCCESS] Users data loaded from Firebase");
    } catch (error) {
        console.error("Error loading users data:", error);
        // Fallback to mock data
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading users data</td></tr>';
    }
}

async function loadMissionsData() {
    try {
        console.log("[INFO] Loading missions data from Firebase...");
        
        // Get missions from Firebase, prioritizing pending missions
        const missionsQuery = query(collection(db, "mission_submissions"), orderBy("submittedAt", "desc"), limit(50));
        const missionsSnapshot = await getDocs(missionsQuery);
        
        const tbody = document.getElementById('missionsTableBody');
        
        if (missionsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No missions found</td></tr>';
            return;
        }
        
        // Sort missions to show pending first
        const missions = missionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sort by status: pending first, then by submittedAt
        missions.sort((a, b) => {
            //  FIXED: Use normalized status comparison
            const aStatus = (a.status || '').toLowerCase();
            const bStatus = (b.status || '').toLowerCase();
            
            if (aStatus === 'Pending' && bStatus !== 'Pending') return -1;
            if (aStatus !== 'Pending' && bStatus === 'Pending') return 1;
            return 0;
        });
        
        // Generate table rows
        tbody.innerHTML = missions.map(mission => {
            const statusBadge = getStatusBadgeClass(mission.status);
            
            //  FIXED: Normalize status for comparison
            const normalizedStatus = (mission.status || '').toLowerCase();
            
            // Debug logging
            console.log(`Mission: ${mission.missionName || mission.name}, Status: ${mission.status}, Normalized: ${normalizedStatus}, ID: ${mission.id}`);
            
            return `
                <tr class="${normalizedStatus === 'pending' ? 'table-warning' : ''}">
                    <td>
                        <strong>${mission.missionName || mission.name}</strong>
                        ${normalizedStatus === 'pending' ? '<br><small class="text-muted"><i class="bi bi-hourglass-split"></i> Awaiting approval</small>' : ''}
                    </td>
                    <td>${mission.orgName || 'Unknown'}</td>
                    <td><span class="badge bg-info">${mission.type || 'General'}</span></td>
                    <td>${mission.date || 'Not set'}</td>
                    <td>${mission.location || 'Not specified'}</td>
                    <td><span class="badge ${statusBadge}">${mission.status || 'pending'}</span></td>
                    <td>
                        ${normalizedStatus === 'pending' ? `
                            <button class="btn btn-sm btn-success me-1" onclick="console.log('Approve clicked:', '${mission.id}'); approveMission('${mission.id}')" title="Approve Mission">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger me-1" onclick="console.log('Reject clicked:', '${mission.id}'); rejectMission('${mission.id}')" title="Reject Mission">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-secondary" disabled title="Already ${mission.status}">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        `}
                        <button class="btn btn-sm btn-outline-info" onclick="console.log('View clicked:', '${mission.id}'); viewMissionDetails('${mission.id}')" title="View Details">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log("[SUCCESS] Missions data loaded from Firebase");
        console.log("Total missions loaded:", missions.length);
        console.log("Pending missions:", missions.filter(m => (m.status || '').toLowerCase() === 'pending').length);        console.log("Generated HTML:", tbody.innerHTML.substring(0, 200) + "...");
        
        // Test if buttons are clickable
        setTimeout(() => {
            const testButtons = document.querySelectorAll('button[onclick*="Test clicked"]');
            console.log("[INFO] Found test buttons:", testButtons.length);
            testButtons.forEach((btn, index) => {
                console.log(`Button ${index}:`, btn.outerHTML.substring(0, 100) + "...");
            });
        }, 1000);
    } catch (error) {
        console.error("Error loading missions data:", error);
        // Fallback to mock data
        const tbody = document.getElementById('missionsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading missions data</td></tr>';
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

        // Get total missions count (only approved missions)
        const approvedMissionsQuery = query(collection(db, "missions"), where("status", "==", "approved"));
        const approvedMissionsSnapshot = await getDocs(approvedMissionsQuery);
        document.getElementById('totalMissions').textContent = approvedMissionsSnapshot.size;

        // Get total volunteers count (users with volunteer role)
        const volunteersQuery = query(collection(db, "users"), where("role", "==", "volunteer"));
        const volunteersSnapshot = await getDocs(volunteersQuery);
        document.getElementById('totalVolunteers').textContent = volunteersSnapshot.size;

        console.log("[SUCCESS] Dashboard stats loaded from Firebase:", {
            users: usersSnapshot.size,
            organizations: orgsSnapshot.size,
            missions: approvedMissionsSnapshot.size,
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
    // Activity Chart
    const activityCtx = document.getElementById('activityChart').getContext('2d');
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
    const missionTypesCtx = document.getElementById('missionTypesChart').getContext('2d');
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
        if (e.target.closest('.nav-link[data-tab]')) {
            e.preventDefault();
            const link = e.target.closest('.nav-link[data-tab]');
            const tabName = link.getAttribute('data-tab');
            console.log('[INFO] Tab clicked:', tabName);
            showTab(tabName);
        }
    });
    
    // Search functionality with null checks
    const userSearch = document.getElementById('userSearch');
    const missionSearch = document.getElementById('missionSearch');
    const volunteerSearch = document.getElementById('volunteerSearch');
    
    if (userSearch) {
        userSearch.addEventListener('input', filterUsers);
        console.log("[SUCCESS] User search listener added");
    }
    if (missionSearch) {
        missionSearch.addEventListener('input', filterMissions);
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

// Action functions
window.verifyUser = async function(userId) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            verified: true,
            verifiedAt: serverTimestamp()
        });
        
        alert(`User verified successfully!`);
        loadUsersData(); // Refresh data
    } catch (error) {
        console.error("Error verifying user:", error);
        alert("Error verifying user. Please try again.");
    }
};

window.deleteUser = async function(userId) {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            alert("User deleted successfully!");
            loadUsersData(); // Refresh data
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Error deleting user. Please try again.");
        }
    }
};

window.approveMission = async function(missionId) {
    try {
        const submissionRef = doc(db, "mission_submissions", missionId);
        const submissionDoc = await getDoc(submissionRef);

        if (!submissionDoc.exists()) {
            alert("Mission submission not found.");
            return;
        }

        const submissionData = submissionDoc.data();
        const approvedMissionData = {
            ...submissionData,
            status: "Open",
            workflowStatus: "approved",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser.email
        };

        // Publish to live collections
        await setDoc(doc(db, "missions", missionId), approvedMissionData);
        await setDoc(
            doc(db, "organizations", submissionData.orgId, "missions", missionId),
            approvedMissionData
        );

        // Mark submission as approved
        await updateDoc(submissionRef, {
            workflowStatus: "approved",
            status: "Open",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser.email
            
        });

        alert("[SUCCESS] Mission approved and published.");
        loadMissionsData();
    } catch (error) {
        console.error("Error approving mission:", error);
        alert("Error approving mission. Please try again.");
    }
};

        // Also update organization's dashboard copy
        const submissionDoc = await getDoc(submissionRef);
        if (submissionDoc.exists()) {
            const submissionData = submissionDoc.data();
            await updateDoc(doc(db, "organizations", submissionData.orgId, "missions", missionId), {
                status: "rejected",
                workflowStatus: "rejected",
                rejectedAt: serverTimestamp(),
                rejectedBy: auth.currentUser.email,
                rejectionReason: reason
            });
        }


window.rejectMission = async function(missionId) {
    const reason = prompt("Please provide a reason for rejecting this mission:");
    if (reason === null) return;

    if (confirm("Are you sure you want to reject this mission?")) {
        try {
            const submissionRef = doc(db, "mission_submissions", missionId);
            await updateDoc(submissionRef, {
                status: "rejected",
                workflowStatus: "rejected",
                rejectedAt: serverTimestamp(),
                rejectedBy: auth.currentUser.email,
                rejectionReason: reason
            });

            alert("[INFO] Mission rejected.");
            loadMissionsData();
        } catch (error) {
            console.error("Error rejecting mission:", error);
            alert("Error rejecting mission. Please try again.");
        }
    }
};

window.viewMissionDetails = async function(missionId) {
    try {
        const missionRef = doc(db, "missions", missionId);
        const missionDoc = await getDoc(missionRef);
        
        if (missionDoc.exists()) {
            const mission = missionDoc.data();
            const details = `
Mission Details:
Name: ${mission.missionName || 'N/A'}
Organization: ${mission.orgName || 'N/A'}
Type: ${mission.type || 'N/A'}
Date: ${mission.date || 'N/A'}
Time: ${mission.startTime || 'N/A'} - ${mission.endTime || 'N/A'}
Location: ${mission.location || 'N/A'}
Volunteers Needed: ${mission.volunteers || 'N/A'}
Status: ${mission.status || 'N/A'}
Description: ${mission.description || 'N/A'}
Submitted: ${mission.submittedAt ? new Date(mission.submittedAt).toLocaleString() : 'N/A'}
Submitted By: ${mission.submittedBy || 'N/A'}
            `;
            alert(details);
        } else {
            alert("Mission not found.");
        }
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
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const filterType = document.getElementById('userFilter').value;
    
    // Implement filtering logic here
    console.log(`Filtering users: ${searchTerm}, type: ${filterType}`);
}

function filterMissions() {
    const searchTerm = document.getElementById('missionSearch').value.toLowerCase();
    const filterType = document.getElementById('missionFilter').value;
    
    // Implement filtering logic here
    console.log(`Filtering missions: ${searchTerm}, type: ${filterType}`);
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
    await loadUsersData();
    
    //  Sync mission statuses to ensure consistency
    await syncMissionStatuses();
    
    // Set up periodic sync every 5 minutes
    setInterval(async () => {
        await syncMissionStatuses();
    }, 5 * 60 * 1000);
});