import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getOrgProfileOnce } from "./org-verification.js";
import {
    readCachedOrgSession,
    resolveOrgSession,
    sessionCan,
    softRefreshOrgSession,
    writeCachedOrgSession,
} from "./org-session.js";
import {
    ORG_CACHE_KEYS,
    readOrgCache,
} from "./org-data-cache.js";
import "../css/org-dark-theme.css";

const THEME_KEY = "kalinga-org-theme";
const SKIP_SURFACE =
    "img, svg, canvas, video, path, .mapboxgl-map, .mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-ctrl, .mapboxgl-ctrl-group, .map-wrap";

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

function parseCssColor(value) {
    if (!value || value === "transparent") return null;
    const match = value.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/
    );
    if (!match) return null;
    return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === undefined ? 1 : Number(match[4]),
    };
}

function luminance(color) {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

function darkFillFor(color) {
    const { r, g, b } = color;
    if (g > r + 10 && g >= b - 10 && g > 150) return "#14532d";
    if (b > r + 12 && b > g - 10 && b > 160 && g > 140) return "#164e63";
    if (r > g + 16 && r >= b && r > 165) return "#7f1d1d";
    if (r > 175 && g > 145 && b < 170) return "#78350f";
    if (b > r + 12 && b > g && b > 165) return "#4c1d95";
    return luminance(color) > 225 ? "#0f172a" : "#1e293b";
}

function lightTextFor(color) {
    const { r, g, b } = color;
    if (g > r + 10 && g >= b - 8) return "#86efac";
    if (b > r + 8 && b >= g - 8 && g > 80) return "#a5f3fc";
    if (r > g + 14 && r >= b) return "#fecaca";
    if (r > 140 && g > 90 && b < 80) return "#fde68a";
    return "#e2e8f0";
}

function shouldSkipSurface(el) {
    return (
        el.matches(SKIP_SURFACE) ||
        Boolean(
            el.closest(
                ".mapboxgl-map, .mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-ctrl-group, .map-wrap"
            )
        )
    );
}

function clearDarkPatches() {
    document.querySelectorAll("[data-dark-patched]").forEach((el) => {
        el.style.removeProperty("background-color");
        el.style.removeProperty("color");
        el.style.removeProperty("border-color");
        delete el.dataset.darkPatched;
    });
}

/** Darken leftover white and light-gray surfaces page CSS still paints. */
function patchDarkElement(el) {
    if (!(el instanceof Element) || shouldSkipSurface(el)) return;
    const style = window.getComputedStyle(el);
    let patched = false;
    const bg = parseCssColor(style.backgroundColor);
    if (bg && bg.a > 0.35 && luminance(bg) > 168) {
        const fill = el.matches("input, select, textarea") ? "#0f172a" : darkFillFor(bg);
        el.style.setProperty("background-color", fill, "important");
        patched = true;
    }
    const fg = parseCssColor(style.color);
    if (fg && fg.a > 0.35 && luminance(fg) < 110) {
        el.style.setProperty("color", lightTextFor(fg), "important");
        patched = true;
    }
    const border = parseCssColor(style.borderTopColor);
    if (border && border.a > 0.35 && luminance(border) > 185 && style.borderTopWidth !== "0px") {
        el.style.setProperty("border-color", "#334155", "important");
        patched = true;
    }
    if (patched) el.dataset.darkPatched = "1";
}

function hardenDarkSurfaces() {
    if (document.documentElement.getAttribute("data-theme") !== "dark") {
        clearDarkPatches();
        return;
    }
    const root = document.querySelector("body.org-app");
    if (!root) return;
    patchDarkElement(root);
    root.querySelectorAll("*").forEach(patchDarkElement);
}

let hardenTimer = 0;
function scheduleHarden() {
    window.clearTimeout(hardenTimer);
    hardenTimer = window.setTimeout(hardenDarkSurfaces, 40);
}

syncOrgThemeFromStorage();
window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) {
        syncOrgThemeFromStorage();
        scheduleHarden();
    }
});

new MutationObserver(() => scheduleHarden()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
});

