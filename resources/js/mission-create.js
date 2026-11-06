import { auth, db } from "./firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    assertOrgVerified,
    fetchOrganizationDisplayName,
} from "./org-verification.js";
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
import { invalidateOrgCache, ORG_CACHE_KEYS } from "./org-data-cache.js";
import {
    ORG_CLOUDINARY,
    uploadFileToCloudinary,
    buildMissionDocumentPublicId,
} from "./cloudinary-upload.js";

let currentUser = null;
let selectedMissionImageFile = null;
let restoredMissionImageDataUrl = null;
/** @type {File[]} */
let selectedMissionDocuments = [];

const MISSION_DOC_MAX_BYTES = 50 * 1024 * 1024;
const MISSION_DOC_ACCEPT_EXT = new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
]);
const MISSION_DOC_ACCEPT_MIME = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const CREATE_FORM_DRAFT_KEY = "kalinga-create-mission-form";

function readCreateFormDraft() {
    try {
        const raw = sessionStorage.getItem(CREATE_FORM_DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveCreateFormDraft() {
    const previewImg = document.querySelector("#missionImagePreview img");
    const image = previewImg?.src?.startsWith("data:") ? previewImg.src : restoredMissionImageDataUrl || "";
    const draft = {
        name: document.getElementById("name")?.value || "",
        description: document.getElementById("description")?.value || "",
        type: document.getElementById("type")?.value || "",
        date: readUsDateInputValue(document.getElementById("date")),
        endDate: readUsDateInputValue(document.getElementById("end_date")),
        startTime: document.getElementById("start_time")?.value || "",
        endTime: document.getElementById("end_time")?.value || "",
        volunteers: document.getElementById("volunteers")?.value || "",
        autoAccept: document.getElementById("autoAcceptVolunteers")?.checked === true,
        linkedCampaignId: document.getElementById("linkedCampaignId")?.value || "",
        locationSearch: document.getElementById("locationSearch")?.value || "",
        location: document.getElementById("location")?.value || "",
        latitude: document.getElementById("latitude")?.value || "",
        longitude: document.getElementById("longitude")?.value || "",
        image: image && image.length < 1500000 ? image : "",
    };
    const hasContent = draft.name || draft.description || draft.date || draft.location || draft.volunteers;
    if (!hasContent) {
        const existing = readCreateFormDraft();
        if (existing && (existing.name || existing.description || existing.date || existing.location)) {
            return;
        }
    }
    try {
        sessionStorage.setItem(CREATE_FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
        console.warn("[WARN] Could not keep the mission form draft:", err);
    }
}

function clearCreateFormDraft() {
    sessionStorage.removeItem(CREATE_FORM_DRAFT_KEY);
    restoredMissionImageDataUrl = null;
    selectedMissionDocuments = [];
    renderMissionDocumentsList();
    showMissionDocumentsError("");
}

function restoreCreateFormDraft() {
    const draft = readCreateFormDraft();
    if (!draft) return;

    const name = document.getElementById("name");
    const description = document.getElementById("description");
    const type = document.getElementById("type");
    const volunteers = document.getElementById("volunteers");
    const autoAccept = document.getElementById("autoAcceptVolunteers");
    const locationSearch = document.getElementById("locationSearch");
    const location = document.getElementById("location");
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");

    if (name) name.value = draft.name || "";
    if (description) description.value = draft.description || "";
    if (type && draft.type) type.value = draft.type;
    setUsDateInputValue(document.getElementById("date"), draft.date || "");
    setUsDateInputValue(document.getElementById("end_date"), draft.endDate || "");
    const startTime = document.getElementById("start_time");
    const endTime = document.getElementById("end_time");
    if (startTime) startTime.value = draft.startTime || "";
    if (endTime) endTime.value = draft.endTime || "";
    if (volunteers) volunteers.value = draft.volunteers || "";
    if (autoAccept) autoAccept.checked = draft.autoAccept === true;
    const linkedCampaign = document.getElementById("linkedCampaignId");
    if (linkedCampaign && draft.linkedCampaignId) {
        linkedCampaign.dataset.restoreValue = draft.linkedCampaignId;
        linkedCampaign.value = draft.linkedCampaignId;
    }
    if (locationSearch) locationSearch.value = draft.locationSearch || draft.location || "";
    if (location) location.value = draft.location || "";
    if (latitude) latitude.value = draft.latitude || "";
    if (longitude) longitude.value = draft.longitude || "";

    if (draft.image) {
        restoredMissionImageDataUrl = draft.image;
        const imagePreview = document.getElementById("missionImagePreview");
        const imageContainer = document.getElementById("missionImageContainer");
        const removeBtn = document.getElementById("removeMissionImage");
        if (imagePreview) {
            imagePreview.innerHTML = `<img src="${draft.image}" alt="Mission cover preview">`;
        }
        imageContainer?.classList.add("has-image");
        if (removeBtn) removeBtn.hidden = false;
    }

    if (typeof window.restoreMissionMapPin === "function") {
        window.restoreMissionMapPin();
    }
    document.getElementById("type")?.dispatchEvent(new Event("change"));
}

const MISSION_DONATION_FLAG = "kalinga-mission-donation-enabled";
const CREATE_DRAFT_KEY = "kalinga-create-mission-draft";
const DONATION_KEEP_KEY = "kalinga-mission-donation-keep";

function clearMissionDonationChoice() {
    localStorage.removeItem(MISSION_DONATION_FLAG);
    sessionStorage.removeItem(MISSION_DONATION_FLAG);
    sessionStorage.removeItem(CREATE_DRAFT_KEY);
    localStorage.removeItem("kalinga-mission-donation-draft");
    sessionStorage.removeItem("kalinga-mission-donation-draft");
    sessionStorage.removeItem("kalinga-create-donation-added");
}

function isMissionDonationEnabled() {
    return (
        localStorage.getItem(MISSION_DONATION_FLAG) === "1" ||
        sessionStorage.getItem(MISSION_DONATION_FLAG) === "1"
    );
}

function getSavedDonationDetails() {
    try {
        const raw =
            sessionStorage.getItem("kalinga-mission-donation-draft") ||
            localStorage.getItem("kalinga-mission-donation-draft");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function updateMissionDonationStatusUi() {
    const status = document.getElementById("missionDonationStatus");
    if (!status) return;
    status.textContent = isMissionDonationEnabled()
        ? "Donation details will be used for this mission."
        : "No donation details set for this mission yet.";
}

function initMissionDonationLifecycle() {
    const nav = performance.getEntriesByType("navigation")[0];
    const reloaded = !nav || nav.type === "reload";
    const returningFromDonation = sessionStorage.getItem(DONATION_KEEP_KEY) === "1";
    sessionStorage.removeItem(DONATION_KEEP_KEY);

    if (reloaded || !returningFromDonation) {
        clearMissionDonationChoice();
    }
    sessionStorage.setItem(CREATE_DRAFT_KEY, "1");
    updateMissionDonationStatusUi();

    const keepForDonationPage = () => {
        saveCreateFormDraft();
        sessionStorage.setItem(DONATION_KEEP_KEY, "1");
        sessionStorage.setItem("kalinga-mission-donation-return-url", "/missions/create");
    };
    document.getElementById("openMissionDonationBtn")?.addEventListener("click", keepForDonationPage);
    document.getElementById("viewMissionDonationBtn")?.addEventListener("click", keepForDonationPage);

    window.addEventListener("pagehide", () => {
        saveCreateFormDraft();
        if (sessionStorage.getItem(DONATION_KEEP_KEY) === "1") return;
        clearMissionDonationChoice();
    });
}

function openMissionSuccessModal() {
    const overlay = document.getElementById("missionSuccessModal");
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.getElementById("missionSuccessModalOk")?.focus();
  }
  
  function closeMissionSuccessModal() {
    const overlay = document.getElementById("missionSuccessModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
  }
  
  function initMissionSuccessModal() {
    const overlay = document.getElementById("missionSuccessModal");
    if (!overlay) return;
  
    document.getElementById("missionSuccessModalOk")?.addEventListener("click", () => {
      closeMissionSuccessModal();
      window.location.href = "/organization/dashboard";
    });
  
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeMissionSuccessModal();
        window.location.href = "/organization/dashboard";
      }
    });
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeMissionSuccessModal();
        window.location.href = "/organization/dashboard";
      }
    });
  }

// Wait for authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;

    currentUser = user;
    console.log("[SUCCESS] User authenticated:", user.uid);

    await loadPlatformConfig();
    const savedForm = readCreateFormDraft();
    populateMissionTypeSelect(document.getElementById("type"), {
        selectedValue: savedForm?.type || "",
    });

    initializePointsPreview();
    initializeFormSubmission();
    initializeImageUpload();
    initializeMissionDocuments();
    initMissionSuccessModal();
    initUsDateInputs(["date", "end_date"]);
    restoreCreateFormDraft();
    initMissionDonationLifecycle();
    await loadLinkedCampaignOptions(user.uid);

    document.querySelector(".form-panel-actions .btn-light")?.addEventListener("click", () => {
        clearCreateFormDraft();
    });
});

