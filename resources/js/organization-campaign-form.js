import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { assertOrgVerified } from "./org-verification.js";
import { uploadFileToCloudinary, isCloudinaryConfigured } from "./cloudinary-upload.js";
import {
    CAMPAIGN_STATUS,
    DONATION_MODE,
    IN_KIND_ITEM_OPTIONS,
    campaignAcceptsMoney,
    escapeHtml,
    formatCentavos,
    normalizeInKindItems,
    parseDateInput,
    pesosToCentavos,
    resolveDonationMode,
} from "./donation-shared.js";

const params = new URLSearchParams(window.location.search);
const pathId =
    window.location.pathname.match(/\/donation\/campaigns\/([^/]+)/)?.[1] || "";
const campaignId =
    document.body.dataset.campaignId ||
    params.get("id") ||
    (pathId && pathId !== "create" ? pathId : "");
const isEdit =
    Boolean(campaignId) &&
    (window.location.pathname.includes("/edit") ||
        Boolean(document.body.dataset.campaignId));

let orgId = null;
let orgName = "";
let coverImageUrl = "";
let existingStatus = CAMPAIGN_STATUS.DRAFT;
let existingInKindReceived = {};
/** @type {Record<string, number>} */
let selectedInKindQty = {};

function setStatusMessage(message, isError = false) {
    const el = document.getElementById("campaignFormStatus");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("is-error", isError);
    if (message) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function maskAccountId(accountId) {
    const value = String(accountId || "").trim();
    if (!value) return "";
    if (value.length <= 4) return `••••${value}`;
    return `••••${value.slice(-4)}`;
}

function getDonationMode() {
    const value = document.getElementById("donationMode")?.value || DONATION_MODE.MONEY;
    if (
        value === DONATION_MODE.MONEY ||
        value === DONATION_MODE.GOODS ||
        value === DONATION_MODE.BOTH
    ) {
        return value;
    }
    return DONATION_MODE.MONEY;
}

function setDonationMode(mode) {
    const next =
        mode === DONATION_MODE.GOODS || mode === DONATION_MODE.BOTH
            ? mode
            : DONATION_MODE.MONEY;
    const hidden = document.getElementById("donationMode");
    if (hidden) hidden.value = next;

    document.querySelectorAll("#donationModePills [data-donation-mode]").forEach((btn) => {
        btn.classList.toggle(
            "active",
            btn.getAttribute("data-donation-mode") === next
        );
    });

    const moneyBlock = document.getElementById("moneyBlock");
    const goodsBlock = document.getElementById("goodsBlock");
    const payCard = document.getElementById("paymongoCard");
    const acceptsMoney = next === DONATION_MODE.MONEY || next === DONATION_MODE.BOTH;
    const acceptsGoods = next === DONATION_MODE.GOODS || next === DONATION_MODE.BOTH;

    if (moneyBlock) moneyBlock.hidden = !acceptsMoney;
    if (goodsBlock) goodsBlock.hidden = !acceptsGoods;
    if (payCard) payCard.hidden = !acceptsMoney;

    const amountInput = document.getElementById("targetAmount");
    if (amountInput) {
        amountInput.required = acceptsMoney;
        if (!acceptsMoney) amountInput.value = "";
    }

    updateLivePreview();
}

function syncSelectedQtyFromInputs() {
    const panel = document.getElementById("inKindQuantities");
    if (!panel) return;
    panel.querySelectorAll("[data-inkind-qty]").forEach((input) => {
        const id = input.getAttribute("data-inkind-qty");
        if (!id || !(id in selectedInKindQty)) return;
        const qty = Math.max(0, Math.floor(Number(input.value) || 0));
        selectedInKindQty[id] = qty > 0 ? qty : 1;
    });
}

function renderInKindQuantities() {
    const panel = document.getElementById("inKindQuantities");
    if (!panel) return;

    const selectedIds = Object.keys(selectedInKindQty);
    if (!selectedIds.length) {
        panel.hidden = true;
        panel.innerHTML = "";
        return;
    }

    panel.hidden = false;
    panel.innerHTML = selectedIds
        .map((id) => {
            const catalog = IN_KIND_ITEM_OPTIONS.find((opt) => opt.id === id);
            if (!catalog) return "";
            const qty = selectedInKindQty[id] || 1;
            return `
      <div class="need-qty-row" data-item-id="${escapeHtml(id)}">
        <strong>${escapeHtml(catalog.label)}</strong>
        <div class="need-qty-controls">
          <input type="number" min="1" step="1" data-inkind-qty="${escapeHtml(id)}"
            value="${qty}" placeholder="Qty" aria-label="${escapeHtml(catalog.label)} quantity">
          <span>${escapeHtml(catalog.unit)}</span>
        </div>
      </div>`;
        })
        .join("");

    panel.querySelectorAll("[data-inkind-qty]").forEach((input) => {
        input.addEventListener("input", () => {
            const id = input.getAttribute("data-inkind-qty");
            if (!id) return;
            const qty = Math.max(0, Math.floor(Number(input.value) || 0));
            selectedInKindQty[id] = qty > 0 ? qty : 1;
            updateLivePreview();
        });
    });
}

function renderInKindItems(selectedItems = []) {
    const tags = document.getElementById("inKindTags");
    if (!tags) return;

    const selectedMap = new Map(
        normalizeInKindItems(selectedItems).map((item) => [item.id, item])
    );
    selectedInKindQty = {};
    for (const [id, item] of selectedMap.entries()) {
        selectedInKindQty[id] = item.targetQuantity;
    }

    tags.innerHTML = IN_KIND_ITEM_OPTIONS.map((opt) => {
        const active = Boolean(selectedInKindQty[opt.id]);
        return `<button type="button" class="need-tag${active ? " is-active" : ""}" data-need-tag="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</button>`;
    }).join("");

    tags.querySelectorAll("[data-need-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-need-tag");
            if (!id) return;
            syncSelectedQtyFromInputs();
            if (id in selectedInKindQty) {
                delete selectedInKindQty[id];
                btn.classList.remove("is-active");
            } else {
                selectedInKindQty[id] = 1;
                btn.classList.add("is-active");
            }
            renderInKindQuantities();
            updateLivePreview();
        });
    });

    renderInKindQuantities();
}

