import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const orgName = document.getElementById("orgName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("[ERROR] Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: orgName });

      await setDoc(doc(db, "organizations", user.uid), {
        orgName,
        email,
        createdAt: new Date().toISOString()
      });

      alert("[SUCCESS] Registration successful!");
      window.location.href = "/organization/login";
    } catch (error) {
      console.error("[ERROR] Registration failed:", error);
      alert("Error: " + error.message);
    }
  });
});
