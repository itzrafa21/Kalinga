import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  userHasApplicationForMission,
  upsertMissionVolunteer,
  getApplicationDocRef,
  syncMissionVolunteerRoster,
  applicationDedupeKey,
  STORAGE_MISSIONS_SUB,
  STORAGE_ORG_ROSTER,
} from "./application-storage.js";
import {
  resolveMissionPoints,
  loadPlatformConfig,
  computeMissionDurationHours,
} from "./mission-type-points.js";

let pendingRejectVolunteer = null;
let currentMissionContext = null;

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

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

function formatDisplayDate(dateStr) {
  if (!dateStr || dateStr === "N/A") return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatWeekday(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function formatTimeLabel(t) {
  if (!t || t === "N/A") return "";
  const raw = String(t).trim();
  if (/am|pm/i.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;
  let h = parseInt(match[1], 10);
  const minutes = match[2];
  if (Number.isNaN(h) || h < 0 || h > 23) return raw;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${minutes} ${period}`;
}

function formatTimeRange(mission) {
  const start = formatTimeLabel(mission.startTime);
  const end = formatTimeLabel(mission.endTime);
  if (start && end) return `${start} – ${end}`;
  return start || end || "—";
}

function formatDurationHuman(mission) {
  const hours = mission.durationHours ?? computeMissionDurationHours(mission);
  if (!hours || hours <= 0) return "";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h} hour${h !== 1 ? "s" : ""} ${m} min`;
  if (h) return `${h} hour${h !== 1 ? "s" : ""}`;
  return `${m} min`;
}

function splitLocation(mission) {
  const raw = (mission.location || "").trim();
  if (!raw) return { line1: "Location TBD", line2: "" };
  if (mission.locationSub) {
    return { line1: raw, line2: mission.locationSub };
  }
  const idx = raw.indexOf(",");
  if (idx > 0) {
    return {
      line1: raw.slice(0, idx).trim(),
      line2: raw.slice(idx + 1).trim(),
    };
  }
  return { line1: raw, line2: "" };
}

function pointsBreakdown(mission) {
  const pts = resolveMissionPoints(mission);
  const base = mission.basePoints ?? mission.typeBasePoints;
  const mult = mission.pointsMultiplier;
  const hours = Math.round(
    mission.durationHours ?? computeMissionDurationHours(mission) ?? 0
  );
  if (base != null && mult != null) {
    return `${base} base × ×${mult} (${hours}h)`;
  }
  if (pts) return `${pts} mission points`;
  return "";
}

function missionStatusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "open" || s === "ongoing" || s === "approved")
    return { cls: "md-b-green", label: status || "Open" };
  if (s === "pending") return { cls: "md-b-amber", label: "Pending" };
  if (s === "rejected") return { cls: "md-b-red", label: "Rejected" };
  if (s === "closed" || s === "completed" || s === "history")
    return { cls: "md-b-gray", label: status || "Closed" };
  return { cls: "md-b-gray", label: status || "—" };
}

function volunteerStatusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "accepted")
    return { cls: "md-b-green", label: "Confirmed" };
  if (s === "pending") return { cls: "md-b-amber", label: "Pending" };
  if (s === "rejected") return { cls: "md-b-red", label: "Rejected" };
  if (s === "closed") return { cls: "md-b-gray", label: "Closed" };
  return { cls: "md-b-gray", label: status || "—" };
}

