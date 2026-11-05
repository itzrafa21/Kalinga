import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getLevelForPoints, loadPlatformConfig } from "./platform-config.js";
import {
  computeGlobalVolunteerStats,
  readStoredProfileStats,
} from "./volunteer-stats.js";

const volunteerId = document.body.dataset.volunteerId || "";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isAdminEmail(email) {
  const value = String(email || "");
  return value.includes("@admin.kalinga.com") || value.includes("admin@");
}

function showText(value) {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "—";
}

function detailRow(iconClass, label, valueHtml, wide = false) {
  return `
    <div class="org-detail-row${wide ? " org-detail-row--wide" : ""}">
      <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
      <div class="org-detail-row__content">
        <span class="org-detail-row__label">${escapeHtml(label)}</span>
        <span class="org-detail-row__value">${valueHtml}</span>
      </div>
    </div>`;
}

function sectionLabel(title) {
  return `<div class="org-section-label">${escapeHtml(title)}</div>`;
}

function deriveVolunteerStatus(volunteer) {
  if (
    volunteer.disabled ||
    volunteer.accountStatus === "inactive" ||
    volunteer.accountStatus === "disabled"
  ) {
    return "Inactive";
  }
  if (volunteer.missionsJoined >= 5 || volunteer.totalPoints >= 150) {
    return "Top Performer";
  }
  return volunteer.missionsJoined > 0 ? "Active" : "Registered";
}

function statusBadgeClass(status) {
  switch (status) {
    case "Top Performer":
      return "top-performer";
    case "Active":
      return "active";
    case "Inactive":
      return "inactive";
    default:
      return "registered";
  }
}

function setStatus(message, isError = false) {
  const status = document.getElementById("volunteerPageStatus");
  const body = document.getElementById("volunteerPageBody");
  const footer = document.getElementById("volunteerPageFooter");
  if (body) body.hidden = true;
  if (footer) footer.hidden = true;
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

async function buildVolunteer(userId, data) {
  const name = data.name || data.displayName || data.fullName || "Volunteer";
  const email = data.email || "—";
  const totalPoints = Number(data.totalPoints) || 0;
  const stored = readStoredProfileStats(data);
  const global = await computeGlobalVolunteerStats(userId);

  const missionsJoined = Math.max(
    Number(data.missionsCompleted) || 0,
    stored.missionsCompleted,
    global.missionsCompleted,
    Number(data.applicationCount) || 0
  );
  const hoursVolunteered = Math.max(
    Number(data.totalVolunteerHours ?? data.hoursVolunteered) || 0,
    stored.totalHours,
    global.totalHours
  );

  return {
    id: userId,
    name,
    email,
    missionsJoined,
    hoursVolunteered,
    level: data.volunteerLevel || getLevelForPoints(totalPoints).name || "—",
    badgeCount: Array.isArray(data.badges) ? data.badges.length : 0,
    totalPoints,
    disabled: data.disabled === true,
    accountStatus: String(data.status || data.accountStatus || "").toLowerCase(),
    phone: data.phone || data.contactNumber || data.mobile || "",
    address: data.address || data.completeAddress || "",
  };
}

function renderVolunteer(volunteer) {
  const status = deriveVolunteerStatus(volunteer);
  const hoursLabel =
    volunteer.hoursVolunteered > 0 ? `${volunteer.hoursVolunteered}h` : "0h";

  return `
    <div class="org-fields">
      ${sectionLabel("Profile")}
      ${detailRow("fa-user", "Name:", showText(volunteer.name))}
      ${detailRow("fa-envelope", "Email:", showText(volunteer.email))}
      ${detailRow("fa-phone", "Phone:", showText(volunteer.phone))}
      ${detailRow("fa-map-marker-alt", "Address:", showText(volunteer.address), true)}
      ${detailRow(
        "fa-circle-check",
        "Status:",
        `<span class="vol-status-badge ${statusBadgeClass(status)}">${escapeHtml(status)}</span>`
      )}
      ${detailRow("fa-fingerprint", "User ID:", showText(volunteer.id), true)}
      ${sectionLabel("Activity")}
      ${detailRow("fa-bullseye", "Missions joined:", escapeHtml(String(volunteer.missionsJoined)))}
      ${detailRow("fa-clock", "Hours volunteered:", escapeHtml(hoursLabel))}
      ${detailRow("fa-layer-group", "Level:", showText(volunteer.level))}
      ${detailRow("fa-star", "Total points:", escapeHtml(String(volunteer.totalPoints)))}
      ${detailRow("fa-award", "Badges:", escapeHtml(String(volunteer.badgeCount)))}
    </div>`;
}

async function loadVolunteer() {
  if (!volunteerId) {
    setStatus("Missing volunteer ID.", true);
    return;
  }

  setStatus("Loading volunteer…");

  try {
    await loadPlatformConfig();
    const snap = await getDoc(doc(db, "users", volunteerId));
    if (!snap.exists()) {
      setStatus("Volunteer not found.", true);
      return;
    }

    const volunteer = await buildVolunteer(volunteerId, snap.data() || {});
    const body = document.getElementById("volunteerPageBody");
    const status = document.getElementById("volunteerPageStatus");
    const footer = document.getElementById("volunteerPageFooter");

    if (body) {
      body.innerHTML = renderVolunteer(volunteer);
      body.hidden = false;
    }
    if (status) status.hidden = true;
    if (footer) footer.hidden = false;
  } catch (error) {
    console.error("[ERROR] loadVolunteer:", error);
    setStatus("Could not load volunteer details.", true);
  }
}

document.getElementById("adminLogoutBtn")?.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!confirm("Are you sure you want to logout?")) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
  localStorage.removeItem("adminUser");
  window.location.href = "/admin/login";
});

onAuthStateChanged(auth, async (user) => {
  if (!user || !isAdminEmail(user.email)) {
    window.location.href = "/admin/login";
    return;
  }
  const email = user.email || "";
  const topbar = document.getElementById("adminEmail");
  const sidebar = document.getElementById("adminEmailSidebar");
  if (topbar) topbar.textContent = email;
  if (sidebar) sidebar.textContent = email;
  await loadVolunteer();
});
