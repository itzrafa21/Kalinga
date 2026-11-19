/**
 * Client-side image upload to Cloudinary (unsigned upload preset).
 *
 * In Cloudinary Dashboard → Settings → Upload → Upload presets:
 * - Create an unsigned preset (e.g. "kalinga_unsigned")
 * - Set folder or allow client folder param
 *
 * In .env:
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=kalinga_unsigned
 */

const CLOUD_NAME =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || "deglw0wzw";
const UPLOAD_PRESET =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ||
    "kalinga_profile_unsigned";

/** Unsigned upload preset required – create in Cloudinary dashboard. */
export const ORG_CLOUDINARY = {
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    folder: "kalinga/organizations",
    avatarPublicId: "avatar",
    avatarTransform: "w_256,h_256,c_fill,q_auto,f_auto",
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export function isCloudinaryConfigured() {
    return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export function getCloudinaryConfigHint() {
    return (
        "Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file, " +
        "then restart Vite (npm run dev)."
    );
}

/**
 * Apply Cloudinary transformation segment to an existing delivery URL.
 * @param {string} url
 * @param {string} transform e.g. "w_256,h_256,c_fill,q_auto,f_auto"
 */
export function cloudinaryUrlWithTransform(url, transform) {
    const raw = String(url ?? "").trim();
    if (!raw || !transform || !/res\.cloudinary\.com/i.test(raw)) {
        return raw;
    }
    if (raw.includes(`/upload/${transform}/`)) {
        return raw;
    }
    return raw.replace("/upload/", `/upload/${transform}/`);
}

/**
 * Strip delivery transforms (e.g. fl_attachment:filename) that break raw file URLs.
 * Keeps the original uploaded asset path so downloads stay valid.
 * @param {string} url
 */
export function sanitizeCloudinaryDocumentUrl(url) {
    const raw = String(url ?? "").trim();
    if (!raw || !/res\.cloudinary\.com/i.test(raw) || !raw.includes("/upload/")) {
        return raw;
    }
    // Only strip fl_attachment (and similar flag) segments — do not touch the asset path.
    return raw.replace(/\/upload\/(?:fl_[^/]+\/)+/gi, "/upload/");
}

/**
 * Build a collision-safe Cloudinary public_id for mission documents.
 * @param {File|string} fileOrName
 * @param {number} [index]
 */
export function buildMissionDocumentPublicId(fileOrName, index = 0) {
    const name =
        typeof fileOrName === "string"
            ? fileOrName
            : String(fileOrName?.name || `document-${index + 1}`);
    const extMatch = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    const ext = extMatch ? extMatch[1] : "";
    const rand =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
            : Math.random().toString(36).slice(2, 14);
    const base = `${Date.now()}-${index}-${rand}`;
    return ext ? `${base}.${ext}` : base;
}

/**
 * Normalize mission.documents from Firestore (array or map-like object).
 * @param {unknown} value
 * @returns {object[]}
 */
export function normalizeMissionDocuments(value) {
    if (Array.isArray(value)) {
        return value.filter((d) => d && typeof d === "object");
    }
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => value[key])
            .filter((d) => d && typeof d === "object");
    }
    return [];
}

/**
 * Build alternate Cloudinary delivery URLs (resource type swaps).
 * Free Cloudinary plans block PDF delivery for `image` assets (HTTP 401);
 * `raw` delivery usually still works.
 * @param {string} url
 * @returns {string[]}
 */
export function candidateCloudinaryDocumentUrls(url) {
    const primary = sanitizeCloudinaryDocumentUrl(String(url || "").trim());
    if (!primary) return [];

    const variants = [primary];
    const pushUnique = (next) => {
        if (next && !variants.includes(next)) variants.push(next);
    };

    if (primary.includes("/image/upload/")) {
        pushUnique(primary.replace("/image/upload/", "/raw/upload/"));
        pushUnique(primary.replace("/image/upload/", "/auto/upload/"));
    } else if (primary.includes("/raw/upload/")) {
        pushUnique(primary.replace("/raw/upload/", "/image/upload/"));
        pushUnique(primary.replace("/raw/upload/", "/auto/upload/"));
    } else if (primary.includes("/auto/upload/")) {
        pushUnique(primary.replace("/auto/upload/", "/raw/upload/"));
        pushUnique(primary.replace("/auto/upload/", "/image/upload/"));
    }

    return variants;
}

