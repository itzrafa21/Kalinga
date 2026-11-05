import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { assertOrgVerified } from "./org-verification.js";
import {
    loadPlatformConfig,
    populateMissionTypeSelect,
    computeMissionPointsPayload,
    updateMissionPointsDisplay,
    isPlatformConfigReady,
} from "./mission-type-points.js";
import {
    initUsDateInputs,
    readUsDateInputValue,
    setUsDateInputValue,
    validateUsDateInput,
} from "./us-date-input.js";
import {
    invalidateOrgCache,
    ORG_CACHE_KEYS,
    missionDetailCacheKey,
} from "./org-data-cache.js";
import {
    ORG_CLOUDINARY,
    uploadFileToCloudinary,
    buildMissionDocumentPublicId,
    normalizeMissionDocuments,
} from "./cloudinary-upload.js";

let selectedMissionImageFile = null;
let removeMissionImage = false;

/** @type {Array<{ kind: "existing", name: string, size?: number, type?: string, url?: string, publicId?: string, format?: string, resourceType?: string, uploadedAt?: string } | { kind: "file", file: File }>} */
let missionDocuments = [];

const MISSION_DOC_MAX_BYTES = 50 * 1024 * 1024;
const MISSION_DOC_ACCEPT_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);
const MISSION_DOC_ACCEPT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function fileExtension(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedMissionDocument(file) {
  const ext = fileExtension(file.name);
  if (MISSION_DOC_ACCEPT_EXT.has(ext)) return true;
  if (file.type && MISSION_DOC_ACCEPT_MIME.has(file.type)) return true;
  return false;
}

function showMissionDocumentsError(message) {
  const el = document.getElementById("missionDocumentsError");
  if (!el) return;
  if (!message) {
    el.textContent = "";
    el.classList.remove("is-visible");
    return;
  }
  el.textContent = message;
  el.classList.add("is-visible");
}

function renderMissionDocumentsList() {
  const list = document.getElementById("missionDocumentsList");
  if (!list) return;

  if (!missionDocuments.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = missionDocuments
    .map((entry, index) => {
      const name =
        entry.kind === "file"
          ? entry.file.name
          : entry.name || "document";
      const size =
        entry.kind === "file"
          ? entry.file.size
          : entry.size || 0;
      const ext =
        (entry.kind === "existing" && entry.format
          ? String(entry.format)
          : fileExtension(name)
        ).toUpperCase() || "FILE";
      const sizeLabel = formatFileSize(size);
      const sub = [sizeLabel, ext].filter(Boolean).join(" · ");
      return `
        <div class="mission-doc-row" data-doc-index="${index}">
          <span class="mission-doc-row__icon" aria-hidden="true"><i class="bi bi-file-earmark"></i></span>
          <span class="mission-doc-row__meta">
            <span class="mission-doc-row__name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
            <span class="mission-doc-row__size">${escapeHtml(sub)}</span>
          </span>
          <button type="button" class="mission-doc-row__remove" data-remove-doc="${index}" aria-label="Remove ${escapeHtml(name)}">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>`;
    })
    .join("");
}

function loadExistingMissionDocuments(mission) {
  const docs = normalizeMissionDocuments(mission?.documents);
  missionDocuments = docs
    .filter((d) => d && (d.url || d.name))
    .map((d) => ({
      kind: "existing",
      name: String(d.name || "document"),
      size: Number(d.size) || 0,
      type: String(d.type || ""),
      url: String(d.url || ""),
      publicId: String(d.publicId || ""),
      format: String(d.format || fileExtension(d.name || "")),
      resourceType: String(d.resourceType || "raw"),
      uploadedAt: d.uploadedAt || "",
    }));
  renderMissionDocumentsList();
  showMissionDocumentsError("");
}

function addMissionDocuments(fileList) {
  const incoming = Array.from(fileList || []);
  if (!incoming.length) return;

  const errors = [];
  const next = [...missionDocuments];

  incoming.forEach((file) => {
    if (!isAllowedMissionDocument(file)) {
      errors.push(`“${file.name}” must be PDF, DOC/DOCX, or Excel.`);
      return;
    }
    if (file.size > MISSION_DOC_MAX_BYTES) {
      errors.push(`“${file.name}” exceeds the 50MB limit.`);
      return;
    }
    const duplicate = next.some((existing) => {
      if (existing.kind === "file") {
        return (
          existing.file.name === file.name &&
          existing.file.size === file.size &&
          existing.file.lastModified === file.lastModified
        );
      }
      return (
        existing.name === file.name &&
        Number(existing.size) === file.size
      );
    });
    if (duplicate) return;
    next.push({ kind: "file", file });
  });

  missionDocuments = next;
  renderMissionDocumentsList();
  showMissionDocumentsError(errors[0] || "");
}

async function uploadNewMissionDocuments(files, orgId) {
  const uploaded = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const result = await uploadFileToCloudinary(file, {
      folder: `${ORG_CLOUDINARY.folder}/${orgId}/missions/documents`,
      publicId: buildMissionDocumentPublicId(file, i),
      maxBytes: MISSION_DOC_MAX_BYTES,
      resourceType: "raw",
      tags: ["mission-document", orgId],
    });
    uploaded.push({
      name: file.name,
      size: file.size,
      type: file.type || "",
      url: result.url,
      publicId: result.publicId || "",
      format: result.format || fileExtension(file.name),
      resourceType: result.resourceType || "raw",
      uploadedAt: new Date().toISOString(),
    });
  }
  return uploaded;
}

async function resolveMissionDocumentsForSave(orgId) {
  const kept = missionDocuments
    .filter((entry) => entry.kind === "existing" && entry.url)
    .map((entry) => ({
      name: entry.name,
      size: entry.size || 0,
      type: entry.type || "",
      url: entry.url,
      publicId: entry.publicId || "",
      format: entry.format || fileExtension(entry.name),
      resourceType: entry.resourceType || "raw",
      uploadedAt: entry.uploadedAt || "",
    }));

  const newFiles = missionDocuments
    .filter((entry) => entry.kind === "file")
    .map((entry) => entry.file);

  if (!newFiles.length) return kept;

  const uploaded = await uploadNewMissionDocuments(newFiles, orgId);
  return [...kept, ...uploaded];
}

function initializeMissionDocuments() {
  const input = document.getElementById("missionDocumentsInput");
  const pickBtn = document.getElementById("missionDocumentsPickBtn");
  const list = document.getElementById("missionDocumentsList");
  if (!input || !pickBtn || !list) return;

  pickBtn.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    addMissionDocuments(input.files);
    input.value = "";
  });
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-doc]");
    if (!btn) return;
    const index = Number(btn.getAttribute("data-remove-doc"));
    if (!Number.isInteger(index)) return;
    missionDocuments.splice(index, 1);
    renderMissionDocumentsList();
    showMissionDocumentsError("");
  });
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function updateMissionImagePreview(src) {
  const imagePreview = document.getElementById("missionImagePreview");
  const imageContainer = document.getElementById("missionImageContainer");
  const removeBtn = document.getElementById("removeMissionImage");
  if (!imagePreview) return;

  if (src) {
    imagePreview.innerHTML = `<img src="${src}" alt="Mission cover preview">`;
    imageContainer?.classList.add("has-image");
    if (removeBtn) removeBtn.hidden = false;
  } else {
    imagePreview.innerHTML =
      '<span id="missionImagePlaceholder"><i class="bi bi-camera"></i></span>';
    imageContainer?.classList.remove("has-image");
    if (removeBtn) removeBtn.hidden = true;
  }
}

