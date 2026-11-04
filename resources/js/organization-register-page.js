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

function readMultiValues(fieldKey) {
  const root = document.querySelector(`[data-multi-field="${fieldKey}"]`);
  if (!root) return [];
  return Array.from(root.querySelectorAll(".multi-field-row input"))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function clearFieldErrors(scope = document) {
  scope.querySelectorAll(".field-error").forEach((el) => el.remove());
  scope.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

function showFieldError(targetId, message) {
  const field = document.getElementById(targetId);
  if (!field) return false;

  field.classList.add("is-invalid");

  const multiField = field.closest(".multi-field");
  const fileBox = field.closest(".file-box");
  let host = fileBox || field.closest(".terms-row") || multiField || field;
  if (host.classList?.contains("terms-row")) {
    host.classList.add("is-invalid");
  }
  if (fileBox) {
    fileBox.querySelector(".file-upload")?.classList.add("is-invalid");
  }

  const existing = (multiField || host.parentElement)?.querySelector(`.field-error[data-for="${targetId}"]`);
  if (existing) {
    existing.querySelector(".field-error-text").textContent = message;
    existing.classList.add("is-visible");
  } else {
    const error = document.createElement("div");
    error.className = "field-error is-visible";
    error.dataset.for = targetId;
    error.innerHTML = `<span class="field-error-icon" aria-hidden="true">!</span><span class="field-error-text"></span>`;
    error.querySelector(".field-error-text").textContent = message;

    if (multiField) {
      multiField.appendChild(error);
    } else if (host.classList?.contains("file-box") || host.classList?.contains("terms-row")) {
      host.insertAdjacentElement("afterend", error);
    } else {
      field.insertAdjacentElement("afterend", error);
    }
  }

  if (field.type === "file") {
    fileBox?.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    field.focus();
  }
  return false;
}

function syncMultiFieldPrimary(root, fieldKey) {
  const inputs = root.querySelectorAll(".multi-field-row input");
  inputs.forEach((input, index) => {
    input.removeAttribute("id");
    input.removeAttribute("data-multi-primary");
    if (index === 0) {
      input.id = fieldKey;
      input.setAttribute("data-multi-primary", "");
    }
  });

  const label = root.querySelector(".form-label");
  if (label && inputs[0]) label.setAttribute("for", fieldKey);
}

function syncMultiFieldActions(root) {
  const rows = root.querySelectorAll(".multi-field-row");
  rows.forEach((row, index) => {
    const btn = row.querySelector(".multi-field-action");
    if (!btn) return;

    if (index === rows.length - 1) {
      btn.classList.remove("is-remove");
      btn.removeAttribute("data-multi-remove");
      btn.setAttribute("data-multi-add", "");
      btn.setAttribute("aria-label", btn.dataset.addLabel || "Add another field");
      btn.textContent = "+";
    } else {
      btn.classList.add("is-remove");
      btn.removeAttribute("data-multi-add");
      btn.setAttribute("data-multi-remove", "");
      btn.setAttribute("aria-label", "Remove this field");
      btn.textContent = "−";
    }
  });
}

function createMultiFieldRow(templateInput, fieldKey) {
  const row = document.createElement("div");
  row.className = "multi-field-row";

  const input = document.createElement("input");
  input.type = templateInput.type || "text";
  input.className = "form-control";
  input.name = `${fieldKey}[]`;
  input.placeholder = templateInput.placeholder || "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "multi-field-action";
  btn.dataset.addLabel = templateInput.closest(".multi-field")
    ?.querySelector("[data-multi-add]")
    ?.getAttribute("aria-label") || "Add another field";
  btn.setAttribute("data-multi-add", "");
  btn.setAttribute("aria-label", btn.dataset.addLabel);
  btn.textContent = "+";

  row.append(input, btn);
  return row;
}

function initMultiFields() {
  document.querySelectorAll("[data-multi-field]").forEach((root) => {
    const fieldKey = root.dataset.multiField;
    const list = root.querySelector(".multi-field-list");
    const primary = root.querySelector("[data-multi-primary]");
    if (!list || !primary) return;

    const addLabel = root.querySelector("[data-multi-add]")?.getAttribute("aria-label") || "Add another field";
    root.querySelectorAll(".multi-field-action").forEach((btn) => {
      btn.dataset.addLabel = addLabel;
    });

    syncMultiFieldActions(root);

    root.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-multi-add]");
      const removeBtn = e.target.closest("[data-multi-remove]");

      if (addBtn && root.contains(addBtn)) {
        e.preventDefault();
        const template = root.querySelector("[data-multi-primary]") || primary;
        const row = createMultiFieldRow(template, fieldKey);
        list.appendChild(row);
        syncMultiFieldPrimary(root, fieldKey);
        syncMultiFieldActions(root);
        row.querySelector("input")?.focus();
        return;
      }

      if (removeBtn && root.contains(removeBtn)) {
        e.preventDefault();
        const rows = root.querySelectorAll(".multi-field-row");
        if (rows.length <= 1) return;
        const row = removeBtn.closest(".multi-field-row");
        if (!row) return;
        row.remove();
        syncMultiFieldPrimary(root, fieldKey);
        syncMultiFieldActions(root);
      }
    });
  });
}

