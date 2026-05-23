import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  userHasApplicationForMission,
  upsertMissionVolunteer,
} from "./application-storage.js";

function getMissionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function escapeHtml(text) {
  const s = String(text ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDisplayDate(dateStr) {
  if (!dateStr || dateStr === "N/A") return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(dateStr));
  return escapeHtml(
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  );
}

function formatTimeLabel(t) {
  if (!t || t === "N/A") return "—";
  const raw = String(t).trim();
  if (/am|pm/i.test(raw)) {
    return escapeHtml(raw);
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return escapeHtml(raw);
  }
  let h = parseInt(match[1], 10);
  const minutes = match[2];
  if (Number.isNaN(h) || h < 0 || h > 23) {
    return escapeHtml(raw);
  }
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return escapeHtml(`${h12}:${minutes} ${period}`);
}

function statusPillClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "open" || s === "ongoing") return "mission-status--open";
  if (s === "approved") return "mission-status--approved";
  if (s === "pending") return "mission-status--pending";
  if (s === "rejected") return "mission-status--rejected";
  return "mission-status--muted";
}

async function fetchApplicantProfileExtras(uid) {
  if (!uid) return { phone: "" };
  try {
    const orgSnap = await getDoc(doc(db, "organizations", uid));
    if (!orgSnap.exists()) return { phone: "" };
    const d = orgSnap.data();
    return { phone: d.phone || d.mobileNumber || "" };
  } catch {
    return { phone: "" };
  }
}

async function countUniqueSignups(missionId) {
  const keys = new Set();
  try {
    const sub = await getDocs(collection(db, "missions", missionId, "applications"));
    sub.forEach((d) => {
      const u = d.data().userId;
      keys.add(u ? `u:${u}` : `d:${d.id}`);
    });
  } catch {
    /* ignore */
  }
  try {
    const q = query(collection(db, "applications"), where("missionId", "==", missionId));
    const root = await getDocs(q);
    root.forEach((d) => {
      const u = d.data().userId;
      keys.add(u ? `u:${u}` : `d:${d.id}`);
    });
  } catch {
    try {
      const all = await getDocs(collection(db, "applications"));
      all.forEach((d) => {
        if (d.data().missionId !== missionId) return;
        const u = d.data().userId;
        keys.add(u ? `u:${u}` : `d:${d.id}`);
      });
    } catch {
      /* ignore */
    }
  }
  return keys.size;
}

async function submitVolunteerApplication(missionId, user, mission = null) {
  const extras = await fetchApplicantProfileExtras(user.uid);
  if (await userHasApplicationForMission(missionId, user.uid)) {
    alert("You have already applied to this mission.");
    return;
  }
  let missionData = mission;
  if (!missionData) {
    const loaded = await loadMissionDocument(missionId, user);
    missionData = loaded?.mission || null;
  }
  const autoAccept = missionData?.autoAcceptVolunteers === true;
  const missionName =
    missionData?.missionName || missionData?.name || missionData?.title || "";
  const orgId = missionData?.orgId || missionData?.organizationId || "";
  const applicationPayload = {
    displayName: user.displayName || user.email?.split("@")[0] || "Applicant",
    email: user.email || "",
    mobileNumber: extras.phone || "",
    occupation: "N/A",
    status: autoAccept ? "approved" : "pending",
    appliedAt: serverTimestamp(),
    userId: user.uid,
    missionId,
    missionName,
    orgId,
  };
  if (autoAccept) {
    applicationPayload.approvedAt = serverTimestamp();
  }
  const applicationsCol = collection(db, "missions", missionId, "applications");
  const missionAppRef = await addDoc(applicationsCol, applicationPayload);

  let userAppId = null;
  try {
    const userAppRef = await addDoc(
      collection(db, "users", user.uid, "applications"),
      { ...applicationPayload }
    );
    userAppId = userAppRef.id;
  } catch (userWriteErr) {
    console.warn("[WARN] mirror application to users/", user.uid, userWriteErr);
  }

  if (autoAccept && orgId) {
    try {
      await upsertMissionVolunteer(orgId, missionId, user.uid, applicationPayload, {
        applicationId: missionAppRef.id,
        userApplicationId: userAppId,
      });
    } catch (rosterErr) {
      console.warn("[WARN] mission volunteer roster:", rosterErr);
    }
  }
  alert(
    autoAccept
      ? "You have been accepted for this mission."
      : "Your volunteer application was submitted."
  );
}

