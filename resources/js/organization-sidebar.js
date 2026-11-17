import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getOrgProfileOnce } from "./org-verification.js";
import { findTeamMembership } from "./org-team.js";
import {
    ORG_CACHE_KEYS,
    readOrgCache,
} from "./org-data-cache.js";
import "../css/org-dark-theme.css";

const THEME_KEY = "kalinga-org-theme";
const LIGHT_BG_RE =
    /^(?:rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*1\)|#fff(?:fff)?|#f8fafc|#f9fafb|#f3f4f6|#f0f2f5|#effff4|#fafafa|#f8faf9|#fffafa)$/i;

function syncThemeToggleIcons(theme) {
    const btn = document.getElementById("orgThemeToggleBtn");
    if (!btn) return;
    const moon = btn.querySelector(".org-theme-icon-moon");
    const sun = btn.querySelector(".org-theme-icon-sun");
    const isDark = theme === "dark";
    if (moon) moon.hidden = isDark;
    if (sun) sun.hidden = !isDark;
    const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
    btn.setAttribute("aria-label", nextLabel);
    btn.setAttribute("title", nextLabel);
}

function applyOrgTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    syncThemeToggleIcons(theme);
}

function saveOrgTheme(theme) {
    try {
        if (theme === "dark") {
            localStorage.setItem(THEME_KEY, "dark");
        } else {
            localStorage.removeItem(THEME_KEY);
        }
    } catch (e) {}
    applyOrgTheme(theme);
    hardenDarkSurfaces();
}

function syncOrgThemeFromStorage() {
    try {
        applyOrgTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
    } catch (e) {
        applyOrgTheme("light");
    }
}

function wireOrgDarkModeToggle() {
    const btn = document.getElementById("orgThemeToggleBtn");
    if (!btn || btn.dataset.ready === "1") return;
    btn.dataset.ready = "1";
    syncOrgThemeFromStorage();
    btn.addEventListener("click", () => {
        const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";
        saveOrgTheme(isDark ? "light" : "dark");
    });
}

/** Darken leftover white/near-white surfaces page CSS still paints. */
function hardenDarkSurfaces() {
    if (document.documentElement.getAttribute("data-theme") !== "dark") return;
    const root = document.querySelector("body.org-app .org-main-content");
    if (!root) return;

    root.querySelectorAll("*").forEach((el) => {
        if (el.closest(".org-sidebar")) return;
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (!LIGHT_BG_RE.test(bg)) return;
        // Skip fully transparent wrappers and media
        if (el.matches("img, svg, canvas, video, path, i")) return;
        el.style.setProperty("background-color", "#1e293b", "important");
        if (style.borderColor && /rgb\(229|rgb\(226|rgb\(241|rgb\(226/.test(style.borderColor)) {
            el.style.setProperty("border-color", "#334155", "important");
        }
    });
}

syncOrgThemeFromStorage();
window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) syncOrgThemeFromStorage();
});
document.addEventListener("DOMContentLoaded", () => {
    wireOrgDarkModeToggle();
    syncOrgThemeFromStorage();
    hardenDarkSurfaces();
    // Re-run after async UI paints tables/cards
    setTimeout(hardenDarkSurfaces, 400);
    setTimeout(hardenDarkSurfaces, 1200);
});

function setOrgWelcomeName(displayName) {
    const welcomeNameEl = document.getElementById("orgNameWelcome");
    if (welcomeNameEl) welcomeNameEl.textContent = displayName;
}

function setUsersNavVisible(visible) {
    const usersLink = document.getElementById("orgNavUsers");
    if (!usersLink) return;
    usersLink.hidden = !visible;
    usersLink.style.display = visible ? "" : "none";
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (!window.location.pathname.includes("/organization/login")) {
            window.location.href = "/organization/login";
        }
        return;
    }

    try {
        const cached = readOrgCache(user.uid, ORG_CACHE_KEYS.SIDEBAR);
        if (cached?.payload?.displayName) {
            setOrgWelcomeName(cached.payload.displayName);
        }

        const orgData = await getOrgProfileOnce(user.uid);
        const isOwner = Boolean(orgData);
        setUsersNavVisible(isOwner);

        if (!isOwner && window.location.pathname.startsWith("/organization/users")) {
            window.location.href = "/organization/dashboard";
            return;
        }

        let displayName;
        if (orgData) {
            displayName =
                (orgData.name && String(orgData.name).trim()) ||
                (orgData.orgName && String(orgData.orgName).trim()) ||
                user.displayName ||
                user.email;
        } else {
            const membership = await findTeamMembership(user);
            if (membership?.orgId) {
                const ownerOrg = await getOrgProfileOnce(membership.orgId);
                displayName =
                    (ownerOrg?.name && String(ownerOrg.name).trim()) ||
                    (ownerOrg?.orgName && String(ownerOrg.orgName).trim()) ||
                    membership.member?.name ||
                    user.displayName ||
                    user.email;
            } else {
                displayName = user.displayName || user.email;
            }
        }

        setOrgWelcomeName(displayName);
    } catch (err) {
        console.warn("[WARN] sidebar user:", err);
        setUsersNavVisible(false);
        setOrgWelcomeName(user.displayName || user.email);
    }
});
