import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  collectionGroup,
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
  syncMissionVolunteerRoster,
  getApplicationDocRef,
  STORAGE_MISSIONS_SUB,
  STORAGE_USERS_SUB,
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

function isApprovedSignupStatus(status) {
  const st = (status || "").toLowerCase();
  return st === "approved" || st === "accepted";
}

function countApprovedVolunteers(volunteers) {
  const keys = new Set();
  for (const v of volunteers) {
    if (!isApprovedSignupStatus(v.status)) continue;
    const key = v.userId ? `u:${v.userId}` : `d:${v.id}`;
    keys.add(key);
  }
  return keys.size;
}

function getMissionVolunteerCapacity(mission, volunteers) {
  const needed = Math.max(0, parseInt(mission?.volunteers, 10) || 0);
  const signedUp = Array.isArray(volunteers) ? countApprovedVolunteers(volunteers) : 0;
  const hasCapacityLimit = needed > 0;
  const slotsOpen = hasCapacityLimit ? Math.max(0, needed - signedUp) : null;
  const isFull = hasCapacityLimit && signedUp >= needed;
  return { needed, signedUp, slotsOpen, isFull, hasCapacityLimit };
}

function canAcceptVolunteerApplication(mission, volunteers, volunteer) {
  if (volunteer && isApprovedSignupStatus(volunteer.status)) return true;
  const { isFull, hasCapacityLimit } = getMissionVolunteerCapacity(mission, volunteers);
  if (!hasCapacityLimit) return true;
  return !isFull;
}

/** Confirmed sign-ups: approved/accepted in applications and org roster. */
async function countMissionSignups(missionId, orgId = null) {
  const keys = new Set();

  const addIfApproved = (data, docId) => {
    if (!isApprovedSignupStatus(data.status)) return;
    const u = data.userId;
    keys.add(u ? `u:${u}` : `d:${docId}`);
  };

  try {
    const sub = await getDocs(
      collection(db, "missions", missionId, "applications")
    );
    sub.forEach((d) => addIfApproved(d.data(), d.id));
  } catch {
    /* ignore */
  }

  if (orgId) {
    try {
      const rosterSnap = await getDocs(
        collection(
          db,
          "organizations",
          orgId,
          "missions",
          missionId,
          "volunteers"
        )
      );
      rosterSnap.forEach((d) => {
        const data = d.data();
        addIfApproved({ ...data, userId: data.userId || d.id }, d.id);
      });
    } catch {
      /* ignore */
    }
  }

  return keys.size;
}

function missionHasAutoAccept(mission) {
  return mission?.autoAcceptVolunteers === true;
}

function pickMergedApplicationStatus(a, b, { autoAccept = false } = {}) {
  const statuses = [(a || "").toLowerCase(), (b || "").toLowerCase()];
  if (statuses.some((s) => s === "approved" || s === "accepted")) {
    return (
      statuses.find((s) => s === "approved" || s === "accepted") || "approved"
    );
  }
  if (autoAccept && statuses.includes("pending")) return "approved";
  if (statuses.includes("pending")) return "pending";
  if (statuses.every((s) => s === "rejected")) return "rejected";
  if (statuses.includes("rejected")) return "rejected";
  return a || b || "pending";
}

/** Match the exact roster row — never fall back to userId alone (avoids wrong-row updates). */
function findVolunteerForRosterAction(volunteers, btn) {
  const row = btn.closest("tr[data-volunteer-id]");
  const appId = (
    row?.getAttribute("data-volunteer-id") ||
    btn.getAttribute("data-app-id") ||
    ""
  ).trim();
  const userId = (
    row?.getAttribute("data-user-id") ||
    btn.getAttribute("data-user-id") ||
    ""
  ).trim();

  if (!appId && !userId) return null;

  const matches = volunteers.filter((v) => {
    const idOk = appId ? String(v.id || "") === appId : true;
    const userOk = userId ? String(v.userId || "") === userId : true;
    return idOk && userOk;
  });

  if (matches.length === 1) return matches[0];
  if (appId) {
    const byId = volunteers.filter((v) => String(v.id || "") === appId);
    if (byId.length === 1) return byId[0];
  }
  return null;
}

