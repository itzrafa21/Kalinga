import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Mission form elements
const createMissionBtn = document.getElementById("createMissionBtn");
const missionTableBody = document.querySelector("#missionsTable tbody");

// Wait for auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/organization/login";
    return;
  }

  console.log("[SUCCESS] Logged in as:", user.uid);

  // Load missions from Firestore
  await loadMissions(user.uid);

  // Handle Create Mission
  if (createMissionBtn) {
    createMissionBtn.addEventListener("click", async () => {
      const missionName = document.getElementById("missionName").value.trim();
      const missionDate = document.getElementById("missionDate").value.trim();
      const missionLocation = document.getElementById("missionLocation").value.trim();
      const missionVolunteers = document.getElementById("missionVolunteers").value.trim();

      if (!missionName || !missionDate || !missionLocation || !missionVolunteers) {
        alert("[WARNING] Please fill out all mission fields.");
        return;
      }

      try {
        // Save to Firestore
        const missionRef = collection(db, "organizations", user.uid, "missions");
        await addDoc(missionRef, {
          name: missionName,
          date: missionDate,
          location: missionLocation,
          volunteers: missionVolunteers,
          status: "Open",
          createdAt: new Date()
        });

        alert("[SUCCESS] Mission created successfully!");
        await loadMissions(user.uid); // refresh table
      } catch (err) {
        console.error("[ERROR] Error creating mission:", err);
        alert("Error: " + err.message);
      }
    });
  }
});

// Function to load missions
async function loadMissions(orgId) {
  const missionRef = collection(db, "organizations", orgId, "missions");
  const snapshot = await getDocs(missionRef);

  missionTableBody.innerHTML = ""; // clear table
  snapshot.forEach((doc) => {
    const data = doc.data();
    const row = `
      <tr>
        <td>${data.name}</td>
        <td>${data.date}</td>
        <td>${data.location}</td>
        <td>${data.volunteers}</td>
        <td>${data.status}</td>
        <td>
          <button class="btn btn-warning btn-sm">Edit</button>
          <button class="btn btn-danger btn-sm">Delete</button>
        </td>
      </tr>
    `;
    missionTableBody.innerHTML += row;
  });
}
