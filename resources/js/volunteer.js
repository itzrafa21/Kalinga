import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, doc, updateDoc } from "firebase/firestore";

// Elements
const volunteerTable = document.getElementById("volunteerTableBody");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const modalBody = document.getElementById("modalBody");

let allVolunteers = [];
let allMissions = [];
let currentUser = null;

// Wait for authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("[WARNING] No user authenticated, redirecting to login");
        window.location.href = "/organization/login";
        return;
    }
    
    currentUser = user;
    console.log("[SUCCESS] Logged in as:", user.uid);
    console.log("[SUCCESS] User email:", user.email);
    
    // Load missions and volunteers
    await loadMissions(user.uid);
    await loadVolunteers();
});

// Function to load missions for the dropdown
async function loadMissions(user) {
    console.log("[INFO] Loading missions for user:", user);
    
    try {
        // Clear existing options
        filterSelect.innerHTML = '<option value="">All Missions</option>';
        
        // Load missions from main missions collection, filtered by orgId
        const missionsRef = collection(db, "missions");
        const missionsQuery = query(missionsRef);
        const snapshot = await getDocs(missionsQuery);
        
        console.log("[INFO] Total missions found:", snapshot.size);
        
        if (snapshot.empty) {
            console.log("[WARNING] No missions found!");
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const mission = docSnap.data();
            console.log("[INFO] Mission data:", mission);
            
            // Only show missions that belong to this organization
            if (mission.orgId === user.uid) {
                const option = document.createElement("option");
                option.value = docSnap.id;
                option.textContent = mission.missionName || mission.name || "Untitled Mission";
                filterSelect.appendChild(option);
                
                console.log("[SUCCESS] Added mission to dropdown:", option.textContent);
            } else {
                console.log("[WARNING] Mission doesn't belong to this org:", mission.orgId, "vs", user.uid);
            }
        });
        
        // Store ALL missions for volunteer loading
        allMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log("[SUCCESS] Loaded missions:", allMissions.length);
        
    } catch (error) {
        console.error("[ERROR] Error loading missions:", error);
    }
}

// Function to load volunteers
async function loadVolunteers() {
    try {
        console.log("[INFO] Loading volunteers from mission applications");
        allVolunteers = [];
        
        // Load volunteers from ALL missions in the main missions collection
        const missionsRef = collection(db, "missions");
        const missionsSnapshot = await getDocs(missionsRef);
        
        console.log("[INFO] Total missions found:", missionsSnapshot.size);
        
        for (const missionDoc of missionsSnapshot.docs) {
            const mission = missionDoc.data();
            const missionId = missionDoc.id;
            
            // Only load volunteers from missions that belong to this organization
            if (mission.orgId !== currentUser.uid) {
                console.log("[WARNING] Skipping mission from different org:", mission.orgId, "vs", currentUser.uid);
                continue;
            }
            
            try {
                console.log("Loading applications for mission:", mission.missionName || mission.name);
                const applicationsRef = collection(db, "missions", missionId, "applications");
                const applicationsSnapshot = await getDocs(applicationsRef);
                
                console.log(`[INFO] Found ${applicationsSnapshot.size} applications for mission: ${mission.missionName || mission.name}`);
                
                applicationsSnapshot.forEach((docSnap) => {
                    const application = docSnap.data();
                    console.log("[INFO] Application data:", application);
                    
                    //  Fixed volunteer data mapping to match Firebase structure
                    const volunteer = {
                        id: docSnap.id,
                        name: application.displayName || application.name || "N/A",
                        email: application.email || "N/A",
                        phone: application.mobileNumber || application.phone || application.mobile || "N/A",
                        occupation: application.occupation || "N/A", // Added occupation field
                        status: application.status || "pending", // Added status field
                        appliedAt: application.appliedAt,
                        missionId: missionId,
                        missionName: mission.missionName || mission.name,
                        userId: application.userId
                    };
                    
                    allVolunteers.push(volunteer);
                    console.log("[SUCCESS] Added volunteer:", volunteer.name, "for mission:", volunteer.missionName);
                });
            } catch (missionError) {
                console.error("[ERROR] Error loading applications for mission:", missionId, missionError);
            }
        }
        
        console.log("[SUCCESS] Total volunteers loaded:", allVolunteers.length);
        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);
    } catch (error) {
        console.error("Error loading volunteers:", error);
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

async function updateApplicationStatus(applicationId, missionId, newStatus) {
    try {
        console.log(`[INFO] Updating application ${applicationId} status to: ${newStatus}`);
        
        // Update the application status in Firebase
        const applicationRef = doc(db, "missions", missionId, "applications", applicationId);
        await updateDoc(applicationRef, {
            status: newStatus,
            updatedAt: new Date()
        });
        
        console.log(`[SUCCESS] Application status updated to: ${newStatus}`);
        
        // Update the local volunteer data
        const volunteer = allVolunteers.find(v => v.id === applicationId);
        if (volunteer) {
            volunteer.status = newStatus;
        }
        
        // Refresh the display
        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);
        
        // Show success message
        alert(`[SUCCESS] Volunteer application ${newStatus} successfully!`);
        
    } catch (error) {
        console.error("[ERROR] Error updating application status:", error);
        alert(`[ERROR] Failed to ${newStatus} application. Please try again.`);
    }
}

