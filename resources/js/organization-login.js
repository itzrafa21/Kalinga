import { auth } from "./firebase.js";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import {
    fetchOrgVerification,
    getVerificationBlockMessageForData,
} from "./org-verification.js";

function getLoginErrorMessage(error) {
    const code = error?.code || "";

    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
            return "Invalid password. Contact the administrator.";
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

function openLoginErrorModal(message, title = "Login failed") {
    const overlay = document.getElementById("loginErrorModal");
    const messageEl = document.getElementById("loginErrorMessage");
    const titleEl = document.getElementById("loginErrorTitle");
    if (!overlay) return;

    if (titleEl && title) {
        titleEl.textContent = title;
    }
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

function initPasswordToggle() {
    const input = document.getElementById("password");
    const toggle = document.getElementById("passwordToggle");
    if (!input || !toggle) return;

    toggle.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggle.classList.toggle("is-visible", !showing);
        toggle.setAttribute("aria-pressed", showing ? "false" : "true");
        toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        input.focus();
    });
}

function initForgotPassword() {
    const link = document.getElementById("forgotPasswordLink");
    if (!link) return;

    link.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email")?.value.trim() || "";
        if (!email) {
            openLoginErrorModal(
                "Enter your organization email first, then tap Forgot password again.",
                "Reset password"
            );
            document.getElementById("email")?.focus();
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            openLoginErrorModal(
                "If that email is registered, a password reset link is on the way. Check your inbox.",
                "Check your email"
            );
        } catch (error) {
            console.error(error);
            if (error?.code === "auth/invalid-email") {
                openLoginErrorModal("Please enter a valid email address.", "Reset password");
            } else if (error?.code === "auth/user-not-found") {
                openLoginErrorModal(
                    "If that email is registered, a password reset link is on the way. Check your inbox.",
                    "Check your email"
                );
            } else {
                openLoginErrorModal(
                    "Could not send a reset email right now. Please try again.",
                    "Reset password"
                );
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initLoginErrorModal();
    initPasswordToggle();
    initForgotPassword();

    const blocked = sessionStorage.getItem("orgLoginBlockReason");
    if (blocked) {
        sessionStorage.removeItem("orgLoginBlockReason");
        openLoginErrorModal(blocked, "Sign-in not available");
    }

    const form = document.getElementById("orgLoginForm");
    if (!form) {
        console.error("[ERROR] Login form not found!");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const keepSignedIn = document.getElementById("keepSignedIn")?.checked ?? true;
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Signing in…";
        }

        try {
            await setPersistence(
                auth,
                keepSignedIn ? browserLocalPersistence : browserSessionPersistence
            );

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
            const user = userCredential.user;

            const check = await fetchOrgVerification(user.uid);
            if (!check.ok) {
                await signOut(auth);
                openLoginErrorModal(
                    getVerificationBlockMessageForData(check.data, check.reason),
                    "Approval required"
                );
                return;
            }

            console.log("[SUCCESS] Logged in:", user.email);
            window.location.href = "/organization/dashboard";
        } catch (error) {
            console.error("[ERROR] Login failed:", error.message);
            openLoginErrorModal(getLoginErrorMessage(error));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Log in";
            }
        }
    });
});
