import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    loadPlatformConfig,
    populateMissionTypeSelect,
    computeMissionPointsPayload,
    isPlatformConfigReady,
} from "./mission-type-points.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/organization/login";
    return;
  }

  await loadPlatformConfig();

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

    populateMissionTypeSelect(document.getElementById("type"), {
      selectedValue: mission.type || "",
    });

    document.getElementById("name").value = mission.missionName || mission.name || "";
    document.getElementById("description").value = mission.description || "";
    document.getElementById("date").value = mission.date || "";
    document.getElementById("startTime").value = mission.startTime || "";
    document.getElementById("endTime").value = mission.endTime || "";
    document.getElementById("endDate").value = mission.endDate || "";
    document.getElementById("location").value = mission.location || "";
    document.getElementById("latitude").value = mission.latitude || "";
    document.getElementById("longitude").value = mission.longitude || "";
    document.getElementById("volunteers").value = mission.volunteers || 0;

    const autoAcceptEl = document.getElementById("autoAcceptVolunteers");
    if (autoAcceptEl) {
        autoAcceptEl.checked = mission.autoAcceptVolunteers === true;
    }

    const locationDisplay = document.getElementById("locationDisplay");
    if (locationDisplay && mission.location) {
      locationDisplay.textContent = mission.location;
    }

    if (typeof window.restoreMissionMapPin === "function") {
      window.restoreMissionMapPin();
    }

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

    const latVal = parseFloat(document.getElementById("latitude").value);
    const lngVal = parseFloat(document.getElementById("longitude").value);

    if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) {
      alert("Please pin a location on the map before saving.");
      return;
    }

    const locationLabel =
      document.getElementById("location").value?.trim() ||
      `Pinned location (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;

    const schedule = {
      type: document.getElementById("type").value?.trim() || "",
      date: document.getElementById("date").value,
      endDate: document.getElementById("endDate").value,
      startTime: document.getElementById("startTime").value,
      endTime: document.getElementById("endTime").value,
    };
    if (!schedule.type) {
      alert("Please select a mission type.");
      return;
    }
    if (!isPlatformConfigReady()) {
      alert(
        "Mission types and duration multipliers are not configured yet. Please contact an administrator."
      );
      return;
    }
    const pointsFields = await computeMissionPointsPayload(schedule);

    const updatedData = {
      missionName: document.getElementById("name").value,
      description: document.getElementById("description").value,
      type: schedule.type,
      date: schedule.date,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      ...pointsFields,
      basePoints: deleteField(),
      location: locationLabel,
      latitude: latVal,
      longitude: lngVal,
      volunteers: document.getElementById("volunteers").value,
      autoAcceptVolunteers:
        document.getElementById("autoAcceptVolunteers")?.checked === true,
    };

    console.log("[INFO] Updating mission with data:", updatedData);

    try {
      await updateDoc(docRef, updatedData);

      const submissionRef = doc(db, "mission_submissions", missionId);
      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
        await updateDoc(submissionRef, updatedData);
      }

      const globalRef = doc(db, "missions", missionId);
      const globalSnap = await getDoc(globalRef);
      if (globalSnap.exists()) {
        await updateDoc(globalRef, updatedData);
      }

      alert("[SUCCESS] Mission updated successfully!");
      window.location.href = "/organization/dashboard";
    } catch (error) {
      console.error("[ERROR] Error updating mission:", error?.code, error?.message, error);
      alert(
        error?.code === "permission-denied"
          ? "You do not have permission to update this mission."
          : "[ERROR] Failed to update mission. Please try again."
      );
    }
  });
});