function collectInKindItemsFromForm() {
    syncSelectedQtyFromInputs();
    const items = Object.entries(selectedInKindQty)
        .map(([id, qty]) => {
            const catalog = IN_KIND_ITEM_OPTIONS.find((opt) => opt.id === id);
            if (!catalog) return null;
            return {
                id: catalog.id,
                label: catalog.label,
                unit: catalog.unit,
                targetQuantity: Math.max(0, Math.floor(Number(qty) || 0)),
                receivedQuantity: Math.max(0, Number(existingInKindReceived[id]) || 0),
            };
        })
        .filter(Boolean);
    return normalizeInKindItems(items);
}

function ensureCategoryOption(value) {
    const select = document.getElementById("category");
    if (!select || !value) return;
    const exists = Array.from(select.options).some((opt) => opt.value === value);
    if (!exists) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        select.appendChild(opt);
    }
    select.value = value;
}

function updateLivePreview() {
    const title = document.getElementById("title")?.value.trim() || "Your campaign title";
    const category = document.getElementById("category")?.value.trim() || "Category";
    const mode = getDonationMode();
    const acceptsMoney = mode === DONATION_MODE.MONEY || mode === DONATION_MODE.BOTH;
    const acceptsGoods = mode === DONATION_MODE.GOODS || mode === DONATION_MODE.BOTH;
    const amount = acceptsMoney
        ? pesosToCentavos(document.getElementById("targetAmount")?.value || 0)
        : 0;
    const goods = acceptsGoods ? collectInKindItemsFromForm() : [];

    const liveTitle = document.getElementById("liveTitle");
    const liveCategory = document.getElementById("liveCategory");
    const liveTarget = document.getElementById("liveTarget");
    const liveCover = document.getElementById("liveCoverPreview");
    const descCount = document.getElementById("descCount");
    const description = document.getElementById("description")?.value || "";
    const moneyProgressWrap = document.getElementById("liveMoneyProgressWrap");
    const moneyLine = document.getElementById("liveMoneyLine");
    const goodsList = document.getElementById("liveGoodsList");

    if (liveTitle) liveTitle.textContent = title;
    if (liveCategory) liveCategory.textContent = category;
    if (descCount) descCount.textContent = String(description.length);

    if (moneyProgressWrap) moneyProgressWrap.hidden = !acceptsMoney;
    if (moneyLine) moneyLine.hidden = !acceptsMoney;
    if (liveTarget) liveTarget.textContent = formatCentavos(amount);

    if (goodsList) {
        if (acceptsGoods && goods.length) {
            goodsList.hidden = false;
            goodsList.innerHTML = goods
                .map(
                    (item) =>
                        `<li><span>${escapeHtml(item.label)}</span><strong>${item.targetQuantity} ${escapeHtml(item.unit)}</strong></li>`
                )
                .join("");
        } else if (acceptsGoods) {
            goodsList.hidden = false;
            goodsList.innerHTML = "<li><span>Select goods and quantities</span><strong>—</strong></li>";
        } else {
            goodsList.hidden = true;
            goodsList.innerHTML = "";
        }
    }

    if (liveCover) {
        if (coverImageUrl) {
            liveCover.innerHTML = `<img src="${escapeHtml(coverImageUrl)}" alt="Cover preview">`;
        } else {
            liveCover.textContent = "Cover image preview";
        }
    }

    document.querySelectorAll("#amountPills [data-amount]").forEach((btn) => {
        const pillAmount = Number(btn.getAttribute("data-amount")) || 0;
        btn.classList.toggle("active", Math.round(amount / 100) === pillAmount);
    });
}

