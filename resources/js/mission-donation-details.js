import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const DRAFT_KEY = "kalinga-mission-donation-draft";
const FLAG_KEY = "kalinga-mission-donation-enabled";

function missionIdFromReturn() {
  const returnUrl = sessionStorage.getItem("kalinga-mission-donation-return-url") || "";
  try {
    return new URL(returnUrl, window.location.origin).searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function showSavedDonation(donation) {
  const loaded = document.getElementById("donationLoaded");
  const empty = document.getElementById("donationEmpty");
  if (!loaded || !donation) return;

  if (empty) empty.hidden = true;
  loaded.hidden = false;
  const account = document.getElementById("viewAccountName");
  const number = document.getElementById("viewGcashNumber");
  const note = document.getElementById("viewNote");
  if (account) account.textContent = donation.accountName || "—";
  if (number) number.textContent = donation.gcashNumber || "—";
  if (note) note.textContent = donation.note || "—";

  const img = document.getElementById("viewQrImg");
  const missing = document.getElementById("viewQrMissing");
  if (donation.qrImage && img) {
    img.src = donation.qrImage;
    img.hidden = false;
    if (missing) missing.hidden = true;
  } else if (missing) {
    missing.hidden = false;
  }
}

function rememberDonation(missionId, donation) {
  const snapshot = {
    method: donation.method || "gcash",
    accountName: donation.accountName || "",
    gcashNumber: donation.gcashNumber || "",
    qrImage: donation.qrImage || "",
    note: donation.note || "",
    missionId,
  };
  const json = JSON.stringify(snapshot);
  sessionStorage.setItem(DRAFT_KEY, json);
  localStorage.setItem(DRAFT_KEY, json);
  sessionStorage.setItem(`${DRAFT_KEY}:${missionId}`, json);
  localStorage.setItem(`${DRAFT_KEY}:${missionId}`, json);
  sessionStorage.setItem(FLAG_KEY, "1");
  localStorage.setItem(FLAG_KEY, "1");
}

if (new URLSearchParams(window.location.search).get("view") === "1") {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const returnUrl = sessionStorage.getItem("kalinga-mission-donation-return-url") || "";
    if (!returnUrl.includes("/missions/edit")) return;

    const loaded = document.getElementById("donationLoaded");
    if (loaded && !loaded.hidden) return;

    const missionId = missionIdFromReturn();
    if (!missionId) return;

    const refs = [
      doc(db, "organizations", user.uid, "missions", missionId),
      doc(db, "organizations", user.uid, "history", missionId),
      doc(db, "missions", missionId),
    ];

    for (const ref of refs) {
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const mission = snap.data();
      if (!mission.makeDonations || !mission.donationDetails) continue;
      showSavedDonation(mission.donationDetails);
      rememberDonation(missionId, mission.donationDetails);
      return;
    }
  });
}