function requireFilled(id, message) {
  if (readValue(id)) return true;
  return showFieldError(id, message);
}

function requireFile(id, message) {
  const input = document.getElementById(id);
  if (input?.files?.length) return true;
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
    if (!requireFilled("orgDescription", "Enter the organization description")) return false;
    if (!requireFile("orgLogo", "Upload the organization logo")) return false;
    if (!requireFilled("yearEstablished", "Enter the year established")) return false;
    if (!requireFilled("orgWebsite", "Enter a website or social media account")) return false;
    if (!requireFilled("orgEmail", "Enter an organization email")) return false;
    if (!requireFilled("orgContactNumber", "Enter a contact number")) return false;
    if (!requireFilled("completeAddress", "Enter the complete address")) return false;
    if (!requireFilled("orgScope", "Select an organization scope")) return false;
    return true;
  }

  if (step === 1) {
    if (!requireFilled("repFullName", "Enter the representative’s full name")) return false;
    if (!requireFilled("repPosition", "Enter the position or designation")) return false;
    if (!requireFilled("repEmail", "Enter an email address")) return false;
    if (!requireFilled("repContactNumber", "Enter a contact number")) return false;
    if (!requireFilled("repGovIdType", "Select a government-issued ID type")) return false;
    if (!requireFilled("repGovIdNumber", "Enter the ID number")) return false;
    if (!requireFile("repGovIdFront", "Upload the front side of the ID")) return false;
    if (!requireFile("repGovIdBack", "Upload the back side of the ID")) return false;
    if (!requireFile("repAuthorization", "Upload proof of authorization")) return false;
    return true;
  }

  if (step === 2) {
    if (!requireFile("docRegistration", "Upload the certificate of registration")) return false;
    if (!requireFile("docAddress", "Upload proof of official address")) return false;
    if (!requireFile("docTypeSpecific", "Upload the type-specific document")) return false;
    return true;
  }

  if (step === 3) {
    if (!requireFilled("username", "Enter a username")) return false;
    if (!requireFilled("email", "Enter an email address")) return false;
    const password = document.getElementById("password")?.value || "";
    const confirmPassword = document.getElementById("confirmPassword")?.value || "";
    if (!password) {
      return showFieldError("password", "Enter a password");
    }
    if (password.length < 6) {
      return showFieldError("password", "Enter a password with at least 6 characters");
    }
    if (!confirmPassword) {
      return showFieldError("confirmPassword", "Confirm your password");
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

  const clearLiveFieldError = (target) => {
    if (!(target instanceof HTMLElement)) return;
    target.classList.remove("is-invalid");
    target.closest(".terms-row")?.classList.remove("is-invalid");

    const multiField = target.closest(".multi-field");
    if (multiField) {
      multiField.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
      multiField.querySelectorAll(".field-error").forEach((el) => el.remove());
      return;
    }

    const fileBox = target.closest(".file-box");
    if (fileBox) {
      fileBox.querySelector(".file-upload")?.classList.remove("is-invalid");
      if (target.id) {
        document.querySelector(`.field-error[data-for="${target.id}"]`)?.remove();
      }
      return;
    }

    if (!target.id) return;
    document.querySelector(`.field-error[data-for="${target.id}"]`)?.remove();
  };

  document.getElementById("registerForm")?.addEventListener("input", (e) => {
    clearLiveFieldError(e.target);
  });

  document.getElementById("registerForm")?.addEventListener("change", (e) => {
    clearLiveFieldError(e.target);
  });

  showStep(0);
}

function initLabelInfoTips() {
  document.querySelectorAll(".label-info").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = btn.classList.contains("is-open");
      document.querySelectorAll(".label-info.is-open").forEach((el) => {
        el.classList.remove("is-open");
      });
      if (!wasOpen) btn.classList.add("is-open");
    });
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".label-info")) return;
    document.querySelectorAll(".label-info.is-open").forEach((el) => {
      el.classList.remove("is-open");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initRegisterSuccessModal();
  initFileUploads();
  initMultiFields();
  initLabelInfoTips();
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
        orgWebsites: readMultiValues("orgWebsite"),
        orgEmail: readValue("orgEmail"),
        orgEmails: readMultiValues("orgEmail"),
        orgContactNumber: readValue("orgContactNumber"),
        orgContactNumbers: readMultiValues("orgContactNumber"),
        completeAddress: readValue("completeAddress"),
        orgScope: readValue("orgScope"),
        representative: {
          fullName: readValue("repFullName"),
          position: readValue("repPosition"),
          email: readValue("repEmail"),
          contactNumber: readValue("repContactNumber"),
          govIdType: readValue("repGovIdType"),
          govIdNumber: readValue("repGovIdNumber"),
        },
        documents: {
          logo: fileMeta("orgLogo"),
          govIdFront: fileMeta("repGovIdFront"),
          govIdBack: fileMeta("repGovIdBack"),
          authorization: fileMeta("repAuthorization"),
          registration: fileMeta("docRegistration"),
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
