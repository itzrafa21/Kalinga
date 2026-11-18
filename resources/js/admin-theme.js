import "../css/admin-dark-theme.css";

const THEME_KEY = "kalinga-org-theme";
const SKIP_SURFACE =
    "img, svg, canvas, video, path, .mapboxgl-map, .mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-ctrl, .mapboxgl-ctrl-group, .map-wrap, .hotline-map, .hotline-map-block";

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

function applyAdminTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    syncThemeToggleIcons(theme);
}

function saveAdminTheme(theme) {
    try {
        if (theme === "dark") {
            localStorage.setItem(THEME_KEY, "dark");
        } else {
            localStorage.removeItem(THEME_KEY);
        }
    } catch (e) {}
    applyAdminTheme(theme);
    hardenDarkSurfaces();
}

function syncAdminThemeFromStorage() {
    try {
        applyAdminTheme(
            localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"
        );
    } catch (e) {
        applyAdminTheme("light");
    }
}

export function wireAdminThemeToggle() {
    const btn = document.getElementById("orgThemeToggleBtn");
    if (!btn || btn.dataset.ready === "1") return;
    btn.dataset.ready = "1";
    syncAdminThemeFromStorage();
    btn.addEventListener("click", () => {
        const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";
        saveAdminTheme(isDark ? "light" : "dark");
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
                ".mapboxgl-map, .mapboxgl-canvas, .mapboxgl-marker, .mapboxgl-ctrl-group, .map-wrap, .hotline-map, .hotline-map-block"
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

function patchDarkElement(el) {
    if (!(el instanceof Element) || shouldSkipSurface(el)) return;
    const style = window.getComputedStyle(el);
    let patched = false;
    const bg = parseCssColor(style.backgroundColor);
    if (bg && bg.a > 0.35 && luminance(bg) > 168) {
        const fill = el.matches("input, select, textarea")
            ? "#0f172a"
            : darkFillFor(bg);
        el.style.setProperty("background-color", fill, "important");
        patched = true;
    }
    const fg = parseCssColor(style.color);
    if (fg && fg.a > 0.35 && luminance(fg) < 110) {
        el.style.setProperty("color", lightTextFor(fg), "important");
        patched = true;
    }
    const border = parseCssColor(style.borderTopColor);
    if (
        border &&
        border.a > 0.35 &&
        luminance(border) > 185 &&
        style.borderTopWidth !== "0px"
    ) {
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
    const root =
        document.querySelector("body.admin-app") ||
        document.querySelector(".shell");
    if (!root) return;
    patchDarkElement(root);
    root.querySelectorAll("*").forEach(patchDarkElement);
}

let hardenTimer = 0;
function scheduleHarden() {
    window.clearTimeout(hardenTimer);
    hardenTimer = window.setTimeout(hardenDarkSurfaces, 40);
}

syncAdminThemeFromStorage();
window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) {
        syncAdminThemeFromStorage();
        scheduleHarden();
    }
});

new MutationObserver(() => scheduleHarden()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
});

function bootAdminTheme() {
    wireAdminThemeToggle();
    syncAdminThemeFromStorage();
    hardenDarkSurfaces();
    setTimeout(hardenDarkSurfaces, 400);
    setTimeout(hardenDarkSurfaces, 1200);

    const app =
        document.querySelector("body.admin-app") ||
        document.querySelector(".shell");
    if (app) {
        new MutationObserver(() => {
            if (
                document.documentElement.getAttribute("data-theme") === "dark"
            ) {
                scheduleHarden();
            }
        }).observe(app, { childList: true, subtree: true });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAdminTheme);
} else {
    bootAdminTheme();
}

document.addEventListener(
    "mouseover",
    (event) => {
        if (document.documentElement.getAttribute("data-theme") !== "dark") {
            return;
        }
        patchDarkElement(event.target);
    },
    true
);