/**
 * @param {string} nameOrUrl
 * @returns {boolean}
 */
export function isOfficeDocument(nameOrUrl = "") {
    return /\.(docx?|xlsx?|pptx?)(?:$|\?)/i.test(String(nameOrUrl || ""));
}

/**
 * Guess a MIME type from a filename/URL so blob previews open inline.
 * @param {string} nameOrUrl
 * @returns {string}
 */
export function guessDocumentMimeType(nameOrUrl = "") {
    const value = String(nameOrUrl || "").toLowerCase();
    if (/\.pdf(?:$|\?)/i.test(value)) return "application/pdf";
    if (/\.png(?:$|\?)/i.test(value)) return "image/png";
    if (/\.jpe?g(?:$|\?)/i.test(value)) return "image/jpeg";
    if (/\.gif(?:$|\?)/i.test(value)) return "image/gif";
    if (/\.webp(?:$|\?)/i.test(value)) return "image/webp";
    if (/\.svg(?:$|\?)/i.test(value)) return "image/svg+xml";
    if (/\.txt(?:$|\?)/i.test(value)) return "text/plain";
    if (/\.csv(?:$|\?)/i.test(value)) return "text/csv";
    if (/\.html?(?:$|\?)/i.test(value)) return "text/html";
    if (/\.docx?(?:$|\?)/i.test(value)) return "application/msword";
    if (/\.xlsx?(?:$|\?)/i.test(value)) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (/\.pptx?(?:$|\?)/i.test(value)) {
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }
    return "application/octet-stream";
}

/**
 * Prefer a delivery URL that browsers/viewers can open.
 * @param {string} url
 * @returns {string}
 */
export function preferredDocumentViewUrl(url) {
    const candidates = candidateCloudinaryDocumentUrls(url);
    return (
        candidates.find((u) => u.includes("/raw/upload/")) ||
        candidates.find((u) => u.includes("/image/upload/")) ||
        candidates[0] ||
        sanitizeCloudinaryDocumentUrl(String(url || "").trim())
    );
}

/**
 * Build a stable href for document anchors (kept for markup; viewing is in-page).
 * @param {string} url
 * @param {string} [filename]
 * @returns {string}
 */