document.addEventListener("DOMContentLoaded", () => {
    wireOrgDarkModeToggle();
    syncOrgThemeFromStorage();
    hardenDarkSurfaces();
    setTimeout(hardenDarkSurfaces, 400);
    setTimeout(hardenDarkSurfaces, 1200);

    const app = document.querySelector("body.org-app");
    if (app) {
        new MutationObserver(() => {
            if (document.documentElement.getAttribute("data-theme") === "dark") {
                scheduleHarden();
            }
        }).observe(app, { childList: true, subtree: true });
    }
});

document.addEventListener(
    "mouseover",
    (event) => {
        if (document.documentElement.getAttribute("data-theme") !== "dark") return;
        patchDarkElement(event.target);
    },
    true
);

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

function applyModuleNavAccess(session) {
    const isOwner = Boolean(session?.isOwner);
    const modules = [
        "missions",
        "history",
        "volunteers",
        "donations",
        "account",
    ];
    modules.forEach((moduleId) => {
        const allowed = isOwner || sessionCan(session, moduleId);
        if (allowed) {
            document.documentElement.removeAttribute(`data-deny-${moduleId}`);
        } else {
            document.documentElement.setAttribute(`data-deny-${moduleId}`, "1");
        }
    });
    document.querySelectorAll("[data-access-module]").forEach((link) => {
        const moduleId = link.getAttribute("data-access-module");
        const allowed = isOwner || sessionCan(session, moduleId);
        link.hidden = !allowed;
        link.style.display = allowed ? "" : "none";
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (!window.location.pathname.includes("/organization/login")) {
            window.location.href = "/organization/login";
        }
        return;
    }

    try {
        // Cache-first: paint sidebar from last session, do not block on Firestore.
        const cached = readCachedOrgSession(user.uid);
        if (cached) {
            applyModuleNavAccess(cached);
            setUsersNavVisible(Boolean(cached.isOwner));
            document.documentElement.setAttribute(
                "data-org-owner",
                cached.isOwner ? "1" : "0"
            );
            const cachedSidebar = readOrgCache(
                cached.orgId,
                ORG_CACHE_KEYS.SIDEBAR
            );
            if (cachedSidebar?.payload?.displayName) {
                setOrgWelcomeName(cachedSidebar.payload.displayName);
            }
        }

        let session = await resolveOrgSession(user, { force: false });
        if (!session) {
            session = await resolveOrgSession(user, { force: true });
        }
        setUsersNavVisible(Boolean(session?.isOwner));
        document.documentElement.setAttribute(
            "data-org-owner",
            session?.isOwner ? "1" : "0"
        );

        if (!session) {
            setOrgWelcomeName(user.displayName || user.email);
            return;
        }

        const sessionAge = Date.now() - (Number(session.cachedAt) || 0);
        const shouldSoftRefresh =
            Boolean(session.fromCache) && sessionAge >= 5 * 60 * 1000;

        writeCachedOrgSession(session);
        applyModuleNavAccess(session);
        if (shouldSoftRefresh) {
            softRefreshOrgSession(user, window.location.pathname, {
                force: true,
            });
        }

        const profileUid = session.orgId;
        const sidebarCache = readOrgCache(profileUid, ORG_CACHE_KEYS.SIDEBAR);
        if (sidebarCache?.payload?.displayName) {
            setOrgWelcomeName(sidebarCache.payload.displayName);
        }

        const orgData = await getOrgProfileOnce(profileUid);
        let displayName;
        if (orgData) {
            displayName =
                (orgData.name && String(orgData.name).trim()) ||
                (orgData.orgName && String(orgData.orgName).trim()) ||
                session.member?.name ||
                user.displayName ||
                user.email;
        } else {
            displayName =
                session.member?.name || user.displayName || user.email;
        }

        setOrgWelcomeName(displayName);

        if (!session.isOwner && session.status === "disabled") {
            window.location.href = "/organization/login";
            return;
        }

        // Denied pages are handled by requireOrgPageAccess (Access Denied UI).
    } catch (err) {
        console.warn("[WARN] sidebar user:", err);
        setUsersNavVisible(false);
        setOrgWelcomeName(user.displayName || user.email);
    }
});