function getEditFormSchedule() {
  return {
    type: document.getElementById("type")?.value || "",
    date: readUsDateInputValue(document.getElementById("date")),
    endDate: readUsDateInputValue(document.getElementById("endDate")),
    startTime: document.getElementById("startTime")?.value || "",
    endTime: document.getElementById("endTime")?.value || "",
  };
}

function initializePointsPreview() {
  const displayEl = document.getElementById("missionPointsPreview");
  const typeEl = document.getElementById("type");
  if (!displayEl) return;

  const refresh = async () => {
    const textEl = displayEl.querySelector("span") || displayEl;
    await updateMissionPointsDisplay(typeEl, textEl, getEditFormSchedule());
  };

  ["type", "date", "endDate", "startTime", "endTime"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", refresh);
    document.getElementById(id)?.addEventListener("input", refresh);
  });

  refresh();
}

function initializeImageUpload() {
  const missionImageInput = document.getElementById("missionImageInput");
  const removeBtn = document.getElementById("removeMissionImage");

  missionImageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    selectedMissionImageFile = file;
    removeMissionImage = false;

    const reader = new FileReader();
    reader.onload = (ev) => updateMissionImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener("click", () => {
    selectedMissionImageFile = null;
    removeMissionImage = true;
    if (missionImageInput) missionImageInput.value = "";
    updateMissionImagePreview(null);
  });
}