export function buildDocumentViewHref(url, filename = "") {
    const href = preferredDocumentViewUrl(url);
    if (!href) return "";
    if (isOfficeDocument(filename) || isOfficeDocument(href)) {
        return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(href)}`;
    }
    return href;
}

function isImageDocument(nameOrUrl = "", mime = "") {
    if (String(mime || "").toLowerCase().startsWith("image/")) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/i.test(String(nameOrUrl || ""));
}

function isPdfDocument(nameOrUrl = "", mime = "") {
    if (String(mime || "").toLowerCase() === "application/pdf") return true;
    return /\.pdf(?:$|\?)/i.test(String(nameOrUrl || ""));
}

function isTextDocument(nameOrUrl = "", mime = "") {
    const type = String(mime || "").toLowerCase();
    if (type.startsWith("text/")) return true;
    return /\.(txt|csv|log|md)(?:$|\?)/i.test(String(nameOrUrl || ""));
}

let docViewerObjectUrl = "";
let docViewerKeyHandler = null;

function ensureDocumentViewerStyles() {
    if (document.getElementById("kalinga-doc-viewer-styles")) return;
    const style = document.createElement("style");
    style.id = "kalinga-doc-viewer-styles";
    style.textContent = `
      .kalinga-doc-viewer {
        position: fixed; inset: 0; z-index: 10050;
        display: none; align-items: center; justify-content: center;
        padding: 1rem; background: rgba(15, 23, 42, 0.62);
        backdrop-filter: blur(2px);
      }
      .kalinga-doc-viewer.is-open { display: flex; }
      .kalinga-doc-viewer[hidden] { display: none !important; }
      .kalinga-doc-viewer__panel {
        width: min(960px, 100%);
        height: min(90vh, 900px);
        background: #fff; border-radius: 14px; overflow: hidden;
        display: flex; flex-direction: column;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      }
      .kalinga-doc-viewer__head {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.85rem 1rem; border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .kalinga-doc-viewer__title {
        margin: 0; flex: 1; min-width: 0;
        font-size: 0.95rem; font-weight: 700; color: #0f172a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .kalinga-doc-viewer__close {
        border: 0; background: #e2e8f0; color: #0f172a;
        width: 2rem; height: 2rem; border-radius: 999px;
        cursor: pointer; font-size: 1.1rem; line-height: 1;
      }
      .kalinga-doc-viewer__close:hover { background: #cbd5e1; }
      .kalinga-doc-viewer__body {
        flex: 1; min-height: 0; background: #0b1220;
        display: flex; align-items: center; justify-content: center;
        position: relative;
      }
      .kalinga-doc-viewer__frame,
      .kalinga-doc-viewer__img {
        width: 100%; height: 100%; border: 0; background: #fff;
      }
      .kalinga-doc-viewer__img {
        object-fit: contain; background: #0b1220; padding: 0.75rem;
      }
      .kalinga-doc-viewer__text {
        width: 100%; height: 100%; margin: 0; padding: 1rem;
        overflow: auto; background: #fff; color: #0f172a;
        font: 0.9rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: pre-wrap; word-break: break-word;
      }
      .kalinga-doc-viewer__status {
        color: #e2e8f0; font-size: 0.95rem; padding: 1.5rem; text-align: center;
      }
      .kalinga-doc-viewer__status.is-error { color: #fecaca; }
    `;
    document.head.appendChild(style);
}

function closeDocumentViewer() {
    const overlay = document.getElementById("kalingaDocViewer");
    if (overlay) {
        overlay.classList.remove("is-open");
        overlay.hidden = true;
        const body = document.getElementById("kalingaDocViewerBody");
        if (body) body.innerHTML = "";
    }
    if (docViewerObjectUrl) {
        URL.revokeObjectURL(docViewerObjectUrl);
        docViewerObjectUrl = "";
    }
    if (docViewerKeyHandler) {
        document.removeEventListener("keydown", docViewerKeyHandler);
        docViewerKeyHandler = null;
    }
    document.body.style.overflow = "";
}

function ensureDocumentViewer() {
    ensureDocumentViewerStyles();
    let overlay = document.getElementById("kalingaDocViewer");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "kalingaDocViewer";
    overlay.className = "kalinga-doc-viewer";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "kalingaDocViewerTitle");
    overlay.innerHTML = `
      <div class="kalinga-doc-viewer__panel" role="document">
        <div class="kalinga-doc-viewer__head">
          <h2 class="kalinga-doc-viewer__title" id="kalingaDocViewerTitle">Document</h2>
          <button type="button" class="kalinga-doc-viewer__close" id="kalingaDocViewerClose" aria-label="Close">×</button>
        </div>
        <div class="kalinga-doc-viewer__body" id="kalingaDocViewerBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeDocumentViewer();
    });
    document
        .getElementById("kalingaDocViewerClose")
        ?.addEventListener("click", closeDocumentViewer);

    return overlay;
}

function setDocumentViewerContent(html) {
    const body = document.getElementById("kalingaDocViewerBody");
    if (body) body.innerHTML = html;
}

function showDocumentViewerShell(title) {
    const overlay = ensureDocumentViewer();
    const titleEl = document.getElementById("kalingaDocViewerTitle");
    if (titleEl) titleEl.textContent = title || "Document";
    setDocumentViewerContent(
        `<div class="kalinga-doc-viewer__status">Loading preview…</div>`
    );
    overlay.hidden = false;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    if (docViewerKeyHandler) {
        document.removeEventListener("keydown", docViewerKeyHandler);
    }
    docViewerKeyHandler = (event) => {
        if (event.key === "Escape") closeDocumentViewer();
    };
    document.addEventListener("keydown", docViewerKeyHandler);
    document.getElementById("kalingaDocViewerClose")?.focus();
    return overlay;
}

async function resolveDocumentPreview(url, filename = "document") {
    const name = String(filename || "document").trim() || "document";
    const preferred = preferredDocumentViewUrl(url);
    if (!preferred) return { ok: false, error: "Missing document URL." };

    if (isOfficeDocument(name) || isOfficeDocument(preferred)) {
        return {
            ok: true,
            kind: "iframe",
            src: `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(preferred)}`,
        };
    }

    const mimeHint = guessDocumentMimeType(name) || guessDocumentMimeType(preferred);
    const candidates = candidateCloudinaryDocumentUrls(preferred);
    let sawUnauthorized = false;

    for (const href of candidates) {
        try {
            const response = await fetch(href, {
                mode: "cors",
                credentials: "omit",
                cache: "no-store",
            });
            if (response.status === 401 || response.status === 403) {
                sawUnauthorized = true;
                continue;
            }
            if (!response.ok) continue;
            const blob = await response.blob();
            if (!blob || blob.size <= 0) continue;
            const mime =
                blob.type && blob.type !== "application/octet-stream"
                    ? blob.type
                    : mimeHint || "application/octet-stream";
            const typed =
                blob.type && blob.type !== "application/octet-stream"
                    ? blob
                    : new Blob([blob], { type: mime });

            if (isTextDocument(name, mime)) {
                const text = await typed.text();
                return { ok: true, kind: "text", text };
            }

            const objectUrl = URL.createObjectURL(typed);
            if (isImageDocument(name, mime) || isImageDocument(preferred, mime)) {
                return { ok: true, kind: "image", src: objectUrl, objectUrl };
            }
            return { ok: true, kind: "iframe", src: objectUrl, objectUrl };
        } catch (error) {
            console.warn("Document view candidate failed:", href, error);
        }
    }

    if (sawUnauthorized) {
        return {
            ok: false,
            error:
                `“${name}” could not be opened (Cloudinary blocked this file type).\n\n` +
                "Fix options:\n" +
                "1) Edit this mission, remove the PDF, and upload it again; or\n" +
                "2) In Cloudinary Console → Settings → Security, enable “Allow delivery of PDF and ZIP files”.",
        };
    }

    if (isPdfDocument(name) || isPdfDocument(preferred)) {
        return {
            ok: true,
            kind: "iframe",
            src: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(preferred)}`,
        };
    }

    return { ok: true, kind: "iframe", src: preferred };
}

/**
 * Open a document in an in-page viewer (no new tab / download).
 * @param {string} url
 * @param {string} [filename]
 * @returns {Promise<boolean>}
 */
export async function openDocumentForView(url, filename = "document") {
    const name = String(filename || "document").trim() || "document";
    if (docViewerObjectUrl) {
        URL.revokeObjectURL(docViewerObjectUrl);
        docViewerObjectUrl = "";
    }
    showDocumentViewerShell(name);

    const preview = await resolveDocumentPreview(url, name);
    if (!preview.ok) {
        setDocumentViewerContent(
            `<div class="kalinga-doc-viewer__status is-error">${String(preview.error || "Could not open document.")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>")}</div>`
        );
        return false;
    }

    if (preview.objectUrl) docViewerObjectUrl = preview.objectUrl;

    if (preview.kind === "image") {
        setDocumentViewerContent(
            `<img class="kalinga-doc-viewer__img" src="${preview.src}" alt="${name.replace(/"/g, "&quot;")}">`
        );
        return true;
    }
    if (preview.kind === "text") {
        const safe = String(preview.text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        setDocumentViewerContent(`<pre class="kalinga-doc-viewer__text">${safe}</pre>`);
        return true;
    }

    setDocumentViewerContent(
        `<iframe class="kalinga-doc-viewer__frame" src="${preview.src}" title="${name.replace(/"/g, "&quot;")}"></iframe>`
    );
    return true;
}

/**
 * Download a Cloudinary (or other) document URL as a file.
 * Tries resource-type variants so PDFs blocked as `image` can still download as `raw`.
 * @param {string} url
 * @param {string} [filename]
 * @returns {Promise<boolean>}
 */
export async function downloadCloudinaryDocument(url, filename = "document") {
    const name = String(filename || "document").trim() || "document";
    const candidates = candidateCloudinaryDocumentUrls(url);
    if (!candidates.length) return false;

    const triggerAnchorDownload = (hrefValue, downloadName) => {
        const anchor = document.createElement("a");
        anchor.href = hrefValue;
        if (downloadName) anchor.setAttribute("download", downloadName);
        anchor.rel = "noopener noreferrer";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    let sawUnauthorized = false;
    for (const href of candidates) {
        try {
            const response = await fetch(href, {
                mode: "cors",
                credentials: "omit",
                cache: "no-store",
            });
            if (response.status === 401 || response.status === 403) {
                sawUnauthorized = true;
                continue;
            }
            if (!response.ok) continue;
            const blob = await response.blob();
            if (!blob || blob.size <= 0) continue;
            const objectUrl = URL.createObjectURL(blob);
            triggerAnchorDownload(objectUrl, name);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
            return true;
        } catch (error) {
            console.warn("Document download candidate failed:", href, error);
        }
    }

    if (sawUnauthorized) {
        alert(
            `“${name}” could not be downloaded (Cloudinary blocked this file type).\n\n` +
                "Fix options:\n" +
                "1) Edit this mission, remove the PDF, and upload it again; or\n" +
                "2) In Cloudinary Console → Settings → Security, enable “Allow delivery of PDF and ZIP files”."
        );
        return false;
    }

    alert(`“${name}” could not be downloaded. Please try again or re-upload the file.`);
    return false;
}

/**
 * @param {File} file
 * @param {{ folder?: string, publicId?: string, maxBytes?: number, tags?: string[] }} [options]
 * @returns {Promise<string>} secure HTTPS URL
 */
export async function uploadImageToCloudinary(file, options = {}) {
    if (!file) {
        throw new Error("No image file selected.");
    }
    if (!file.type?.startsWith("image/")) {
        throw new Error("Please select a valid image file.");
    }

    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / (1024 * 1024));
        throw new Error(`Image must be smaller than ${mb}MB.`);
    }

    if (!isCloudinaryConfigured()) {
        throw new Error(getCloudinaryConfigHint());
    }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", UPLOAD_PRESET);
    if (options.folder) {
        body.append("folder", options.folder);
    }
    if (options.publicId) {
        body.append("public_id", options.publicId);
    }
    if (options.tags?.length) {
        body.append("tags", options.tags.join(","));
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const response = await fetch(endpoint, {
        method: "POST",
        body,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const msg =
            payload?.error?.message ||
            payload?.message ||
            `Cloudinary upload failed (${response.status})`;
        throw new Error(msg);
    }

    const url = payload.secure_url || payload.url;
    if (!url) {
        throw new Error("Cloudinary did not return an image URL.");
    }

    return url;
}

/**
 * Upload any file (documents, etc.) via Cloudinary auto/raw endpoint.
 * @param {File} file
 * @param {{ folder?: string, publicId?: string, maxBytes?: number, tags?: string[], resourceType?: "auto"|"raw"|"image" }} [options]
 * @returns {Promise<{ url: string, publicId?: string, bytes?: number, format?: string, resourceType?: string }>}
 */
export async function uploadFileToCloudinary(file, options = {}) {
    if (!file) {
        throw new Error("No file selected.");
    }

    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / (1024 * 1024));
        throw new Error(`File must be smaller than ${mb}MB.`);
    }

    if (!isCloudinaryConfigured()) {
        throw new Error(getCloudinaryConfigHint());
    }

    // Prefer raw for documents so PDFs are not stored as `image` (blocked with HTTP 401 on free plans).
    const resourceType = options.resourceType || "raw";
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", UPLOAD_PRESET);
    if (options.folder) {
        body.append("folder", options.folder);
    }
    if (options.publicId) {
        body.append("public_id", options.publicId);
    }
    if (options.tags?.length) {
        body.append("tags", options.tags.join(","));
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    const response = await fetch(endpoint, {
        method: "POST",
        body,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const msg =
            payload?.error?.message ||
            payload?.message ||
            `Cloudinary upload failed (${response.status})`;
        throw new Error(msg);
    }

    let url = payload.secure_url || payload.url;
    if (!url) {
        throw new Error("Cloudinary did not return a file URL.");
    }

    let resolvedType = payload.resource_type || resourceType;
    const isPdf =
        /\.pdf$/i.test(file.name || "") ||
        file.type === "application/pdf" ||
        String(payload.format || "").toLowerCase() === "pdf";

    // If a PDF landed as `image`, rewrite delivery URL to raw when possible and warn via type.
    if (isPdf && String(url).includes("/image/upload/")) {
        url = String(url).replace("/image/upload/", "/raw/upload/");
        resolvedType = "raw";
    }

    return {
        url,
        publicId: payload.public_id || "",
        bytes: Number(payload.bytes) || file.size,
        format: payload.format || "",
        resourceType: resolvedType,
    };
}
