import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { assertOrgVerified } from "./org-verification.js";
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

const campaignId =
    document.body.dataset.campaignId ||
    window.location.pathname.match(/\/donation\/campaigns\/([^/]+)/)?.[1] ||
    "";

let orgId = null;
let currentCampaign = null;

function setMessage(message, isError = false) {
    const el = document.getElementById("campaignDetailsStatus");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("is-error", isError);
}

async function loadTransactions() {
    const tbody = document.getElementById("donationsTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading…</td></tr>';
    const snap = await getDocs(
        query(collection(db, "donations"), where("campaignId", "==", campaignId))
    );
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
    if (!rows.length) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted">No donations yet.</td></tr>';
        return;
    }
    tbody.innerHTML = rows
        .map((d) => {
            const when = d.paidAt || d.createdAt || "—";
            const goods = normalizeInKindItems(d.inKindItems || []);
            const amountLabel = goods.length
                ? goods
                      .map((item) => `${item.label} × ${item.targetQuantity || item.quantity || 0}`)
                      .join(", ")
                : formatCentavos(d.amountCentavos);
            return `<tr>
        <td>${escapeHtml(d.volunteerName || d.volunteerEmail || "Donor")}</td>
        <td>${escapeHtml(amountLabel)}</td>
        <td>${escapeHtml(String(d.status || "").toUpperCase())}</td>
        <td>${escapeHtml(String(when).slice(0, 19).replace("T", " "))}</td>
        <td class="small text-muted">${escapeHtml(d.id)}</td>
      </tr>`;
        })
        .join("");
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
    document.getElementById("campaignDates").textContent = `${c.startDate || "—"} → ${c.endDate || "—"}`;
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
        if (c.status === CAMPAIGN_STATUS.PUBLISHED) {
            bits.push(
                `<button type="button" class="btn btn-outline" id="closeCampaignBtn">Close campaign</button>`
            );
        }
        actions.innerHTML = bits.join(" ");
        document
            .getElementById("submitForApprovalBtn")
            ?.addEventListener("click", submitForApproval);
        document
            .getElementById("closeCampaignBtn")
            ?.addEventListener("click", closeCampaign);
    }

    if (c.status === CAMPAIGN_STATUS.REJECTED && c.rejectionReason) {
        setMessage(`Rejected: ${c.rejectionReason}`, true);
    }

    await loadTransactions();
}

async function submitForApproval() {
    if (campaignAcceptsMoney(currentCampaign || {})) {
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        const linked = orgSnap.data()?.paymongo?.linkedAccountId || "";
        if (!linked) {
            alert("Connect your PayMongo Linked Account first.");
            return;
        }
        await updateDoc(doc(db, "donation_campaigns", campaignId), {
            status: CAMPAIGN_STATUS.PENDING,
            paymongoAccountId: linked,
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

async function closeCampaign() {
    if (!confirm("Close this campaign? Volunteers will no longer be able to donate.")) {
        return;
    }
    await updateDoc(doc(db, "donation_campaigns", campaignId), {
        status: CAMPAIGN_STATUS.CLOSED,
        updatedAt: serverTimestamp(),
    });
    await loadCampaign();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;
    orgId = user.uid;
    if (!campaignId) {
        setMessage("Missing campaign id.", true);
        return;
    }
    await loadCampaign();
});
