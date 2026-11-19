import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { assertOrgVerified } from "./org-verification.js";
import {
  blockPageContent,
  requireOrgPageAccess,
  sessionCan,
} from "./org-session.js";
import {
  userHasApplicationForMission,
  upsertMissionVolunteer,
  syncMissionVolunteerRoster,
  getApplicationDocRef,
  resolveMissionIdFromApplication,
  STORAGE_MISSIONS_SUB,
  STORAGE_APPLICATIONS_ROOT,
  STORAGE_USERS_SUB,
  STORAGE_ORG_ROSTER,
} from "./application-storage.js";
import {
  resolveMissionPoints,
  loadPlatformConfig,
  computeMissionDurationHours,
} from "./mission-type-points.js";
import {
  readOrgCache,
  writeOrgCache,
  invalidateOrgCache,
  missionDetailCacheKey,
  isOrgCacheFresh,
  NAV_FRESH_MS,
  LAST_ORG_UID_KEY,
  ORG_CACHE_KEYS,
} from "./org-data-cache.js";
import {
  sanitizeCloudinaryDocumentUrl,
  normalizeMissionDocuments,
  downloadCloudinaryDocument,
  candidateCloudinaryDocumentUrls,
  uploadFileToCloudinary,
  uploadImageToCloudinary,
  buildMissionDocumentPublicId,
  ORG_CLOUDINARY,
} from "./cloudinary-upload.js";
import {
  parseSortableDateMs,
  compareDateMs,
  wireDateSortHeader,
} from "./table-date-sort.js";

let pendingRejectVolunteer = null;
let currentMissionContext = null;
let CURRENT_ACTOR = null;
let CURRENT_SESSION = null;
let missionAnnouncementsCache = [];
/** @type {File[]} */
let pendingAnnounceImages = [];
/** @type {File[]} */
let pendingAnnounceDocs = [];
const ANNOUNCE_MAX_BYTES = 50 * 1024 * 1024;
const ANNOUNCE_DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);
/** @type {'asc'|'desc'} */
let rosterDateSortDir = "asc";

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

function resolveHostName(mission, user) {
  const fromMission =
    mission?.orgName ||
    mission?.organizationName ||
    mission?.organization?.orgName ||
    mission?.organization?.name ||
    "";
  if (String(fromMission).trim()) return String(fromMission).trim();

  const orgId = mission?.orgId || mission?.organizationId || user?.uid || "";
  if (orgId) {
    try {
      const cached = readOrgCache(orgId, ORG_CACHE_KEYS.SIDEBAR);
      const name =
        cached?.payload?.displayName ||
        cached?.payload?.orgData?.orgName ||
        cached?.payload?.orgData?.name ||
        "";
      if (String(name).trim()) return String(name).trim();
    } catch {
      /* ignore */
    }
  }
  return user?.displayName || "Organization";
}