async function loadLinkedCampaignOptions(orgId) {
    const select = document.getElementById("linkedCampaignId");
    if (!select) return;

    const restoreValue = select.dataset.restoreValue || select.value || "";
    select.innerHTML = '<option value="">None (optional)</option>';

    try {
        const snap = await getDocs(
            query(collection(db, "donation_campaigns"), where("orgId", "==", orgId))
        );
        const campaigns = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) =>
                ["draft", "pending_approval", "published"].includes(
                    String(c.status || "").toLowerCase()
                )
            )
            .sort((a, b) =>
                String(a.title || "").localeCompare(String(b.title || ""), undefined, {
                    sensitivity: "base",
                })
            );

        for (const campaign of campaigns) {
            const opt = document.createElement("option");
            opt.value = campaign.id;
            const status = String(campaign.status || "draft").replace(/_/g, " ");
            opt.textContent = `${campaign.title || "Untitled"} (${status})`;
            select.appendChild(opt);
        }

        if (restoreValue) {
            select.value = restoreValue;
        }
    } catch (error) {
        console.warn("[WARN] Could not load donation campaigns:", error);
    }
}

function getLinkedCampaignFields() {
    const select = document.getElementById("linkedCampaignId");
    const linkedCampaignId = String(select?.value || "").trim();
    if (!linkedCampaignId) {
        return {
            linkedCampaignId: "",
            linkedCampaignName: "",
        };
    }
    const label = String(select.selectedOptions?.[0]?.textContent || "")
        .replace(/\s*\([^)]*\)\s*$/, "")
        .trim();
    return {
        linkedCampaignId,
        linkedCampaignName: label || linkedCampaignId,
    };
}

