import { auth, db } from "./firebase";
import { collection, getDocs, query, doc, deleteDoc, setDoc, updateDoc, getDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

let CURRENT_USER = null;

// When user is logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }

    console.log("[SUCCESS] User logged in:", user.uid);
    CURRENT_USER = user;

    // Load missions the first time
    await loadMissions(user);
    
    // Set up automatic status updates every 1 minute (more frequent)
    setInterval(async () => {
        if (CURRENT_USER) {
            await updateMissionStatuses(CURRENT_USER);
            await loadMissions(CURRENT_USER);
        }
    }, 1 * 60 * 1000); // 1 minute instead of 5
});

//  Function to update mission statuses automatically
async function updateMissionStatuses(user) {
    try {
        console.log("[INFO] Updating mission statuses...");
        
        const missionsRef = collection(db, "organizations", user.uid, "missions");
        const snapshot = await getDocs(missionsRef);
        
        let updatedCount = 0;
        
        for (const docSnap of snapshot.docs) {
            const mission = docSnap.data();
            const missionId = docSnap.id;
            
            // Skip pending missions
            if (mission.status === "Pending" || mission.status === "pending") {
                continue;
            }

            if (newStatus === "Completed") {
                await closePendingApplicationsForMission(missionId);
            }
            
            const newStatus = calculateMissionStatus(mission);
            
            if (newStatus !== mission.status) {
                console.log(`[INFO] Updating mission ${missionId}: ${mission.status} → ${newStatus}`);
                
                // Update in organization's missions
                await updateDoc(doc(db, "organizations", user.uid, "missions", missionId), {
                    status: newStatus,
                    lastStatusUpdate: new Date()
                });
                
                // Also update in global missions collection
                try {
                    await updateDoc(doc(db, "missions", missionId), {
                        status: newStatus,
                        lastStatusUpdate: new Date()
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

//  Calculate what a mission's status should be
function calculateMissionStatus(mission) {
    const now = new Date();
    const startDate = mission.date;
    const endDate = mission.endDate || mission.date;
    const startTime = mission.startTime;
    const endTime = mission.endTime;

    if (!startDate || !endDate || !startTime || !endTime) {
        console.log("[WARNING] Mission missing date/time info:", mission);
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
            console.warn("[WARNING] End before start; treating end as after start:", mission.missionName);
            endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
        }

        console.log("[INFO] Status calculation for mission:", {
            missionName: mission.missionName,
            now: now.toISOString(),
            missionStart: missionDateTime.toISOString(),
            missionEnd: endDateTime.toISOString(),
        });

        if (now < missionDateTime) {
            return "Open";
        }
        if (now >= missionDateTime && now <= endDateTime) {
            return "Ongoing";
        }
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

//  Parse 12-hour time format
function parse12HourTime(date, time12hr) {
    const [time, period] = time12hr.split(' ');
    const [hours, minutes] = time.split(':');
    
    let hour24 = parseInt(hours);
    
    if (period === 'AM') {
        if (hour24 === 12) hour24 = 0; // 12 AM = 00:00
    } else if (period === 'PM') {
        if (hour24 !== 12) hour24 += 12; // Add 12 except for 12 PM
    }
    
    return new Date(`${date}T${hour24.toString().padStart(2, '0')}:${minutes}`);
}

// Function to fetch and render missions
async function loadMissions(user) {
    const missionsTableBody = document.getElementById("missionsBody");
    const missionsRef = collection(db, "organizations", user.uid, "missions");
    const missionsQuery = query(missionsRef);

    try {
        const snapshot = await getDocs(missionsQuery);
        missionsTableBody.innerHTML = "";

        if (snapshot.empty) {
            console.log("No missions found!");
            document.getElementById("totalMissions").innerText = "Total Missions: 0";
            document.getElementById("ongoingMissions").innerText = "Ongoing Missions: 0";
            return;
        }

        let totalCount = 0;
        let ongoingCount = 0;
        const today = new Date();

        snapshot.forEach((docSnap) => {
            const mission = docSnap.data();
            const normalizedStatus = (mission.status || "").toLowerCase();

            // Rejected → move to history, do not show on dashboard
            if (normalizedStatus === "rejected") {
                console.log(`[INFO] Moving rejected mission "${mission.missionName}" to history`);
                moveMissionToHistory(user.uid, docSnap.id, mission);
                return;
            }

            const shouldMoveToHistory = shouldMoveMissionToHistory(mission, today);

            if (shouldMoveToHistory) {
                console.log(`[INFO] Moving mission "${mission.missionName}" to history`);
                moveMissionToHistory(user.uid, docSnap.id, mission);
                return;
            }

            totalCount++;

            const isMissionOngoing =
                normalizedStatus === "open" ||
                normalizedStatus === "ongoing" ||
                (normalizedStatus === "completed" && isMissionInFuture(mission));

            if (isMissionOngoing) {
                ongoingCount++;
            }

            const row = `
                <tr>
                    <td>${mission.missionName || "Untitled"}</td>
                    <td>${mission.description || "N/A"}</td>
                    <td>${mission.type || "N/A"}</td>
                    <td>${mission.volunteers || 0}</td>
                    <td><span class="badge ${getStatusBadgeClass(mission.status)}">${mission.status || "N/A"}</span></td>
                    <td>
                    <button class="edit-btn view-details-btn" data-id="${docSnap.id}">View Details</button>
                    </td>
                </tr>
            `;
            missionsTableBody.insertAdjacentHTML("beforeend", row);
        });

        // Update counters
        document.getElementById("totalMissions").innerText = `Total Missions: ${totalCount}`;
        document.getElementById("ongoingMissions").innerText = `Ongoing Missions: ${ongoingCount}`;
        
        console.log(`[SUCCESS] Loaded ${totalCount} missions, ${ongoingCount} ongoing`);
        
    } catch (error) {
        console.error("Error fetching missions: ", error);
    }
}

//  Check if mission should be moved to history (FIXED)
function shouldMoveMissionToHistory(mission, today) {
    // Pending missions should stay on the dashboard until admin acts
    const status = (mission.status || '').toLowerCase();
    if (status === 'pending') {
        return false;
    }

    const endDate = mission.endDate || mission.date;
    if (!endDate || !mission.endTime) {
        return false;
    }

    try {
        let missionEndDateTime;

        if (mission.endTime.includes('AM') || mission.endTime.includes('PM')) {
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

//  Check if mission is in the future
function isMissionInFuture(mission) {
    if (!mission.date || !mission.startTime) return false;
    
    try {
        let missionStartDateTime;
        
        if (mission.startTime.includes('AM') || mission.startTime.includes('PM')) {
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

//  Move mission to history (merge global missions/{id} so volunteers etc. stay correct)
async function moveMissionToHistory(orgId, missionId, mission) {
    try {
        const historyRef = doc(db, "organizations", orgId, "history", missionId);

        let payload = { ...mission, movedToHistoryAt: new Date() };

        try {
            const globalSnap = await getDoc(doc(db, "missions", missionId));
            if (globalSnap.exists()) {
                const globalData = globalSnap.data();
                // Global doc wins on overlapping keys (fixes stale volunteers on org snapshot)
                payload = { ...mission, ...globalData, movedToHistoryAt: new Date() };
            }
        } catch (e) {
            console.warn("[WARNING] Could not read global mission for merge:", missionId, e);
        }

        await setDoc(historyRef, payload);

        await deleteDoc(doc(db, "organizations", orgId, "missions", missionId));

        console.log(`[SUCCESS] Mission "${mission.missionName}" moved to history`);
    } catch (error) {
        console.error("[ERROR] Error moving mission to history:", error);
    }
}

//  Get status badge class
function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'open': return 'bg-primary';
        case 'ongoing': return 'bg-info';
        case 'completed': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Convert time from 24hr to 12hr format
function formatTime(time) {
    if (time === "N/A" || !time) return "N/A";
    const [hour, minute] = time.split(':');
    let suffix = "AM";
    let formattedHour = parseInt(hour);

    if (formattedHour >= 12) {
        suffix = "PM";
        if (formattedHour > 12) formattedHour -= 12;
    } else if (formattedHour === 0) {
        formattedHour = 12;  // Midnight
    }

    return `${formattedHour}:${minute} ${suffix}`;
}

//  Event delegation for edit/delete
document.getElementById("missionsBody")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    if (!editBtn && !deleteBtn) return;
    if (!CURRENT_USER) return;

    const missionId = (editBtn || deleteBtn).dataset.id;

    if (editBtn) {
        window.location.href = `/missions/details?id=${encodeURIComponent(missionId)}`;
        return;
      }

    if (deleteBtn) {
        if (!confirm("Are you sure you want to delete this mission?")) return;

        try {
            await deleteDoc(doc(db, "organizations", CURRENT_USER.uid, "missions", missionId));
            await deleteDoc(doc(db, "missions", missionId)); // also delete global mission
            alert("[SUCCESS] Mission deleted!");
            await loadMissions(CURRENT_USER); // refresh table and counters
        } catch (err) {
            console.error("Error deleting mission:", err);
            alert("[ERROR] Failed to delete mission.");
        }
    }
});
