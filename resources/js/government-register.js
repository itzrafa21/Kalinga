import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

function openSuccessModal(officeName) {
  const overlay = document.getElementById("registerSuccessModal");
  const messageEl = document.getElementById("registerSuccessMessage");
  if (!overlay) return;
  if (messageEl && officeName) {
    messageEl.textContent = `${officeName} is registered. You can now sign in to review request letters.`;
  }
  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  document.getElementById("registerSuccessOk")?.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("registerSuccessOk")?.addEventListener("click", () => {
    window.location.href = "/government/login";
  });

  const form = document.getElementById("govRegisterForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const officeName = document.getElementById("officeName").value.trim();
    const department = document.getElementById("department").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account…";
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: officeName });

      await setDoc(doc(db, "government_offices", user.uid), {
        officeName,
        name: officeName,
        department: department || "",
        email,
        role: "government",
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);
      openSuccessModal(officeName);
    } catch (error) {
      console.error("[ERROR] Government registration failed:", error);
      alert("Error: " + (error.message || "Registration failed."));
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create office account";
      }
    }
  });
});
