import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

function getMissionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();

  if (!missionId) {
    container.textContent = "No mission ID provided.";
    return;
  }

  try {
    // Load from main missions collection (adjust path if needed)
    const missionRef = doc(db, "missions", missionId);
    const snap = await getDoc(missionRef);

    if (!snap.exists()) {
      container.textContent = "Mission not found.";
      return;
    }

    const mission = snap.data();

    container.innerHTML = `
    <div class="mission-details-card">
      <p><strong>Title:</strong> ${mission.missionName || "Untitled Mission"}</p>
      <p><strong>Type:</strong> ${mission.type || "N/A"}</p>
        <p><strong>Description:</strong> ${mission.description || "N/A"}</p>
        <p><strong>Date:</strong> ${mission.date || "N/A"}</p>
        <p><strong>End Date:</strong> ${mission.endDate || "N/A"}</p>
        <p><strong>Start Time:</strong> ${mission.startTime || "N/A"}</p>
        <p><strong>End Time:</strong> ${mission.endTime || "N/A"}</p>
        <p><strong>Location:</strong> ${mission.location || "N/A"}</p>
        <p><strong>Volunteers Needed:</strong> ${mission.volunteers || 0}</p>
        <p><strong>Status:</strong> ${mission.status || "N/A"}</p>
        <!-- Add any other fields (orgName, coordinates, image, etc.) here -->
      </div>  

      <div class="details-actions">
    <button class="edit-mission-btn" onclick="window.location.href='/missions/edit?id=${encodeURIComponent(missionId)}'">
      Edit Mission
    </button>
  </div>
    `;
  } catch (err) {
    console.error("Error loading mission details:", err);
    container.textContent = "Error loading mission details.";
  }
});