function setCoverPreview(url) {
    coverImageUrl = url || "";
    const preview = document.getElementById("coverPreview");
    if (preview) {
        if (coverImageUrl) {
            preview.hidden = false;
            preview.innerHTML = `<img src="${escapeHtml(coverImageUrl)}" alt="Cover">`;
        } else {
            preview.hidden = true;
            preview.innerHTML = "";
        }
    }
    updateLivePreview();
}

async function loadPaymongoStatus() {
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    const linked = orgSnap.data()?.paymongo?.linkedAccountId || "";
    const icon = document.getElementById("paymongoIcon");
    const title = document.getElementById("paymongoTitle");
    const help = document.getElementById("paymongoHelp");
    const link = document.getElementById("paymongoChangeLink");

    if (linked) {
        if (title) title.textContent = "Payments go to your organization.";
        if (help) {
            help.textContent = `Using your connected PayMongo account ending in ${maskAccountId(linked)}.`;
        }
        if (icon) {
            icon.className = "pay-card__icon";
            icon.innerHTML = '<i class="bi bi-shield-check"></i>';
        }
        if (link) link.textContent = "Change";
    } else {
        if (title) title.textContent = "PayMongo account not connected.";
        if (help) {
            help.textContent =
                "Connect a PayMongo Linked Account in Donation Center before submitting money campaigns.";
        }
        if (icon) {
            icon.className = "pay-card__icon is-off";
            icon.innerHTML = '<i class="bi bi-shield-exclamation"></i>';
        }
        if (link) link.textContent = "Connect";
    }
}

async function loadMissions() {
    const select = document.getElementById("relatedMissionId");
    if (!select) return;
    select.innerHTML = '<option value="">None</option>';
    try {
        const snap = await getDocs(
            query(collection(db, "organizations", orgId, "missions"))
        );
        const missions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        missions.sort((a, b) =>
            String(a.missionName || a.name || "").localeCompare(
                String(b.missionName || b.name || "")
            )
        );
        for (const m of missions) {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.missionName || m.name || m.id;
            select.appendChild(opt);
        }
    } catch (error) {
        console.warn("Could not load missions", error);
    }
}

