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
    // Remove one or more transformation segments between /upload/ and /vNNNN/
    return raw.replace(
        /\/upload\/(?:[^/]+\/)*?(?=v\d+\/)/,
        "/upload/"
    );
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

    const resourceType = options.resourceType || "auto";
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

    const url = payload.secure_url || payload.url;
    if (!url) {
        throw new Error("Cloudinary did not return a file URL.");
    }

    return {
        url,
        publicId: payload.public_id || "",
        bytes: Number(payload.bytes) || file.size,
        format: payload.format || "",
        resourceType: payload.resource_type || resourceType,
    };
}
