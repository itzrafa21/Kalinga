import { auth, db } from "./firebase";
import { collection, getDocs, query, doc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

let CURRENT_USER = null;
let historySearchListenerAttached = false;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }

    console.log("[SUCCESS] User logged in:", user.uid);
    CURRENT_USER = user;

    // Load missions for this user
    await loadHistoryMissions(user);
});

function updateHistoryMissionFooter(visibleCount) {
    const el = document.getElementById("historyCountText");
    if (!el) return;
    el.textContent =
        visibleCount === 1 ? "Showing 1 mission" : `Showing ${visibleCount} missions`;
}

function filterHistoryMissionsTable() {
    const tbody = document.getElementById("historyMissionsBody");
    if (!tbody) return;

    const q = (document.getElementById("historySearch")?.value || "").trim().toLowerCase();
    const rows = tbody.querySelectorAll("tr.history-mission-row");
    let visible = 0;

    rows.forEach((tr) => {
        const name = (tr.cells[0]?.textContent || "").toLowerCase();
        const date = (tr.cells[1]?.textContent || "").toLowerCase();
        const loc = (tr.cells[2]?.textContent || "").toLowerCase();
        const haystack = `${name} ${date} ${loc}`;
        const match = !q || haystack.includes(q);
        tr.style.display = match ? "" : "none";
        if (match) visible++;
    });

    updateHistoryMissionFooter(visible);
}

function ensureHistorySearchListener() {
    const input = document.getElementById("historySearch");
    if (!input) return;

    if (!historySearchListenerAttached) {
        historySearchListenerAttached = true;
        input.addEventListener("input", filterHistoryMissionsTable);
    }

    filterHistoryMissionsTable();
}