function mergeVolunteerEntries(existing, incoming, options = {}) {
  const missionApp =
    existing.storage === STORAGE_MISSIONS_SUB
      ? existing
      : incoming.storage === STORAGE_MISSIONS_SUB
        ? incoming
        : null;
  const userApp =
    existing.storage === STORAGE_USERS_SUB
      ? existing
      : incoming.storage === STORAGE_USERS_SUB
        ? incoming
        : null;
  const base = missionApp || existing;
  const other = base === existing ? incoming : existing;

  const userApplicationId =
    userApp?.id ||
    base.userApplicationId ||
    other.userApplicationId ||
    (base.storage === STORAGE_USERS_SUB ? base.id : "") ||
    (other.storage === STORAGE_USERS_SUB ? other.id : "") ||
    "";

  return {
    ...other,
    ...base,
    status: pickMergedApplicationStatus(existing.status, incoming.status, options),
    missionPoints: other.missionPoints ?? base.missionPoints,
    userApplicationId,
    applicationId:
      missionApp?.id || base.applicationId || other.applicationId || "",
    id: missionApp?.id || base.id || other.id,
    storage: missionApp ? STORAGE_MISSIONS_SUB : base.storage || incoming.storage,
    appliedAt: base.appliedAt || other.appliedAt || null,
    name: base.name || other.name,
    email: base.email || other.email,
    userId: base.userId || other.userId || "",
  };
}

function applicationBelongsToMissionOrg(data, orgId) {
  if (!orgId) return true;
  const appOrg = data?.orgId || data?.organizationId || "";
  return !appOrg || appOrg === orgId;
}

async function pushApplicationRecord(docSnap, missionId, orgId, storage, upsert) {
  const data = docSnap.data();
  if (!applicationBelongsToMissionOrg(data, orgId)) return;

  const resolvedMissionId = String(
    data.missionId || data.mission_id || data.missionID || missionId
  );
  if (resolvedMissionId !== String(missionId)) return;

  const pathParts = docSnap.ref.path.split("/");
  const userIdFromPath =
    storage === STORAGE_USERS_SUB && pathParts[0] === "users"
      ? pathParts[1]
      : "";
  const userId = data.userId || userIdFromPath || "";

  let name = data.displayName || data.name || "";
  let email = data.email || "";
  if ((!name || !email) && userId) {
    const profile = await fetchUserFieldsForVolunteer(userId);
    name = name || profile.name;
    email = email || profile.email;
  }

  upsert({
    id: docSnap.id,
    applicationId: storage === STORAGE_MISSIONS_SUB ? docSnap.id : data.applicationId || "",
    storage,
    userId,
    userApplicationId:
      storage === STORAGE_USERS_SUB ? docSnap.id : data.userApplicationId || "",
    name: name || (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
    email: email || "N/A",
    status: data.status || "pending",
    appliedAt: data.appliedAt || data.createdAt || data.approvedAt || null,
    orgId: data.orgId || data.organizationId || orgId || "",
    missionId,
  });
}

/** Mobile apps often write only users/{uid}/applications — load those for this mission. */
async function loadUserApplicationsForMission(missionId, orgId, upsert) {
  let loadedFromGroup = false;

  try {
    const cgSnap = await getDocs(
      query(
        collectionGroup(db, "applications"),
        where("missionId", "==", missionId)
      )
    );
    for (const docSnap of cgSnap.docs) {
      if (docSnap.ref.path.startsWith("users/")) {
        await pushApplicationRecord(
          docSnap,
          missionId,
          orgId,
          STORAGE_USERS_SUB,
          upsert
        );
      } else if (docSnap.ref.path.startsWith("missions/")) {
        await pushApplicationRecord(
          docSnap,
          missionId,
          orgId,
          STORAGE_MISSIONS_SUB,
          upsert
        );
      }
    }
    loadedFromGroup = !cgSnap.empty;
    if (loadedFromGroup) return;
  } catch (err) {
    console.warn("[WARN] collectionGroup applications for mission:", err);
  }

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    for (const userDoc of usersSnap.docs) {
      const appsSnap = await getDocs(
        query(
          collection(db, "users", userDoc.id, "applications"),
          where("missionId", "==", missionId)
        )
      );
      for (const appDoc of appsSnap.docs) {
        await pushApplicationRecord(
          appDoc,
          missionId,
          orgId,
          STORAGE_USERS_SUB,
          upsert
        );
      }
    }
  } catch (err) {
    console.warn("[WARN] scan users/*/applications for mission:", err);
  }
}