function openMissionEditSuccessModal(missionName) {
  const overlay = document.getElementById("missionEditSuccessModal");
  const messageEl = document.getElementById("missionEditSuccessModalMessage");
  if (!overlay) return;

  if (messageEl && missionName) {
    messageEl.innerHTML = `<strong>${escapeHtml(missionName)}</strong> was updated successfully. Your changes are now saved.`;
  }

  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  document.getElementById("missionEditSuccessModalOk")?.focus();
}

function closeMissionEditSuccessModal() {
  const overlay = document.getElementById("missionEditSuccessModal");
  if (!overlay) return;
  overlay.setAttribute("hidden", "");
  overlay.classList.remove("is-open");
}

function escapeHtml(text) {
  const s = String(text ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initMissionEditSuccessModal() {
  const overlay = document.getElementById("missionEditSuccessModal");
  if (!overlay) return;

  const goToDashboard = () => {
    closeMissionEditSuccessModal();
    window.location.href = "/organization/dashboard";
  };

  document.getElementById("missionEditSuccessModalOk")?.addEventListener("click", goToDashboard);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) goToDashboard();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      goToDashboard();
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/organization/login";
    return;
  }
  if (!(await assertOrgVerified(user))) return;

  initMissionEditSuccessModal();
  initializeImageUpload();
  initializeMissionDocuments();
  initUsDateInputs(["date", "endDate"]);

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

  const activeDocRef = doc(db, "organizations", user.uid, "missions", missionId);
  const historyDocRef = doc(db, "organizations", user.uid, "history", missionId);
  let docRef = activeDocRef;

  let docSnap = await getDoc(activeDocRef);
  if (!docSnap.exists()) {
    docSnap = await getDoc(historyDocRef);
    if (docSnap.exists()) docRef = historyDocRef;
  }

  if (docSnap.exists()) {
    const mission = docSnap.data();
    console.log("[INFO] Mission data loaded:", mission);

    populateMissionTypeSelect(document.getElementById("type"), {
      selectedValue: mission.type || "",
    });

    document.getElementById("name").value = mission.missionName || mission.name || "";
    document.getElementById("description").value = mission.description || "";
    setUsDateInputValue(document.getElementById("date"), mission.date || "");
    document.getElementById("startTime").value = mission.startTime || "";
    document.getElementById("endTime").value = mission.endTime || "";
    setUsDateInputValue(document.getElementById("endDate"), mission.endDate || "");
    document.getElementById("location").value = mission.location || "";
    document.getElementById("latitude").value = mission.latitude || "";
    document.getElementById("longitude").value = mission.longitude || "";
    document.getElementById("volunteers").value = mission.volunteers || 0;

    const autoAcceptEl = document.getElementById("autoAcceptVolunteers");
    if (autoAcceptEl) {
        autoAcceptEl.checked = mission.autoAcceptVolunteers === true;
    }

    await initEditDonation(mission, missionId, user.uid);

    const locationSearch = document.getElementById("locationSearch");
    if (locationSearch && mission.location) {
      locationSearch.value = mission.location;
    }

    if (typeof window.restoreMissionMapPin === "function") {
      window.restoreMissionMapPin();
    }

    if (mission.missionImage) {
      updateMissionImagePreview(mission.missionImage);
    }

    loadExistingMissionDocuments(mission);

    initializePointsPreview();

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

    const startDateEl = document.getElementById("date");
    const endDateEl = document.getElementById("endDate");
    const startDateCheck = validateUsDateInput(startDateEl, "Start date");
    if (!startDateCheck.ok) {
      alert(startDateCheck.message);
      startDateEl?.focus();
      return;
    }
    const endDateCheck = validateUsDateInput(endDateEl, "End date");
    if (!endDateCheck.ok) {
      alert(endDateCheck.message);
      endDateEl?.focus();
      return;
    }

    const schedule = {
      type: document.getElementById("type").value?.trim() || "",
      date: readUsDateInputValue(startDateEl),
      endDate: readUsDateInputValue(endDateEl),
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
      makeDonations: editDonationEnabled(),
      donationDetails: (() => {
        if (!editDonationEnabled()) return deleteField();
        const data = readEditDonationDraft();
        if (!data) return deleteField();
        return donationFieldsFromDraft(data);
      })(),
    };

    if (selectedMissionImageFile) {
      try {
        updatedData.missionImage = await convertToBase64(selectedMissionImageFile);
      } catch (conversionError) {
        console.error("[ERROR] Error converting mission image:", conversionError);
        alert(`Failed to process mission image: ${conversionError.message}`);
        return;
      }
    } else if (removeMissionImage) {
      updatedData.missionImage = deleteField();
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const prevSubmitHtml = submitBtn?.innerHTML;
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="bi bi-hourglass-split"></i> Saving…';
      }
      updatedData.documents = await resolveMissionDocumentsForSave(user.uid);
    } catch (docErr) {
      console.error("[ERROR] Mission document upload:", docErr);
      alert(docErr?.message || "Failed to upload documents.");
      if (submitBtn) {
        submitBtn.disabled = false;
        if (prevSubmitHtml != null) submitBtn.innerHTML = prevSubmitHtml;
      }
      return;
    }

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

      invalidateOrgCache(user.uid, ORG_CACHE_KEYS.DASHBOARD);
      invalidateOrgCache(user.uid, ORG_CACHE_KEYS.HISTORY);
      invalidateOrgCache(user.uid, ORG_CACHE_KEYS.ORG_MISSIONS_MAP);
      invalidateOrgCache(user.uid, missionDetailCacheKey(missionId));

      clearEditDonationDraft();
      openMissionEditSuccessModal(updatedData.missionName);
    } catch (error) {
      console.error("[ERROR] Error updating mission:", error?.code, error?.message, error);
      alert(
        error?.code === "permission-denied"
          ? "You do not have permission to update this mission."
          : "[ERROR] Failed to update mission. Please try again."
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (prevSubmitHtml != null) submitBtn.innerHTML = prevSubmitHtml;
      }
    }
  });
});