async function loadCampaign() {
    if (!isEdit || !campaignId) return;
    const snap = await getDoc(doc(db, "donation_campaigns", campaignId));
    if (!snap.exists()) {
        setStatusMessage("Campaign not found.", true);
        return;
    }
    const data = snap.data() || {};
    if (data.orgId !== orgId) {
        setStatusMessage("You do not own this campaign.", true);
        return;
    }
    existingStatus = data.status || CAMPAIGN_STATUS.DRAFT;
    if (
        existingStatus !== CAMPAIGN_STATUS.DRAFT &&
        existingStatus !== CAMPAIGN_STATUS.REJECTED
    ) {
        setStatusMessage(
            "Only draft or rejected campaigns can be edited. You can still view details.",
            true
        );
    }

    document.getElementById("title").value = data.title || "";
    ensureCategoryOption(data.category || "");
    document.getElementById("description").value = data.description || "";
    const mode = resolveDonationMode(data);
    setDonationMode(mode);
    if (campaignAcceptsMoney(data)) {
        document.getElementById("targetAmount").value = (
            (Number(data.targetAmountCentavos) || 0) / 100
        ).toFixed(2);
    }
    const items = normalizeInKindItems(data.inKindItems || []);
    existingInKindReceived = Object.fromEntries(
        items.map((item) => [item.id, item.receivedQuantity || 0])
    );
    renderInKindItems(items);
    document.getElementById("startDate").value = data.startDate || "";
    document.getElementById("endDate").value = data.endDate || "";
    if (data.relatedMissionId) {
        document.getElementById("relatedMissionId").value = data.relatedMissionId;
    }
    setCoverPreview(data.coverImageUrl || "");
    updateLivePreview();
}

async function handleCoverUpload(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
        throw new Error("Please choose a PNG or JPG image.");
    }
    if (!isCloudinaryConfigured()) {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        setCoverPreview(dataUrl);
        return;
    }
    const result = await uploadFileToCloudinary(file, {
        folder: `kalinga/organizations/${orgId}/campaigns`,
        resourceType: "image",
    });
    setCoverPreview(result.url || result.secure_url || "");
}

function collectPayload(status) {
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value.trim();
    const description = document.getElementById("description").value.trim();
    const donationMode = getDonationMode();
    const acceptsMoney =
        donationMode === DONATION_MODE.MONEY || donationMode === DONATION_MODE.BOTH;
    const acceptsGoods =
        donationMode === DONATION_MODE.GOODS || donationMode === DONATION_MODE.BOTH;
    const targetAmountCentavos = acceptsMoney
        ? pesosToCentavos(document.getElementById("targetAmount").value)
        : 0;
    const inKindItems = acceptsGoods ? collectInKindItemsFromForm() : [];
    const startDate = parseDateInput(document.getElementById("startDate").value);
    const endDate = parseDateInput(document.getElementById("endDate").value);
    const relatedMissionId = document.getElementById("relatedMissionId").value;
    const relatedMissionName =
        document.getElementById("relatedMissionId").selectedOptions?.[0]?.textContent ||
        "";

    if (!title) throw new Error("Campaign title is required.");
    if (!category) throw new Error("Category is required.");
    if (!description) throw new Error("Description is required.");
    if (description.length > 500) {
        throw new Error("Description must be 500 characters or fewer.");
    }
    if (acceptsMoney && targetAmountCentavos < 1000) {
        throw new Error("Target amount must be at least ₱10.");
    }
    if (acceptsGoods && !inKindItems.length) {
        throw new Error("Select at least one goods item with a quantity.");
    }
    if (!acceptsMoney && !acceptsGoods) {
        throw new Error("Choose money, goods, or both.");
    }
    if (!startDate || !endDate) throw new Error("Start and end dates are required.");
    if (endDate < startDate) throw new Error("End date must be on or after the start date.");

    return {
        orgId,
        orgName,
        title,
        category,
        description,
        coverImageUrl: coverImageUrl || "",
        donationMode,
        acceptsMoney,
        acceptsGoods,
        targetAmountCentavos,
        inKindItems,
        startDate,
        endDate,
        relatedMissionId: relatedMissionId || "",
        relatedMissionName:
            relatedMissionId && relatedMissionName !== "None" ? relatedMissionName : "",
        status,
        updatedAt: serverTimestamp(),
    };
}

