import { auth, db } from "./firebase.js";
import "./admin-theme.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
    CAMPAIGN_STATUS,
    campaignAcceptsGoods,
    campaignAcceptsMoney,
    campaignStatusLabel,
    donationModeLabel,
    escapeHtml,
    formatCentavos,
    formatInKindSummary,
    resolveDonationMode,
} from "./donation-shared.js";
import { ADMIN_CACHE_KEYS, invalidateAdminCache } from "./admin-data-cache.js";

const campaignId = document.body.dataset.campaignId || "";

function isAdminEmail(email) {
    const value = String(email || "");
    return value.includes("@admin.kalinga.com") || value.includes("admin@");
}

function setStatus(message, isError = false) {
    const el = document.getElementById("campaignPageStatus");
    const body = document.getElementById("campaignPageBody");
    const footer = document.getElementById("campaignPageFooter");
    if (body) body.hidden = true;
    if (footer) footer.hidden = true;
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("is-error", isError);
}

function detailRow(icon, label, valueHtml) {
    return `
      <div class="org-detail-row">
        <div class="org-detail-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
        <div class="org-detail-text">
          <strong>${escapeHtml(label)}</strong>
          <span>${valueHtml}</span>
        </div>
      </div>`;
}

function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    el.classList.add("is-open");
}

function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("is-open");
    el.hidden = true;
}

function renderCampaign(c) {
    const status = String(c.status || "draft");
    const titleEl = document.getElementById("campaignDetailsTitle");
    if (titleEl) titleEl.textContent = (c.title || "CAMPAIGN DETAILS").toUpperCase();

    const body = document.getElementById("campaignPageBody");
    const footer = document.getElementById("campaignPageFooter");
    const actions = document.getElementById("campaignPageActions");
    const statusEl = document.getElementById("campaignPageStatus");

    const coverHtml = c.coverImageUrl
        ? `<div class="campaign-cover-wrap"><img src="${escapeHtml(c.coverImageUrl)}" alt="Campaign cover" class="campaign-cover-img"></div>`
        : "";

    const leftRows = [
        detailRow(
            "fa-tag",
            "Status:",
            `<span class="org-status-badge ${escapeHtml(status)}">${escapeHtml(campaignStatusLabel(status))}</span>`
        ),
        detailRow("fa-building", "Organization:", escapeHtml(c.orgName || c.orgId || "—")),
        detailRow("fa-folder", "Category:", escapeHtml(c.category || "—")),
        detailRow("fa-hand-holding-heart", "Donation Type:", escapeHtml(donationModeLabel(resolveDonationMode(c)))),
        detailRow("fa-calendar", "Schedule:", `${escapeHtml(c.startDate || "—")} → ${escapeHtml(c.endDate || "—")}`),
        c.relatedMissionName
            ? detailRow("fa-bullseye", "Related Mission:", escapeHtml(c.relatedMissionName))
            : "",
        detailRow(
            "fa-align-left",
            "Description:",
            escapeHtml(c.description || "No description provided.").replace(/\n/g, "<br>")
        ),
        status === CAMPAIGN_STATUS.REJECTED && c.rejectionReason
            ? detailRow("fa-ban", "Rejection Reason:", escapeHtml(c.rejectionReason))
            : "",
    ].join("");

    const rightRows = [
        campaignAcceptsMoney(c)
            ? detailRow("fa-bullseye", "Target Amount:", escapeHtml(formatCentavos(c.targetAmountCentavos)))
            : "",
        campaignAcceptsMoney(c)
            ? detailRow("fa-coins", "Raised So Far:", escapeHtml(formatCentavos(c.raisedAmountCentavos)))
            : "",
        campaignAcceptsMoney(c)
            ? detailRow("fa-users", "Donors:", escapeHtml(String(Number(c.donorCount) || 0)))
            : "",
        campaignAcceptsGoods(c)
            ? detailRow("fa-box-open", "Needed Goods:", escapeHtml(formatInKindSummary(c.inKindItems) || "—"))
            : "",
        campaignAcceptsGoods(c) && c.goodsPersonInCharge
            ? detailRow("fa-user", "Person in Charge:", escapeHtml(c.goodsPersonInCharge))
            : "",
        campaignAcceptsGoods(c) && c.goodsDropoffLocation
            ? detailRow("fa-map-marker-alt", "Drop-off Location:", escapeHtml(c.goodsDropoffLocation))
            : "",
        campaignAcceptsGoods(c) && c.goodsContactNumber
            ? detailRow("fa-phone", "Number to Call:", escapeHtml(c.goodsContactNumber))
            : "",
    ].join("");

    if (body) {
        body.innerHTML = `
          ${coverHtml}
          <div class="org-page__col">
            <h2 class="org-page__section-title">Campaign Overview</h2>
            ${leftRows}
          </div>
          <div class="org-page__col">
            <h2 class="org-page__section-title">Targets &amp; Logistics</h2>
            ${rightRows || '<p style="color:#6b7280;font-size:0.9rem;">No target or logistics details.</p>'}
          </div>`;
        body.hidden = false;
    }

    if (actions) {
        actions.innerHTML =
            status === CAMPAIGN_STATUS.PENDING
                ? `<button type="button" class="org-action org-action--approve" id="campaignApproveBtn"><i class="fas fa-check"></i> Approve</button>
                   <button type="button" class="org-action org-action--reject" id="campaignRejectBtn"><i class="fas fa-times"></i> Reject</button>`
                : "";
        document.getElementById("campaignApproveBtn")?.addEventListener("click", approveCampaign);
        document.getElementById("campaignRejectBtn")?.addEventListener("click", openRejectModal);
    }

    if (footer) footer.hidden = false;
    if (statusEl) statusEl.hidden = true;
}