function formatAnnouncementTime(ts) {
  if (!ts) return "";
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts?.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadMissionAnnouncements(missionId) {
  if (!missionId) return [];
  const col = collection(db, "missions", missionId, "announcements");
  try {
    const q = query(col, orderBy("createdAt", "desc"), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    try {
      const snap = await getDocs(query(col, limit(30)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const am = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bm = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return bm - am;
        });
    } catch (err2) {
      console.warn("[WARN] loadMissionAnnouncements:", err2 || err);
      return [];
    }
  }
}

function announceFileExtension(name) {
  const parts = String(name || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isAnnounceImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
}

function isAnnounceDocFile(file) {
  const ext = announceFileExtension(file?.name);
  if (ANNOUNCE_DOC_EXT.has(ext)) return true;
  const type = String(file?.type || "");
  return (
    type === "application/pdf" ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet")
  );
}

function splitAnnouncementAttachments(announcement = {}) {
  const images = normalizeMissionDocuments(
    announcement.images || []
  ).filter((d) => d && (d.url || d.name));
  const docs = normalizeMissionDocuments(
    announcement.documents || []
  ).filter((d) => d && (d.url || d.name));

  if (images.length || docs.length) {
    return { images, docs };
  }

  const fallback = normalizeMissionDocuments(
    announcement.attachments || announcement.files || []
  ).filter((d) => d && (d.url || d.name));
  const splitImages = [];
  const splitDocs = [];
  fallback.forEach((item) => {
    const kind = String(item.kind || item.resourceType || "").toLowerCase();
    const type = String(item.type || "").toLowerCase();
    const format = String(item.format || "").toLowerCase();
    const isImage =
      kind === "image" ||
      type.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(format);
    if (isImage) splitImages.push(item);
    else splitDocs.push(item);
  });
  return { images: splitImages, docs: splitDocs };
}

function renderAnnouncementAttachmentsHtml(announcement = {}) {
  const { images, docs } = splitAnnouncementAttachments(announcement);
  if (!images.length && !docs.length) return "";

  const imagesHtml = images.length
    ? `<div class="md-announce-attach-block">
        <div class="md-announce-attach-label">Images</div>
        <div class="md-announce-images">${images
          .map((img) => {
            const url = sanitizeCloudinaryDocumentUrl(
              String(img.url || "").trim()
            );
            if (!url) return "";
            const name = documentDownloadName(img);
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name)}">
              <img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy">
            </a>`;
          })
          .filter(Boolean)
          .join("")}</div>
      </div>`
    : "";

  const docsHtml = docs.length
    ? `<div class="md-announce-attach-block">
        <div class="md-announce-attach-label">Documents</div>
        <div class="md-announce-docs md-docs-list">${docs
          .map((docItem) => {
            const original = String(docItem.url || "").trim();
            const candidates = candidateCloudinaryDocumentUrls(original);
            const url =
              candidates.find((u) => u.includes("/raw/upload/")) ||
              candidates[0] ||
              sanitizeCloudinaryDocumentUrl(original);
            if (!url) return "";
            const name = documentDownloadName(docItem);
            const sizeLabel = formatDocumentSize(docItem.size);
            const format = String(docItem.format || "").toUpperCase();
            const meta =
              [format, sizeLabel].filter(Boolean).join(" · ") || "Document";
            return `
              <a class="md-doc-link" href="${escapeHtml(url)}" data-download-name="${escapeHtml(name)}" download="${escapeHtml(name)}" rel="noopener noreferrer">
                <span class="md-doc-link__icon" aria-hidden="true"><i class="ti ti-file-download"></i></span>
                <span class="md-doc-link__meta">
                  <span class="md-doc-link__name">${escapeHtml(name)}</span>
                  <span class="md-doc-link__sub">${escapeHtml(meta)}</span>
                </span>
                <span class="md-doc-link__action">Download</span>
              </a>`;
          })
          .filter(Boolean)
          .join("")}</div>
      </div>`
    : "";

  return `${imagesHtml}${docsHtml}`;
}

function renderAnnouncementsSection(announcements, isOwner, inHistory) {
  const canAdd = isOwner && !inHistory;
  const items = Array.isArray(announcements) ? announcements : [];
  const listHtml = items.length
    ? `<div class="md-announce-list">${items
        .map((a) => {
          const title = String(a.title || "").trim();
          const description = String(a.description || a.desc || "").trim();
          const text = String(a.text || a.message || "").trim();
          const attachmentsHtml = renderAnnouncementAttachmentsHtml(a);
          if (!title && !description && !text && !attachmentsHtml) return "";
          const when = formatAnnouncementTime(a.createdAt);
          const author = a.authorName || a.createdByName || "";
          const meta = [author, when].filter(Boolean).join(" · ");
          return `
            <article class="md-announce-item">
              ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
              ${
                description
                  ? `<div class="md-announce-desc">${escapeHtml(description)}</div>`
                  : ""
              }
              ${text ? `<p>${escapeHtml(text)}</p>` : ""}
              ${attachmentsHtml}
              ${meta ? `<div class="md-announce-meta">${escapeHtml(meta)}</div>` : ""}
            </article>`;
        })
        .filter(Boolean)
        .join("")}</div>`
    : `<div class="md-empty-block">No announcements yet.${
        canAdd ? " Post one to update your volunteers." : ""
      }</div>`;

  return `
    <section class="md-card" id="missionAnnouncementsCard">
      <div class="md-card-head">
        <span class="md-sec-label--title">Announcements</span>
        ${
          canAdd
            ? `<button type="button" class="md-btn-add-announce" id="addMissionAnnounceBtn">+ Add announcement</button>`
            : ""
        }
      </div>
      ${listHtml}
    </section>`;
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

function formatAttendanceClockTime(ts) {
  if (!ts) return "";
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts?.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
    timeInAt: base.timeInAt || other.timeInAt || null,
    timeOutAt: base.timeOutAt || other.timeOutAt || null,
    name: base.name || other.name,
    email: base.email || other.email,
    userId: base.userId || other.userId || "",
  };
}

function missionIdFromPath(refPath = "") {
  const parts = String(refPath).split("/");
  if (parts[0] === "missions" && parts[2] === "applications") return parts[1];
  return "";
}

function applicationBelongsToMissionOrg(data, orgId, refPath = "") {
  if (!orgId) return true;
  const appOrg = data?.orgId || data?.organizationId || "";
  if (!appOrg || appOrg === orgId) return true;
  // Trust applications stored under missions/{id}/applications even if orgId field is stale.
  if (missionIdFromPath(refPath)) return true;
  return false;
}

function applicationMatchesMission(
  data,
  missionId,
  mission = null,
  refPath = "",
  orgId = null
) {
  const targetId = String(missionId || "");
  if (!targetId) return false;

  const fromPath = resolveMissionIdFromApplication(data, refPath);
  if (fromPath && String(fromPath) === targetId) return true;

  const fromData = String(
    data?.missionId || data?.mission_id || data?.missionID || ""
  );
  if (fromData && fromData === targetId) return true;

  // Path missions/{missionId}/applications/{doc} is authoritative.
  if (missionIdFromPath(refPath) === targetId) return true;

  const missionName = String(
    mission?.missionName || mission?.name || mission?.title || ""
  ).trim();
  const appName = String(
    data?.missionName || data?.mission_name || data?.title || ""
  ).trim();
  if (missionName && appName && missionName === appName) {
    const appOrg = data?.orgId || data?.organizationId || "";
    // Name-only matches must belong to this org (or have no org field).
    if (!orgId || !appOrg || appOrg === orgId) return true;
  }

  return false;
}

async function pushApplicationRecord(
  docSnap,
  missionId,
  orgId,
  storage,
  upsert,
  mission = null
) {
  const data = docSnap.data();
  const refPath = docSnap.ref?.path || "";
  if (!applicationBelongsToMissionOrg(data, orgId, refPath)) return;
  if (!applicationMatchesMission(data, missionId, mission, refPath, orgId)) return;

  const pathParts = refPath.split("/");
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
    timeInAt: data.timeInAt || null,
    timeOutAt: data.timeOutAt || null,
    orgId: data.orgId || data.organizationId || orgId || "",
    missionId,
  });
}

function storageForApplicationPath(path = "") {
  if (path.startsWith("users/")) return STORAGE_USERS_SUB;
  if (path.startsWith("applications/")) return STORAGE_APPLICATIONS_ROOT;
  if (path.startsWith("missions/")) return STORAGE_MISSIONS_SUB;
  return STORAGE_MISSIONS_SUB;
}

/** Mobile apps often write only users/{uid}/applications — load those for this mission. */
async function loadUserApplicationsForMission(missionId, orgId, upsert, mission = null) {
  const ingestGroupSnap = async (cgSnap) => {
    for (const docSnap of cgSnap.docs) {
      const path = docSnap.ref.path;
      if (
        path.startsWith("users/") ||
        path.startsWith("missions/") ||
        path.startsWith("applications/")
      ) {
        await pushApplicationRecord(
          docSnap,
          missionId,
          orgId,
          storageForApplicationPath(path),
          upsert,
          mission
        );
      }
    }
  };

  try {
    const cgSnap = await getDocs(
      query(
        collectionGroup(db, "applications"),
        where("missionId", "==", missionId)
      )
    );
    await ingestGroupSnap(cgSnap);
  } catch (err) {
    console.warn("[WARN] collectionGroup applications for mission:", err);
  }

  // Match by mission name when docs omit/wrong missionId (common on mobile).
  const missionName = String(
    mission?.missionName || mission?.name || mission?.title || ""
  ).trim();
  if (missionName) {
    try {
      const nameSnap = await getDocs(
        query(
          collectionGroup(db, "applications"),
          where("missionName", "==", missionName)
        )
      );
      await ingestGroupSnap(nameSnap);
    } catch (err) {
      console.warn("[WARN] collectionGroup applications by missionName:", err);
    }
  }

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    for (const userDoc of usersSnap.docs) {
      try {
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
            upsert,
            mission
          );
        }
      } catch (userErr) {
        console.warn(
          "[WARN] users/",
          userDoc.id,
          "/applications for mission:",
          userErr
        );
      }
    }
  } catch (err) {
    console.warn("[WARN] scan users/*/applications for mission:", err);
  }
}

async function loadRootApplicationsForMission(missionId, orgId, upsert, mission = null) {
  try {
    const rootSnap = await getDocs(
      query(collection(db, "applications"), where("missionId", "==", missionId))
    );
    for (const docSnap of rootSnap.docs) {
      await pushApplicationRecord(
        docSnap,
        missionId,
        orgId,
        STORAGE_APPLICATIONS_ROOT,
        upsert,
        mission
      );
    }
  } catch (err) {
    console.warn("[WARN] root applications for mission:", err);
  }

  const missionName = String(
    mission?.missionName || mission?.name || mission?.title || ""
  ).trim();
  if (!missionName) return;

  try {
    const nameSnap = await getDocs(
      query(collection(db, "applications"), where("missionName", "==", missionName))
    );
    for (const docSnap of nameSnap.docs) {
      await pushApplicationRecord(
        docSnap,
        missionId,
        orgId,
        STORAGE_APPLICATIONS_ROOT,
        upsert,
        mission
      );
    }
  } catch (err) {
    console.warn("[WARN] root applications by missionName:", err);
  }
}

async function loadOrgRosterForMission(missionId, orgId, upsert) {
  if (!orgId) return;
  const paths = [
    ["organizations", orgId, "missions", missionId, "volunteers"],
    ["organizations", orgId, "history", missionId, "volunteers"],
  ];
  for (const pathParts of paths) {
    try {
      const rosterSnap = await getDocs(collection(db, ...pathParts));
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
          timeInAt: data.timeInAt || null,
          timeOutAt: data.timeOutAt || null,
          orgId,
          missionId,
          missionPoints: data.missionPoints,
        });
      }
    } catch (err) {
      console.warn("[WARN] mission roster:", pathParts.join("/"), err);
    }
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
        upsert,
        mission
      );
    }
  } catch (err) {
    console.warn("[WARN] mission applications:", err);
  }

  await loadRootApplicationsForMission(missionId, orgId, upsert, mission);
  await loadUserApplicationsForMission(missionId, orgId, upsert, mission);
  await loadOrgRosterForMission(missionId, orgId, upsert);

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

async function updateVolunteerAttendance(volunteer, missionId, action) {
  const hasTimedIn = Boolean(volunteer.timeInAt);
  const hasTimedOut = Boolean(volunteer.timeOutAt);

  if (action === "time-in") {
    if (hasTimedIn) {
      throw new Error("Time in already recorded for this volunteer.");
    }
    if (hasTimedOut) {
      throw new Error("Cannot time in after time out.");
    }
  } else if (action === "time-out") {
    if (!hasTimedIn) {
      throw new Error("Record time in before time out.");
    }
    if (hasTimedOut) {
      throw new Error("Time out already recorded for this volunteer.");
    }
  } else {
    throw new Error("Unknown attendance action");
  }

  const now = new Date();
  const appPayload = {
    updatedAt: now,
  };
  const rosterPayload = {
    updatedAt: now,
    status: volunteer.status || "approved",
  };
  if (action === "time-in") {
    appPayload.timeInAt = now;
    rosterPayload.timeInAt = now;
  } else if (action === "time-out") {
    appPayload.timeOutAt = now;
    rosterPayload.timeOutAt = now;
    // Keep existing timeInAt on both application + roster
    if (volunteer.timeInAt) {
      rosterPayload.timeInAt = volunteer.timeInAt;
    }
  }

  const refs = await resolveApplicationDocRefs(volunteer, missionId);
  let updated = false;
  for (const ref of refs) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, appPayload);
        updated = true;
      }
    } catch (err) {
      console.warn("[WARN] update attendance ref:", ref.path, err);
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
  await syncApplicationStatusToCopies(
    volunteer,
    missionId,
    rosterPayload,
    orgId
  );
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
  const isConfirmed = norm === "approved" || norm === "accepted";
  const showAttendance = isOwner && isConfirmed;
  const hasTimedIn = Boolean(v.timeInAt);
  const hasTimedOut = Boolean(v.timeOutAt);
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

  const statusBadge =
    norm === "pending"
      ? ""
      : `<span class="md-badge ${st.cls}">${escapeHtml(st.label)}</span>`;

  const statusActionsCell = `
    <div class="md-status-actions">
      ${statusBadge}
      ${actionButtons}
    </div>`;

  const timeInLabel = formatAttendanceClockTime(v.timeInAt);
  const timeOutLabel = formatAttendanceClockTime(v.timeOutAt);
  let attendanceInner = "";
  if (hasTimedIn && hasTimedOut) {
    attendanceInner = `
      <span class="md-attendance-time md-attendance-time--in" title="Time in">In: ${escapeHtml(timeInLabel)}</span>
      <span class="md-attendance-time md-attendance-time--out" title="Time out">Out: ${escapeHtml(timeOutLabel)}</span>`;
  } else if (hasTimedIn) {
    attendanceInner = `
      <span class="md-attendance-time md-attendance-time--in" title="Time in">In: ${escapeHtml(timeInLabel)}</span>
      <button type="button" class="md-btn md-btn-solid-r md-btn-xs md-roster-time-out-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
        Time Out
      </button>`;
  } else {
    attendanceInner = `
      <button type="button" class="md-btn md-btn-g md-btn-xs md-roster-time-in-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}">
        Time In
      </button>
      <button type="button" class="md-btn md-btn-solid-r md-btn-xs md-roster-time-out-btn" data-app-id="${escapeHtml(v.id)}" data-user-id="${escapeHtml(v.userId || "")}" disabled title="Record time in first" aria-disabled="true">
        Time Out
      </button>`;
  }

  const attendanceCell = showAttendance
    ? `<div class="md-action-group md-attendance-group">${attendanceInner}</div>`
    : '<span class="md-dash">—</span>';

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
      <td>${attendanceCell}</td>
    </tr>`;
}