async function loadMissionDocument(missionId, user) {
  const globalSnap = await getDoc(doc(db, "missions", missionId));
  const globalData = globalSnap.exists() ? globalSnap.data() : null;
  let orgData = null;
  const orgId = globalData?.orgId || globalData?.organizationId;
  if (orgId) {
    const orgSnap = await getDoc(
      doc(db, "organizations", orgId, "missions", missionId)
    );
    if (orgSnap.exists()) orgData = orgSnap.data();
  }
  if (globalData || orgData) {
    return { mission: { ...orgData, ...globalData } };
  }
  if (user?.uid) {
    const volunteerOrgSnap = await getDoc(
      doc(db, "organizations", user.uid, "missions", missionId)
    );
    if (volunteerOrgSnap.exists()) {
      return { mission: volunteerOrgSnap.data() };
    }
  }
  const subSnap = await getDoc(doc(db, "mission_submissions", missionId));
  if (subSnap.exists()) {
    return { mission: subSnap.data() };
  }
  return null;
}


function renderRejectedMissionPage(container, mission, missionId, user) {
  const reason =
    (mission.rejectionReason || "").trim() ||
    "No reason was provided by the administrator.";
  const rejectedBy = mission.rejectedBy || "Administrator";

  let rejectedWhen = "—";
  if (mission.rejectedAt?.toDate) {
    rejectedWhen = mission.rejectedAt.toDate().toLocaleString();
  } else if (mission.rejectedAt) {
    rejectedWhen = new Date(mission.rejectedAt).toLocaleString();
  }

  const isOwner = Boolean(user && mission.orgId && mission.orgId === user.uid);

  container.innerHTML = `
    <motion.div class="mission-page">
      <header class="mission-hero">
        <div class="mission-hero__top">
          <span class="mission-kicker">Mission Details</span>
          <span class="mission-status-pill mission-status--rejected">Rejected</span>
        </div>
        <h1 class="mission-title">${escapeHtml(mission.missionName || "Untitled mission")}</h1>
        <div class="mission-hero__meta">
          <span class="mission-chip">${escapeHtml(mission.type || "General")}</span>
          <span class="mission-location"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(mission.location || "Location TBD")}</span>
        </div>
      </header>

      <div class="mission-body">
        <section class="mission-section">
          <h2 class="mission-label">Description</h2>
          <p class="mission-desc">${escapeHtml(mission.description || "No description provided.")}</p>
        </section>

        <div class="mission-divider"></div>

        <section class="mission-section mission-rejection-box">
          <h2 class="mission-label">Reason for rejection</h2>
          <p class="mission-rejection-reason">${escapeHtml(reason)}</p>
          <p class="mission-rejection-meta">
            Rejected by: ${escapeHtml(rejectedBy)}<br>
            Date: ${escapeHtml(rejectedWhen)}
          </p>
        </section>

                <motion.div class="mission-actions">
          <a class="mission-btn mission-btn--ghost" href="/organization/dashboard">← Dashboard</a>
        </div>
      </div>
    </div>
  `;
}

