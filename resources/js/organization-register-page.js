import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ORG_VERIFICATION_STATUS } from "./org-verification.js";

const STEP_LABELS = [
  "Step 1 of 4 — Organization Information",
  "Step 2 of 4 — Authorized Representative",
  "Step 3 of 4 — Supporting Documents",
  "Step 4 of 4 — Account Credentials",
];

let currentStep = 0;

function openRegisterSuccessModal(orgName) {
  const overlay = document.getElementById("registerSuccessModal");
  const messageEl = document.getElementById("registerSuccessMessage");
  if (!overlay) return;

  if (messageEl && orgName) {
    messageEl.innerHTML = `<strong>${escapeHtml(orgName)}</strong> has been registered. An administrator will review your organization before you can sign in to the dashboard.`;
  }

  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  document.getElementById("registerSuccessOk")?.focus();
}

function closeRegisterSuccessModal() {
  const overlay = document.getElementById("registerSuccessModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("hidden", "");
}

function escapeHtml(text) {
  const s = String(text ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileMeta(inputId) {
  const input = document.getElementById(inputId);
  const file = input?.files?.[0];
  if (!file) return null;
  return {
    name: file.name,
    size: file.size,
    type: file.type || "",
  };
}

function readValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function clearFieldErrors(scope = document) {
  scope.querySelectorAll(".field-error").forEach((el) => el.remove());
  scope.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

function showFieldError(targetId, message) {
  const field = document.getElementById(targetId);
  if (!field) return false;

  field.classList.add("is-invalid");

  let host = field.closest(".file-box") || field.closest(".terms-row") || field;
  if (host.classList?.contains("terms-row")) {
    host.classList.add("is-invalid");
  }

  const existing = host.parentElement?.querySelector(`.field-error[data-for="${targetId}"]`);
  if (existing) {
    existing.querySelector(".field-error-text").textContent = message;
    existing.classList.add("is-visible");
  } else {
    const error = document.createElement("div");
    error.className = "field-error is-visible";
    error.dataset.for = targetId;
    error.innerHTML = `<span class="field-error-icon" aria-hidden="true">!</span><span class="field-error-text"></span>`;
    error.querySelector(".field-error-text").textContent = message;

    if (host.classList?.contains("file-box") || host.classList?.contains("terms-row")) {
      host.insertAdjacentElement("afterend", error);
    } else {
      field.insertAdjacentElement("afterend", error);
    }
  }

  field.focus();
  return false;
}

function requireFilled(id, message) {
  if (readValue(id)) return true;
  return showFieldError(id, message);
}

function initRegisterSuccessModal() {
  const overlay = document.getElementById("registerSuccessModal");
  const okBtn = document.getElementById("registerSuccessOk");
  if (!overlay || !okBtn) return;

  okBtn.addEventListener("click", () => {
    window.location.href = "/organization/login";
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      window.location.href = "/organization/login";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeRegisterSuccessModal();
      window.location.href = "/organization/login";
    }
  });
}

function showStep(step) {
  currentStep = step;
  document.querySelectorAll(".reg-step").forEach((section) => {
    const index = Number(section.dataset.step);
    section.hidden = index !== step;
  });

  document.querySelectorAll("[data-step-pill]").forEach((pill) => {
    const index = Number(pill.dataset.stepPill);
    pill.classList.toggle("active", index === step);
    pill.classList.toggle("done", index < step);
  });

  const subtitle = document.getElementById("regStepSubtitle");
  if (subtitle) subtitle.textContent = STEP_LABELS[step] || "";

  const backBtn = document.getElementById("regBackBtn");
  const nextBtn = document.getElementById("regNextBtn");
  const submitBtn = document.getElementById("regSubmitBtn");
  const last = step === STEP_LABELS.length - 1;

  if (backBtn) backBtn.hidden = step === 0;
  if (nextBtn) nextBtn.hidden = last;
  if (submitBtn) submitBtn.hidden = !last;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep(step) {
  const active = document.querySelector(`.reg-step[data-step="${step}"]`);
  clearFieldErrors(active || document);

  if (step === 0) {
    if (!requireFilled("orgName", "Enter the organization name")) return false;
    if (!requireFilled("orgType", "Select an organization type")) return false;
    if (!requireFilled("orgEmail", "Enter an organization email")) return false;
    return true;
  }

  if (step === 1) {
    if (!requireFilled("repFullName", "Enter the representative’s full name")) return false;
    if (!requireFilled("repEmail", "Enter an email or phone number")) return false;
    return true;
  }

  if (step === 2) {
    return true;
  }

  if (step === 3) {
    if (!requireFilled("username", "Enter a username")) return false;
    if (!requireFilled("email", "Enter an email or phone number")) return false;
    const password = document.getElementById("password")?.value || "";
    const confirmPassword = document.getElementById("confirmPassword")?.value || "";
    if (password.length < 6) {
      return showFieldError("password", "Enter a password with at least 6 characters");
    }
    if (password !== confirmPassword) {
      return showFieldError("confirmPassword", "Passwords do not match");
    }
    if (document.getElementById("acceptTerms")?.checked !== true) {
      return showFieldError("acceptTerms", "Accept the terms and policies to continue");
    }
    return true;
  }

  return true;
}

function initFileUploads() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    const card = document.querySelector(`.file-upload[data-file-for="${input.id}"]`);
    if (!card) return;
    const nameEl = card.querySelector(".file-upload-name");

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        card.classList.remove("has-file");
        if (nameEl) nameEl.textContent = "No file chosen";
        return;
      }
      card.classList.add("has-file");
      if (nameEl) nameEl.textContent = file.name;
    });
  });
}