async function loadCampaign() {
    if (!campaignId) {
        setStatus("Missing campaign ID.", true);
        return;
    }
    try {
        const snap = await getDoc(doc(db, "donation_campaigns", campaignId));
        if (!snap.exists()) {
            setStatus("Campaign not found.", true);
            return;
        }
        renderCampaign({ id: snap.id, ...snap.data() });
    } catch (error) {
        console.error(error);
        setStatus("Could not load campaign.", true);
    }
}

async function approveCampaign() {
    const btn = document.getElementById("campaignApproveBtn");
    if (btn) btn.disabled = true;
    try {
        await updateDoc(doc(db, "donation_campaigns", campaignId), {
            status: CAMPAIGN_STATUS.PUBLISHED,
            publishedAt: serverTimestamp(),
            rejectionReason: "",
            updatedAt: serverTimestamp(),
        });
        invalidateAdminCache(ADMIN_CACHE_KEYS.CAMPAIGNS);
        invalidateAdminCache(ADMIN_CACHE_KEYS.DASHBOARD_STATS);
        await loadCampaign();
        openOverlay("campaignApproveSuccessModal");
    } catch (error) {
        console.error(error);
        alert("Failed to approve campaign.");
        if (btn) btn.disabled = false;
    }
}

function openRejectModal() {
    const textarea = document.getElementById("campaignRejectReasonInput");
    const err = document.getElementById("campaignRejectReasonError");
    if (textarea) textarea.value = "";
    if (err) err.textContent = "";
    openOverlay("campaignRejectModal");
    textarea?.focus();
}

async function confirmReject() {
    const textarea = document.getElementById("campaignRejectReasonInput");
    const err = document.getElementById("campaignRejectReasonError");
    const reason = (textarea?.value || "").trim();
    if (!reason) {
        if (err) err.textContent = "A rejection reason is required.";
        textarea?.focus();
        return;
    }
    if (err) err.textContent = "";
    closeOverlay("campaignRejectModal");

    try {
        await updateDoc(doc(db, "donation_campaigns", campaignId), {
            status: CAMPAIGN_STATUS.REJECTED,
            rejectionReason: reason,
            updatedAt: serverTimestamp(),
        });
        invalidateAdminCache(ADMIN_CACHE_KEYS.CAMPAIGNS);
        invalidateAdminCache(ADMIN_CACHE_KEYS.DASHBOARD_STATS);
        await loadCampaign();
    } catch (error) {
        console.error(error);
        alert("Failed to reject campaign.");
    }
}

document.getElementById("campaignApproveSuccessOk")?.addEventListener("click", () => {
    closeOverlay("campaignApproveSuccessModal");
});
document.getElementById("campaignRejectCancel")?.addEventListener("click", () => {
    closeOverlay("campaignRejectModal");
});
document.getElementById("campaignRejectConfirm")?.addEventListener("click", confirmReject);

document.getElementById("adminLogoutBtn")?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!confirm("Are you sure you want to logout?")) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
    }
    localStorage.removeItem("adminUser");
    window.location.href = "/admin/login";
});

onAuthStateChanged(auth, async (user) => {
    if (!user || !isAdminEmail(user.email)) {
        window.location.href = "/admin/login";
        return;
    }
    const emailEl = document.getElementById("adminEmailSidebar");
    if (emailEl) emailEl.textContent = user.email || "";
    await loadCampaign();
});
