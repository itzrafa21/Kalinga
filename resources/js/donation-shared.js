/** Shared helpers for Kalinga donation campaigns. */

export const CAMPAIGN_STATUS = {
    DRAFT: "draft",
    PENDING: "pending_approval",
    PUBLISHED: "published",
    REJECTED: "rejected",
    CLOSED: "closed",
};

export const DONATION_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
};

export const DONATION_MODE = {
    MONEY: "money",
    GOODS: "goods",
    BOTH: "both",
};

/** Catalog of in-kind donation item choices orgs can request. */
export const IN_KIND_ITEM_OPTIONS = [
    { id: "water", label: "Water", unit: "bottles" },
    { id: "food", label: "Food", unit: "packs" },
    { id: "shelter", label: "Shelter", unit: "kits" },
    { id: "medical_supplies", label: "Medical Supplies", unit: "kits" },
    { id: "clothing", label: "Clothing", unit: "packs" },
    { id: "hygiene_kits", label: "Hygiene Kits", unit: "kits" },
    { id: "baby_supplies", label: "Baby Supplies", unit: "packs" },
    { id: "electricity", label: "Electricity", unit: "units" },
    { id: "communications", label: "Communications", unit: "units" },
    { id: "transport", label: "Transport", unit: "trips" },
    { id: "volunteers", label: "Volunteers", unit: "people" },
    { id: "logistics_support", label: "Logistics Support", unit: "units" },
    { id: "equipment", label: "Equipment", unit: "pcs" },
    { id: "other", label: "Other", unit: "pcs" },
];

/** Map legacy item ids from earlier drafts onto the current catalog. */
const LEGACY_IN_KIND_IDS = {
    health_kit: "medical_supplies",
    hygiene_kit: "hygiene_kits",
};

export function donationModeLabel(mode) {
    switch (String(mode || "").toLowerCase()) {
        case DONATION_MODE.GOODS:
            return "Goods";
        case DONATION_MODE.BOTH:
            return "Money & goods";
        default:
            return "Money";
    }
}

export function normalizeInKindItems(items = []) {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            const rawId = String(item?.id || "").trim();
            const id = LEGACY_IN_KIND_IDS[rawId] || rawId;
            const catalog = IN_KIND_ITEM_OPTIONS.find((opt) => opt.id === id);
            const targetQuantity = Math.max(0, Math.floor(Number(item?.targetQuantity) || 0));
            const receivedQuantity = Math.max(
                0,
                Math.floor(Number(item?.receivedQuantity) || 0)
            );
            if (!id || targetQuantity <= 0) return null;
            return {
                id,
                label: String(item?.label || catalog?.label || id),
                unit: String(item?.unit || catalog?.unit || "pcs"),
                targetQuantity,
                receivedQuantity,
            };
        })
        .filter(Boolean);
}

export function resolveDonationMode(campaign = {}) {
    const raw = String(campaign?.donationMode || "").toLowerCase();
    if (
        raw === DONATION_MODE.MONEY ||
        raw === DONATION_MODE.GOODS ||
        raw === DONATION_MODE.BOTH
    ) {
        return raw;
    }
    if (campaign?.acceptsGoods && campaign?.acceptsMoney) return DONATION_MODE.BOTH;
    if (campaign?.acceptsGoods) return DONATION_MODE.GOODS;
    return DONATION_MODE.MONEY;
}

export function campaignAcceptsMoney(campaign = {}) {
    const mode = resolveDonationMode(campaign);
    return mode === DONATION_MODE.MONEY || mode === DONATION_MODE.BOTH;
}

export function campaignAcceptsGoods(campaign = {}) {
    const mode = resolveDonationMode(campaign);
    return mode === DONATION_MODE.GOODS || mode === DONATION_MODE.BOTH;
}

export function inKindProgressPercent(items = []) {
    const list = normalizeInKindItems(items);
    if (!list.length) return 0;
    let totalTarget = 0;
    let totalReceived = 0;
    for (const item of list) {
        totalTarget += item.targetQuantity;
        totalReceived += Math.min(item.receivedQuantity, item.targetQuantity);
    }
    if (totalTarget <= 0) return 0;
    return Math.min(100, Math.round((totalReceived / totalTarget) * 100));
}

export function formatInKindSummary(items = [], { withReceived = false } = {}) {
    const list = normalizeInKindItems(items);
    if (!list.length) return "No goods selected";
    return list
        .map((item) => {
            if (withReceived) {
                return `${item.label}: ${item.receivedQuantity}/${item.targetQuantity} ${item.unit}`;
            }
            return `${item.label} × ${item.targetQuantity} ${item.unit}`;
        })
        .join(" · ");
}

export function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function pesosToCentavos(pesos) {
    const n = Number(String(pesos).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
}

export function formatCentavos(centavos) {
    const amount = (Number(centavos) || 0) / 100;
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(amount);
}

export function campaignStatusLabel(status) {
    switch (String(status || "").toLowerCase()) {
        case CAMPAIGN_STATUS.DRAFT:
            return "Draft";
        case CAMPAIGN_STATUS.PENDING:
            return "Pending approval";
        case CAMPAIGN_STATUS.PUBLISHED:
            return "Published";
        case CAMPAIGN_STATUS.REJECTED:
            return "Rejected";
        case CAMPAIGN_STATUS.CLOSED:
            return "Closed";
        default:
            return "Unknown";
    }
}

export function campaignProgressPercent(raisedCentavos, targetCentavos) {
    const target = Number(targetCentavos) || 0;
    if (target <= 0) return 0;
    return Math.min(100, Math.round(((Number(raisedCentavos) || 0) / target) * 100));
}

export function parseDateInput(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    // Accept YYYY-MM-DD from <input type="date">
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toISOString().slice(0, 10);
}

export function isCampaignAcceptingDonations(campaign) {
    if (!campaign || campaign.status !== CAMPAIGN_STATUS.PUBLISHED) return false;
    const today = new Date().toISOString().slice(0, 10);
    const start = String(campaign.startDate || "");
    const end = String(campaign.endDate || "");
    if (start && today < start) return false;
    if (end && today > end) return false;
    return true;
}
