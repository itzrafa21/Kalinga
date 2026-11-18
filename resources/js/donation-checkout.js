import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    campaignAcceptsMoney,
    campaignProgressPercent,
    formatCentavos,
} from "./donation-shared.js";

const campaignId =
    document.body.dataset.campaignId ||
    window.location.pathname.match(/\/donate\/([^/]+)/)?.[1] ||
    "";

let campaign = null;
let amountCentavos = 5000;

function setStatus(message, isError = false) {
    const el = document.getElementById("statusMsg");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(isError));
}

function syncAmountUi() {
    document.querySelectorAll("#amountPills [data-amount]").forEach((btn) => {
        const value = Number(btn.getAttribute("data-amount")) || 0;
        btn.classList.toggle("active", value === amountCentavos);
    });
    const custom = document.getElementById("customAmount");
    if (custom && document.activeElement !== custom) {
        custom.value = String(Math.round(amountCentavos / 100));
    }
}

function paintCampaign() {
    if (!campaign) return;
    const title = document.getElementById("campaignTitle");
    const meta = document.getElementById("campaignMeta");
    const cover = document.getElementById("campaignCover");
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");

    if (title) title.textContent = campaign.title || "Campaign";
    if (meta) {
        meta.textContent = [
            campaign.orgName || campaign.organizationName || "Organization",
            campaign.category || "",
        ]
            .filter(Boolean)
            .join(" · ");
    }
    if (cover) {
        if (campaign.coverImageUrl) {
            cover.hidden = false;
            cover.src = campaign.coverImageUrl;
        } else {
            cover.hidden = true;
        }
    }
    const pct = campaignProgressPercent(campaign);
    if (fill) fill.style.width = `${pct}%`;
    if (label) {
        label.textContent = `${formatCentavos(campaign.raisedAmountCentavos || 0)} raised of ${formatCentavos(campaign.targetAmountCentavos || 0)} · ${pct}%`;
    }
}

async function loadCampaign() {
    if (!campaignId) {
        setStatus("Missing campaign id.", true);
        return false;
    }
    const snap = await getDoc(doc(db, "donation_campaigns", campaignId));
    if (!snap.exists()) {
        setStatus("Campaign not found.", true);
        return false;
    }
    campaign = { id: snap.id, ...snap.data() };
    if (campaign.status !== "published") {
        setStatus("This campaign is not accepting donations yet.", true);
        return false;
    }
    if (!campaignAcceptsMoney(campaign)) {
        setStatus("This campaign does not accept money donations.", true);
        return false;
    }
    paintCampaign();
    setStatus("");
    return true;
}

async function startCheckout() {
    const user = auth.currentUser;
    if (!user) {
        try {
            sessionStorage.setItem("kalinga-donate-return", window.location.pathname);
        } catch (e) {}
        window.location.href = "/organization/login";
        return;
    }
    if (!campaign) {
        setStatus("Campaign is still loading.", true);
        return;
    }

    const custom = document.getElementById("customAmount");
    const pesos = Math.max(10, Math.floor(Number(custom?.value) || 0));
    amountCentavos = pesos * 100;
    syncAmountUi();

    const btn = document.getElementById("donateBtn");
    if (btn) btn.disabled = true;
    setStatus("Starting Maya checkout…");

    try {
        const token = await user.getIdToken();
        const response = await fetch("/api/donations/checkout", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                campaignId,
                amountCentavos,
                donorName:
                    document.getElementById("donorName")?.value?.trim() ||
                    user.displayName ||
                    "",
                donorEmail: user.email || "",
                orgId: campaign.orgId || "",
                campaignTitle: campaign.title || "",
                orgName: campaign.orgName || campaign.organizationName || "",
            }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.message || "Checkout failed.");
        }
        if (!payload.checkoutUrl) {
            throw new Error("Maya did not return a checkout URL.");
        }

        // Mirror a pending receipt so the org can already see who started a donation.
        if (payload.donationId) {
            const receipt = {
                campaignId,
                campaignTitle: campaign.title || "",
                orgId: campaign.orgId || "",
                orgName: campaign.orgName || campaign.organizationName || "",
                volunteerId: user.uid,
                volunteerEmail: user.email || "",
                volunteerName:
                    document.getElementById("donorName")?.value?.trim() ||
                    user.displayName ||
                    "",
                amountCentavos,
                currency: "PHP",
                status: "pending",
                provider: "maya",
                mayaCheckoutId: payload.checkoutSessionId || "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                syncedFrom: "donation-checkout",
            };
            try {
                await setDoc(doc(db, "donations", payload.donationId), receipt, {
                    merge: true,
                });
                await setDoc(
                    doc(
                        db,
                        "donation_campaigns",
                        campaignId,
                        "transactions",
                        payload.donationId
                    ),
                    receipt,
                    { merge: true }
                );
            } catch (syncError) {
                console.warn("[WARN] pending donation sync:", syncError);
            }
        }

        window.location.href = payload.checkoutUrl;
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Could not start checkout.", true);
        if (btn) btn.disabled = false;
    }
}

function wireUi() {
    document.querySelectorAll("#amountPills [data-amount]").forEach((btn) => {
        btn.addEventListener("click", () => {
            amountCentavos = Number(btn.getAttribute("data-amount")) || 5000;
            syncAmountUi();
        });
    });
    document.getElementById("customAmount")?.addEventListener("input", (event) => {
        const pesos = Math.max(10, Math.floor(Number(event.target.value) || 0));
        amountCentavos = pesos * 100;
        document.querySelectorAll("#amountPills [data-amount]").forEach((btn) => {
            btn.classList.remove("active");
        });
    });
    document.getElementById("donateBtn")?.addEventListener("click", startCheckout);
}

onAuthStateChanged(auth, async (user) => {
    wireUi();
    syncAmountUi();
    const ok = await loadCampaign();
    if (!ok) return;
    if (!user) {
        setStatus("Sign in to continue, then tap Donate with Maya.");
    } else {
        const nameInput = document.getElementById("donorName");
        if (nameInput && !nameInput.value) {
            nameInput.value = user.displayName || "";
        }
    }
});
