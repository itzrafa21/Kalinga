import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getOrgProfileOnce } from "./org-verification.js";
import {
    ORG_CACHE_KEYS,
    readOrgCache,
} from "./org-data-cache.js";
import "../css/org-dark-theme.css";

const THEME_KEY = "kalinga-org-theme";
const LIGHT_BG_RE =
    /^(?:rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*1\)|#fff(?:fff)?|#f8fafc|#f9fafb|#f3f4f6|#f0f2f5|#effff4|#fafafa|#f8faf9|#fffafa)$/i;

function applyOrgTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
}

function syncOrgThemeFromStorage() {
    try {
        applyOrgTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
    } catch (e) {
        applyOrgTheme("light");
    }
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
        let displayName;
        if (orgData) {
            displayName =
                (orgData.name && String(orgData.name).trim()) ||
                (orgData.orgName && String(orgData.orgName).trim()) ||
                user.displayName ||
                user.email;
        } else {
            displayName = user.displayName || user.email;
        }

        setOrgWelcomeName(displayName);
    } catch (err) {
        console.warn("[WARN] sidebar user:", err);
        setOrgWelcomeName(user.displayName || user.email);
    }
});
