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