function getCreateFormSchedule() {
    return {
        type: document.getElementById("type")?.value || "",
        date: readUsDateInputValue(document.getElementById("date")),
        endDate: readUsDateInputValue(document.getElementById("end_date")),
        startTime: document.getElementById("start_time")?.value || "",
        endTime: document.getElementById("end_time")?.value || "",
    };
}

function parseCreateDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    try {
        const raw = String(timeStr).trim();
        if (/am|pm/i.test(raw)) {
            const [time, period] = raw.split(/\s+/);
            const [hours, minutes] = time.split(":");
            let hour24 = parseInt(hours, 10);
            const p = period.toUpperCase();
            if (p === "AM") {
                if (hour24 === 12) hour24 = 0;
            } else if (p === "PM" && hour24 !== 12) {
                hour24 += 12;
            }
            return new Date(
                `${dateStr}T${String(hour24).padStart(2, "0")}:${minutes}`
            );
        }
        const t = raw.length === 5 ? `${raw}:00` : raw;
        return new Date(`${dateStr}T${t}`);
    } catch {
        return null;
    }
}

function validateMissionScheduleNotPast(schedule) {
    const start = parseCreateDateTime(schedule.date, schedule.startTime);
    const end = parseCreateDateTime(schedule.endDate, schedule.endTime);
    const now = new Date();

    if (!start || Number.isNaN(start.getTime())) {
        return { ok: false, message: "Please enter a valid start date and time." };
    }
    if (!end || Number.isNaN(end.getTime())) {
        return { ok: false, message: "Please enter a valid end date and time." };
    }
    if (end <= start) {
        return {
            ok: false,
            message: "End time must be after start time. Please enter a fixed schedule.",
        };
    }
    if (end <= now) {
        return {
            ok: false,
            message:
                "This mission time has already passed. Please enter a fixed future date and time.",
        };
    }
    if (start <= now) {
        return {
            ok: false,
            message:
                "The start time has already passed. Please enter a fixed future start time.",
        };
    }
    return { ok: true };
}

function initializePointsPreview() {
    const displayEl = document.getElementById("missionPointsPreview");
    const typeEl = document.getElementById("type");
    if (!displayEl) return;

    const refresh = async () => {
        const textEl = displayEl?.querySelector("span") || displayEl;
        await updateMissionPointsDisplay(typeEl, textEl, getCreateFormSchedule());
    };

    ["type", "date", "end_date", "start_time", "end_time"].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", refresh);
        document.getElementById(id)?.addEventListener("input", refresh);
    });

    refresh();
}