// Function to fetch and render completed missions
async function loadHistoryMissions(user) {
    const historyTableBody = document.getElementById("historyMissionsBody");
    
    try {
        console.log("[INFO] Loading history missions...");
        
        // Load from history collection
        const historyRef = collection(db, "organizations", user.uid, "history");
        const historyQuery = query(historyRef);
        const historySnapshot = await getDocs(historyQuery);

        historyTableBody.innerHTML = "";

        if (historySnapshot.empty) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon"><i class="bi bi-clipboard"></i></div>
                        <h4>No completed missions found</h4>
                        <p>Missions will appear here once they are completed</p>
                    </td>
                </tr>
            `;
            console.log("[INFO] No missions in history collection");
            return;
        }

        console.log(`[INFO] Found ${historySnapshot.docs.length} missions in history collection`);

        let validMissionsCount = 0;
        let removedMissionsCount = 0;
        let totalVolunteersHelped = 0;
        let thisMonthCount = 0;

        // Check each mission in history to see if it still exists in the main missions collection
        for (const docSnap of historySnapshot.docs) {
            const mission = docSnap.data();
            const missionId = docSnap.id;
            
            console.log(`[INFO] Checking mission: ${mission.missionName || mission.name || "Untitled"} (ID: ${missionId})`);

            try {
                // Check if this mission still exists in the main missions collection
                const mainMissionRef = doc(db, "missions", missionId);
                const mainMissionSnap = await getDoc(mainMissionRef);
                
                if (mainMissionSnap.exists()) {
                    // Mission still exists in main collection, show it in history
                    validMissionsCount++;
                    
                    // Get actual volunteer count from mission applications
                    const actualVolunteers = await getActualVolunteerCount(missionId);
                    const totalNeeded = parseInt(mission.volunteers) || 0;
                    
                    // Format volunteer display
                    const volunteerDisplay = `${actualVolunteers}/${totalNeeded} volunteers`;
                    
                    // Add to stats
                    totalVolunteersHelped += actualVolunteers;
                    
                    // Check if mission was completed this month
                    if (mission.date) {
                        const missionDate = new Date(mission.date);
                        const now = new Date();
                        if (missionDate.getMonth() === now.getMonth() && 
                            missionDate.getFullYear() === now.getFullYear()) {
                            thisMonthCount++;
                        }
                    }
                    
                    const row = `
                        <tr class="history-mission-row">
                            <td>${mission.missionName || mission.name || "Untitled"}</td>
                            <td>${mission.date || "N/A"}</td>
                            <td>${mission.location || "N/A"}</td>
                            <td>${volunteerDisplay}</td>
                            <td><span class="status-badge status-completed">Completed</span></td>
                        </tr>
                    `;
                    historyTableBody.insertAdjacentHTML("beforeend", row);
                    
                    console.log(`[SUCCESS] Mission ${missionId} - Volunteers: ${volunteerDisplay}`);
                } else {
                    // Mission no longer exists in main collection, remove it from history
                    console.log(`[WARNING] [Mission ${missionId} no longer exists in main collection, removing from history`);
                    
                    try {
                        await deleteDoc(doc(db, "organizations", user.uid, "history", missionId));
                        removedMissionsCount++;
                        console.log(`[INFO] Removed mission ${missionId} from history`);
                    } catch (deleteError) {
                        console.error(`[ERROR] Error removing mission ${missionId} from history:`, deleteError);
                    }
                }
            } catch (checkError) {
                console.error(`[ERROR] Error checking mission ${missionId}:`, checkError);
                // If there's an error checking, we'll skip this mission
            }
        }

        // Update stats
        updateStats(validMissionsCount, thisMonthCount, totalVolunteersHelped);

        // If no valid missions remain, show empty message
        if (validMissionsCount === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon"><i class="bi bi-clipboard"></i></div>
                        <h4>No completed missions found</h4>
                        <p>Missions will appear here once they are completed</p>
                    </td>
                </tr>
            `;
            updateHistoryMissionFooter(0);
        } else {
            ensureHistorySearchListener();
        }

        console.log(`[SUCCESS] History cleanup complete:`);
        console.log(`   - Valid missions shown: ${validMissionsCount}`);
        console.log(`   - Removed missions: ${removedMissionsCount}`);
        console.log(`   - Total volunteers helped: ${totalVolunteersHelped}`);
        
        // Show a message if missions were cleaned up
        if (removedMissionsCount > 0) {
            console.log(`[INFO] Cleaned up ${removedMissionsCount} deleted missions from history`);
        }

    } catch (error) {
        console.error("[ERROR] Error fetching history missions:", error);
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon"><i class="bi bi-x-circle"></i></div>
                    <h4>Error loading missions</h4>
                    <p>Please refresh the page and try again</p>
                </td>
            </tr>
        `;
        updateHistoryMissionFooter(0);
    }
}

// Function to get actual volunteer count from mission applications
async function getActualVolunteerCount(missionId) {
    try {
        console.log(`[INFO] Getting volunteer count for mission: ${missionId}`);
        
        // Check applications in the main missions collection
        const applicationsRef = collection(db, "missions", missionId, "applications");
        const applicationsQuery = query(applicationsRef);
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        let approvedCount = 0;
        let pendingCount = 0;
        
        applicationsSnapshot.forEach((docSnap) => {
            const application = docSnap.data();
            if (application.status === "approved" || application.status === "accepted") {
                approvedCount++;
            } else if (application.status === "pending") {
                pendingCount++;
            }
        });
        
        console.log(`[INFO] Mission ${missionId} - Approved: ${approvedCount}, Pending: ${pendingCount}`);
        
        // Return approved volunteers (you can change this to include pending if needed)
        return approvedCount;
        
    } catch (error) {
        console.error(`[ERROR] Error getting volunteer count for mission ${missionId}:`, error);
        return 0;
    }
}

// Function to update stats cards
function updateStats(totalCompleted, thisMonth, totalVolunteers) {
    document.getElementById("totalCompletedMissions").textContent = totalCompleted;
    document.getElementById("thisMonthMissions").textContent = thisMonth;
    document.getElementById("totalVolunteersHelped").textContent = totalVolunteers;
    
    console.log(`[INFO] Stats updated - Completed: ${totalCompleted}, This Month: ${thisMonth}, Volunteers: ${totalVolunteers}`);
}
