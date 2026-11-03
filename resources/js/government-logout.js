import { signOut } from "firebase/auth";
import { auth } from "./firebase";

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
    await signOut(auth);
    window.location.href = "/government/login";
  } catch (error) {
    console.error("[ERROR] government logout:", error);
    alert("Error logging out: " + error.message);
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const overlay = document.getElementById("orgLogoutModal");
  if (!logoutBtn || !overlay) return;

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openLogoutModal();
  });
  document.getElementById("orgLogoutCancel")?.addEventListener("click", closeLogoutModal);
  document.getElementById("orgLogoutConfirm")?.addEventListener("click", async () => {
    closeLogoutModal();
    await performLogout();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLogoutModal();
  });
});
