<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Setup - Kalinga</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js'
  ])
  @include('partials.org-layout-styles')

  <style>
    .org-main-content.main-content {
      max-width: 960px;
    }
    .page-title-donation {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a2f;
      margin: 0 0 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .page-title-donation i { color: #28a745; }
    .page-subtitle {
      margin: 0 0 1.5rem;
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.45;
    }

    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card {
      flex: 1;
      min-width: 180px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 1.35rem 1.5rem;
      text-align: center;
      font-weight: bold;
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      top: -40%;
      right: -40%;
      width: 200%;
      height: 200%;
      background: rgba(40, 167, 69, 0.05);
      transform: rotate(45deg);
      pointer-events: none;
    }

    .card h2 {
      font-size: 1.85rem;
      margin: 0.35rem 0 0;
      color: #28a745;
      position: relative;
    }

    .card p {
      margin: 0.4rem 0 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 500;
      position: relative;
    }

    .donation-section {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .donation-section h3 {
      margin: 0 0 0.4rem;
      font-size: 1.35rem;
      color: #28a745;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-desc {
      margin: 0 0 1.25rem;
      color: #64748b;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .mock-badge {
      background: #ffc107;
      color: #000;
      padding: 0.4rem 0.85rem;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.85rem;
      display: inline-block;
      margin-bottom: 1.15rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.45rem;
      font-weight: 600;
      color: #334155;
      font-size: 0.92rem;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s ease-in-out;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }

    .form-hint {
      margin: 0.4rem 0 0;
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.4;
    }

    .payment-methods {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.85rem;
    }

    .payment-method {
      padding: 1rem;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      text-align: center;
      font-weight: 600;
      color: #334155;
      background: #fff;
    }

    .payment-method i {
      display: block;
      font-size: 1.35rem;
      margin-bottom: 0.35rem;
      color: #64748b;
    }

    .payment-method:hover,
    .payment-method.active {
      border-color: #28a745;
      background: rgba(40, 167, 69, 0.05);
    }

    .payment-method.active i {
      color: #28a745;
    }

    .payment-method.coming-soon {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .gcash-setup-box {
      border: 1px dashed #c5d5cc;
      border-radius: 12px;
      padding: 1.15rem 1.25rem;
      background: #f8faf9;
      margin-top: 0.25rem;
    }

    .gcash-setup-box > .box-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 700;
      color: #1e3a2f;
      margin-bottom: 0.35rem;
    }

    .qr-preview {
      margin-top: 0.75rem;
      max-width: 220px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #dbe3ea;
      background: #fff;
    }

    .qr-preview img {
      display: block;
      width: 100%;
      height: auto;
    }

    .qr-preview[hidden] {
      display: none !important;
    }

    .save-btn {
      background: linear-gradient(90deg, #28a745, #00c853);
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      font-family: inherit;
    }

    .save-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
    }

    .save-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .preview-note {
      margin-top: 1.25rem;
      padding: 0.9rem 1rem;
      background: #ecfdf3;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      color: #166534;
      font-size: 0.88rem;
      line-height: 1.45;
    }

    @media (max-width: 768px) {
      .stats { flex-direction: column; }
      .donation-section { padding: 1.5rem; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'donation'])

  <main class="org-main-content main-content" id="mainContent">
    <h1 class="page-title-donation"><i class="bi bi-heart"></i> Donation Center</h1>
    <p class="page-subtitle">
      Set up how volunteers can donate to your organization. You are not donating here — you are publishing your payment details for others to use.
    </p>

    <div class="stats">
      <div class="card">
        <h2 id="totalDonations">₱0</h2>
        <p>Total Raised</p>
      </div>
      <div class="card">
        <h2 id="thisMonth">₱0</h2>
        <p>This Month</p>
      </div>
      <div class="card">
        <h2 id="donorsCount">0</h2>
        <p>Donors</p>
      </div>
    </div>

    <div class="donation-section">
      <h3><i class="bi bi-wallet2"></i> How volunteers can donate</h3>
      <p class="section-desc">
        Add your GCash details and QR code. Volunteers will use these to send donations later.
      </p>
      <div class="mock-badge">MOCK-UP — not saved to Firebase yet</div>

      <form id="donationSetupForm">
        <div class="form-group">
          <label>Payment method</label>
          <div class="payment-methods">
            <div class="payment-method active" data-method="gcash" role="button" tabindex="0">
              <i class="bi bi-phone"></i>
              GCash
            </div>
            <div class="payment-method coming-soon" data-method="paymaya" title="Coming soon">
              <i class="bi bi-credit-card"></i>
              PayMaya
            </div>
            <div class="payment-method coming-soon" data-method="bank" title="Coming soon">
              <i class="bi bi-bank"></i>
              Bank
            </div>
          </div>
          <p class="form-hint">GCash is available for this mockup. Other methods can be added later.</p>
        </div>

        <div class="gcash-setup-box" id="gcashDetailsBox">
          <div class="box-title"><i class="bi bi-qr-code"></i> Your GCash receiving details</div>
          <p class="form-hint" style="margin-bottom: 1rem;">
            From the GCash app: open Receive / My QR, then enter the same account name and number here and upload the QR image.
          </p>

          <div class="form-group">
            <label for="gcashAccountName">Account name</label>
            <input type="text" id="gcashAccountName" placeholder="e.g. GoodApps Organization" required>
          </div>

          <div class="form-group">
            <label for="gcashNumber">GCash number</label>
            <input type="tel" id="gcashNumber" placeholder="09XX XXX XXXX" required>
          </div>

          <div class="form-group">
            <label for="donationQrInput">GCash QR code image</label>
            <input type="file" id="donationQrInput" accept="image/png,image/jpeg,image/webp">
            <p class="form-hint">PNG or JPG. Keep the file under ~700 KB if you later save it to Firestore.</p>
            <div class="qr-preview" id="donationQrPreview" hidden>
              <img id="donationQrImg" alt="Organization GCash QR preview">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label for="volunteerNote">Note shown to volunteers (optional)</label>
            <textarea id="volunteerNote" rows="3" placeholder="e.g. Please include your name in the GCash message. Thank you for supporting our missions!"></textarea>
          </div>
        </div>

        <div class="form-group" style="margin-top: 1.5rem; margin-bottom: 0;">
          <button type="submit" class="save-btn" id="saveDonationSetupBtn">
            <i class="bi bi-check-lg"></i> Save donation details
          </button>
        </div>
      </form>

      <div class="preview-note">
        <strong>Next step (later):</strong> a volunteer-facing donate page will show this QR and number as read-only so they can send money. This org page only configures receiving details.
      </div>
    </div>
  </main>

  <script>
  (function () {
    const STORAGE_KEY = "kalinga-org-donation-gcash";

    const form = document.getElementById("donationSetupForm");
    const qrInput = document.getElementById("donationQrInput");
    const qrPreview = document.getElementById("donationQrPreview");
    const qrImg = document.getElementById("donationQrImg");
    const saveBtn = document.getElementById("saveDonationSetupBtn");
    const accountEl = document.getElementById("gcashAccountName");
    const numberEl = document.getElementById("gcashNumber");
    const noteEl = document.getElementById("volunteerNote");

    let qrDataUrl = "";

    function loadSavedDonation() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);

        if (accountEl) accountEl.value = data.accountName || "";
        if (numberEl) numberEl.value = data.gcashNumber || "";
        if (noteEl) noteEl.value = data.note || "";

        if (data.qrImage && qrImg && qrPreview) {
          qrDataUrl = data.qrImage;
          qrImg.src = data.qrImage;
          qrPreview.hidden = false;
        }
      } catch (err) {
        console.warn("[WARN] Could not load saved donation details:", err);
      }
    }

    function saveDonationLocally(payload) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    qrInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file || !qrImg || !qrPreview) return;

      if (file.size > 900 * 1024) {
        alert("QR image is quite large. Please use a smaller PNG/JPG (under ~700 KB).");
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        qrDataUrl = ev.target.result || "";
        qrImg.src = qrDataUrl;
        qrPreview.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    document.querySelectorAll(".payment-method:not(.coming-soon)").forEach((method) => {
      method.addEventListener("click", () => {
        document.querySelectorAll(".payment-method:not(.coming-soon)").forEach((m) => {
          m.classList.remove("active");
        });
        method.classList.add("active");
      });
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const accountName = accountEl?.value?.trim() || "";
      const number = numberEl?.value?.trim() || "";
      const note = noteEl?.value?.trim() || "";

      if (!accountName) {
        alert("Please enter the GCash account name.");
        accountEl?.focus();
        return;
      }
      if (!number) {
        alert("Please enter your GCash number.");
        numberEl?.focus();
        return;
      }
      if (!qrDataUrl && qrPreview?.hidden) {
        alert("Please upload your GCash QR code so volunteers can scan it.");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

      const payload = {
        method: "gcash",
        accountName,
        gcashNumber: number,
        note,
        qrImage: qrDataUrl || "",
        savedAt: new Date().toISOString(),
      };

      try {
        saveDonationLocally(payload);
        alert("Donation details saved on this browser.\n\n(Not uploaded to Firebase yet.)");
      } catch (err) {
        console.error(err);
        alert(
          "Could not save. The QR image may be too large for browser storage. Try a smaller image."
        );
      }

      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save donation details';
    });

    loadSavedDonation();
  })();
</script>
</body>
</html>
