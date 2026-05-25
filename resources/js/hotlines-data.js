import { doc, getDoc } from "firebase/firestore";
import { buildInitialHotlinesSeed } from "./hotlines-seed.js";

const HOTLINES_DOC = ["platform_config", "hotlines"];

/** @typedef {{ id: string, label: string, number: string, active?: boolean, sortOrder?: number }} HotlineNumber */
/** @typedef {{ id: string, name: string, location?: string, active?: boolean, sortOrder?: number, numbers: HotlineNumber[] }} HotlineCategory */

/**
 * Migrate legacy flat `items[]` (one number per row) into grouped categories.
 * @param {Array<Record<string, unknown>>} items
 * @returns {HotlineCategory[]}
 */
export function migrateFlatItemsToCategories(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return items.map((item, i) => ({
        id: String(item.id || `org-${i}`),
        name: String(item.name || "Hotline"),
        location: String(item.location || item.description || ""),
        active: item.active !== false,
        sortOrder: item.sortOrder ?? i,
        numbers: [
            {
                id: `line-${i}`,
                label: String(item.category || "Main line"),
                number: String(item.number || ""),
                active: item.active !== false,
                sortOrder: 0,
            },
        ],
    }));
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
            return buildInitialHotlinesSeed().categories;
        }
        const data = snap.data();
        if (Array.isArray(data.categories) && data.categories.length > 0) {
            return data.categories
                .filter((c) => c.active !== false)
                .map((c) => ({
                    ...c,
                    numbers: (c.numbers || []).filter((n) => n.active !== false),
                }))
                .filter((c) => c.numbers.length > 0);
        }
        if (Array.isArray(data.items) && data.items.length > 0) {
            return migrateFlatItemsToCategories(data.items).filter(
                (c) => c.active !== false && c.numbers.length > 0
            );
        }
        return buildInitialHotlinesSeed().categories;
    } catch (err) {
        console.warn("[WARN] loadHotlineCategories:", err);
        return buildInitialHotlinesSeed().categories;
    }
}