async function ensurePaymongoConnected() {
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    const linked = orgSnap.data()?.paymongo?.linkedAccountId || "";
    if (!linked) {
        throw new Error(
            "Connect your PayMongo Linked Account in Donation Center before submitting a money campaign."
        );
    }
    return linked;
}

async function saveCampaign(status) {
    setStatusMessage("");
    const payload = collectPayload(status);
    if (status === CAMPAIGN_STATUS.PENDING && payload.acceptsMoney) {
        const linked = await ensurePaymongoConnected();
        payload.paymongoAccountId = linked;
        payload.submittedAt = serverTimestamp();
    } else if (status === CAMPAIGN_STATUS.PENDING) {
        payload.submittedAt = serverTimestamp();
    }

    if (isEdit && campaignId) {
        if (
            existingStatus !== CAMPAIGN_STATUS.DRAFT &&
            existingStatus !== CAMPAIGN_STATUS.REJECTED
        ) {
            throw new Error("This campaign can no longer be edited.");
        }
        if (status === CAMPAIGN_STATUS.PENDING) {
            payload.rejectionReason = "";
        }
        await updateDoc(doc(db, "donation_campaigns", campaignId), payload);
        return campaignId;
    }

    const created = await addDoc(collection(db, "donation_campaigns"), {
        ...payload,
        raisedAmountCentavos: 0,
        donorCount: 0,
        rejectionReason: "",
        createdAt: serverTimestamp(),
        createdBy: orgId,
    });
    return created.id;
}

async function onSubmit(event) {
    event.preventDefault();
    const submitMode = event.submitter?.dataset?.mode || "draft";
    const status =
        submitMode === "submit" ? CAMPAIGN_STATUS.PENDING : CAMPAIGN_STATUS.DRAFT;
    const draftBtn = document.getElementById("saveDraftBtn");
    const submitBtn = document.getElementById("submitCampaignBtn");
    if (draftBtn) draftBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    try {
        const id = await saveCampaign(status);
        window.location.href = `/donation/campaigns/${encodeURIComponent(id)}`;
    } catch (error) {
        console.error(error);
        setStatusMessage(error.message || "Could not save campaign.", true);
    } finally {
        if (draftBtn) draftBtn.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

function wireUi() {
    renderInKindItems([]);
    setDonationMode(DONATION_MODE.MONEY);

    document.querySelectorAll("#donationModePills [data-donation-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
            setDonationMode(btn.getAttribute("data-donation-mode"));
        });
    });

    ["title", "category", "description", "targetAmount"].forEach((id) => {
        document.getElementById(id)?.addEventListener("input", updateLivePreview);
        document.getElementById(id)?.addEventListener("change", updateLivePreview);
    });

    document.querySelectorAll("#amountPills [data-amount]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const amount = btn.getAttribute("data-amount");
            const input = document.getElementById("targetAmount");
            if (input) input.value = amount;
            updateLivePreview();
        });
    });

    const dropzone = document.getElementById("coverDropzone");
    const fileInput = document.getElementById("coverImage");
    dropzone?.addEventListener("click", () => fileInput?.click());
    dropzone?.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
    });
    dropzone?.addEventListener("dragleave", () => {
        dropzone.classList.remove("is-dragover");
    });
    dropzone?.addEventListener("drop", async (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        try {
            await handleCoverUpload(file);
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not upload cover image.");
        }
    });
    fileInput?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await handleCoverUpload(file);
        } catch (error) {
            console.error(error);
            alert(error.message || "Could not upload cover image.");
        }
    });

    document.getElementById("campaignForm")?.addEventListener("submit", onSubmit);
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;
    orgId = user.uid;
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    orgName = orgSnap.data()?.name || orgSnap.data()?.orgName || "";

    wireUi();
    await loadPaymongoStatus();
    await loadMissions();
    await loadCampaign();
    updateLivePreview();
});
