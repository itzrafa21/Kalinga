import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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
    validateUsDateInput,
} from "./us-date-input.js";

let currentUser = null;
let selectedMissionImageFile = null;

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
    
    currentUser = user;
    console.log("[SUCCESS] User authenticated:", user.uid);

    await loadPlatformConfig();
    populateMissionTypeSelect(document.getElementById("type"));

    initializePointsPreview();
    initializeFormSubmission();
    initializeImageUpload();
    initMissionSuccessModal();
    initUsDateInputs(["date", "end_date"]);
});

function getCreateFormSchedule() {
    return {
        type: document.getElementById("type")?.value || "",
        date: readUsDateInputValue(document.getElementById("date")),
        endDate: readUsDateInputValue(document.getElementById("end_date")),
        startTime: document.getElementById("start_time")?.value || "",
        endTime: document.getElementById("end_time")?.value || "",
    };
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
            // Get organization name
            const orgName = currentUser.displayName || currentUser.email || "Unknown Organization";
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

            openMissionSuccessModal();
        } catch (error) {
            console.error("[ERROR] Error creating mission:", error.message, error);
            alert("Failed to create mission. Please check console.");
        }
    });
    
    console.log("[SUCCESS] Form submission initialized successfully");
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