function renderMissionPage(container, mission, missionId, user, signedUp) {
  const status = mission.status || "N/A";
  const statusLower = status.toLowerCase();
  const needed = Math.max(0, parseInt(mission.volunteers, 10) || 0);
  const pct =
    needed > 0 ? Math.min(100, Math.round((signedUp / needed) * 100)) : signedUp > 0 ? 100 : 0;

  const orgId = mission.orgId;
  const isOwner = Boolean(user && orgId && orgId === user.uid);
  const canVolunteer =
    Boolean(user && orgId && orgId !== user.uid) &&
    ["open", "ongoing", "approved"].includes(statusLower);

  const actionsHtml = isOwner
    ? `<div class="mission-actions">
         <a class="mission-btn mission-btn--ghost" href="/organization/dashboard">← Dashboard</a>
         <a class="mission-btn mission-btn--primary" href="/missions/edit?id=${encodeURIComponent(missionId)}">Edit mission</a>
       </div>`
    : canVolunteer
      ? `<div class="mission-actions">
           <a class="mission-btn mission-btn--ghost" href="/organization/dashboard">← Dashboard</a>
           <button type="button" class="mission-btn mission-btn--primary" id="volunteerApplyBtn">Volunteer for this mission</button>
         </div>`
      : `<div class="mission-actions">
           <a class="mission-btn mission-btn--ghost" href="/organization/dashboard">← Dashboard</a>
         </div>`;

  container.innerHTML = `
    <div class="mission-page">
      <header class="mission-hero">
        <div class="mission-hero__top">
          <span class="mission-kicker">Mission Details</span>
          <span class="mission-status-pill ${statusPillClass(status)}">${escapeHtml(status)}</span>
        </div>
        <h1 class="mission-title">${escapeHtml(mission.missionName || "Untitled mission")}</h1>
        <div class="mission-hero__meta">
          <span class="mission-chip">${escapeHtml(mission.type || "General")}</span>
          <span class="mission-location"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(mission.location || "Location TBD")}</span>
        </div>
      </header>

      <div class="mission-body">
        <section class="mission-section">
          <h2 class="mission-label">Description</h2>
          <p class="mission-desc">${escapeHtml(mission.description || "No description provided.")}</p>
        </section>

        <div class="mission-divider"></div>

        <section class="mission-section mission-dt-grid">
          <div class="mission-dt-card">
            <span class="mission-dt-label">Start</span>
            <p class="mission-dt-date">${formatDisplayDate(mission.date)}</p>
            <p class="mission-dt-time">${formatTimeLabel(mission.startTime)}</p>
          </div>
          <div class="mission-dt-card">
            <span class="mission-dt-label">End</span>
            <p class="mission-dt-date">${formatDisplayDate(mission.endDate || mission.date)}</p>
            <p class="mission-dt-time">${formatTimeLabel(mission.endTime)}</p>
          </div>
        </section>

        <div class="mission-divider"></div>

        <section class="mission-section mission-vol">
          <div class="mission-vol__head">
            <span class="mission-label mission-label--inline">Volunteers needed</span>
            <span class="mission-vol__cap">${needed || "—"}</span>
          </div>
          <div class="mission-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="mission-progress__fill" style="width:${pct}%"></div>
          </div>
          <p class="mission-vol__sub">${signedUp} / ${needed || "—"} signed up</p>
        </section>

        ${actionsHtml}
      </div>
    </div>
  `;

  const volBtn = document.getElementById("volunteerApplyBtn");
  if (volBtn && user) {
    volBtn.addEventListener("click", async () => {
      volBtn.disabled = true;
      try {
        await submitVolunteerApplication(missionId, user, mission);
      } catch (err) {
        console.error(err);
        alert(err?.message || "Could not submit application.");
      } finally {
        volBtn.disabled = false;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();

  if (!container) return;
  if (!missionId) {
    container.innerHTML = `<p class="mission-error">No mission ID provided.</p>`;
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    try {
      const loaded = await loadMissionDocument(missionId, user);

      if (!loaded) {
        container.innerHTML = `<p class="mission-error">Mission not found.</p>`;
        return;
      }

      const mission = loaded.mission;
      const status = (mission.status || "").toLowerCase();

      if (status === "rejected") {
        renderRejectedMissionPage(container, mission, missionId, user);
        return;
      }

      const signedUp = await countUniqueSignups(missionId);
      renderMissionPage(container, mission, missionId, user, signedUp);
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="mission-error">Error loading mission details.</p>`;
    }
  });
});