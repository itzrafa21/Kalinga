const pendingScripts = new Map();
const pendingStyles = new Map();

function existingScript(src) {
    return document.querySelector(`script[data-lazy-cdn="${src}"], script[src="${src}"]`);
}

function existingStylesheet(href) {
    return document.querySelector(
        `link[data-lazy-cdn="${href}"], link[rel="stylesheet"][href="${href}"]`
    );
}

export function loadStylesheet(href) {
    if (!href) return Promise.resolve();
    if (existingStylesheet(href)) return Promise.resolve();
    if (pendingStyles.has(href)) return pendingStyles.get(href);

    const promise = new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.lazyCdn = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        document.head.appendChild(link);
    }).finally(() => pendingStyles.delete(href));

    pendingStyles.set(href, promise);
    return promise;
}

export function loadScript(src) {
    if (!src) return Promise.resolve();
    const existing = existingScript(src);
    if (existing) {
        if (existing.dataset.lazyReady === "1") return Promise.resolve();
        return new Promise((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener(
                "error",
                () => reject(new Error(`Failed to load script: ${src}`)),
                { once: true }
            );
        });
    }
    if (pendingScripts.has(src)) return pendingScripts.get(src);

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.lazyCdn = src;
        script.onload = () => {
            script.dataset.lazyReady = "1";
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    }).finally(() => pendingScripts.delete(src));

    pendingScripts.set(src, promise);
    return promise;
}

export async function ensureChartJs() {
    if (typeof window.Chart !== "undefined") return true;
    await loadScript("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js");
    return typeof window.Chart !== "undefined";
}

export async function ensureJsPdf() {
    if (!(window.jspdf?.jsPDF || window.jsPDF)) {
        await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
    }
    const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (JsPDF && typeof JsPDF.API?.autoTable !== "function") {
        await loadScript(
            "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"
        );
    }
    return Boolean(window.jspdf?.jsPDF || window.jsPDF);
}

const MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
const MAPBOX_JS = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";

export async function ensureMapbox() {
    if (typeof window.mapboxgl !== "undefined") return true;
    await Promise.all([loadStylesheet(MAPBOX_CSS), loadScript(MAPBOX_JS)]);
    return typeof window.mapboxgl !== "undefined";
}
