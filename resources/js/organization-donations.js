import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    serverTimestamp,
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
    formatInKindSummary,
    inKindProgressPercent,
    resolveDonationMode,
} from "./donation-shared.js";

let orgId = null;
let orgName = "";
let allCampaigns = [];
let campaignFilter = "all";
let primaryShareCampaignId = "";

function maskAccountId(accountId) {
    const value = String(accountId || "").trim();
    if (!value) return "";
    if (value.length <= 4) return `••••${value}`;
    return `••••${value.slice(-4)}`;
}

function formatDisplayDate(iso) {
    const raw = String(iso || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
    const date = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function campaignDurationLabel(startDate, endDate) {
    if (!startDate || !endDate) return "—";
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    return days === 1 ? "1 day" : `${days} days`;
}

function campaignPublicUrl(campaignId) {
    return `${window.location.origin}/donation/campaigns/${encodeURIComponent(campaignId)}`;
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const input = document.createElement("textarea");
        input.value = text;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand("copy");
        input.remove();
        return ok;
    }
}

function setPaymongoStatus(connected, accountId = "") {
    const badge = document.getElementById("paymongoStatusBadge");
    const help = document.getElementById("paymongoHelp");
    const title = document.getElementById("paymongoTitle");
    const icon = document.getElementById("paymongoIcon");
    const editBtn = document.getElementById("editPaymongoBtn");
    const input = document.getElementById("paymongoLinkedAccountId");
    if (input && accountId) input.value = accountId;

    if (connected) {
        if (title) title.textContent = "PayMongo account connected";
        if (help) {
            help.textContent = `Linked account ending in ${maskAccountId(accountId)} · Test mode`;
        }
        if (badge) {
            badge.textContent = "Connected";
            badge.className = "paymongo-badge";
        }
        if (icon) {
            icon.className = "paymongo-card__icon";
            icon.innerHTML = '<i class="bi bi-shield-check"></i>';
        }
        if (editBtn) editBtn.textContent = "Edit account";
    } else {
        if (title) title.textContent = "PayMongo account not connected";
        if (help) {
            help.textContent =
                "Connect your Linked Account so donations settle to your organization — not Kalinga.";
        }
        if (badge) {
            badge.textContent = "Not connected";
            badge.className = "paymongo-badge is-off";
        }
        if (icon) {
            icon.className = "paymongo-card__icon is-off";
            icon.innerHTML = '<i class="bi bi-shield-exclamation"></i>';
        }
        if (editBtn) editBtn.textContent = "Connect account";
    }
}

function togglePaymongoEdit(forceOpen) {
    const form = document.getElementById("paymongoForm");
    if (!form) return;
    const open =
        typeof forceOpen === "boolean" ? forceOpen : !form.classList.contains("is-open");
    form.classList.toggle("is-open", open);
    if (open) document.getElementById("paymongoLinkedAccountId")?.focus();
}

async function loadOrgPaymongo() {
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    if (!orgSnap.exists()) return;
    const data = orgSnap.data() || {};
    orgName = data.name || data.orgName || "";
    const linked = data.paymongo?.linkedAccountId || "";
    setPaymongoStatus(Boolean(linked), linked);
}

async function savePaymongoAccount(event) {
    event.preventDefault();
    const input = document.getElementById("paymongoLinkedAccountId");
    const btn = document.getElementById("savePaymongoBtn");
    const accountId = String(input?.value || "").trim();
    if (!accountId) {
        alert("Enter your PayMongo Linked Account ID.");
        return;
    }
    if (btn) btn.disabled = true;
    try {
        await updateDoc(doc(db, "organizations", orgId), {
            paymongo: {
                linkedAccountId: accountId,
                status: "connected",
                connectedAt: serverTimestamp(),
                livemode: false,
            },
            updatedAt: serverTimestamp(),
        });
        setPaymongoStatus(true, accountId);
        togglePaymongoEdit(false);
    } catch (error) {
        console.error(error);
        alert("Could not save PayMongo account. Check Firestore permissions.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function filteredCampaigns() {
    if (campaignFilter === "published") {
        return allCampaigns.filter((c) => c.status === CAMPAIGN_STATUS.PUBLISHED);
    }
    if (campaignFilter === "drafts") {
        return allCampaigns.filter(
            (c) =>
                c.status === CAMPAIGN_STATUS.DRAFT ||
                c.status === CAMPAIGN_STATUS.REJECTED ||
                c.status === CAMPAIGN_STATUS.PENDING
        );
    }
    return allCampaigns.slice();
}

function closeAllMenus() {
    document.querySelectorAll(".more-menu.is-open").forEach((menu) => {
        menu.classList.remove("is-open");
    });
}

function renderCampaignRows() {
    const tbody = document.getElementById("campaignsTableBody");
    const shareCta = document.getElementById("shareCta");
    if (!tbody) return;

    const campaigns = filteredCampaigns();
    if (!campaigns.length) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="empty-state">No campaigns in this view yet. Create your first campaign.</td></tr>';
        if (shareCta) shareCta.classList.remove("is-visible");
        return;
    }

    tbody.innerHTML = campaigns
        .map((c) => {
            const acceptsMoney = campaignAcceptsMoney(c);
            const acceptsGoods = campaignAcceptsGoods(c);
            const moneyProgress = campaignProgressPercent(
                c.raisedAmountCentavos,
                c.targetAmountCentavos
            );
            const goodsProgress = inKindProgressPercent(c.inKindItems);
            const progress = acceptsMoney
                ? acceptsGoods
                    ? Math.round((moneyProgress + goodsProgress) / 2)
                    : moneyProgress
                : goodsProgress;
            const amountsLabel = acceptsMoney
                ? acceptsGoods
                    ? `${formatCentavos(c.raisedAmountCentavos)} of ${formatCentavos(c.targetAmountCentavos)} · ${formatInKindSummary(c.inKindItems)}`
                    : `${formatCentavos(c.raisedAmountCentavos)} of ${formatCentavos(c.targetAmountCentavos)}`
                : formatInKindSummary(c.inKindItems);
            const canEdit =
                c.status === CAMPAIGN_STATUS.DRAFT ||
                c.status === CAMPAIGN_STATUS.REJECTED;
            return `
        <tr data-campaign-id="${escapeHtml(c.id)}">
          <td>
            <p class="campaign-title">${escapeHtml(c.title || "Untitled")}</p>
            ${
                c.category
                    ? `<span class="category-chip">${escapeHtml(c.category)}</span>`
                    : ""
            }
            <div class="date-sub" style="margin-top:0.25rem">${escapeHtml(donationModeLabel(resolveDonationMode(c)))}</div>
          </td>
          <td><span class="status-pill status-${escapeHtml(c.status)}">${escapeHtml(campaignStatusLabel(c.status))}</span></td>
          <td>
            <div class="progress-amounts">${escapeHtml(amountsLabel)}</div>
            <div class="progress-line">
              <div class="progress-bar"><span style="width:${progress}%"></span></div>
              <span class="progress-pct">${progress}%</span>
            </div>
          </td>
          <td>
            <div class="date-main">${escapeHtml(formatDisplayDate(c.startDate))}</div>
            <div class="date-sub">${escapeHtml(campaignDurationLabel(c.startDate, c.endDate))}</div>
          </td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-table" data-copy-link="${escapeHtml(c.id)}">
                <i class="bi bi-link-45deg"></i> Copy link
              </button>
              <a class="btn-table solid" href="/donation/campaigns/${encodeURIComponent(c.id)}">View</a>
              <button type="button" class="btn-icon" data-more-toggle="${escapeHtml(c.id)}" aria-label="More actions">
                <i class="bi bi-three-dots"></i>
              </button>
              <div class="more-menu" data-more-menu="${escapeHtml(c.id)}">
                ${
                    canEdit
                        ? `<a href="/donation/campaigns/${encodeURIComponent(c.id)}/edit">Edit</a>`
                        : ""
                }
                <button type="button" data-copy-link="${escapeHtml(c.id)}">Copy link</button>
              </div>
            </div>
          </td>
        </tr>`;
        })
        .join("");

    const publishedZeroRaised = allCampaigns.find(
        (c) =>
            c.status === CAMPAIGN_STATUS.PUBLISHED &&
            !(Number(c.raisedAmountCentavos) > 0)
    );
    primaryShareCampaignId = publishedZeroRaised?.id || campaigns[0]?.id || "";
    if (shareCta) {
        shareCta.classList.toggle("is-visible", Boolean(publishedZeroRaised));
    }
}

function updateStats(campaigns, monthRaised, donors) {
    let raised = 0;
    let published = 0;
    let active = 0;
    for (const c of campaigns) {
        raised += Number(c.raisedAmountCentavos) || 0;
        if (c.status === CAMPAIGN_STATUS.PUBLISHED) {
            published += 1;
            active += 1;
        }
    }

    const monthName = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const totalEl = document.getElementById("totalDonations");
    const monthEl = document.getElementById("thisMonth");
    const donorsEl = document.getElementById("donorsCount");
    const activeEl = document.getElementById("activeCampaigns");
    const monthHint = document.getElementById("monthHint");
    const donorsHint = document.getElementById("donorsHint");
    const activeHint = document.getElementById("activeHint");

    if (totalEl) totalEl.textContent = formatCentavos(raised);
    if (monthEl) monthEl.textContent = formatCentavos(monthRaised);
    if (monthHint) monthHint.textContent = monthName;
    if (donorsEl) donorsEl.textContent = String(donors);
    if (donorsHint) {
        donorsHint.textContent = donors > 0 ? "Unique paid donors" : "No donations yet";
    }
    if (activeEl) activeEl.textContent = String(active);
    if (activeHint) {
        activeHint.textContent = `${published} published`;
    }
}

async function loadCampaigns() {
    const tbody = document.getElementById("campaignsTableBody");
    if (tbody) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="empty-state">Loading campaigns…</td></tr>';
    }

    const snap = await getDocs(
        query(collection(db, "donation_campaigns"), where("orgId", "==", orgId))
    );
    allCampaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    allCampaigns.sort((a, b) =>
        String(b.updatedAt?.toDate?.() || b.updatedAt || "").localeCompare(
            String(a.updatedAt?.toDate?.() || a.updatedAt || "")
        )
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let monthRaised = 0;
    let donors = 0;

    try {
        const donationsSnap = await getDocs(
            query(
                collection(db, "donations"),
                where("orgId", "==", orgId),
                where("status", "==", "paid")
            )
        );
        const donorIds = new Set();
        donationsSnap.forEach((d) => {
            const data = d.data() || {};
            const paidAt =
                data.paidAt?.toDate?.() || (data.paidAt ? new Date(data.paidAt) : null);
            if (paidAt && paidAt >= monthStart) {
                monthRaised += Number(data.amountCentavos) || 0;
            }
            if (data.volunteerId) donorIds.add(data.volunteerId);
            else if (data.volunteerEmail) donorIds.add(data.volunteerEmail);
        });
        donors = donorIds.size;
        if (!donors) {
            donors = allCampaigns.reduce(
                (sum, c) => sum + (Number(c.donorCount) || 0),
                0
            );
        }
    } catch (error) {
        console.warn("Could not load donation totals", error);
        donors = allCampaigns.reduce((sum, c) => sum + (Number(c.donorCount) || 0), 0);
    }

    updateStats(allCampaigns, monthRaised, donors);
    renderCampaignRows();
}

function wireUi() {
    document.getElementById("editPaymongoBtn")?.addEventListener("click", () => {
        togglePaymongoEdit();
    });
    document.getElementById("paymongoForm")?.addEventListener("submit", savePaymongoAccount);

    document.querySelectorAll("[data-campaign-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            campaignFilter = btn.getAttribute("data-campaign-filter") || "all";
            document.querySelectorAll("[data-campaign-filter]").forEach((el) => {
                el.classList.toggle(
                    "active",
                    el.getAttribute("data-campaign-filter") === campaignFilter
                );
            });
            renderCampaignRows();
        });
    });

    document.getElementById("campaignsTableBody")?.addEventListener("click", async (event) => {
        const copyBtn = event.target.closest("[data-copy-link]");
        if (copyBtn) {
            const id = copyBtn.getAttribute("data-copy-link");
            const ok = await copyText(campaignPublicUrl(id));
            copyBtn.textContent = ok ? "Copied!" : "Copy failed";
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="bi bi-link-45deg"></i> Copy link';
            }, 1200);
            return;
        }

        const moreBtn = event.target.closest("[data-more-toggle]");
        if (moreBtn) {
            const id = moreBtn.getAttribute("data-more-toggle");
            const menu = document.querySelector(`[data-more-menu="${id}"]`);
            const wasOpen = menu?.classList.contains("is-open");
            closeAllMenus();
            if (menu && !wasOpen) menu.classList.add("is-open");
        }
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".row-actions")) closeAllMenus();
    });

    document
        .getElementById("copyPrimaryCampaignLink")
        ?.addEventListener("click", async () => {
            if (!primaryShareCampaignId) return;
            const btn = document.getElementById("copyPrimaryCampaignLink");
            const ok = await copyText(campaignPublicUrl(primaryShareCampaignId));
            if (btn) {
                const prev = btn.innerHTML;
                btn.innerHTML = ok
                    ? '<i class="bi bi-check-lg"></i> Link copied'
                    : "Copy failed";
                setTimeout(() => {
                    btn.innerHTML = prev;
                }, 1400);
            }
        });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;
    orgId = user.uid;
    wireUi();
    await loadOrgPaymongo();
    await loadCampaigns();
});
