import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ORG_VERIFICATION_STATUS } from "./org-verification.js";

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

document.addEventListener("DOMContentLoaded", () => {
  initRegisterSuccessModal();

  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const orgName = document.getElementById("orgName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (password !== confirmPassword) {
      alert("[ERROR] Passwords do not match!");
      return;
    }

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
