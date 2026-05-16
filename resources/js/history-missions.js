import { auth, db } from "./firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

let CURRENT_USER = null;
let historySearchListenerAttached = false;

async function populateSidebarUser(user) {
    try {
        const snap = await getDoc(doc(db, "organizations", user.uid));
        const data = snap.exists() ? snap.data() : {};

        const displayName =
            (data?.name && String(data.name).trim()) ||
            (data?.orgName && String(data.orgName).trim()) ||
            user?.displayName ||
            user?.email ||
            "Organization";

        const sidebarNameEl = document.getElementById("sidebarUserName");
        const sidebarInitialEl = document.getElementById("sidebarUserInitial");
        const avatarWrap = document.querySelector(".sidebar-user-avatar");
        const avatarImg = document.getElementById("sidebarUserAvatarImg");

        if (sidebarNameEl) sidebarNameEl.textContent = displayName;
        if (sidebarInitialEl) {
            const ch = displayName.charAt(0);
            sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
        }

        if (avatarWrap && avatarImg) {
            const pic = data?.profilePictureBase64 || data?.profilePictureURL;
            if (pic) {
                avatarImg.src = pic;
                avatarWrap.classList.add("has-photo");
            } else {
                avatarImg.removeAttribute("src");
                avatarWrap.classList.remove("has-photo");
            }
        }
    } catch (err) {
        console.error("[ERROR] populateSidebarUser:", err);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }

    console.log("[SUCCESS] User logged in:", user.uid);
    CURRENT_USER = user;

    await populateSidebarUser(user);

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
                const status = (mission.status || "").toLowerCase();
                const mainMissionRef = doc(db, "missions", missionId);
                const mainMissionSnap = await getDoc(mainMissionRef);

                const showInHistory =
                    status === "rejected" || mainMissionSnap.exists();

                if (!showInHistory) {
                    try {
                        await deleteDoc(doc(db, "organizations", user.uid, "history", missionId));
                        removedMissionsCount++;
                    } catch (deleteError) {
                        console.error(`[ERROR] Error removing mission ${missionId} from history:`, deleteError);
                    }
                    continue;
                }

                validMissionsCount++;

                const actualVolunteers =
                    status === "rejected"
                        ? 0
                        : await getActualVolunteerCount(missionId);
                const totalNeeded = parseInt(mission.volunteers, 10) || 0;
                const volunteerDisplay =
                    status === "rejected"
                        ? "—"
                        : `${actualVolunteers}/${totalNeeded} volunteers`;

                if (status !== "rejected") {
                    totalVolunteersHelped += actualVolunteers;
                    // ... keep existing this-month logic if you want
                }

                const statusLabel =
                    status === "rejected" ? "Rejected" : "Completed";
                const statusClass =
                    status === "rejected" ? "status-rejected" : "status-completed";

                const row = `
                    <tr class="history-mission-row">
                        <td>${mission.missionName || mission.name || "Untitled"}</td>
                        <td>${mission.date || "N/A"}</td>
                        <td>${mission.location || "N/A"}</td>
                        <td>${volunteerDisplay}</td>
                        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    </tr>
                `;
                historyTableBody.insertAdjacentHTML("beforeend", row);
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
// (subcollection + root "applications", same sources as volunteer.js / mission-details.js)
async function getActualVolunteerCount(missionId) {
    const approvedKeys = new Set();

    const addIfApproved = (data, docId) => {
        const st = (data.status || "").toLowerCase();
        if (st !== "approved" && st !== "accepted") return;
        const u = data.userId;
        approvedKeys.add(u ? `u:${u}` : `d:${docId}`);
    };

    try {
        console.log(`[INFO] Getting volunteer count for mission: ${missionId}`);

        const applicationsSnapshot = await getDocs(
            collection(db, "missions", missionId, "applications")
        );
        applicationsSnapshot.forEach((docSnap) => {
            addIfApproved(docSnap.data(), docSnap.id);
        });

        let pendingCount = 0;
        applicationsSnapshot.forEach((docSnap) => {
            const st = (docSnap.data().status || "").toLowerCase();
            if (st === "pending") pendingCount++;
        });

        try {
            const rootQ = query(
                collection(db, "applications"),
                where("missionId", "==", missionId)
            );
            const rootSnap = await getDocs(rootQ);
            rootSnap.forEach((docSnap) => {
                addIfApproved(docSnap.data(), docSnap.id);
                const st = (docSnap.data().status || "").toLowerCase();
                if (st === "pending") pendingCount++;
            });
        } catch {
            try {
                const allRoot = await getDocs(collection(db, "applications"));
                allRoot.forEach((docSnap) => {
                    if (docSnap.data().missionId !== missionId) return;
                    addIfApproved(docSnap.data(), docSnap.id);
                    const st = (docSnap.data().status || "").toLowerCase();
                    if (st === "pending") pendingCount++;
                });
            } catch {
                /* ignore */
            }
        }

        const approvedCount = approvedKeys.size;
        console.log(
            `[INFO] Mission ${missionId} - Approved (unique): ${approvedCount}, Pending (partial): ${pendingCount}`
        );

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
