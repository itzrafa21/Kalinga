import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function getLoginErrorMessage(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "The email or password you entered is incorrect. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please wait a moment and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    default:
      return "Unable to sign in right now. Please try again.";
  }
}

function openLoginErrorModal(message, title = "Login failed") {
  const overlay = document.getElementById("loginErrorModal");
  const messageEl = document.getElementById("loginErrorMessage");
  const titleEl = document.getElementById("loginErrorTitle");
  if (!overlay) return;
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  document.getElementById("loginErrorOk")?.focus();
}

function closeLoginErrorModal() {
  const overlay = document.getElementById("loginErrorModal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("hidden", "");
}

async function assertGovernmentOffice(uid) {
  const snap = await getDoc(doc(db, "government_offices", uid));
  if (!snap.exists()) {
    return { ok: false, reason: "not_government" };
  }
  const data = snap.data() || {};
  if (data.role && data.role !== "government") {
    return { ok: false, reason: "wrong_role" };
  }
  return { ok: true, data };
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("loginErrorModal");
  document.getElementById("loginErrorOk")?.addEventListener("click", closeLoginErrorModal);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeLoginErrorModal();
  });

  const form = document.getElementById("govLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in…";
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const check = await assertGovernmentOffice(user.uid);
      if (!check.ok) {
        await signOut(auth);
        openLoginErrorModal(
          "This account is not registered as a government office. Please use the government office login or register an office account.",
          "Access denied"
        );
        return;
      }
      window.location.href = "/government/dashboard";
    } catch (error) {
      console.error("[ERROR] Government login failed:", error);
      openLoginErrorModal(getLoginErrorMessage(error));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    }
  });
});