function formatJoinedDate(ts) {
  if (!ts) return "—";
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts?.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLastUpdated(mission) {
  const ts =
    mission.updatedAt || mission.approvedAt || mission.createdAt || mission.submittedAt;
  if (!ts) return "";
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts?.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `Last updated ${d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

async function fetchUserFieldsForVolunteer(userId) {
  if (!userId) return {};
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return {};
    const u = snap.data();
    return {
      name: u.name || u.displayName || "",
      email: u.email || "",
      phone: u.phone || u.mobileNumber || u.mobile || "",
    };
  } catch {
    return {};
  }
}

async function fetchApplicantProfileExtras(uid) {
  if (!uid) return { phone: "" };
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const d = userSnap.data();
      return {
        phone: d.phone || d.mobileNumber || d.mobile || "",
      };
    }
  } catch {
    /* ignore */
  }
  return { phone: "" };
}

async function countUniqueSignups(missionId) {
  const keys = new Set();
  try {
    const sub = await getDocs(collection(db, "missions", missionId, "applications"));
    sub.forEach((d) => {
      const data = d.data();
      const u = data.userId;
      const st = (data.status || "").toLowerCase();
      if (st === "rejected") return;
      keys.add(u ? `u:${u}` : `d:${d.id}`);
    });
  } catch {
    /* ignore */
  }
  return keys.size;
}

async function loadMissionVolunteers(missionId, orgId) {
  const list = [];
  const seen = new Set();

  const push = (v) => {
    const key = applicationDedupeKey(missionId, v.userId, v.id);
    if (seen.has(key)) return;
    seen.add(key);
    list.push(v);
  };

  if (orgId) {
    try {
      const rosterSnap = await getDocs(
        collection(db, "organizations", orgId, "missions", missionId, "volunteers")
      );
      for (const docSnap of rosterSnap.docs) {
        const data = docSnap.data();
        const userId = data.userId || docSnap.id;
        let name = data.displayName || data.name || "";
        let email = data.email || "";
        if ((!name || !email) && userId) {
          const profile = await fetchUserFieldsForVolunteer(userId);
          name = name || profile.name;
          email = email || profile.email;
        }
        push({
          id: data.applicationId || data.userApplicationId || docSnap.id,
          userApplicationId: data.userApplicationId || "",
          storage: STORAGE_ORG_ROSTER,
          userId,
          name: name || (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
          email: email || "N/A",
          status: data.status || "approved",
          appliedAt: data.appliedAt || data.approvedAt || null,
          orgId,
          missionId,
          missionPoints: data.missionPoints,
        });
      }
    } catch (err) {
      console.warn("[WARN] mission roster:", err);
    }
  }

  try {
    const appSnap = await getDocs(
      collection(db, "missions", missionId, "applications")
    );
    for (const docSnap of appSnap.docs) {
      const data = docSnap.data();
      const userId = data.userId || "";
      const key = applicationDedupeKey(missionId, userId, docSnap.id);
      if (seen.has(key)) continue;
      let name = data.displayName || data.name || "";
      let email = data.email || "";
      if ((!name || !email) && userId) {
        const profile = await fetchUserFieldsForVolunteer(userId);
        name = name || profile.name;
        email = email || profile.email;
      }
      push({
        id: docSnap.id,
        storage: STORAGE_MISSIONS_SUB,
        userId,
        name: name || (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
        email: email || "N/A",
        status: data.status || "pending",
        appliedAt: data.appliedAt || data.createdAt || null,
        orgId: data.orgId || orgId || "",
        missionId,
        userApplicationId: data.userApplicationId || "",
      });
    }
  } catch (err) {
    console.warn("[WARN] mission applications:", err);
  }

  return list;
}

async function syncApplicationStatusToCopies(volunteer, missionId, payload, orgId) {
  if (!volunteer.userId) return;

  try {
    if (
      volunteer.storage === STORAGE_ORG_ROSTER
    ) {
      const missionSnap = await getDocs(
        query(
          collection(db, "missions", missionId, "applications"),
          where("userId", "==", volunteer.userId)
        )
      );
      for (const mDoc of missionSnap.docs) {
        await updateDoc(mDoc.ref, payload);
      }
    } else {
      const userSnap = await getDocs(
        query(
          collection(db, "users", volunteer.userId, "applications"),
          where("missionId", "==", missionId)
        )
      );
      for (const uDoc of userSnap.docs) {
        await updateDoc(uDoc.ref, payload);
      }
    }
  } catch (syncErr) {
    console.warn("[WARN] sync application status:", syncErr);
  }

  const resolvedOrgId = orgId || volunteer.orgId || "";
  await syncMissionVolunteerRoster(
    resolvedOrgId,
    missionId,
    volunteer.userId,
    payload.status,
    { ...volunteer, ...payload },
    { applicationId: volunteer.id }
  );
}

async function updateApplicationStatus(volunteer, missionId, newStatus, options = {}) {
  const rejectionReason = (options.rejectionReason || "").trim();
  const payload = {
    status: newStatus,
    updatedAt: new Date(),
  };
  if (newStatus === "rejected") {
    payload.rejectionReason = rejectionReason;
    payload.rejectedAt = new Date();
  }
  if (newStatus === "approved" || newStatus === "accepted") {
    payload.approvedAt = new Date();
  }

  await updateDoc(getApplicationDocRef(volunteer), payload);
  const orgId =
    volunteer.orgId ||
    currentMissionContext?.mission?.orgId ||
    currentMissionContext?.mission?.organizationId ||
    "";
  await syncApplicationStatusToCopies(volunteer, missionId, payload, orgId);
}

function openRejectModal(volunteer) {
  pendingRejectVolunteer = volunteer;
  const overlay = document.getElementById("rejectReasonModal");
  const input = document.getElementById("rejectReasonInput");
  const err = document.getElementById("rejectReasonError");
  if (!overlay) return;
  if (input) input.value = "";
  if (err) err.textContent = "";
  overlay.hidden = false;
  overlay.classList.add("is-open");
  input?.focus();
}

function closeRejectModal() {
  pendingRejectVolunteer = null;
  const overlay = document.getElementById("rejectReasonModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.hidden = true;
}

function wireRejectModal(missionId) {
  const overlay = document.getElementById("rejectReasonModal");
  const cancel = document.getElementById("rejectModalCancel");
  const confirm = document.getElementById("rejectModalConfirm");
  if (!overlay || overlay.dataset.wired === "1") return;
  overlay.dataset.wired = "1";

  cancel?.addEventListener("click", closeRejectModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeRejectModal();
  });

  confirm?.addEventListener("click", async () => {
    const volunteer = pendingRejectVolunteer;
    const input = document.getElementById("rejectReasonInput");
    const err = document.getElementById("rejectReasonError");
    const reason = (input?.value || "").trim();
    if (!volunteer) return;
    if (!reason) {
      if (err) err.textContent = "Please enter a rejection reason.";
      return;
    }
    if (err) err.textContent = "";
    confirm.disabled = true;
    try {
      await updateApplicationStatus(volunteer, missionId, "rejected", {
        rejectionReason: reason,
      });
      closeRejectModal();
      await refreshMissionDetails();
    } catch (e) {
      console.error(e);
      alert("Could not reject application. Try again.");
    } finally {
      confirm.disabled = false;
    }
  });
}

function rosterRowHtml(v, mission, missionPoints, durationHours, isOwner) {
  const st = volunteerStatusBadge(v.status);
  const norm = (v.status || "").toLowerCase();
  const showActions = isOwner && norm === "pending";
  const hoursLabel =
    norm === "rejected"
      ? '<span class="md-dash">—</span>'
      : durationHours
        ? `${Math.round(durationHours)}h`
        : '<span class="md-dash">—</span>';
  const pts =
    norm === "rejected"
      ? '<span class="md-dash">—</span>'
      : `<span class="md-pts-val">${escapeHtml(String(v.missionPoints ?? missionPoints ?? "—"))}</span>`;

  const actionButtons = showActions
    ? `<div class="md-action-group">
        <button type="button" class="md-btn md-btn-outline-g md-btn-xs md-approve-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
          <i class="ti ti-check" aria-hidden="true"></i> Approve
        </button>
        <button type="button" class="md-btn md-btn-r md-btn-xs md-reject-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
          <i class="ti ti-x" aria-hidden="true"></i> Reject
        </button>
      </div>`
    : "";

  const statusActionsCell = `
    <div class="md-status-actions">
      <span class="md-badge ${st.cls}">${escapeHtml(st.label)}</span>
      ${actionButtons}
    </div>`;

  return `
    <tr data-volunteer-id="${escapeHtml(v.id)}">
      <td>
        <div class="md-name-cell">
          <div class="md-av">${escapeHtml(initials(v.name))}</div>
          ${escapeHtml(v.name)}
        </div>
      </td>
      <td class="md-muted">${escapeHtml(v.email)}</td>
      <td class="md-muted">${escapeHtml(formatJoinedDate(v.appliedAt))}</td>
      <td class="md-muted">${hoursLabel}</td>
      <td>${pts}</td>
      <td>${statusActionsCell}</td>
      <td>
        <button type="button" class="md-btn md-btn-xs md-view-volunteer" data-name="${escapeHtml(v.name)}" data-email="${escapeHtml(v.email)}" title="View volunteer">
          <i class="ti ti-eye" aria-hidden="true"></i> View
        </button>
      </td>
    </tr>`;
}

function renderRosterSection(volunteers, mission, isOwner) {
  if (!isOwner) return "";

  const missionPoints = resolveMissionPoints(mission);
  const durationHours =
    mission.durationHours ?? computeMissionDurationHours(mission);

  const rows =
    volunteers.length > 0
      ? volunteers
          .map((v) => rosterRowHtml(v, mission, missionPoints, durationHours, isOwner))
          .join("")
      : "";

  const tableBody = volunteers.length
    ? rows
    : `<tr><td colspan="7"><div class="md-empty-roster">No volunteer applications yet.</div></td></tr>`;

  return `
    <section class="md-card md-card--table">
      <div class="md-roster-head">
        <span class="md-sec-label md-sec-label--title">Volunteer List</span>
        <span class="md-badge md-b-gray">${volunteers.length} total</span>
      </div>
      <div class="md-table-wrap">
        <table class="md-table">
          <thead>
            <tr>
              <th style="width:20%">Name</th>
              <th style="width:22%">Email</th>
              <th style="width:11%">Date joined</th>
              <th style="width:8%">Hours</th>
              <th style="width:8%">Points</th>
              <th style="width:22%">Status / Actions</th>
              <th style="width:0%"></th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
    </section>`;
}

function renderMissionFrame(container, mission, missionId, user, signedUp, volunteers) {
  const status = mission.status || "N/A";
  const statusLower = status.toLowerCase();
  const needed = Math.max(0, parseInt(mission.volunteers, 10) || 0);
  const pct =
    needed > 0
      ? Math.min(100, Math.round((signedUp / needed) * 100))
      : signedUp > 0
        ? 100
        : 0;
  const slotsOpen = needed > 0 ? Math.max(0, needed - signedUp) : 0;

  const orgId = mission.orgId || mission.organizationId;
  const isOwner = Boolean(user && orgId && orgId === user.uid);
  const canVolunteer =
    Boolean(user && orgId && orgId !== user.uid) &&
    ["open", "ongoing", "approved"].includes(statusLower);

  const badge = missionStatusBadge(status);
  const loc = splitLocation(mission);
  const pts = resolveMissionPoints(mission);
  const ptsSub = pointsBreakdown(mission);
  const editUrl = `/missions/edit?id=${encodeURIComponent(missionId)}`;
  const lastUpdated = formatLastUpdated(mission);

  const topEdit = canVolunteer
  ? `<button type="button" class="md-btn md-btn-g" id="volunteerApplyBtn">...</button>`
  : "";

  const rosterHtml = renderRosterSection(volunteers, mission, isOwner);

  container.innerHTML = `
    <div class="md-page">
      <div class="md-topbar">
        <a href="/organization/dashboard" class="md-back">
          <i class="ti ti-arrow-left" aria-hidden="true"></i> Dashboard
        </a>
        <div class="md-topbar-actions">${topEdit}</div>
      </div>

      <div class="md-hero">
        <span class="md-hero-badge md-badge ${badge.cls}">${escapeHtml(badge.label)}</span>
        <div class="md-hero-content">
          <div class="md-title-row">
            <h2 class="md-title">${escapeHtml(mission.missionName || "Untitled mission")}</h2>
            <span class="md-badge md-b-blue md-type-badge">${escapeHtml(mission.type || "General")}</span>
          </div>
          <p class="md-desc">${escapeHtml(mission.description || "No description provided.")}</p>
          <div class="md-info-grid">
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-calendar" aria-hidden="true"></i> Date</div>
              <div class="md-cell-val">${escapeHtml(formatDisplayDate(mission.date))}</div>
              <div class="md-cell-sub">${escapeHtml(formatWeekday(mission.date))}</div>
            </div>
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-clock" aria-hidden="true"></i> Time</div>
              <div class="md-cell-val">${escapeHtml(formatTimeRange(mission))}</div>
              <div class="md-cell-sub">${escapeHtml(formatDurationHuman(mission))}</div>
            </div>
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-map-pin" aria-hidden="true"></i> Location</div>
              <div class="md-cell-val">${escapeHtml(loc.line1)}</div>
              ${loc.line2 ? `<div class="md-cell-sub">${escapeHtml(loc.line2)}</div>` : ""}
            </div>
            <div class="md-cell md-pts-cell">
              <div class="md-cell-label"><i class="ti ti-star" aria-hidden="true"></i> Points</div>
              <div class="md-cell-val">${pts ? `${escapeHtml(String(pts))} pts` : "—"}</div>
              ${ptsSub ? `<div class="md-cell-sub">${escapeHtml(ptsSub)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>

      <div class="md-body">
        <section class="md-card">
          <div class="md-sec-label">Volunteer progress</div>
          <div class="md-prog-row">
            <span class="md-muted">${signedUp} / ${needed || "—"} signed up</span>
            <span class="md-slots-open">${
              needed ? `${slotsOpen} slot${slotsOpen !== 1 ? "s" : ""} open` : ""
            }</span>
          </div>
          <div class="md-prog-wrap">
            <div class="md-prog" style="width:${pct}%"></div>
          </div>
        </section>

        ${rosterHtml}
      </div>

      <div class="md-foot">
        <div class="md-foot-meta">${escapeHtml(lastUpdated)}</div>
        <div class="md-foot-actions">
          ${
            isOwner
              ? `<a href="${editUrl}" class="md-btn md-btn-g"><i class="ti ti-edit" aria-hidden="true"></i> Edit mission</a>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  wireRejectModal(missionId);
  bindMissionInteractions(container, mission, missionId, user, volunteers, isOwner);
}

function bindMissionInteractions(container, mission, missionId, user, volunteers, isOwner) {
  const volBtn = document.getElementById("volunteerApplyBtn");
  if (volBtn && user) {
    volBtn.addEventListener("click", async () => {
      volBtn.disabled = true;
      try {
        await submitVolunteerApplication(missionId, user, mission);
        await refreshMissionDetails();
      } catch (err) {
        console.error(err);
        alert(err?.message || "Could not submit application.");
      } finally {
        volBtn.disabled = false;
      }
    });
  }

  container.querySelectorAll(".md-approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const appId = btn.getAttribute("data-app-id");
      const volunteer = volunteers.find((v) => v.id === appId);
      if (!volunteer) return;
      btn.disabled = true;
      try {
        await updateApplicationStatus(volunteer, missionId, "approved");
        await refreshMissionDetails();
      } catch (e) {
        console.error(e);
        alert("Could not approve application.");
      } finally {
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll(".md-reject-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const appId = btn.getAttribute("data-app-id");
      const volunteer = volunteers.find((v) => v.id === appId);
      if (volunteer) openRejectModal(volunteer);
    });
  });

  container.querySelectorAll(".md-view-volunteer").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name") || "Volunteer";
      const email = btn.getAttribute("data-email") || "";
      alert(`${name}\n${email}`);
    });
  });
}