async function loadMissionVolunteers(missionId, orgId, mission = null) {
  const byUserId = new Map();
  const mergeOptions = { autoAccept: missionHasAutoAccept(mission) };

  const upsert = (v) => {
    const key = v.userId || v.id;
    if (!key) return;
    const existing = byUserId.get(key);
    byUserId.set(
      key,
      existing ? mergeVolunteerEntries(existing, v, mergeOptions) : v
    );
  };

  try {
    const appSnap = await getDocs(
      collection(db, "missions", missionId, "applications")
    );
    for (const docSnap of appSnap.docs) {
      await pushApplicationRecord(
        docSnap,
        missionId,
        orgId,
        STORAGE_MISSIONS_SUB,
        upsert
      );
    }
  } catch (err) {
    console.warn("[WARN] mission applications:", err);
  }

  await loadUserApplicationsForMission(missionId, orgId, upsert);

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
        upsert({
          id: data.applicationId || data.userApplicationId || docSnap.id,
          applicationId: data.applicationId || "",
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

  return Array.from(byUserId.values());
}

async function resolveApplicationDocRefs(volunteer, missionId) {
  const refs = [];
  const seen = new Set();

  const addRef = (ref) => {
    if (!ref?.path || seen.has(ref.path)) return;
    seen.add(ref.path);
    refs.push(ref);
  };

  const v = { ...volunteer, missionId };

  if (volunteer.storage === STORAGE_MISSIONS_SUB && volunteer.id) {
    addRef(doc(db, "missions", missionId, "applications", volunteer.id));
    if (volunteer.userId && volunteer.userApplicationId) {
      addRef(
        doc(
          db,
          "users",
          volunteer.userId,
          "applications",
          volunteer.userApplicationId
        )
      );
    }
  } else if (volunteer.storage === STORAGE_USERS_SUB && volunteer.userId && volunteer.id) {
    addRef(doc(db, "users", volunteer.userId, "applications", volunteer.id));
  } else if (volunteer.storage === STORAGE_ORG_ROSTER && volunteer.userId) {
    if (volunteer.userApplicationId) {
      addRef(
        doc(
          db,
          "users",
          volunteer.userId,
          "applications",
          volunteer.userApplicationId
        )
      );
    }
    const missionAppId = volunteer.applicationId || "";
    if (missionAppId) {
      addRef(doc(db, "missions", missionId, "applications", missionAppId));
    }
  } else {
    addRef(getApplicationDocRef(v));
  }

  if (refs.length > 0) return refs;

  if (volunteer.userId) {
    try {
      const missionSnap = await getDocs(
        query(
          collection(db, "missions", missionId, "applications"),
          where("userId", "==", volunteer.userId)
        )
      );
      missionSnap.docs.forEach((d) => addRef(d.ref));

      const userSnap = await getDocs(
        query(
          collection(db, "users", volunteer.userId, "applications"),
          where("missionId", "==", missionId)
        )
      );
      userSnap.docs.forEach((d) => addRef(d.ref));
    } catch (err) {
      console.warn("[WARN] resolve application refs:", err);
    }
  }

  return refs;
}

async function syncApplicationStatusToCopies(volunteer, missionId, payload, orgId) {
  if (volunteer.userId) {
    try {
      if (
        volunteer.storage === STORAGE_USERS_SUB ||
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
      console.warn("[WARN] sync application status copies:", syncErr);
    }
  }

  if (!volunteer.userId) return;

  const resolvedOrgId = orgId || volunteer.orgId || "";
  await syncMissionVolunteerRoster(
    resolvedOrgId,
    missionId,
    volunteer.userId,
    payload.status,
    { ...volunteer, ...payload },
    { applicationId: volunteer.applicationId || volunteer.id }
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

  const refs = await resolveApplicationDocRefs(volunteer, missionId);
  let updated = false;
  for (const ref of refs) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, payload);
        updated = true;
      }
    } catch (err) {
      console.warn("[WARN] update application ref:", ref.path, err);
    }
  }
  if (!updated) {
    throw new Error("Application record not found");
  }

  const orgId =
    volunteer.orgId ||
    currentMissionContext?.mission?.orgId ||
    currentMissionContext?.mission?.organizationId ||
    "";
  await syncApplicationStatusToCopies(volunteer, missionId, payload, orgId);
}

