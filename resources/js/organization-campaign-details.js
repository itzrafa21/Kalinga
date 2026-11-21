import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { assertOrgVerified } from "./org-verification.js";
import {
    blockPageContent,
    requireOrgPageAccess,
    sessionCan,
} from "./org-session.js";
import {
    CAMPAIGN_STATUS,
    campaignAcceptsGoods,
    campaignAcceptsMoney,
    campaignStatusLabel,
    donationModeLabel,
    escapeHtml,
    formatCentavos,
    inKindProgressPercent,
    normalizeInKindItems,
    resolveDonationMode,
} from "./donation-shared.js";
import {
    isCloudinaryConfigured,
    uploadImageToCloudinary,
} from "./cloudinary-upload.js";

const campaignId =
    document.body.dataset.campaignId ||
    window.location.pathname.match(/\/donation\/campaigns\/([^/]+)/)?.[1] ||
    "";

let orgId = null;
let currentCampaign = null;
/** @type {File[]} */
let pendingUpdatePhotos = [];
let updateModalWired = false;

function setMessage(message, isError = false) {
    const el = document.getElementById("campaignDetailsStatus");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("is-error", isError);
}

const SHORT_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function parseCampaignDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const date =
        typeof value?.toDate === "function"
            ? value.toDate()
            : new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatShortDate(value) {
    const date = parseCampaignDate(value);
    if (!date) return "";
    return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatCampaignDateRange(start, end) {
    const startDate = parseCampaignDate(start);
    const endDate = parseCampaignDate(end);
    if (!startDate && !endDate) return "";
    if (!startDate) return formatShortDate(end);
    if (!endDate) return formatShortDate(start);
    const sameDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate();
    if (sameDay) return formatShortDate(end);
    if (startDate.getFullYear() === endDate.getFullYear()) {
        return `${SHORT_MONTHS[startDate.getMonth()]} ${startDate.getDate()} – ${SHORT_MONTHS[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function donationDate(donation) {
    const raw =
        donation.donatedAt ||
        donation.paidAt ||
        donation.createdAt ||
        "";
    if (!raw) return null;
    if (typeof raw?.toDate === "function") return raw.toDate();
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function donationWhen(donation) {
    const date = donationDate(donation);
    if (!date) return "—";
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${hours}:${minutes} ${ampm}`;
}

function normalizeDonorDoc(id, data = {}) {
    const amountCentavos =
        Number(data.amountCentavos) ||
        (Number(data.amount) ? Math.round(Number(data.amount) * 100) : 0);
    return {
        id,
        volunteerName: data.name || data.volunteerName || data.donorName || "",
        volunteerEmail: data.email || data.volunteerEmail || data.donorEmail || "",
        volunteerId: data.userId || data.volunteerId || "",
        amountCentavos,
        status: data.status || "paid",
        donatedAt: data.donatedAt || "",
        paidAt: data.paidAt || data.donatedAt || "",
        createdAt: data.createdAt || data.donatedAt || "",
        anonymous: Boolean(data.anonymous),
        ...data,
        amountCentavos,
    };
}

function mergeDonationRows(...lists) {
    const byId = new Map();
    lists.flat().forEach((row) => {
        if (!row) return;
        const id = String(row.id || "").trim();
        if (!id) return;
        const prev = byId.get(id) || {};
        byId.set(id, { ...prev, ...row, id });
    });
    return Array.from(byId.values());
}

async function loadFirestoreDonations() {
    const rows = [];
    const errors = [];

    // Actual donor receipts live under donation_campaigns/{id}/donors.
    try {
        const snap = await getDocs(
            collection(db, "donation_campaigns", campaignId, "donors")
        );
        snap.docs.forEach((d) =>
            rows.push(normalizeDonorDoc(d.id, d.data() || {}))
        );
    } catch (error) {
        console.warn("[WARN] campaign donors:", error);
        errors.push(error);
    }

    // Legacy / alternate receipt paths.
    try {
        const snap = await getDocs(
            collection(db, "donation_campaigns", campaignId, "transactions")
        );
        snap.docs.forEach((d) =>
            rows.push(normalizeDonorDoc(d.id, d.data() || {}))
        );
    } catch (error) {
        console.warn("[WARN] campaign transactions:", error);
        errors.push(error);
    }

    if (orgId) {
        try {
            const snap = await getDocs(
                query(
                    collection(db, "donations"),
                    where("orgId", "==", orgId),
                    where("campaignId", "==", campaignId),
                    limit(100)
                )
            );
            snap.docs.forEach((d) =>
                rows.push(normalizeDonorDoc(d.id, d.data() || {}))
            );
        } catch (error) {
            console.warn("[WARN] donations orgId+campaignId:", error);
            errors.push(error);
        }
    }

    return { rows, errors };
}

async function loadApiDonations() {
    const user = auth.currentUser;
    if (!user) return { donations: [], raisedCentavos: null, donorCount: null };
    const token = await user.getIdToken();
    const response = await fetch(
        `/api/donations?campaignId=${encodeURIComponent(campaignId)}&orgId=${encodeURIComponent(orgId || "")}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );
    if (!response.ok) {
        throw new Error(`Donation API failed (${response.status})`);
    }
    const payload = await response.json();
    return {
        donations: Array.isArray(payload.donations) ? payload.donations : [],
        raisedCentavos:
            typeof payload.raisedCentavos === "number" ? payload.raisedCentavos : null,
        donorCount: typeof payload.donorCount === "number" ? payload.donorCount : null,
    };
}

function formatCompactCentavos(centavos) {
    const cents = Math.round(Number(centavos) || 0);
    const whole = cents % 100 === 0;
    const amount = cents / 100;
    return `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
    })}`;
}

function paintMoneySummary(raisedCentavos, donorCount) {
    const target = Number(currentCampaign?.targetAmountCentavos) || 0;
    const raised = Math.max(0, Math.round(Number(raisedCentavos) || 0));
    const donors = Math.max(0, Number(donorCount) || 0);
    const still = Math.max(0, target - raised);
    const pct =
        target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    set("raisedAmount", formatCompactCentavos(raised));
    set("targetAmount", formatCompactCentavos(target));
    set("stillNeeded", formatCompactCentavos(still));
    set("fundedPercent", `${pct}%`);
    set("donorCount", String(donors));
    set("donorLabel", donors === 1 ? "donor" : "donors");
    const settled = Math.max(
        0,
        Math.round(Number(currentCampaign?.settledAmountCentavos) || 0)
    );
    set("settledAmount", formatCompactCentavos(Math.min(settled, raised)));

    const fill = document.getElementById("progressFill");
    if (fill) fill.style.width = `${pct}%`;
}

function paintRaisedFromRows(rows) {
    if (!rows.length) return;

    const raised = rows.reduce(
        (sum, d) => sum + (Number(d.amountCentavos) || 0),
        0
    );
    const donors = new Set(
        rows
            .map((d) => d.volunteerId || d.volunteerEmail || d.id)
            .filter(Boolean)
    );
    paintMoneySummary(raised, donors.size);
}

function campaignRecentDonations() {
    const list = currentCampaign?.recentDonations;
    if (!Array.isArray(list)) return [];
    return list
        .filter((item) => item && typeof item === "object")
        .map((item, index) => ({
            id: String(item.id || `recent-${index}`),
            volunteerName: item.volunteerName || item.donorName || item.name || "",
            volunteerEmail: item.volunteerEmail || item.donorEmail || item.email || "",
            amountCentavos: Number(item.amountCentavos) || 0,
            status: item.status || "paid",
            paidAt: item.paidAt || item.createdAt || "",
            createdAt: item.createdAt || item.paidAt || "",
        }));
}

function renderDonationRows(rows) {
    const list = document.getElementById("donationsList");
    const total = document.getElementById("donationTotal");
    if (total) total.textContent = `${rows.length} total`;
    if (!list) return;

    if (!rows.length) {
        const counted = Number(currentCampaign?.donorCount) || 0;
        list.innerHTML = counted
            ? `<li class="donation-empty">Totals show ${counted} donor(s), but no donor names were saved for those payments.</li>`
            : `<li class="donation-empty">No donations yet.</li>`;
        return;
    }

    list.innerHTML = rows
        .map((d) => {
            const goods = normalizeInKindItems(d.inKindItems || []);
            const amountLabel = goods.length
                ? goods
                      .map(
                          (item) =>
                              `${item.label} × ${item.targetQuantity || item.quantity || 0}`
                      )
                      .join(", ")
                : formatCentavos(d.amountCentavos);
            const name = String(
                d.volunteerName || d.donorName || d.name || ""
            ).trim();
            const email = String(
                d.volunteerEmail || d.donorEmail || d.email || ""
            ).trim();
            const displayName = name || (email ? email : "Anonymous");
            const anonymous = displayName === "Anonymous";
            const initial = anonymous
                ? "?"
                : displayName.charAt(0).toUpperCase();
            return `<li class="donation-row">
        <span class="donor-avatar${anonymous ? " is-anon" : ""}" aria-hidden="true">${escapeHtml(initial)}</span>
        <div class="donor-copy">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(donationWhen(d))}</span>
        </div>
        <span class="donation-amount">${escapeHtml(amountLabel)}</span>
      </li>`;
        })
        .join("");
}

function isSuccessfulDonation(row) {
    const status = String(row?.status || "paid").toLowerCase();
    return (
        status === "" ||
        status === "paid" ||
        status === "success" ||
        status === "successful" ||
        status === "payment_success"
    );
}

async function loadTransactions() {
    const list = document.getElementById("donationsList");
    if (!list) return;
    list.innerHTML = '<li class="donation-empty">Loading…</li>';

    let apiRows = [];
    let firestoreRows = [];

    try {
        const api = await loadApiDonations();
        apiRows = api.donations;
    } catch (error) {
        console.warn("Donation API unavailable:", error);
    }

    try {
        const loaded = await loadFirestoreDonations();
        firestoreRows = loaded.rows || [];
    } catch (error) {
        console.warn("Firestore donations unavailable:", error);
    }

    const recentRows = campaignRecentDonations();
    const rows = mergeDonationRows(firestoreRows, apiRows, recentRows)
        .filter(isSuccessfulDonation)
        .sort((a, b) => {
            const aTime = donationDate(a)?.getTime() || 0;
            const bTime = donationDate(b)?.getTime() || 0;
            return bTime - aTime;
        });

    if (rows.length) {
        paintRaisedFromRows(rows);
    }

    renderDonationRows(rows);
}

async function loadCampaign() {
    const snap = await getDoc(doc(db, "donation_campaigns", campaignId));
    if (!snap.exists()) {
        setMessage("Campaign not found.", true);
        return;
    }
    const c = snap.data() || {};
    currentCampaign = c;
    if (c.orgId !== orgId) {
        setMessage("You do not own this campaign.", true);
        return;
    }

    const acceptsMoney = campaignAcceptsMoney(c);
    const acceptsGoods = campaignAcceptsGoods(c);
    const goods = normalizeInKindItems(c.inKindItems || []);

    document.getElementById("campaignTitle").textContent = c.title || "Campaign";
    document.getElementById("campaignCategory").textContent = c.category || "";
    document.getElementById("campaignDescription").textContent = c.description || "";
    document.getElementById("campaignStatus").textContent = campaignStatusLabel(c.status);
    document.getElementById("campaignStatus").className = `status-pill status-${c.status}`;
    const modeEl = document.getElementById("campaignMode");
    if (modeEl) modeEl.textContent = donationModeLabel(resolveDonationMode(c));
    document.getElementById("campaignDates").textContent = formatCampaignDateRange(
        c.startDate,
        c.endDate
    );
    document.getElementById("campaignMission").textContent =
        c.relatedMissionName || "none";

    const moneyBlock = document.getElementById("moneyBlock");
    if (moneyBlock) moneyBlock.hidden = !acceptsMoney;
    if (acceptsMoney) {
        paintMoneySummary(c.raisedAmountCentavos, Number(c.donorCount) || 0);
    }

    const goodsPanel = document.getElementById("goodsPanel");
    const goodsList = document.getElementById("goodsList");
    if (goodsPanel && goodsList) {
        if (acceptsGoods && goods.length) {
            goodsPanel.hidden = false;
            const goodsPct = inKindProgressPercent(goods);
            goodsList.innerHTML = `
        ${goods
            .map(
                (item) => `<li>
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.receivedQuantity}/${item.targetQuantity} ${escapeHtml(item.unit)}</strong>
          </li>`
            )
            .join("")}
        <li>
          <span>Goods progress</span>
          <strong>${goodsPct}%</strong>
        </li>`;
        } else {
            goodsPanel.hidden = true;
            goodsList.innerHTML = "";
        }
    }

    const cover = document.getElementById("campaignCover");
    const coverWrap = cover?.closest(".cover-wrap");
    if (cover) {
        if (c.coverImageUrl) {
            cover.hidden = false;
            cover.src = c.coverImageUrl;
            if (coverWrap) coverWrap.hidden = false;
        } else {
            cover.hidden = true;
            if (coverWrap) coverWrap.hidden = true;
        }
    }

    const actions = document.getElementById("campaignActions");
    if (actions) {
        const bits = [];
        if (
            c.status === CAMPAIGN_STATUS.DRAFT ||
            c.status === CAMPAIGN_STATUS.REJECTED
        ) {
            bits.push(
                `<a class="btn btn-outline" href="/donation/campaigns/${encodeURIComponent(campaignId)}/edit">Edit</a>`
            );
            bits.push(
                `<button type="button" class="btn btn-primary" id="submitForApprovalBtn">Submit for approval</button>`
            );
        }
        actions.hidden = bits.length === 0;
        actions.innerHTML = bits.join(" ");
        document
            .getElementById("submitForApprovalBtn")
            ?.addEventListener("click", submitForApproval);
    }

    const addBtn = document.getElementById("addCampaignUpdateBtn");
    if (addBtn) addBtn.hidden = false;

    if (c.status === CAMPAIGN_STATUS.REJECTED && c.rejectionReason) {
        setMessage(`Rejected: ${c.rejectionReason}`, true);
    }

    wireUpdateModal();
    await loadTransactions();
}

function setUpdateModalError(message = "") {
    const el = document.getElementById("campaignUpdateError");
    if (el) el.textContent = message || "";
}

function renderUpdatePhotoPreviews() {
    const root = document.getElementById("campaignUpdatePhotoPreviews");
    if (!root) return;
    if (!pendingUpdatePhotos.length) {
        root.innerHTML = "";
        return;
    }
    root.innerHTML = pendingUpdatePhotos
        .map((file, index) => {
            const url = URL.createObjectURL(file);
            return `<div class="preview">
        <img src="${escapeHtml(url)}" alt="Selected photo ${index + 1}">
        <button type="button" data-remove-photo="${index}" aria-label="Remove photo">×</button>
      </div>`;
        })
        .join("");
}

function openUpdateModal() {
    const modal = document.getElementById("campaignUpdateModal");
    const text = document.getElementById("campaignUpdateText");
    const fileInput = document.getElementById("campaignUpdatePhotos");
    pendingUpdatePhotos = [];
    if (text) text.value = "";
    if (fileInput) fileInput.value = "";
    setUpdateModalError("");
    renderUpdatePhotoPreviews();
    if (modal) {
        modal.hidden = false;
        modal.classList.add("is-open");
    }
    text?.focus();
}

function closeUpdateModal() {
    const modal = document.getElementById("campaignUpdateModal");
    if (modal) {
        modal.classList.remove("is-open");
        modal.hidden = true;
    }
    pendingUpdatePhotos = [];
    const fileInput = document.getElementById("campaignUpdatePhotos");
    if (fileInput) fileInput.value = "";
    renderUpdatePhotoPreviews();
    setUpdateModalError("");
}

function onAddCampaignUpdate() {
    openUpdateModal();
}

async function saveCampaignUpdate() {
    const textEl = document.getElementById("campaignUpdateText");
    const saveBtn = document.getElementById("campaignUpdateSave");
    const body = String(textEl?.value || "").trim();
    if (!body) {
        setUpdateModalError("Please write a short update about the campaign.");
        textEl?.focus();
        return;
    }
    if (!pendingUpdatePhotos.length) {
        setUpdateModalError("Please add at least one picture from the campaign.");
        return;
    }
    if (!isCloudinaryConfigured()) {
        setUpdateModalError("Image upload is not configured.");
        return;
    }

    if (saveBtn) saveBtn.disabled = true;
    setUpdateModalError("Uploading photos…");

    try {
        const imageUrls = [];
        for (const file of pendingUpdatePhotos) {
            const url = await uploadImageToCloudinary(file, {
                folder: `kalinga/campaigns/${campaignId}/updates`,
                tags: ["campaign-update", campaignId],
            });
            if (url) imageUrls.push(url);
        }
        if (!imageUrls.length) {
            throw new Error("Could not upload photos. Please try again.");
        }

        setUpdateModalError("Saving update…");
        await addDoc(collection(db, "donation_campaigns", campaignId, "updates"), {
            body,
            imageUrls,
            orgId: orgId || "",
            createdBy: auth.currentUser?.uid || "",
            createdAt: serverTimestamp(),
        });

        closeUpdateModal();
        setMessage("Campaign update posted.", false);
    } catch (error) {
        console.error("[ERROR] saveCampaignUpdate:", error);
        setUpdateModalError(
            error?.message || "Could not post the update. Please try again."
        );
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

function wireUpdateModal() {
    if (updateModalWired) return;
    updateModalWired = true;

    document
        .getElementById("addCampaignUpdateBtn")
        ?.addEventListener("click", onAddCampaignUpdate);
    document
        .getElementById("campaignUpdateCancel")
        ?.addEventListener("click", closeUpdateModal);
    document
        .getElementById("campaignUpdateSave")
        ?.addEventListener("click", () => {
            void saveCampaignUpdate();
        });
    document
        .getElementById("campaignUpdateModal")
        ?.addEventListener("click", (event) => {
            if (event.target?.id === "campaignUpdateModal") closeUpdateModal();
        });
    document
        .getElementById("campaignUpdatePhotos")
        ?.addEventListener("change", (event) => {
            const files = Array.from(event.target.files || []).filter((file) =>
                String(file.type || "").startsWith("image/")
            );
            pendingUpdatePhotos = [...pendingUpdatePhotos, ...files].slice(0, 8);
            renderUpdatePhotoPreviews();
            setUpdateModalError("");
            event.target.value = "";
        });
    document
        .getElementById("campaignUpdatePhotoPreviews")
        ?.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-remove-photo]");
            if (!btn) return;
            const index = Number(btn.getAttribute("data-remove-photo"));
            if (!Number.isFinite(index)) return;
            pendingUpdatePhotos.splice(index, 1);
            renderUpdatePhotoPreviews();
        });
}

async function submitForApproval() {
    if (campaignAcceptsMoney(currentCampaign || {})) {
        await updateDoc(doc(db, "donation_campaigns", campaignId), {
            status: CAMPAIGN_STATUS.PENDING,
            submittedAt: serverTimestamp(),
            rejectionReason: "",
            updatedAt: serverTimestamp(),
        });
    } else {
        await updateDoc(doc(db, "donation_campaigns", campaignId), {
            status: CAMPAIGN_STATUS.PENDING,
            submittedAt: serverTimestamp(),
            rejectionReason: "",
            updatedAt: serverTimestamp(),
        });
    }
    await loadCampaign();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;
    const access = await requireOrgPageAccess(user);
    if (!access) return;
    if (!sessionCan(access.session, "donations")) {
        blockPageContent(
            "Your account does not include Donation access. Ask the organization owner to update your rights."
        );
        return;
    }
    orgId = access.session?.orgId || access.actor?.uid || "";
    if (!campaignId) {
        setMessage("Missing campaign id.", true);
        return;
    }
    await loadCampaign();
});
