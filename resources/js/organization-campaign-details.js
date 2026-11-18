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
    campaignProgressPercent,
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

function donorLabel(donation) {
    const name = String(
        donation.volunteerName ||
            donation.donorName ||
            donation.name ||
            ""
    ).trim();
    const email = String(
        donation.volunteerEmail || donation.donorEmail || donation.email || ""
    ).trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return "Anonymous donor";
}

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function formatCampaignDate(value) {
    if (!value) return "—";
    const raw = String(value).trim();
    const date =
        typeof value?.toDate === "function"
            ? value.toDate()
            : new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
    if (Number.isNaN(date.getTime())) return raw || "—";
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
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
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, "0");
    return `${mm}/${dd}/${yyyy} ${hh}:${minutes} ${ampm}`;
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

function paintRaisedFromRows(rows) {
    const paid = rows.filter(
        (d) => String(d.status || "").toLowerCase() === "paid"
    );
    if (!paid.length) return;

    const raised = paid.reduce(
        (sum, d) => sum + (Number(d.amountCentavos) || 0),
        0
    );
    const donors = new Set(
        paid
            .map((d) => d.volunteerId || d.volunteerEmail || d.id)
            .filter(Boolean)
    );

    const raisedEl = document.getElementById("raisedAmount");
    const donorsEl = document.getElementById("donorCount");
    if (raisedEl) raisedEl.textContent = formatCentavos(raised);
    if (donorsEl) donorsEl.textContent = String(donors.size);

    const target = Number(currentCampaign?.targetAmountCentavos) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}% funded`;
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
    const tbody = document.getElementById("donationsTableBody");
    if (!tbody) return;

    if (!rows.length) {
        const counted = Number(currentCampaign?.donorCount) || 0;
        tbody.innerHTML = counted
            ? `<tr><td colspan="3" class="text-center text-muted">
                Totals show ${counted} donor(s), but no donor names were saved for those payments.
                New donations will list the donor name and email here after checkout succeeds.
              </td></tr>`
            : `<tr><td colspan="3" class="text-center text-muted">No donations yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows
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
            const displayName =
                d.anonymous && !name ? "Anonymous donor" : name || donorLabel(d);
            const donorHtml = email
                ? `<strong>${escapeHtml(displayName)}</strong><div class="small text-muted">${escapeHtml(email)}</div>`
                : `<strong>${escapeHtml(displayName)}</strong>`;
            return `<tr>
        <td>${donorHtml}</td>
        <td>${escapeHtml(amountLabel)}</td>
        <td>${escapeHtml(donationWhen(d))}</td>
      </tr>`;
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
    const tbody = document.getElementById("donationsTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading…</td></tr>';

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
    document.getElementById("campaignDates").textContent = `${formatCampaignDate(c.startDate)} → ${formatCampaignDate(c.endDate)}`;
    document.getElementById("campaignMission").textContent =
        c.relatedMissionName || "—";

    const moneyStats = document.getElementById("moneyStats");
    const moneyProgressWrap = document.getElementById("moneyProgressWrap");
    if (moneyStats) moneyStats.hidden = !acceptsMoney;
    if (moneyProgressWrap) moneyProgressWrap.hidden = !acceptsMoney;

    if (acceptsMoney) {
        document.getElementById("raisedAmount").textContent = formatCentavos(
            c.raisedAmountCentavos
        );
        document.getElementById("targetAmount").textContent = formatCentavos(
            c.targetAmountCentavos
        );
        document.getElementById("donorCount").textContent = String(c.donorCount || 0);
        const pct = campaignProgressPercent(c.raisedAmountCentavos, c.targetAmountCentavos);
        const bar = document.getElementById("progressFill");
        if (bar) bar.style.width = `${pct}%`;
        document.getElementById("progressLabel").textContent = `${pct}% funded`;
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
        bits.push(
            `<button type="button" class="btn btn-add-update" id="addCampaignUpdateBtn">Add Update</button>`
        );
        actions.innerHTML = bits.join(" ");
        document
            .getElementById("submitForApprovalBtn")
            ?.addEventListener("click", submitForApproval);
        document
            .getElementById("addCampaignUpdateBtn")
            ?.addEventListener("click", onAddCampaignUpdate);
    }

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
