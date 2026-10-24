<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Donation Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite(['resources/css/app.css','resources/js/app.js','resources/js/auth-guard.js','resources/js/organization-sidebar.js','resources/js/organization-logout.js'])
  @include('partials.org-layout-styles')
  <style>
    .org-main-content.main-content { max-width: 720px; }
    .donation-view-card {
      background: #fff; border-radius: 16px; padding: 1.75rem;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
    }
    .donation-view-card h1 {
      margin: 0 0 0.5rem; font-size: 1.35rem; color: #28a745;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .donation-view-card .desc { color: #64748b; margin: 0 0 1.25rem; }
    .detail-row { margin-bottom: 1rem; }
    .detail-row label { display: block; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
    .detail-row .value { padding: 0.75rem 1rem; background: #f8faf9; border-radius: 8px; border: 1px solid #e2e8f0; }
    .qr-box img { max-width: 220px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .empty-state { color: #64748b; padding: 1rem; background: #fff8e6; border-radius: 10px; }
    .back-row { margin-top: 1.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'missions'])

  <main class="org-main-content main-content">
    <div class="donation-view-card">
      <h1><i class="bi bi-heart"></i> Donation details for this mission</h1>
      <p class="desc">These are the GCash details from your Donation Center. Volunteers will use them for this mission.</p>

      <div id="donationLoaded" hidden>
        <div class="detail-row">
          <label>Account name</label>
          <div class="value" id="viewAccountName">—</div>
        </div>
        <div class="detail-row">
          <label>GCash number</label>
          <div class="value" id="viewGcashNumber">—</div>
        </div>
        <div class="detail-row">
          <label>Note for volunteers</label>
          <div class="value" id="viewNote">—</div>
        </div>
        <div class="detail-row qr-box">
          <label>GCash QR</label>
          <img id="viewQrImg" alt="GCash QR" hidden>
          <div id="viewQrMissing" class="value" hidden>No QR saved</div>
        </div>
      </div>

      <div id="donationEmpty" class="empty-state" hidden>
        No donation details found. Go to <strong>Donation</strong> in the sidebar, save your GCash details, then come back.
      </div>

      <div class="back-row">
        <a href="/missions/create" class="btn btn-outline-secondary">← Back to create mission</a>
        <a href="/donation" class="btn btn-outline-success">Edit donation details</a>
        <button type="button" class="btn btn-success" id="useForMissionBtn" hidden>Use for this mission</button>
      </div>
    </div>
  </main>

  <script>
  (function () {
    const ORG_KEY = "kalinga-org-donation-gcash";
    const DRAFT_KEY = "kalinga-mission-donation-draft";
    const FLAG_KEY = "kalinga-mission-donation-enabled";
    const CREATE_DRAFT_KEY = "kalinga-create-mission-draft";
    const KEEP_KEY = "kalinga-mission-donation-keep";
    const RETURN_KEY = "kalinga-mission-donation-return";

    const viewOnly = new URLSearchParams(window.location.search).get("view") === "1";
    const loaded = document.getElementById("donationLoaded");
    const empty = document.getElementById("donationEmpty");
    const useBtn = document.getElementById("useForMissionBtn");

    function readJson(storage, key) {
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function showEmpty(message) {
      empty.hidden = false;
      empty.textContent = message;
    }

    let data = readJson(sessionStorage, DRAFT_KEY) || readJson(localStorage, DRAFT_KEY);

const returnUrl = sessionStorage.getItem("kalinga-mission-donation-return-url") || "/missions/create";
const backLink = document.querySelector(".back-row a.btn-outline-secondary");
if (backLink) {
  backLink.href = returnUrl;
  backLink.textContent = returnUrl.includes("/missions/edit")
    ? "← Back to edit mission"
    : "← Back to create mission";
}

function markReturnToCreate() {
  sessionStorage.setItem(RETURN_KEY, "1");
}

backLink?.addEventListener("click", markReturnToCreate);

function fillDonation(donation, showUse) {
  loaded.hidden = false;
  if (showUse) useBtn.hidden = false;
  document.getElementById("viewAccountName").textContent = donation.accountName || "—";
  document.getElementById("viewGcashNumber").textContent = donation.gcashNumber || "—";
  document.getElementById("viewNote").textContent = donation.note || "—";

  const img = document.getElementById("viewQrImg");
  const missing = document.getElementById("viewQrMissing");
  if (donation.qrImage) {
    img.src = donation.qrImage;
    img.hidden = false;
  } else {
    missing.hidden = false;
  }

  if (!showUse) return;
  useBtn?.addEventListener("click", () => {
    const snapshot = {
      method: donation.method || "gcash",
      accountName: donation.accountName || "",
      gcashNumber: donation.gcashNumber || "",
      qrImage: donation.qrImage || "",
      note: donation.note || "",
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    localStorage.setItem(FLAG_KEY, "1");
    sessionStorage.setItem(FLAG_KEY, "1");
    markReturnToCreate();
    window.location.href = returnUrl;
  });
}

if (!data) {
  showEmpty("No donation details for this mission.");
  const org = !viewOnly ? readJson(localStorage, ORG_KEY) : null;
  if (org && (org.accountName || org.gcashNumber || org.qrImage)) {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-success mt-3";
    addBtn.textContent = "Add donation details";
    empty.appendChild(addBtn);
    addBtn.addEventListener("click", () => {
      empty.hidden = true;
      fillDonation(org, true);
    });
  }
} else {
  fillDonation(data, !viewOnly);
}

    window.addEventListener("pagehide", () => {
      if (sessionStorage.getItem(RETURN_KEY) === "1") {
        sessionStorage.removeItem(RETURN_KEY);
        return;
      }
      sessionStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(FLAG_KEY);
      localStorage.removeItem(FLAG_KEY);
      sessionStorage.removeItem(CREATE_DRAFT_KEY);
      sessionStorage.removeItem(KEEP_KEY);
    });
  })();
</script>
</body>
</html>