function initStepNavigation() {
  document.getElementById("regNextBtn")?.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(Math.min(currentStep + 1, STEP_LABELS.length - 1));
  });

  document.getElementById("regBackBtn")?.addEventListener("click", () => {
    showStep(Math.max(currentStep - 1, 0));
  });

  document.getElementById("registerForm")?.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement) || !target.id) return;
    target.classList.remove("is-invalid");
    document.querySelector(`.field-error[data-for="${target.id}"]`)?.remove();
    target.closest(".terms-row")?.classList.remove("is-invalid");
  });

  document.getElementById("registerForm")?.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement) || !target.id) return;
    target.classList.remove("is-invalid");
    document.querySelector(`.field-error[data-for="${target.id}"]`)?.remove();
    target.closest(".terms-row")?.classList.remove("is-invalid");
  });

  showStep(0);
}

document.addEventListener("DOMContentLoaded", () => {
  initRegisterSuccessModal();
  initFileUploads();
  initStepNavigation();

  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (currentStep !== STEP_LABELS.length - 1) {
      if (!validateStep(currentStep)) return;
      showStep(currentStep + 1);
      return;
    }

    if (!validateStep(3)) return;

    const orgName = readValue("orgName");
    const email = readValue("email");
    const password = document.getElementById("password")?.value || "";
    const submitBtn = document.getElementById("regSubmitBtn");

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account…";
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: orgName });

      await setDoc(doc(db, "organizations", user.uid), {
        orgName,
        name: orgName,
        email,
        username: readValue("username"),
        orgType: readValue("orgType"),
        orgDescription: readValue("orgDescription"),
        yearEstablished: readValue("yearEstablished"),
        orgWebsite: readValue("orgWebsite"),
        orgEmail: readValue("orgEmail"),
        orgContactNumber: readValue("orgContactNumber"),
        completeAddress: readValue("completeAddress"),
        orgScope: readValue("orgScope"),
        representative: {
          fullName: readValue("repFullName"),
          position: readValue("repPosition"),
          email: readValue("repEmail"),
          contactNumber: readValue("repContactNumber"),
        },
        documents: {
          logo: fileMeta("orgLogo"),
          govId: fileMeta("repGovId"),
          authorization: fileMeta("repAuthorization"),
          registration: fileMeta("docRegistration"),
          articles: fileMeta("docArticles"),
          addressProof: fileMeta("docAddress"),
          typeSpecific: fileMeta("docTypeSpecific"),
        },
        acceptedTerms: true,
        verified: false,
        verificationStatus: ORG_VERIFICATION_STATUS.PENDING,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);

      openRegisterSuccessModal(orgName);
    } catch (error) {
      console.error("[ERROR] Registration failed:", error);
      alert("Error: " + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
      }
    }
  });
});
