import { auth } from "./firebase.js";   // must include .js
import { signInWithEmailAndPassword } from "firebase/auth"; // if using Vite
// OR if no bundler, use CDN (tell me which you’re using)

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("orgLoginForm");

    if (!form) {
        console.error("[ERROR] Login form not found!");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("[SUCCESS] Logged in:", user.email);
            window.location.href = "/organization/dashboard";
        } catch (error) {
            console.error("[ERROR] Login failed:", error.message);
            alert("Login failed: " + error.message);
        }
    });
});