/** Approve pending applications when the mission has auto-accept enabled. */
async function autoAcceptPendingMissionApplications(missionId, mission, volunteers) {
  if (!missionHasAutoAccept(mission)) return false;

  let changed = false;
  for (const volunteer of volunteers) {
    if ((volunteer.status || "").toLowerCase() !== "pending") continue;
    if (!canAcceptVolunteerApplication(mission, volunteers, volunteer)) break;
    try {
      await updateApplicationStatus(volunteer, missionId, "approved");
      volunteer.status = "approved";
      changed = true;
    } catch (err) {
      console.error("[ERROR] auto-accept application:", volunteer.userId || volunteer.id, err);
    }
  }
  return changed;
}

function getRosterStatusSuccessCopy(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "accepted") {
    return {
      title: "Application accepted",
      message: "The volunteer has been confirmed for this mission.",
      iconClass: "is-approved",
      iconHtml: '<i class="ti ti-circle-check"></i>',
    };
  }
  if (s === "rejected") {
    return {
      title: "Application rejected",
      message: "The volunteer application was rejected.",
      iconClass: "is-rejected",
      iconHtml: '<i class="ti ti-circle-x"></i>',
    };
  }
  return {
    title: "Status updated",
    message: "The volunteer application was updated successfully.",
    iconClass: "is-approved",
    iconHtml: '<i class="ti ti-circle-check"></i>',
  };
}

function openRosterStatusSuccessModal(status) {
  const overlay = document.getElementById("rosterStatusSuccessModal");
  const titleEl = document.getElementById("rosterStatusSuccessTitle");
  const messageEl = document.getElementById("rosterStatusSuccessMessage");
  const iconEl = document.getElementById("rosterStatusSuccessIcon");
  if (!overlay || !titleEl || !messageEl) return;

  const copy = getRosterStatusSuccessCopy(status);
  titleEl.textContent = copy.title;
  messageEl.textContent = copy.message;
  if (iconEl) {
    iconEl.className = `roster-success-modal-icon ${copy.iconClass}`;
    iconEl.innerHTML = copy.iconHtml;
  }

  overlay.hidden = false;
  overlay.classList.add("is-open");
  document.getElementById("rosterStatusSuccessOk")?.focus();
}

function closeRosterStatusSuccessModal() {
  const overlay = document.getElementById("rosterStatusSuccessModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.hidden = true;
}

function wireRosterStatusSuccessModal() {
  const overlay = document.getElementById("rosterStatusSuccessModal");
  if (!overlay || overlay.dataset.wired === "1") return;
  overlay.dataset.wired = "1";

  const close = () => closeRosterStatusSuccessModal();
  document.getElementById("rosterStatusSuccessOk")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
}

function openMissionFullModal(mission, capacity) {
  const overlay = document.getElementById("missionFullModal");
  const messageEl = document.getElementById("missionFullMessage");
  if (!overlay) return;

  const needed = capacity?.needed ?? Math.max(0, parseInt(mission?.volunteers, 10) || 0);
  const signedUp = capacity?.signedUp ?? needed;
  if (messageEl) {
    messageEl.textContent =
      needed > 0
        ? `This mission is full (${signedUp} of ${needed} volunteer slots filled). You cannot accept more applicants until a spot opens up.`
        : "This mission has no open volunteer slots. You cannot accept more applicants.";
  }

  overlay.hidden = false;
  overlay.classList.add("is-open");
  document.getElementById("missionFullOk")?.focus();
}

function closeMissionFullModal() {
  const overlay = document.getElementById("missionFullModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.hidden = true;
}

function wireMissionFullModal() {
  const overlay = document.getElementById("missionFullModal");
  if (!overlay || overlay.dataset.wired === "1") return;
  overlay.dataset.wired = "1";

  const close = () => closeMissionFullModal();
  document.getElementById("missionFullOk")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
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
      openRosterStatusSuccessModal("rejected");
    } catch (e) {
      console.error(e);
      alert("Could not reject application. Try again.");
    } finally {
      confirm.disabled = false;
    }
  });
}

