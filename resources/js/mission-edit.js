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

let selectedMissionImageFile = null;
let removeMissionImage = false;

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