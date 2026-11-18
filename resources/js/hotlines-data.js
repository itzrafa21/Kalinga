import { doc, getDoc } from "firebase/firestore";

const HOTLINES_DOC = ["platform_config", "hotlines"];

/** @typedef {{ id: string, label: string, number: string, email: string, active?: boolean, sortOrder?: number }} HotlineNumber */
/** @typedef {{ id: string, name: string, location?: string, latitude?: number|null, longitude?: number|null, active?: boolean, sortOrder?: number, numbers: HotlineNumber[] }} HotlineCategory */

export function hotlineContactHasValue(entry) {
    return Boolean(String(entry?.number || "").trim() || String(entry?.email || "").trim());
}

/** Avoid Number(null) === 0, which pins maps in the ocean at 0°N 0°E. */
export function parseHotlineCoord(value) {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
}

export function parseHotlineCoords(lat, lng) {
    const latitude = parseHotlineCoord(lat);
    const longitude = parseHotlineCoord(lng);
    if (latitude == null || longitude == null) {
        return { latitude: null, longitude: null };
    }
    // Clear corrupted unset pins previously saved as 0,0
    if (latitude === 0 && longitude === 0) {
        return { latitude: null, longitude: null };
    }
    return { latitude, longitude };
}

/**
 * Migrate legacy flat `items[]` (one number per row) into grouped categories.
 * @param {Array<Record<string, unknown>>} items
 * @returns {HotlineCategory[]}
 */
export function migrateFlatItemsToCategories(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return items.map((item, i) => {
        const coords = parseHotlineCoords(item.latitude, item.longitude);
        return {
            id: String(item.id || `org-${i}`),
            name: String(item.name || "Hotline"),
            location: String(item.location || item.description || ""),
            latitude: coords.latitude,
            longitude: coords.longitude,
            active: item.active !== false,
            sortOrder: item.sortOrder ?? i,
            numbers: [
                {
                    id: `line-${i}`,
                    label: String(item.category || "Main line"),
                    number: String(item.number || ""),
                    email: String(item.email || "").trim(),
                    active: item.active !== false,
                    sortOrder: 0,
                },
            ].filter(hotlineContactHasValue),
        };
    });
}

/**
 * Load active hotline categories for display (volunteer / org apps).
 * @param {import('firebase/firestore').Firestore} db
 * @returns {Promise<HotlineCategory[]>}
 */
export async function loadHotlineCategories(db) {
    try {
        const snap = await getDoc(doc(db, ...HOTLINES_DOC));
        if (!snap.exists()) {
            return [];
        }
        const data = snap.data();
        if (Array.isArray(data.categories) && data.categories.length > 0) {
            return data.categories
                .filter((c) => c.active !== false)
                .map((c) => ({
                    ...c,
                    numbers: (c.numbers || []).filter(
                        (n) => n.active !== false && hotlineContactHasValue(n)
                    ),
                }))
                .filter((c) => c.numbers.length > 0);
        }
        if (Array.isArray(data.items) && data.items.length > 0) {
            return migrateFlatItemsToCategories(data.items).filter(
                (c) => c.active !== false && c.numbers.length > 0
            );
        }
        return [];
    } catch (err) {
        console.warn("[WARN] loadHotlineCategories:", err);
        return [];
    }
}
