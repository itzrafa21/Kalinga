const THEME_KEY = "kalinga-org-theme";

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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAdminThemeToggle);
} else {
    wireAdminThemeToggle();
}