const EDIT_DONATION_DRAFT = "kalinga-mission-donation-draft";
const EDIT_DONATION_FLAG = "kalinga-mission-donation-enabled";
const EDIT_DONATION_KEEP = "kalinga-mission-donation-keep";
const EDIT_DONATION_RETURN = "kalinga-mission-donation-return-url";
let activeEditMissionId = "";

function missionDonationKey(missionId) {
  return missionId ? `${EDIT_DONATION_DRAFT}:${missionId}` : EDIT_DONATION_DRAFT;
}

function readStoredDonation(key) {
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readEditDonationDraft(missionId = activeEditMissionId) {
  if (missionId) {
    const specific = readStoredDonation(missionDonationKey(missionId));
    if (specific) return specific;
  }
  const generic = readStoredDonation(EDIT_DONATION_DRAFT);
  if (!generic) return null;
  if (missionId && generic.missionId && generic.missionId !== missionId) return null;
  return generic;
}

function donationFieldsFromDraft(details) {
  return {
    method: details.method || "gcash",
    accountName: details.accountName || "",
    gcashNumber: details.gcashNumber || "",
    qrImage: details.qrImage || "",
    note: details.note || "",
  };
}

function editDonationEnabled() {
  if (sessionStorage.getItem(EDIT_DONATION_FLAG) === "1" || localStorage.getItem(EDIT_DONATION_FLAG) === "1") {
    return true;
  }
  const draft = readEditDonationDraft();
  return !!(draft && (draft.accountName || draft.gcashNumber || draft.qrImage));
}

function clearEditDonationDraft() {
  sessionStorage.removeItem(EDIT_DONATION_DRAFT);
  localStorage.removeItem(EDIT_DONATION_DRAFT);
  sessionStorage.removeItem(EDIT_DONATION_FLAG);
  localStorage.removeItem(EDIT_DONATION_FLAG);
}

function writeEditDonationDraft(details, missionId) {
  const snapshot = {
    ...donationFieldsFromDraft(details),
    missionId: missionId || details.missionId || "",
  };
  const json = JSON.stringify(snapshot);
  const storedId = snapshot.missionId;
  sessionStorage.setItem(EDIT_DONATION_DRAFT, json);
  localStorage.setItem(EDIT_DONATION_DRAFT, json);
  if (storedId) {
    sessionStorage.setItem(missionDonationKey(storedId), json);
    localStorage.setItem(missionDonationKey(storedId), json);
  }
  sessionStorage.setItem(EDIT_DONATION_FLAG, "1");
  localStorage.setItem(EDIT_DONATION_FLAG, "1");
}

async function persistEditDonation(userId, missionId, details) {
  const payload = {
    makeDonations: true,
    donationDetails: donationFieldsFromDraft(details),
  };
  const refs = [
    doc(db, "organizations", userId, "missions", missionId),
    doc(db, "organizations", userId, "history", missionId),
    doc(db, "mission_submissions", missionId),
    doc(db, "missions", missionId),
  ];

  let saved = false;
  for (const ref of refs) {
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;
    await updateDoc(ref, payload);
    saved = true;
  }
  if (!saved) {
    throw new Error("Mission document was not found.");
  }

  invalidateOrgCache(userId, ORG_CACHE_KEYS.DASHBOARD);
  invalidateOrgCache(userId, ORG_CACHE_KEYS.HISTORY);
  invalidateOrgCache(userId, ORG_CACHE_KEYS.ORG_MISSIONS_MAP);
  invalidateOrgCache(userId, missionDetailCacheKey(missionId));
}

function updateEditDonationStatus() {
  const status = document.getElementById("missionDonationStatus");
  if (!status) return;
  status.textContent = editDonationEnabled() && readEditDonationDraft()
    ? "Donation details will be used for this mission."
    : "No donation details set for this mission yet.";
}

async function initEditDonation(mission, missionId, userId) {
  activeEditMissionId = missionId;
  const returning = sessionStorage.getItem(EDIT_DONATION_KEEP) === "1";
  sessionStorage.removeItem(EDIT_DONATION_KEEP);

  const draft = readEditDonationDraft(missionId);
  const draftForThis =
    !!draft &&
    (draft.accountName || draft.gcashNumber || draft.qrImage) &&
    (!draft.missionId || draft.missionId === missionId);

  if (!draftForThis) {
    clearEditDonationDraft();
    if (mission.makeDonations === true && mission.donationDetails) {
      writeEditDonationDraft(mission.donationDetails, missionId);
    }
  } else {
    writeEditDonationDraft(draft, missionId);
    if (returning || mission.makeDonations !== true) {
      try {
        await persistEditDonation(userId, missionId, draft);
      } catch (error) {
        console.error("[ERROR] Error saving mission donation:", error);
        alert("Donation details could not be saved. Please try again.");
      }
    }
  }
  updateEditDonationStatus();

  const back = `/missions/edit?id=${encodeURIComponent(missionId)}`;
  const arm = (id, viewOnly) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = viewOnly ? "/missions/donation-details?view=1" : "/missions/donation-details";
    el.addEventListener("click", () => {
      sessionStorage.setItem(EDIT_DONATION_KEEP, "1");
      sessionStorage.setItem(EDIT_DONATION_RETURN, back);
      const existing = readEditDonationDraft(missionId);
      if (existing && (existing.accountName || existing.gcashNumber || existing.qrImage)) {
        writeEditDonationDraft(existing, missionId);
      } else if (mission.donationDetails) {
        writeEditDonationDraft(mission.donationDetails, missionId);
      }
    });
  };
  arm("openMissionDonationBtn", false);
  arm("viewMissionDonationBtn", true);
}