function rosterRowHtml(v, mission, missionPoints, durationHours, isOwner, slotInfo = {}) {
  const st = volunteerStatusBadge(v.status);
  const norm = (v.status || "").toLowerCase();
  const showActions = isOwner && norm === "pending";
  const missionFull = Boolean(slotInfo.isFull);
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
        <button type="button" class="md-btn md-btn-outline-g md-btn-xs md-roster-accept-btn${missionFull ? " is-mission-full" : ""}" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}"${missionFull ? ' title="Mission is full"' : ""}>
          <i class="ti ti-check" aria-hidden="true"></i> Accept
        </button>
        <button type="button" class="md-btn md-btn-r md-btn-xs md-roster-decline-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
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
    <tr data-volunteer-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
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
    </tr>`;
}

function renderRosterSection(volunteers, mission, isOwner, slotInfo) {
  if (!isOwner) return "";

  const missionPoints = resolveMissionPoints(mission);
  const durationHours =
    mission.durationHours ?? computeMissionDurationHours(mission);

  const rows =
    volunteers.length > 0
      ? volunteers
          .map((v) =>
            rosterRowHtml(v, mission, missionPoints, durationHours, isOwner, slotInfo)
          )
          .join("")
      : "";

  const tableBody = volunteers.length
    ? rows
    : `<tr><td colspan="6"><div class="md-empty-roster">No volunteer applications yet.</div></td></tr>`;

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
              <th style="width:24%">Status / Actions</th>
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
  const slotInfo = getMissionVolunteerCapacity(mission, volunteers);

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

  const rosterHtml = renderRosterSection(volunteers, mission, isOwner, slotInfo);

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

  const rosterTable = container.querySelector(".md-table tbody");
  if (!rosterTable || !isOwner) return;

  rosterTable.addEventListener("click", async (e) => {
    const acceptBtn = e.target.closest(".md-roster-accept-btn");
    const declineBtn = e.target.closest(".md-roster-decline-btn");
    const btn = acceptBtn || declineBtn;
    if (!btn) return;

    const roster =
      currentMissionContext?.volunteers?.length > 0
        ? currentMissionContext.volunteers
        : volunteers;
    const volunteer = findVolunteerForRosterAction(roster, btn);
    if (!volunteer) {
      console.warn("[WARN] roster action: volunteer not found for row", {
        appId: btn.getAttribute("data-app-id"),
        userId: btn.getAttribute("data-user-id"),
      });
      return;
    }

    if (declineBtn) {
      openRejectModal(volunteer);
      return;
    }

    const missionCtx = currentMissionContext?.mission || mission;
    const rosterForCapacity =
      currentMissionContext?.volunteers?.length > 0
        ? currentMissionContext.volunteers
        : roster;
    if (!canAcceptVolunteerApplication(missionCtx, rosterForCapacity, volunteer)) {
      const capacity =
        currentMissionContext?.slotInfo ||
        getMissionVolunteerCapacity(missionCtx, rosterForCapacity);
      openMissionFullModal(missionCtx, capacity);
      return;
    }

    btn.disabled = true;
    try {
      await updateApplicationStatus(volunteer, missionId, "approved");
      await refreshMissionDetails();
      openRosterStatusSuccessModal("approved");
    } catch (err) {
      console.error(err);
      alert(
        err?.message === "Application record not found"
          ? "Application record not found. Refresh the page and try again."
          : "Could not approve application."
      );
    } finally {
      btn.disabled = false;
    }
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

  if (orgId) {
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
    return { mission: { ...globalData, ...orgData } };
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
    const orgId =
      mission.orgId || mission.organizationId || user?.uid || "";
    const status = (mission.status || "").toLowerCase();

    if (status === "rejected") {
      renderRejectedMissionPage(container, mission, missionId, user);
      return;
    }

    const isOwner = Boolean(user && orgId && orgId === user.uid);
    let volunteers = isOwner
      ? await loadMissionVolunteers(missionId, orgId, mission)
      : [];
    if (isOwner && missionHasAutoAccept(mission)) {
      const accepted = await autoAcceptPendingMissionApplications(
        missionId,
        mission,
        volunteers
      );
      if (accepted) {
        volunteers = await loadMissionVolunteers(missionId, orgId, mission);
      }
    }
    const signedUp = isOwner
      ? countApprovedVolunteers(volunteers)
      : await countMissionSignups(missionId, orgId);

    currentMissionContext = {
      mission,
      missionId,
      user,
      volunteers,
      slotInfo: getMissionVolunteerCapacity(mission, volunteers),
    };

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
      wireRosterStatusSuccessModal();
      wireMissionFullModal();
      await refreshMissionDetails();
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="md-error">Error loading mission details.</p>`;
    }
  });
});
