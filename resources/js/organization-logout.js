import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { clearAllOrgCaches } from "./org-data-cache.js";

function openLogoutModal() {
    const overlay = document.getElementById("orgLogoutModal");
    if (!overlay) return;
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.getElementById("orgLogoutConfirm")?.focus();
}

function closeLogoutModal() {
    const overlay = document.getElementById("orgLogoutModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
}

async function performLogout() {
    const confirmBtn = document.getElementById("orgLogoutConfirm");
    if (confirmBtn) confirmBtn.disabled = true;
    try {
        clearAllOrgCaches();
        await signOut(auth);
        window.location.href = "/organization/login";
    } catch (error) {
        console.error("[ERROR] logout:", error);
        alert("Error logging out: " + error.message);
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

function wireLogoutModal() {
    const logoutBtn = document.getElementById("logoutBtn");
    const overlay = document.getElementById("orgLogoutModal");
    const cancelBtn = document.getElementById("orgLogoutCancel");
    const confirmBtn = document.getElementById("orgLogoutConfirm");

    if (!logoutBtn || !overlay) return;

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openLogoutModal();
    });

    cancelBtn?.addEventListener("click", closeLogoutModal);

    confirmBtn?.addEventListener("click", async () => {
        closeLogoutModal();
        await performLogout();
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeLogoutModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            closeLogoutModal();
        }
    });
}

document.addEventListener("DOMContentLoaded", wireLogoutModal);
