import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

function getLoginErrorMessage(error) {
    const code = error?.code || "";

    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "The email or password you entered is incorrect. Please check your credentials and try again.";
        case "auth/too-many-requests":
            return "Too many failed login attempts. Please wait a moment and try again.";
        case "auth/user-disabled":
            return "This account has been disabled. Please contact support.";
        default:
            return "Unable to sign in right now. Please try again.";
    }
}

function openLoginErrorModal(message) {
    const overlay = document.getElementById("loginErrorModal");
    const messageEl = document.getElementById("loginErrorMessage");
    if (!overlay) return;

    if (messageEl && message) {
        messageEl.textContent = message;
    }

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

function initLoginErrorModal() {
    const overlay = document.getElementById("loginErrorModal");
    const okBtn = document.getElementById("loginErrorOk");
    if (!overlay || !okBtn) return;

    okBtn.addEventListener("click", () => {
        closeLoginErrorModal();
        document.getElementById("password")?.focus();
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeLoginErrorModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            closeLoginErrorModal();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initLoginErrorModal();

    const form = document.getElementById("orgLoginForm");
    if (!form) {
        console.error("[ERROR] Login form not found!");
        return;
    }

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
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
            const user = userCredential.user;
            console.log("[SUCCESS] Logged in:", user.email);
            window.location.href = "/organization/dashboard";
        } catch (error) {
            console.error("[ERROR] Login failed:", error.message);
            openLoginErrorModal(getLoginErrorMessage(error));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Login";
            }
        }
    });
});