// Fixed displayVolunteers function with better styling
function displayVolunteers(volunteers) {
    volunteerTable.innerHTML = "";
    if (volunteers.length === 0) {
        volunteerTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No volunteers found</td></tr>`;
        return;
    }

    volunteers.forEach((v) => {
        const row = document.createElement("tr");
        
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

    // Add event listeners for Accept buttons
    document.querySelectorAll(".accept-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const applicationId = e.target.closest('.accept-btn').dataset.id;
            const missionId = e.target.closest('.accept-btn').dataset.missionId;
            updateApplicationStatus(applicationId, missionId, 'approved');
        });
    });

    // Add event listeners for Reject buttons
    document.querySelectorAll(".reject-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const applicationId = e.target.closest('.reject-btn').dataset.id;
            const missionId = e.target.closest('.reject-btn').dataset.missionId;
            updateApplicationStatus(applicationId, missionId, 'rejected');
        });
    });
}

// Status badge class function with better styling
function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return 'pending-badge';
        case 'approved': return 'approved-badge';
        case 'rejected': return 'rejected-badge';
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
        default: return '<i class="fas fa-question-circle"></i>';
    }
}

function showDetails(v) {
    modalBody.innerHTML = `
        <p><strong>Name:</strong> ${v.name}</p>
        <p><strong>Email:</strong> ${v.email}</p>
        <p><strong>Phone:</strong> ${v.phone || "N/A"}</p>
        <p><strong>Occupation:</strong> ${v.occupation || "N/A"}</p>
        <p><strong>Mission:</strong> ${v.missionName || "N/A"}</p>
        <p><strong>Status:</strong> ${v.status || "N/A"}</p>
        <p><strong>Applied At:</strong> ${v.appliedAt || "N/A"}</p>
    `;
    detailsModal.show();
}

// Search functionality
searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allVolunteers.filter(
        (v) =>
            (v.name && v.name.toLowerCase().includes(term)) ||
            (v.email && v.email.toLowerCase().includes(term))
    );
    displayVolunteers(filtered);
    updateVolunteerCounts(filtered);
});

// Mission filter functionality
filterSelect.addEventListener("change", () => {
    const selectedMissionId = filterSelect.value;
    
    if (!selectedMissionId) {
        // Show all volunteers
        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);
    } else {
        // Filter volunteers by selected mission
        const filteredVolunteers = allVolunteers.filter(volunteer => volunteer.missionId === selectedMissionId);
        displayVolunteers(filteredVolunteers);
        updateVolunteerCounts(filteredVolunteers);
        console.log("Selected mission:", selectedMissionId);
        console.log("Filtered volunteers:", filteredVolunteers.length);
    }
});