function renderRejectedMissionPage(container, mission, missionId, user) {
  const reason =
    (mission.rejectionReason || "").trim() ||
    "No reason was provided by the administrator.";
  const badge = missionStatusBadge("rejected");
  const loc = splitLocation(mission);
  const pts = resolveMissionPoints(mission);
  const ptsSub = pointsBreakdown(mission);
  const orgId = mission.orgId || mission.organizationId;
  const isOwner = Boolean(user && orgId && orgId === user.uid);
  const editUrl = `/missions/edit?id=${encodeURIComponent(missionId)}`;

  container.innerHTML = `
    <div class="md-page">
      <div class="md-topbar">
        <a href="/organization/dashboard" class="md-back">
          <i class="ti ti-arrow-left" aria-hidden="true"></i> Dashboard
        </a>
      </div>

      <div class="md-hero">
        <span class="md-hero-badge md-badge ${badge.cls}">${escapeHtml(badge.label)}</span>
        <div class="md-hero-content">
          <div class="md-title-row">
            <h2 class="md-title">${escapeHtml(mission.missionName || "Untitled mission")}</h2>
            <span class="md-badge md-b-blue md-type-badge">${escapeHtml(mission.type || "General")}</span>
          </div>
          <p class="md-desc">${escapeHtml(mission.description || "No description provided.")}</p>
          <div class="md-info-grid">
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-calendar" aria-hidden="true"></i> Date</div>
              <div class="md-cell-val">${escapeHtml(formatDisplayDate(mission.date))}</div>
              <div class="md-cell-sub">${escapeHtml(formatWeekday(mission.date))}</div>
            </div>
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-clock" aria-hidden="true"></i> Time</div>
              <div class="md-cell-val">${escapeHtml(formatTimeRange(mission))}</div>
              <div class="md-cell-sub">${escapeHtml(formatDurationHuman(mission))}</div>
            </div>
            <div class="md-cell">
              <div class="md-cell-label"><i class="ti ti-map-pin" aria-hidden="true"></i> Location</div>
              <div class="md-cell-val">${escapeHtml(loc.line1)}</div>
              ${loc.line2 ? `<div class="md-cell-sub">${escapeHtml(loc.line2)}</div>` : ""}
            </div>
            <div class="md-cell md-pts-cell">
              <div class="md-cell-label"><i class="ti ti-star" aria-hidden="true"></i> Points</div>
              <div class="md-cell-val">${pts ? `${escapeHtml(String(pts))} pts` : "—"}</div>
              ${ptsSub ? `<div class="md-cell-sub">${escapeHtml(ptsSub)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>

      <div class="md-body">
        <section class="md-card">
          <div class="md-rejection">
            <strong>Reason for rejection</strong><br>
            ${escapeHtml(reason)}
          </div>
        </section>
      </div>

      <div class="md-foot">
        <div class="md-foot-meta">${escapeHtml(formatLastUpdated(mission))}</div>
        <div class="md-foot-actions">
          ${
            isOwner
              ? `<a href="${editUrl}" class="md-btn md-btn-g"><i class="ti ti-edit" aria-hidden="true"></i> Edit mission</a>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
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
        missionPoints: missionData ? resolveMissionPoints(missionData) : undefined,
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

async function refreshMissionDetails() {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();
  const user = auth.currentUser;
  if (!container || !missionId) return;

  try {
    const loaded = await loadMissionDocument(missionId, user);
    if (!loaded) {
      container.innerHTML = `<p class="md-error">Mission not found.</p>`;
      return;
    }
    const mission = loaded.mission;
    currentMissionContext = { mission, missionId, user };
    const orgId = mission.orgId || mission.organizationId;
    const status = (mission.status || "").toLowerCase();

    if (status === "rejected") {
      renderRejectedMissionPage(container, mission, missionId, user);
      return;
    }

    const signedUp = await countUniqueSignups(missionId);
    const isOwner = Boolean(user && orgId && orgId === user.uid);
    const volunteers = isOwner
      ? await loadMissionVolunteers(missionId, orgId)
      : [];

    renderMissionFrame(
      container,
      mission,
      missionId,
      user,
      signedUp,
      volunteers
    );
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="md-error">Error loading mission details.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();

  if (!container) return;
  if (!missionId) {
    container.innerHTML = `<p class="md-error">No mission ID provided.</p>`;
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/organization/login";
      return;
    }
    try {
      await loadPlatformConfig();
      await refreshMissionDetails();
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="md-error">Error loading mission details.</p>`;
    }
  });
});
