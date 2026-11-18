import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

const donationId =
    document.body.dataset.donationId ||
    new URLSearchParams(window.location.search).get("donation_id") ||
    "";
const serverStatus = (document.body.dataset.donationStatus || "").toLowerCase();

function setNote(message) {
    const el = document.getElementById("syncNote");
    if (el) el.textContent = message || "";
}

async function fetchDonation(token) {
    const response = await fetch(`/api/donations/${encodeURIComponent(donationId)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`Could not load donation (${response.status})`);
    }
    const payload = await response.json();
    return payload.donation || null;
}

function buildReceipt(donation) {
    return {
        campaignId: donation.campaignId || "",
        campaignTitle: donation.campaignTitle || "",
        orgId: donation.orgId || "",
        orgName: donation.orgName || "",
        volunteerId: donation.volunteerId || auth.currentUser?.uid || "",
        volunteerEmail: donation.volunteerEmail || auth.currentUser?.email || "",
        volunteerName:
            donation.volunteerName ||
            auth.currentUser?.displayName ||
            "",
        amountCentavos: Number(donation.amountCentavos) || 0,
        currency: donation.currency || "PHP",
        status: donation.status || serverStatus || "pending",
        provider: donation.provider || "maya",
        mayaCheckoutId: donation.mayaCheckoutId || "",
        mayaPaymentId: donation.mayaPaymentId || "",
        paidAt: donation.paidAt || null,
        createdAt: donation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedFrom: "donation-success",
    };
}

async function syncReceipt(donation) {
    const receipt = buildReceipt(donation);
    if (!receipt.campaignId || !receipt.volunteerId) {
        throw new Error("Donation is missing campaign or volunteer.");
    }

    await setDoc(doc(db, "donations", donationId), receipt, { merge: true });
    await setDoc(
        doc(db, "donation_campaigns", receipt.campaignId, "transactions", donationId),
        receipt,
        { merge: true }
    );

    if (String(receipt.status).toLowerCase() !== "paid") {
        return;
    }

    const campaignRef = doc(db, "donation_campaigns", receipt.campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) {
        return;
    }
    const campaign = campaignSnap.data() || {};
    const recent = Array.isArray(campaign.recentDonations)
        ? [...campaign.recentDonations]
        : [];
    const alreadyListed = recent.some(
        (row) => row && String(row.id || "") === String(donationId)
    );

    const entry = {
        id: donationId,
        volunteerName: receipt.volunteerName,
        volunteerEmail: receipt.volunteerEmail,
        amountCentavos: receipt.amountCentavos,
        status: "paid",
        paidAt: receipt.paidAt || new Date().toISOString(),
    };

    if (!alreadyListed) {
        recent.push(entry);
        await updateDoc(campaignRef, {
            raisedAmountCentavos:
                (Number(campaign.raisedAmountCentavos) || 0) +
                (Number(receipt.amountCentavos) || 0),
            donorCount: (Number(campaign.donorCount) || 0) + 1,
            recentDonations: recent.slice(-50),
            updatedAt: serverTimestamp(),
        });
    } else {
        const nextRecent = recent.map((row) =>
            row && String(row.id || "") === String(donationId) ? { ...row, ...entry } : row
        );
        await updateDoc(campaignRef, {
            recentDonations: nextRecent.slice(-50),
            updatedAt: serverTimestamp(),
        });
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!donationId) {
        setNote("");
        return;
    }
    if (!user) {
        setNote("Sign in once so this donation can appear on the organization campaign page.");
        return;
    }

    try {
        setNote("Saving donor details for the organization…");
        const token = await user.getIdToken();
        const donation = await fetchDonation(token);
        if (!donation) {
            setNote("Donation record not found.");
            return;
        }
        await syncReceipt(donation);
        setNote("Donor details saved. The organization can see this donation on the campaign page.");
    } catch (error) {
        console.warn("[WARN] donation success sync:", error);
        setNote(
            error?.message ||
                "Could not sync donor details to Firestore. Publish the latest firestore.rules and refresh."
        );
    }
});
