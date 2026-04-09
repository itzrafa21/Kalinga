import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/organization/login";
    return;
  }

  // Get missionId from query param
  const urlParams = new URLSearchParams(window.location.search);
  const missionId = urlParams.get("id");
  
  console.log("[INFO] Mission ID from URL:", missionId); // Debug logging
  
  if (!missionId) {
    alert("No mission ID found!");
    window.location.href = "/organization/dashboard";
    return;
  }

  document.getElementById("missionId").value = missionId;

  // Fetch mission data
  const docRef = doc(db, "organizations", user.uid, "missions", missionId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const mission = docSnap.data();
    console.log("[INFO] Mission data loaded:", mission);
    
    document.getElementById("name").value = mission.missionName || mission.name || "";
    document.getElementById("description").value = mission.description || "";
    document.getElementById("type").value = mission.type || "";
    document.getElementById("date").value = mission.date || "";
    document.getElementById("startTime").value = mission.startTime || "";
    document.getElementById("endTime").value = mission.endTime || "";
    document.getElementById("endDate").value = mission.endDate || "";
    document.getElementById("location").value = mission.location || "";
    document.getElementById("latitude").value = mission.latitude || "";
    document.getElementById("longitude").value = mission.longitude || "";
    document.getElementById("volunteers").value = mission.volunteers || 0;
    
    //  Removed status field access since it was removed from HTML
    // document.getElementById("status").value = mission.status || "Open";
    
    console.log("[SUCCESS] Mission form populated successfully");
  } else {
    console.error("[ERROR] Mission not found in database");
    alert("Mission not found!");
    window.location.href = "/organization/dashboard";
  }

  // Save changes
  document.getElementById("editMissionForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const updatedData = {
      missionName: document.getElementById("name").value,
      description: document.getElementById("description").value,
      type: document.getElementById("type").value,
      date: document.getElementById("date").value,
      endDate: document.getElementById("endDate").value,
      startTime: document.getElementById("startTime").value,
      endTime: document.getElementById("endTime").value,
      location: document.getElementById("location").value,
      latitude: document.getElementById("latitude").value,
      longitude: document.getElementById("longitude").value,
      volunteers: document.getElementById("volunteers").value,
    };
    
    console.log("[INFO] Updating mission with data:", updatedData); //  Debug logging
    
    try {
      // Update both collections (organization subcollection and global missions)
      await updateDoc(docRef, updatedData);
      await updateDoc(doc(db, "missions", missionId), updatedData);

      alert("[SUCCESS] Mission updated successfully!");
      window.location.href = "/organization/dashboard";
    } catch (error) {
      console.error("[ERROR] Error updating mission:", error);
      alert("[ERROR] Failed to update mission. Please try again.");
    }
  });
});