function formatDocumentSize(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentDownloadName(docItem) {
  const name = String(docItem?.name || "").trim();
  if (name) return name;
  const format = String(docItem?.format || "").trim();
  return format ? `document.${format}` : "document";
}

function wireMissionDocumentsDownloads(root) {
  if (!root || root.dataset.docDownloadWired === "1") return;
  root.dataset.docDownloadWired = "1";
  root.addEventListener("click", (event) => {
    const link = event.target.closest("a.md-doc-link");
    if (!link || !root.contains(link)) return;
    const url = link.getAttribute("href") || "";
    const name =
      link.getAttribute("data-download-name") ||
      link.getAttribute("download") ||
      "document";
    if (!url || url === "#") return;
    event.preventDefault();
    event.stopPropagation();
    void downloadCloudinaryDocument(url, name);
  });
}

function renderPendingAnnounceList(listId, files, removeAttr) {
  const list = document.getElementById(listId);
  if (!list) return;
  if (!files.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = files
    .map((file, index) => {
      const size = formatDocumentSize(file.size);
      return `<li>
        <span>${escapeHtml(file.name)}${size ? ` · ${escapeHtml(size)}` : ""}</span>
        <button type="button" ${removeAttr}="${index}">Remove</button>
      </li>`;
    })
    .join("");
}

function renderPendingAnnounceFiles() {
  renderPendingAnnounceList(
    "missionAnnounceImageList",
    pendingAnnounceImages,
    "data-remove-announce-image"
  );
  renderPendingAnnounceList(
    "missionAnnounceDocList",
    pendingAnnounceDocs,
    "data-remove-announce-doc"
  );
}

function pushUniqueAnnounceFiles(target, fileList, validateFn, invalidMessage) {
  const incoming = Array.from(fileList || []);
  const errors = [];
  incoming.forEach((file) => {
    if (!validateFn(file)) {
      errors.push(`“${file.name}” ${invalidMessage}`);
      return;
    }
    if (file.size > ANNOUNCE_MAX_BYTES) {
      errors.push(`“${file.name}” must be smaller than 50MB.`);
      return;
    }
    const duplicate = target.some(
      (existing) =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
    );
    if (duplicate) return;
    target.push(file);
  });
  return errors[0] || "";
}

function addPendingAnnounceImages(fileList) {
  const error = pushUniqueAnnounceFiles(
    pendingAnnounceImages,
    fileList,
    isAnnounceImageFile,
    "is not a supported image."
  );
  renderPendingAnnounceFiles();
  return error;
}

function addPendingAnnounceDocs(fileList) {
  const error = pushUniqueAnnounceFiles(
    pendingAnnounceDocs,
    fileList,
    isAnnounceDocFile,
    "is not a supported document."
  );
  renderPendingAnnounceFiles();
  return error;
}

async function uploadAnnouncementAttachments(files, orgId, missionId) {
  const uploaded = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const folder = `${ORG_CLOUDINARY.folder}/${orgId}/missions/${missionId}/announcements`;
    if (isAnnounceImageFile(file)) {
      const url = await uploadImageToCloudinary(file, {
        folder,
        publicId: buildMissionDocumentPublicId(file, i),
        maxBytes: ANNOUNCE_MAX_BYTES,
        tags: ["mission-announcement", orgId, missionId],
      });
      uploaded.push({
        name: file.name,
        size: file.size,
        type: file.type || "image/*",
        url,
        format: announceFileExtension(file.name),
        kind: "image",
        resourceType: "image",
        uploadedAt: new Date().toISOString(),
      });
      continue;
    }

    const result = await uploadFileToCloudinary(file, {
      folder,
      publicId: buildMissionDocumentPublicId(file, i),
      maxBytes: ANNOUNCE_MAX_BYTES,
      resourceType: "raw",
      tags: ["mission-announcement", orgId, missionId],
    });
    uploaded.push({
      name: file.name,
      size: file.size,
      type: file.type || "",
      url: result.url,
      publicId: result.publicId || "",
      format: result.format || announceFileExtension(file.name),
      kind: "document",
      resourceType: result.resourceType || "raw",
      uploadedAt: new Date().toISOString(),
    });
  }
  return uploaded;
}

function renderMissionDocumentsSection(mission) {
  const docs = normalizeMissionDocuments(mission?.documents).filter(
    (d) => d && (d.url || d.name)
  );

  const items = docs
    .map((docItem, index) => {
      const original = String(docItem.url || "").trim();
      const candidates = candidateCloudinaryDocumentUrls(original);
      const url =
        candidates.find((u) => u.includes("/raw/upload/")) ||
        candidates[0] ||
        sanitizeCloudinaryDocumentUrl(original);
      if (!url || !(url.startsWith("https://") || url.startsWith("http://"))) {
        return "";
      }
      const name = documentDownloadName(docItem);
      const sizeLabel = formatDocumentSize(docItem.size);
      const format = String(docItem.format || "").toUpperCase();
      const metaParts = [format, sizeLabel].filter(Boolean);
      const meta = metaParts.length ? metaParts.join(" · ") : "Document";
      return `
        <a class="md-doc-link" href="${escapeHtml(url)}" data-doc-index="${index}" data-download-name="${escapeHtml(name)}" download="${escapeHtml(name)}" rel="noopener noreferrer">
          <span class="md-doc-link__icon" aria-hidden="true"><i class="ti ti-file-download"></i></span>
          <span class="md-doc-link__meta">
            <span class="md-doc-link__name">${escapeHtml(name)}</span>
            <span class="md-doc-link__sub">${escapeHtml(meta)}</span>
          </span>
          <span class="md-doc-link__action">Download</span>
        </a>`;
    })
    .filter(Boolean)
    .join("");

  return `
    <section class="md-card">
      <div class="md-card-head">
        <span class="md-sec-label--title">Documents</span>
      </div>
      ${
        items
          ? `<div class="md-docs-list">${items}</div>`
          : `<div class="md-empty-block">No documents attached.</div>`
      }
    </section>`;
}

function sortRosterVolunteers(volunteers = []) {
  return [...volunteers].sort((a, b) =>
    compareDateMs(
      parseSortableDateMs(a.appliedAt),
      parseSortableDateMs(b.appliedAt),
      rosterDateSortDir
    )
  );
}

function initRosterDateSort() {
  wireDateSortHeader(document.getElementById("rosterDateSortHeader"), {
    getDir: () => rosterDateSortDir,
    setDir: (d) => {
      rosterDateSortDir = d === "desc" ? "desc" : "asc";
    },
    onSort: () => {
      const ctx = currentMissionContext;
      if (!ctx?.mission || !ctx?.missionId) return;
      renderMissionFrame(
        document.getElementById("detailsContainer"),
        ctx.mission,
        ctx.missionId,
        ctx.user,
        countApprovedVolunteers(ctx.volunteers || []),
        ctx.volunteers || [],
        Boolean(ctx.inHistory),
        missionAnnouncementsCache
      );
    },
  });
}

function renderRosterSection(volunteers, mission, isOwner, slotInfo) {
  if (!isOwner) return "";

  const missionPoints = resolveMissionPoints(mission);
  const durationHours =
    mission.durationHours ?? computeMissionDurationHours(mission);
  const sorted = sortRosterVolunteers(volunteers);

  const rows =
    sorted.length > 0
      ? sorted
          .map((v) =>
            rosterRowHtml(v, mission, missionPoints, durationHours, isOwner, slotInfo)
          )
          .join("")
      : "";

  const tableBody = sorted.length
    ? rows
    : `<tr><td colspan="7"><div class="md-empty-roster">No volunteer applications yet.</div></td></tr>`;

  return `
    <section class="md-card md-card--table">
      <div class="md-roster-head">
        <span class="md-sec-label--title">Volunteer list</span>
        <span class="md-badge md-b-gray">${volunteers.length} total</span>
      </div>
      <div class="md-table-wrap">
        <table class="md-table">
          <thead>
            <tr>
              <th style="width:18%">Name</th>
              <th style="width:18%">Email</th>
              <th style="width:10%" class="th-sortable" id="rosterDateSortHeader" aria-sort="ascending">
                <button type="button" class="th-sort-btn">
                  Date joined <i class="bi bi-arrow-down-up th-sort-icon" aria-hidden="true"></i>
                </button>
              </th>
              <th style="width:7%">Hours</th>
              <th style="width:7%">Points</th>
              <th style="width:20%">Status</th>
              <th style="width:20%">Attendance</th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
    </section>`;
}

function renderMissionFrame(
  container,
  mission,
  missionId,
  user,
  signedUp,
  volunteers,
  inHistory = false,
  announcements = []
) {
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
  const hostName = resolveHostName(mission, user);
  const weekday = formatWeekday(mission.date);
  const duration = formatDurationHuman(mission);
  const editUrl = `/missions/edit?id=${encodeURIComponent(missionId)}`;
  const lastUpdated = formatLastUpdated(mission);
  const backHref = inHistory ? "/missions/history" : "/organization/dashboard";
  const backLabel = inHistory ? "History" : "Dashboard";

  const topEdit = canVolunteer
    ? `<button type="button" class="md-btn md-btn-g" id="volunteerApplyBtn">Apply as volunteer</button>`
    : "";

  const footerActions = renderOwnerFooterActions(
    isOwner,
    editUrl,
    inHistory,
    mission
  );
  const rosterHtml = renderRosterSection(volunteers, mission, isOwner, slotInfo);
  const documentsHtml = renderMissionDocumentsSection(mission);
  const announcementsHtml = renderAnnouncementsSection(
    announcements,
    isOwner,
    inHistory
  );

  setMissionPageNav(backHref, backLabel, topEdit);

  container.innerHTML = `
    <div class="md-page">
      <div class="md-hero">
        <span class="md-hero-badge md-badge ${badge.cls}">${escapeHtml(badge.label)}</span>
        <div class="md-hero-content">
          <h2 class="md-title">${escapeHtml(mission.missionName || "Untitled mission")}</h2>
          <p class="md-host">Hosted by ${escapeHtml(hostName)}</p>
          <div class="md-chip-row">
            <span class="md-type-badge">${escapeHtml(mission.type || "General")}</span>
          </div>
          <div class="md-info-grid">
            <div class="md-cell">
              <div class="md-cell-label">Date</div>
              <div class="md-cell-val">${escapeHtml(formatDisplayDate(mission.date))}</div>
              ${weekday ? `<div class="md-cell-sub">${escapeHtml(weekday)}</div>` : ""}
            </div>
            <div class="md-cell">
              <div class="md-cell-label">Time</div>
              <div class="md-cell-val">${escapeHtml(formatTimeRange(mission))}</div>
              ${duration ? `<div class="md-cell-sub">${escapeHtml(duration)}</div>` : ""}
            </div>
            <div class="md-cell">
              <div class="md-cell-label">Location</div>
              <div class="md-cell-val">${escapeHtml(loc.line1)}</div>
              ${loc.line2 ? `<div class="md-cell-sub">${escapeHtml(loc.line2)}</div>` : ""}
            </div>
            <div class="md-cell md-pts-cell">
              <div class="md-cell-label">Points</div>
              <div class="md-cell-val">${
                pts ? `${escapeHtml(String(pts))} pts` : "—"
              }</div>
              <div class="md-cell-sub">per volunteer</div>
            </div>
          </div>
        </div>
      </div>

      <div class="md-body">
        <div class="md-split">
          <section class="md-card">
            <div class="md-card-head">
              <span class="md-sec-label--title">Volunteer progress</span>
              <span class="md-slots-open">${
                needed
                  ? `${slotsOpen} slot${slotsOpen !== 1 ? "s" : ""} open`
                  : ""
              }</span>
            </div>
            <div class="md-prog-wrap">
              <div class="md-prog" style="width:${pct}%"></div>
            </div>
            <div class="md-prog-row">
              <span class="md-muted">${signedUp} of ${needed || "—"} signed up</span>
            </div>
          </section>
          ${documentsHtml}
        </div>

        ${announcementsHtml}
        ${rosterHtml}
      </div>

      <div class="md-foot">
        <div class="md-foot-meta">${escapeHtml(lastUpdated)}</div>
        <div class="md-foot-actions">${footerActions}</div>
      </div>
    </div>
  `;

  wireRejectModal(missionId);
  bindMissionInteractions(container, mission, missionId, user, volunteers, isOwner);
  wireMissionDocumentsDownloads(container);
  wireMissionAnnouncements(missionId, isOwner && !inHistory, user);
  initRosterDateSort();
}

function openMissionAnnounceModal() {
  const overlay = document.getElementById("missionAnnounceModal");
  const titleInput = document.getElementById("missionAnnounceTitleInput");
  const descInput = document.getElementById("missionAnnounceDescInput");
  const input = document.getElementById("missionAnnounceInput");
  const imagesInput = document.getElementById("missionAnnounceImagesInput");
  const docsInput = document.getElementById("missionAnnounceDocsInput");
  const err = document.getElementById("missionAnnounceError");
  if (!overlay) return;
  pendingAnnounceImages = [];
  pendingAnnounceDocs = [];
  renderPendingAnnounceFiles();
  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";
  if (input) input.value = "";
  if (imagesInput) imagesInput.value = "";
  if (docsInput) docsInput.value = "";
  if (err) err.textContent = "";
  overlay.hidden = false;
  overlay.classList.add("is-open");
  titleInput?.focus();
}

function closeMissionAnnounceModal() {
  const overlay = document.getElementById("missionAnnounceModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.hidden = true;
  pendingAnnounceImages = [];
  pendingAnnounceDocs = [];
  renderPendingAnnounceFiles();
}

function wireMissionAnnouncements(missionId, canAdd, user) {
  const addBtn = document.getElementById("addMissionAnnounceBtn");
  const cancelBtn = document.getElementById("missionAnnounceCancel");
  const saveBtn = document.getElementById("missionAnnounceSave");
  const overlay = document.getElementById("missionAnnounceModal");
  const titleInput = document.getElementById("missionAnnounceTitleInput");
  const descInput = document.getElementById("missionAnnounceDescInput");
  const input = document.getElementById("missionAnnounceInput");
  const imageBtn = document.getElementById("missionAnnounceImageBtn");
  const docBtn = document.getElementById("missionAnnounceDocBtn");
  const imagesInput = document.getElementById("missionAnnounceImagesInput");
  const docsInput = document.getElementById("missionAnnounceDocsInput");
  const imageList = document.getElementById("missionAnnounceImageList");
  const docList = document.getElementById("missionAnnounceDocList");
  const err = document.getElementById("missionAnnounceError");

  if (addBtn && canAdd) {
    addBtn.onclick = () => openMissionAnnounceModal();
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => closeMissionAnnounceModal();
  }
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeMissionAnnounceModal();
    };
  }
  if (imageBtn && imagesInput && canAdd) {
    imageBtn.onclick = () => imagesInput.click();
    imagesInput.onchange = () => {
      const error = addPendingAnnounceImages(imagesInput.files);
      imagesInput.value = "";
      if (err) err.textContent = error || "";
    };
  }
  if (docBtn && docsInput && canAdd) {
    docBtn.onclick = () => docsInput.click();
    docsInput.onchange = () => {
      const error = addPendingAnnounceDocs(docsInput.files);
      docsInput.value = "";
      if (err) err.textContent = error || "";
    };
  }
  if (imageList && !imageList.dataset.wired) {
    imageList.dataset.wired = "1";
    imageList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-announce-image]");
      if (!btn) return;
      const index = Number(btn.getAttribute("data-remove-announce-image"));
      if (!Number.isFinite(index)) return;
      pendingAnnounceImages.splice(index, 1);
      renderPendingAnnounceFiles();
    });
  }
  if (docList && !docList.dataset.wired) {
    docList.dataset.wired = "1";
    docList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-announce-doc]");
      if (!btn) return;
      const index = Number(btn.getAttribute("data-remove-announce-doc"));
      if (!Number.isFinite(index)) return;
      pendingAnnounceDocs.splice(index, 1);
      renderPendingAnnounceFiles();
    });
  }
  if (saveBtn && canAdd) {
    saveBtn.onclick = async () => {
      const title = String(titleInput?.value || "").trim();
      const description = String(descInput?.value || "").trim();
      const text = String(input?.value || "").trim();
      const pendingFiles = [...pendingAnnounceImages, ...pendingAnnounceDocs];
      if (!title) {
        if (err) err.textContent = "Please enter a title.";
        titleInput?.focus();
        return;
      }
      if (!text && !pendingFiles.length) {
        if (err) {
          err.textContent =
            "Please enter announcement text or attach at least one file.";
        }
        input?.focus();
        return;
      }
      saveBtn.disabled = true;
      const prevSaveHtml = saveBtn.innerHTML;
      saveBtn.textContent = pendingFiles.length ? "Uploading…" : "Posting…";
      if (err) err.textContent = "";
      try {
        const hostName = resolveHostName(
          currentMissionContext?.mission || {},
          user
        );
        const orgId =
          currentMissionContext?.mission?.orgId ||
          currentMissionContext?.mission?.organizationId ||
          user?.uid ||
          "";
        const attachments = pendingFiles.length
          ? await uploadAnnouncementAttachments(pendingFiles, orgId, missionId)
          : [];
        await addDoc(collection(db, "missions", missionId, "announcements"), {
          title,
          description,
          text,
          attachments,
          images: attachments.filter((a) => a.kind === "image"),
          documents: attachments.filter((a) => a.kind === "document"),
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "",
          authorName: hostName,
          orgId,
        });
        closeMissionAnnounceModal();
        missionAnnouncementsCache = await loadMissionAnnouncements(missionId);
        await refreshMissionDetails({ refresh: true, background: true });
      } catch (e) {
        console.error(e);
        if (err) {
          err.textContent =
            e?.message || "Could not post announcement. Try again.";
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = prevSaveHtml || "Post announcement";
      }
    };
  }
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
    const timeInBtn = e.target.closest(".md-roster-time-in-btn");
    const timeOutBtn = e.target.closest(".md-roster-time-out-btn");
    const btn = acceptBtn || declineBtn || timeInBtn || timeOutBtn;
    if (!btn || btn.disabled) return;

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

    if (timeInBtn || timeOutBtn) {
      const action = timeInBtn ? "time-in" : "time-out";
      btn.disabled = true;
      try {
        await updateVolunteerAttendance(volunteer, missionId, action);
        invalidateOrgCache(
          auth.currentUser?.uid,
          missionDetailCacheKey(missionId)
        );
        await refreshMissionDetails({ refresh: true, background: true });
      } catch (err) {
        console.error(err);
        alert(
          err?.message === "Application record not found"
            ? "Application record not found. Refresh the page and try again."
            : action === "time-in"
              ? "Could not record time in."
              : "Could not record time out."
        );
        btn.disabled = false;
      }
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
      invalidateOrgCache(
        auth.currentUser?.uid,
        missionDetailCacheKey(missionId)
      );
      await refreshMissionDetails({ refresh: true, background: true });
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

function renderRejectedMissionPage(container, mission, missionId, user, inHistory = false) {
  const reason =
    (mission.rejectionReason || "").trim() ||
    "No reason was provided by the administrator.";
  const badge = missionStatusBadge("rejected");
  const loc = splitLocation(mission);
  const pts = resolveMissionPoints(mission);
  const hostName = resolveHostName(mission, user);
  const weekday = formatWeekday(mission.date);
  const duration = formatDurationHuman(mission);
  const orgId = mission.orgId || mission.organizationId;
  const isOwner = Boolean(user && orgId && orgId === user.uid);
  const editUrl = `/missions/edit?id=${encodeURIComponent(missionId)}`;
  const backHref = inHistory ? "/missions/history" : "/organization/dashboard";
  const backLabel = inHistory ? "History" : "Dashboard";
  const footerActions = renderOwnerFooterActions(
    isOwner,
    editUrl,
    inHistory,
    mission
  );

  setMissionPageNav(backHref, backLabel);

  container.innerHTML = `
    <div class="md-page">
      <div class="md-hero">
        <span class="md-hero-badge md-badge ${badge.cls}">${escapeHtml(badge.label)}</span>
        <div class="md-hero-content">
          <h2 class="md-title">${escapeHtml(mission.missionName || "Untitled mission")}</h2>
          <p class="md-host">Hosted by ${escapeHtml(hostName)}</p>
          <div class="md-chip-row">
            <span class="md-type-badge">${escapeHtml(mission.type || "General")}</span>
          </div>
          <div class="md-info-grid">
            <div class="md-cell">
              <div class="md-cell-label">Date</div>
              <div class="md-cell-val">${escapeHtml(formatDisplayDate(mission.date))}</div>
              ${weekday ? `<div class="md-cell-sub">${escapeHtml(weekday)}</div>` : ""}
            </div>
            <div class="md-cell">
              <div class="md-cell-label">Time</div>
              <div class="md-cell-val">${escapeHtml(formatTimeRange(mission))}</div>
              ${duration ? `<div class="md-cell-sub">${escapeHtml(duration)}</div>` : ""}
            </div>
            <div class="md-cell">
              <div class="md-cell-label">Location</div>
              <div class="md-cell-val">${escapeHtml(loc.line1)}</div>
              ${loc.line2 ? `<div class="md-cell-sub">${escapeHtml(loc.line2)}</div>` : ""}
            </div>
            <div class="md-cell md-pts-cell">
              <div class="md-cell-label">Points</div>
              <div class="md-cell-val">${pts ? `${escapeHtml(String(pts))} pts` : "—"}</div>
              <div class="md-cell-sub">per volunteer</div>
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
        <div class="md-foot-actions">${footerActions}</div>
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

  // Prefer the signed-in organization's own copy so owner roster checks stay correct.
  let ownOrgData = null;
  let ownHistoryData = null;
  if (user?.uid) {
    const ownOrgSnap = await getDoc(
      doc(db, "organizations", user.uid, "missions", missionId)
    );
    if (ownOrgSnap.exists()) ownOrgData = ownOrgSnap.data();

    const ownHistorySnap = await getDoc(
      doc(db, "organizations", user.uid, "history", missionId)
    );
    if (ownHistorySnap.exists()) ownHistoryData = ownHistorySnap.data();
  }

  if (ownOrgData || ownHistoryData) {
    return {
      mission: {
        ...(globalData || {}),
        ...(ownOrgData || {}),
        ...(ownHistoryData || {}),
        orgId: user.uid,
        organizationId: user.uid,
      },
      inHistory: Boolean(ownHistoryData) && !ownOrgData,
    };
  }

  let orgData = null;
  let historyData = null;
  const orgId =
    globalData?.orgId ||
    globalData?.organizationId ||
    user?.uid ||
    null;

  if (orgId) {
    const orgSnap = await getDoc(
      doc(db, "organizations", orgId, "missions", missionId)
    );
    if (orgSnap.exists()) orgData = orgSnap.data();

    const historySnap = await getDoc(
      doc(db, "organizations", orgId, "history", missionId)
    );
    if (historySnap.exists()) historyData = historySnap.data();
  }

  if (globalData || orgData || historyData) {
    const resolvedOrgId =
      globalData?.orgId ||
      globalData?.organizationId ||
      orgData?.orgId ||
      orgData?.organizationId ||
      historyData?.orgId ||
      historyData?.organizationId ||
      user?.uid ||
      null;

    return {
      mission: {
        ...globalData,
        ...orgData,
        ...historyData,
        orgId: resolvedOrgId,
        organizationId: resolvedOrgId,
      },
      inHistory: Boolean(historyData),
    };
  }

  const subSnap = await getDoc(doc(db, "mission_submissions", missionId));
  if (subSnap.exists()) {
    const data = subSnap.data();
    const resolvedOrgId =
      data.orgId || data.organizationId || user?.uid || null;
    return {
      mission: {
        ...data,
        orgId: resolvedOrgId,
        organizationId: resolvedOrgId,
      },
      inHistory: false,
    };
  }

  return null;
}

function clearMissionPageNav() {
  const backEl = document.getElementById("mdPageBack");
  const navEl = document.getElementById("mdTopNav");
  if (backEl) backEl.innerHTML = "";
  if (navEl) navEl.innerHTML = "";
}

function setMissionPageNav(backHref, backLabel, topActionsHtml = "") {
  const backEl = document.getElementById("mdPageBack");
  const navEl = document.getElementById("mdTopNav");
  if (backEl) {
    backEl.innerHTML = `
      <a href="${backHref}" class="md-back">
        <i class="ti ti-arrow-left" aria-hidden="true"></i> ${escapeHtml(backLabel)}
      </a>`;
  }
  if (navEl) {
    navEl.innerHTML = topActionsHtml || "";
  }
}

function isMissionReadOnly(mission, inHistory) {
  if (inHistory) return true;
  const status = (mission?.status || "").toLowerCase();
  return ["completed", "history", "closed"].includes(status);
}

function renderOwnerFooterActions(isOwner, editUrl, inHistory, mission = null) {
  if (!isOwner) return "";

  const backLink = inHistory
    ? `<a href="/missions/history" class="md-btn md-btn-outline-g"><i class="ti ti-history" aria-hidden="true"></i> Back to history</a>`
    : "";

  if (isMissionReadOnly(mission, inHistory)) {
    return backLink;
  }

  return `${backLink}
    <a href="${editUrl}" class="md-btn md-btn-g"><i class="ti ti-edit" aria-hidden="true"></i> Edit mission</a>`;
}

function saveMissionDetailCache(orgId, missionId, payload) {
  if (!orgId || !missionId) return;
  writeOrgCache(orgId, missionDetailCacheKey(missionId), payload);
}

function renderMissionDetailsFromCache(container, payload, user) {
  const { mission, inHistory, volunteers, signedUp, missionId, announcements } =
    payload;
  if (!mission || !missionId) return false;

  if ((mission.status || "").toLowerCase() === "rejected") {
    renderRejectedMissionPage(container, mission, missionId, user, Boolean(inHistory));
    return true;
  }

  const list = Array.isArray(announcements)
    ? announcements
    : missionAnnouncementsCache;
  missionAnnouncementsCache = list;

  currentMissionContext = {
    mission,
    missionId,
    user,
    volunteers: volunteers || [],
    slotInfo: getMissionVolunteerCapacity(mission, volunteers || []),
    inHistory: Boolean(inHistory),
  };

  renderMissionFrame(
    container,
    mission,
    missionId,
    user,
    signedUp ?? 0,
    volunteers || [],
    Boolean(inHistory),
    list
  );
  return true;
}

/** Paint from sessionStorage before auth finishes (same idea as mission list hydrate). */
function tryEarlyMissionDetailPaint() {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();
  if (!container || !missionId) return false;
  if (container.querySelector(".md-page, .md-hero")) {
    return true;
  }
  let uid = "";
  try {
    uid = sessionStorage.getItem(LAST_ORG_UID_KEY) || "";
  } catch {
    uid = "";
  }
  if (!uid) return false;
  const cached = readOrgCache(uid, missionDetailCacheKey(missionId));
  if (!cached?.payload?.mission) return false;
  return renderMissionDetailsFromCache(container, cached.payload, {
    uid,
  });
}

async function refreshMissionDetails({ refresh = true, background = false } = {}) {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();
  const user = CURRENT_ACTOR || auth.currentUser;
  if (!container || !missionId) return;

  const orgId = user?.uid || null;
  const cacheKey = missionDetailCacheKey(missionId);
  const cached = orgId ? readOrgCache(orgId, cacheKey) : null;
  const hasCache = Boolean(cached?.payload?.mission);

  // Never show a loading spinner — paint cache or keep current content.
  if (hasCache && !background) {
    renderMissionDetailsFromCache(container, cached.payload, user);
  }

  // Cached payload can render immediately; skip network when fresh unless forced.
  if (hasCache && !refresh && !background) {
    return;
  }
  if (
    hasCache &&
    background &&
    orgId &&
    isOrgCacheFresh(orgId, cacheKey, NAV_FRESH_MS) &&
    !refresh
  ) {
    return;
  }

    try {
      const loaded = await loadMissionDocument(missionId, user);
      if (!loaded) {
      clearMissionPageNav();
      container.innerHTML = `<p class="md-error">Mission not found.</p>`;
        return;
      }
      const mission = loaded.mission;
    const inHistory = Boolean(loaded.inHistory);
    const orgId =
      mission.orgId || mission.organizationId || user?.uid || "";
      const status = (mission.status || "").toLowerCase();

      if (status === "rejected") {
      renderRejectedMissionPage(container, mission, missionId, user, inHistory);
      if (orgId) {
        saveMissionDetailCache(orgId, missionId, {
          mission,
          missionId,
          inHistory,
          volunteers: [],
          signedUp: 0,
        });
      }
        return;
      }

    const isOwner = Boolean(user && orgId && orgId === user.uid);
    let volunteers = isOwner
      ? await loadMissionVolunteers(missionId, orgId, mission)
      : [];
    if (isOwner && !inHistory && missionHasAutoAccept(mission)) {
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

    const announcements = await loadMissionAnnouncements(missionId);
    missionAnnouncementsCache = announcements;

    currentMissionContext = {
      mission,
      missionId,
      user,
      volunteers,
      slotInfo: getMissionVolunteerCapacity(mission, volunteers),
      inHistory: Boolean(inHistory),
    };

    renderMissionFrame(
      container,
      mission,
      missionId,
      user,
      signedUp,
      volunteers,
      inHistory,
      announcements
    );

    if (orgId) {
      saveMissionDetailCache(orgId, missionId, {
        mission,
        missionId,
        inHistory,
        volunteers,
        signedUp,
        announcements,
      });
    }
    } catch (err) {
      console.error(err);
    if (!hasCache && !container.querySelector(".md-page, .md-hero")) {
      clearMissionPageNav();
      container.innerHTML = `<p class="md-error">Error loading mission details.</p>`;
    }
  }
}

function bootMissionDetailsPage() {
  const container = document.getElementById("detailsContainer");
  const missionId = getMissionIdFromUrl();

  if (!container) return;
  if (!missionId) {
    clearMissionPageNav();
    container.innerHTML = `<p class="md-error">No mission ID provided.</p>`;
    return;
  }

  // Instant paint from last org cache (before auth / Firestore).
  tryEarlyMissionDetailPaint();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/organization/login";
      return;
    }
    if (!(await assertOrgVerified(user))) return;
    const access = await requireOrgPageAccess(user);
    if (!access) return;
    if (
      !sessionCan(access.session, "missions") &&
      !sessionCan(access.session, "history")
    ) {
      blockPageContent(
        "Your account does not include access to mission details. Ask the organization owner to update your rights."
      );
      return;
    }
    CURRENT_ACTOR = access.actor;
    CURRENT_SESSION = access.session;
    try {
      wireRosterStatusSuccessModal();
      wireMissionFullModal();

      // Paint cache immediately; do not wait on platform config.
      void loadPlatformConfig();
      await refreshMissionDetails({ refresh: false });

      const orgId = CURRENT_ACTOR?.uid;
      const fresh =
        orgId &&
        isOrgCacheFresh(
          orgId,
          missionDetailCacheKey(missionId),
          NAV_FRESH_MS
        );
      if (!fresh) {
        void refreshMissionDetails({ refresh: true, background: true });
      }
    } catch (err) {
      console.error(err);
      if (!container.querySelector(".md-page, .md-hero")) {
        container.innerHTML = `<p class="md-error">Error loading mission details.</p>`;
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootMissionDetailsPage);
} else {
  bootMissionDetailsPage();
}