// Initialize form submission
function initializeFormSubmission() {
    const form = document.getElementById("createMissionForm"); //  FIXED: Changed from "missionForm" to "createMissionForm"
    
    if (!form) {
        console.error("[ERROR] Form not found!");
        return;
    }
    
    console.log("[SUCCESS] Form found, setting up submission handler");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // This prevents page refresh
        console.log("[INFO] Form submitted");
        
        try {
            const orgName = await fetchOrganizationDisplayName(
                currentUser.uid,
                currentUser.displayName || currentUser.email || "Unknown Organization"
            );
            console.log("[INFO] Organization name:", orgName);
            
            const latVal = parseFloat(document.getElementById("latitude")?.value);
            const lngVal = parseFloat(document.getElementById("longitude")?.value);

            if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) {
                alert("Please pin a location on the map before submitting.");
                return;
            }

            const location =
                document.getElementById("location")?.value?.trim() ||
                `Pinned location (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
            const latitude = latVal;
            const longitude = lngVal;
            
            console.log("[INFO] Location data from form:");
            console.log("  - Location:", location);
            console.log("  - Latitude:", latitude);
            console.log("  - Longitude:", longitude);

            const missionType = document.getElementById("type")?.value?.trim() || "";
            if (!missionType) {
                alert("Please select a mission type.");
                return;
            }
            if (!isPlatformConfigReady()) {
                alert(
                    "Mission types and duration multipliers are not configured yet. Please contact an administrator."
                );
                return;
            }
            const startDateEl = document.getElementById("date");
            const endDateEl = document.getElementById("end_date");
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

            const schedule = getCreateFormSchedule();
schedule.type = missionType;

const scheduleCheck = validateMissionScheduleNotPast(schedule);
if (!scheduleCheck.ok) {
    alert(scheduleCheck.message);
    document.getElementById("start_time")?.focus();
    return;
}

const pointsFields = await computeMissionPointsPayload(schedule);

            const missionData = {
                missionName: document.getElementById("name")?.value || "Untitled",
                description: document.getElementById("description")?.value || "",
                type: missionType,
                ...pointsFields,
                status: "Pending",
                date: schedule.date,
                startTime: document.getElementById("start_time")?.value || "",
                endTime: document.getElementById("end_time")?.value || "",
                location: location || "N/A",
                latitude: latitude || "N/A",
                longitude: longitude || "N/A",
                volunteers: document.getElementById("volunteers")?.value || "1",          
                autoAcceptVolunteers:
                    document.getElementById("autoAcceptVolunteers")?.checked === true,
                ...getLinkedCampaignFields(),
                    makeDonations: isMissionDonationEnabled(),
                    donationDetails: (() => {
                        if (!isMissionDonationEnabled()) return null;
                        const data = getSavedDonationDetails();
                        if (!data) return null;
                        return {
                            method: data.method || "gcash",
                            accountName: data.accountName || "",
                            gcashNumber: data.gcashNumber || "",
                            qrImage: data.qrImage || "",
                            note: data.note || "",
                        };
                    })(),
                orgId: currentUser.uid,
                orgName: orgName,
                createdAt: new Date(),
                submittedAt: new Date(),
                submittedBy: currentUser.email,
                endDate: schedule.endDate,
            };

            // Handle mission image upload with Base64
            if (selectedMissionImageFile) {
                console.log("[INFO] Converting mission image to Base64...");
                
                try {
                    const base64Image = await convertToBase64(selectedMissionImageFile);
                    missionData.missionImage = base64Image;
                    console.log("[SUCCESS] Mission image converted to Base64");
                } catch (conversionError) {
                    console.error("[ERROR] Error converting mission image:", conversionError);
                    alert(`Failed to process mission image: ${conversionError.message}`);
                    return;
                }
            } else if (restoredMissionImageDataUrl) {
                missionData.missionImage = restoredMissionImageDataUrl;
            }

            if (selectedMissionDocuments.length > 0) {
                const submitBtn = form.querySelector('button[type="submit"]');
                const prevSubmitHtml = submitBtn?.innerHTML;
                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML =
                            '<i class="bi bi-hourglass-split"></i> Uploading documents…';
                    }
                    missionData.documents = await uploadMissionDocuments(
                        selectedMissionDocuments,
                        currentUser.uid
                    );
                } catch (docErr) {
                    console.error("[ERROR] Mission document upload:", docErr);
                    alert(docErr?.message || "Failed to upload documents.");
                    return;
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        if (prevSubmitHtml != null) submitBtn.innerHTML = prevSubmitHtml;
                    }
                }
            } else {
                missionData.documents = [];
            }

            console.log("[INFO] Mission data prepared:", missionData);

            // Save only to mission submissions (NOT to live missions yet)
            console.log("[INFO] Saving mission to mission_submissions...");
            const submissionData = {
                ...missionData,
                status: "Pending",
                workflowStatus: "submitted",
                submittedAt: serverTimestamp(),
            };

            const submissionRef = await addDoc(collection(db, "mission_submissions"), submissionData);
            console.log("[SUCCESS] Mission submission saved with ID:", submissionRef.id);

            // Also save to organization's missions so it appears immediately in org dashboard
            const orgMissionRef = doc(db, "organizations", currentUser.uid, "missions", submissionRef.id);
            await setDoc(orgMissionRef, {
                ...submissionData,
                submissionId: submissionRef.id
            });
            console.log("[SUCCESS] Mission saved to organization dashboard as Pending");

            // Mirror link onto the campaign when one was selected
            if (missionData.linkedCampaignId) {
                try {
                    await updateDoc(doc(db, "donation_campaigns", missionData.linkedCampaignId), {
                        relatedMissionId: submissionRef.id,
                        relatedMissionName: missionData.missionName || "",
                        updatedAt: serverTimestamp(),
                    });
                } catch (linkErr) {
                    console.warn("[WARN] Could not update linked campaign:", linkErr);
                }
            }

            invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.DASHBOARD);
            invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.PROFILE);
            invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.ORG_MISSIONS_MAP);
            invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.VOLUNTEERS);
            clearMissionDonationChoice();
            clearCreateFormDraft();

            openMissionSuccessModal();
        } catch (error) {
            console.error("[ERROR] Error creating mission:", error.message, error);
            alert("Failed to create mission. Please check console.");
        }
    });
    
    console.log("[SUCCESS] Form submission initialized successfully");
}

function fileExtension(name) {
    const parts = String(name || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
}

function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
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

    if (!selectedMissionDocuments.length) {
        list.innerHTML = "";
        return;
    }

    list.innerHTML = selectedMissionDocuments
        .map((file, index) => {
            const ext = fileExtension(file.name).toUpperCase() || "FILE";
            return `
        <div class="mission-doc-row" data-doc-index="${index}">
          <span class="mission-doc-row__icon" aria-hidden="true"><i class="bi bi-file-earmark"></i></span>
          <span class="mission-doc-row__meta">
            <span class="mission-doc-row__name" title="${escapeHtmlAttr(file.name)}">${escapeHtmlAttr(file.name)}</span>
            <span class="mission-doc-row__size">${escapeHtmlAttr(formatFileSize(file.size))} · ${escapeHtmlAttr(ext)}</span>
          </span>
          <button type="button" class="mission-doc-row__remove" data-remove-doc="${index}" aria-label="Remove ${escapeHtmlAttr(file.name)}">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>`;
        })
        .join("");
}

function escapeHtmlAttr(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function addMissionDocuments(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const errors = [];
    const next = [...selectedMissionDocuments];

    incoming.forEach((file) => {
        if (!isAllowedMissionDocument(file)) {
            errors.push(`“${file.name}” must be PDF, DOC/DOCX, or Excel.`);
            return;
        }
        if (file.size > MISSION_DOC_MAX_BYTES) {
            errors.push(`“${file.name}” exceeds the 50MB limit.`);
            return;
        }
        const duplicate = next.some(
            (existing) =>
                existing.name === file.name &&
                existing.size === file.size &&
                existing.lastModified === file.lastModified
        );
        if (duplicate) return;
        next.push(file);
    });

    selectedMissionDocuments = next;
    renderMissionDocumentsList();
    showMissionDocumentsError(errors[0] || "");
}

async function uploadMissionDocuments(files, orgId) {
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
        selectedMissionDocuments.splice(index, 1);
        renderMissionDocumentsList();
        showMissionDocumentsError("");
    });
}

// Initialize image upload functionality
function initializeImageUpload() {
    const missionImageInput = document.getElementById("missionImageInput");
    const imagePreview = document.getElementById("missionImagePreview");
    const imageContainer = document.getElementById("missionImageContainer");
    const removeBtn = document.getElementById("removeMissionImage");

    if (missionImageInput) {
        missionImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            selectedMissionImageFile = file;
            console.log("[INFO] Mission image selected:", file.name);

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (imagePreview) {
                    imagePreview.innerHTML = `<img src="${ev.target.result}" alt="Mission cover preview">`;
                }
                imageContainer?.classList.add("has-image");
                if (removeBtn) removeBtn.hidden = false;
            };
            reader.readAsDataURL(file);
        });
    }

    removeBtn?.addEventListener("click", () => {
        selectedMissionImageFile = null;
        restoredMissionImageDataUrl = null;
        if (missionImageInput) missionImageInput.value = "";
        if (imagePreview) {
            imagePreview.innerHTML =
                '<span id="missionImagePlaceholder"><i class="bi bi-camera"></i></span>';
        }
        imageContainer?.classList.remove("has-image");
        removeBtn.hidden = true;
    });
}

// Helper function to convert file to Base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
