<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ !empty($campaignId) ? 'Edit' : 'Create' }} Campaign - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/organization-campaign-form.js'
  ])
  @include('partials.org-layout-styles')
  <style>
    html, body.org-app {
      height: 100%;
      overflow: hidden;
      background: #f3f4f6;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.campaign-form-page {
      margin-left: 210px;
      max-width: none;
      width: calc(100% - 210px);
      height: 100vh;
      min-height: 100vh;
      padding: 0;
      background: #f3f4f6;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .campaign-topbar {
      background: #166534;
      color: #fff;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-shrink: 0;
    }
    .campaign-topbar i { font-size: 1rem; }
    .campaign-topbar p { margin: 0; font-size: 0.95rem; font-weight: 600; }
    .campaign-topbar span { opacity: 0.85; font-weight: 500; }
    .campaign-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem 1.5rem 1.25rem;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #166534;
      font-weight: 650;
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
      margin: 0 0 0.3rem;
      font-size: 1.85rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      margin: 0 0 1.25rem;
      color: #6b7280;
      font-size: 0.95rem;
    }
    .status-msg {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: #eff6ff;
      color: #1e40af;
    }
    .status-msg.is-error { background: #fef2f2; color: #991b1b; }
    .form-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
      gap: 1.15rem;
      align-items: start;
    }
    .form-main { min-width: 0; }
    .form-side {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.2rem 1.25rem;
      margin-bottom: 1rem;
    }
    .card h2 {
      margin: 0 0 1rem;
      font-size: 1.05rem;
      font-weight: 750;
      color: #111827;
    }
    .form-group { margin-bottom: 1rem; }
    .form-group:last-child { margin-bottom: 0; }
    .form-group label {
      display: block;
      font-weight: 650;
      margin-bottom: 0.4rem;
      color: #374151;
      font-size: 0.9rem;
    }
    .field-hint {
      margin: 0 0 0.45rem;
      color: #9ca3af;
      font-size: 0.82rem;
    }
    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.7rem 0.85rem;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font: inherit;
      box-sizing: border-box;
      background: #fff;
      color: #111827;
    }
    .form-group textarea { min-height: 110px; resize: vertical; }
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
    }
    .char-count {
      text-align: right;
      color: #9ca3af;
      font-size: 0.78rem;
      margin-top: 0.35rem;
    }
    .upload-box {
      border: 1.5px dashed #86efac;
      border-radius: 12px;
      padding: 1.5rem 1rem;
      background: #f0fdf4;
      text-align: center;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .upload-box.is-dragover {
      background: #dcfce7;
      border-color: #16a34a;
    }
    .upload-box i {
      font-size: 1.5rem;
      color: #16a34a;
      display: block;
      margin-bottom: 0.45rem;
    }
    .upload-box strong {
      display: block;
      color: #166534;
      font-size: 0.92rem;
      margin-bottom: 0.2rem;
    }
    .upload-box span {
      color: #6b7280;
      font-size: 0.8rem;
    }
    .upload-box input { display: none; }
    #coverPreview {
      margin-top: 0.85rem;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #dbe3ea;
    }
    #coverPreview img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
    }
    .amount-wrap {
      display: flex;
      align-items: center;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .amount-wrap:focus-within {
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
    }
    .amount-prefix {
      padding: 0.7rem 0.75rem;
      background: #f9fafb;
      color: #6b7280;
      font-weight: 700;
      border-right: 1px solid #e5e7eb;
    }
    .amount-wrap input {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding-left: 0.85rem;
    }
    .amount-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.65rem;
    }
    .amount-pills button {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #374151;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 650;
      font-family: inherit;
      cursor: pointer;
    }
    .amount-pills button:hover,
    .amount-pills button.active {
      border-color: #86efac;
      background: #f0fdf4;
      color: #166534;
    }
    .mode-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .mode-pills button {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #374151;
      border-radius: 999px;
      padding: 0.45rem 0.9rem;
      font-size: 0.86rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
    }
    .mode-pills button.active {
      border-color: #166534;
      background: #166534;
      color: #fff;
    }
    .needs-copy h3 {
      margin: 0 0 0.35rem;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .needs-copy p {
      margin: 0 0 1rem;
      color: #64748b;
      font-size: 0.95rem;
    }
    .need-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
    }
    .need-tag {
      border: 1px solid #dbe3ee;
      background: #fff;
      color: #0f172a;
      border-radius: 999px;
      padding: 0.72rem 1.15rem;
      font-size: 0.95rem;
      font-weight: 650;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .need-tag:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }
    .need-tag.is-active {
      border-color: #166534;
      background: #166534;
      color: #fff;
      box-shadow: none;
    }
    .need-quantities {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 1rem;
    }
    .need-quantities[hidden] { display: none !important; }
    .need-qty-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 0.65rem;
      align-items: center;
      padding: 0.7rem 0.85rem;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f8fafc;
    }
    .need-qty-row strong {
      color: #0f172a;
      font-size: 0.92rem;
    }
    .need-qty-controls {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .need-qty-controls input {
      width: 100%;
      padding: 0.5rem 0.65rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font: inherit;
    }
    .need-qty-controls span {
      color: #64748b;
      font-size: 0.8rem;
      white-space: nowrap;
      min-width: 3.5rem;
    }
    @media (max-width: 700px) {
      .need-qty-row { grid-template-columns: 1fr; }
    }
    .preview-goods {
      margin: 0.75rem 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .preview-goods li {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      color: #4b5563;
      font-size: 0.84rem;
    }
    .preview-goods strong { color: #111827; }
    .money-block[hidden],
    .goods-block[hidden],
    .pay-card[hidden] { display: none !important; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }
    @media (max-width: 700px) {
      .inkind-row { grid-template-columns: 1fr; }
    }
    .pay-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1rem 1.15rem;
      margin-bottom: 0;
    }
    .pay-card__icon {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pay-card__icon.is-off {
      background: #fee2e2;
      color: #b91c1c;
    }
    .pay-card__copy { flex: 1; min-width: 0; }
    .pay-card__copy strong {
      display: block;
      font-size: 0.92rem;
      color: #111827;
      margin-bottom: 0.15rem;
    }
    .pay-card__copy span {
      color: #6b7280;
      font-size: 0.84rem;
    }
    .pay-card a {
      color: #166534;
      font-weight: 700;
      text-decoration: none;
      font-size: 0.88rem;
      flex-shrink: 0;
    }
    .pay-card a:hover { text-decoration: underline; }

    .preview-card h2,
    .steps-card h2 {
      margin-bottom: 0.85rem;
    }
    .preview-cover {
      height: 140px;
      border-radius: 12px;
      background: #dcfce7;
      color: #166534;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 650;
      font-size: 0.9rem;
      overflow: hidden;
      margin-bottom: 0.85rem;
    }
    .preview-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .preview-chip {
      display: inline-flex;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: #ede9fe;
      color: #5b21b6;
      font-size: 0.72rem;
      font-weight: 700;
      margin-bottom: 0.45rem;
    }
    .preview-title {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      font-weight: 750;
      color: #111827;
      line-height: 1.35;
      word-break: break-word;
    }
    .preview-progress-track {
      height: 8px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.45rem;
    }
    .preview-progress-track span {
      display: block;
      height: 100%;
      width: 0;
      background: #16a34a;
    }
    .preview-raised {
      margin: 0;
      color: #6b7280;
      font-size: 0.84rem;
    }
    .steps-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .steps-list li {
      display: flex;
      gap: 0.7rem;
      align-items: flex-start;
      color: #4b5563;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .steps-list .num {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: #166534;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .steps-list .num.is-muted { background: #d1d5db; color: #374151; }
    .steps-list strong { color: #111827; }

    .campaign-footer {
      flex-shrink: 0;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      padding: 0.9rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
    }
    .campaign-footer p {
      margin: 0;
      color: #9ca3af;
      font-size: 0.84rem;
    }
    .footer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }
    .btn {
      border-radius: 10px;
      padding: 0.65rem 1.05rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      font-size: 0.9rem;
    }
    .btn-cancel {
      background: #fff;
      border: 1px solid #d1d5db;
      color: #374151;
    }
    .btn-draft {
      background: #fff;
      border: 1px solid #86efac;
      color: #166534;
    }
    .btn-submit {
      background: #166534;
      border: 1px solid #166534;
      color: #fff;
    }
    .btn-submit:hover { background: #14532d; color: #fff; }
    .btn:disabled { opacity: 0.65; cursor: not-allowed; }

    @media (max-width: 1100px) {
      .form-layout { grid-template-columns: 1fr; }
      .form-side { position: static; }
    }
    @media (max-width: 768px) {
      .org-main-content.main-content.campaign-form-page {
        margin-left: 0;
        width: 100%;
      }
      .grid-2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body class="org-app" @if(!empty($campaignId)) data-campaign-id="{{ $campaignId }}" @endif>
  @include('partials.org-sidebar', ['activeNav' => 'donation'])

  <main class="org-main-content main-content campaign-form-page">
    <div class="campaign-scroll">
      <a class="back-link" href="/donation">← Back to Donations</a>
      <h1 class="page-title">{{ !empty($campaignId) ? 'Edit campaign' : 'Create campaign' }}</h1>
      <p class="page-subtitle">Campaigns are reviewed by an admin before volunteers can donate.</p>
      <div id="campaignFormStatus" class="status-msg" hidden></div>

      <form id="campaignForm">
        <div class="form-layout">
          <div class="form-main">
            <section class="card">
              <h2>Campaign details</h2>
              <div class="form-group">
                <label for="title">Campaign title</label>
                <input id="title" name="title" type="text" required maxlength="120" placeholder="Medical Mission for Cebu Communities">
              </div>
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" name="category" required>
                  <option value="">Select a category</option>
                  <option value="Medical Mission">Medical Mission</option>
                  <option value="Disaster Relief">Disaster Relief</option>
                  <option value="Education">Education</option>
                  <option value="Environment">Environment</option>
                  <option value="Community">Community</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div class="form-group">
                <label for="description">Description</label>
                <p class="field-hint">Tell donors what this campaign will fund.</p>
                <textarea id="description" name="description" required maxlength="500" placeholder="Help provide medical supplies…"></textarea>
                <div class="char-count"><span id="descCount">0</span> / 500</div>
              </div>
              <div class="form-group">
                <label for="coverImage">Cover image</label>
                <div class="upload-box" id="coverDropzone">
                  <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                  <strong>Drag a photo here, or browse</strong>
                  <span>PNG or JPG · Recommended 1200 × 675 px</span>
                  <input id="coverImage" type="file" accept="image/png,image/jpeg,image/webp">
                </div>
                <div id="coverPreview" hidden></div>
              </div>
            </section>

            <section class="card">
              <h2>What to collect</h2>
              <p class="field-hint" style="margin-top:-0.35rem">Choose money, goods, or both.</p>
              <div class="mode-pills" id="donationModePills" role="group" aria-label="Donation type">
                <button type="button" class="active" data-donation-mode="money">Money</button>
                <button type="button" data-donation-mode="goods">Goods</button>
                <button type="button" data-donation-mode="both">Money &amp; goods</button>
              </div>
              <input type="hidden" id="donationMode" value="money">

              <div class="money-block" id="moneyBlock">
                <div class="form-group">
                  <label for="targetAmount">Target donation amount</label>
                  <div class="amount-wrap">
                    <span class="amount-prefix">₱</span>
                    <input id="targetAmount" name="targetAmount" type="text" inputmode="decimal" placeholder="50,000.00" autocomplete="off">
                  </div>
                  <div class="amount-pills" id="amountPills">
                    <button type="button" data-amount="10000">₱10,000</button>
                    <button type="button" data-amount="25000">₱25,000</button>
                    <button type="button" data-amount="50000">₱50,000</button>
                    <button type="button" data-amount="100000">₱100,000</button>
                  </div>
                </div>
              </div>

              <div class="goods-block" id="goodsBlock" hidden>
                <div class="needs-copy">
                  <h3>What else do you need?</h3>
                  <p>Pick what people can bring or send, and how much of it.</p>
                </div>
                <div class="need-tags" id="inKindTags" role="group" aria-label="Needed goods"></div>
                <div class="need-quantities" id="inKindQuantities" hidden></div>
              </div>
            </section>

            <section class="card">
              <h2>Goal and schedule</h2>
              <div class="grid-2">
                <div class="form-group">
                  <label for="startDate">Start date</label>
                  <input id="startDate" name="startDate" type="date" required>
                </div>
                <div class="form-group">
                  <label for="endDate">End date</label>
                  <input id="endDate" name="endDate" type="date" required>
                </div>
              </div>
              <div class="form-group">
                <label for="relatedMissionId">Related mission (optional)</label>
                <select id="relatedMissionId" name="relatedMissionId">
                  <option value="">None</option>
                </select>
                <p class="field-hint" style="margin-top:0.45rem;margin-bottom:0">
                  Link this campaign to a mission so donors can see where their help goes.
                </p>
              </div>
            </section>

            <section class="pay-card" id="paymongoCard">
              <div class="pay-card__icon" id="paymongoIcon"><i class="bi bi-shield-check"></i></div>
              <div class="pay-card__copy">
                <strong id="paymongoTitle">Payments go to your organization.</strong>
                <span id="paymongoHelp">Connect a PayMongo Linked Account in Donation Center before submitting.</span>
              </div>
              <a href="/donation" id="paymongoChangeLink">Change</a>
            </section>
          </div>

          <aside class="form-side">
            <section class="card preview-card">
              <h2>Campaign preview</h2>
              <div class="preview-cover" id="liveCoverPreview">Cover image preview</div>
              <div class="preview-chip" id="liveCategory">Category</div>
              <p class="preview-title" id="liveTitle">Your campaign title</p>
              <div class="preview-progress-track" id="liveMoneyProgressWrap"><span id="liveProgress"></span></div>
              <p class="preview-raised" id="liveMoneyLine">₱0 raised of <span id="liveTarget">₱0</span></p>
              <ul class="preview-goods" id="liveGoodsList" hidden></ul>
            </section>

            <section class="card steps-card">
              <h2>What happens next</h2>
              <ol class="steps-list">
                <li>
                  <span class="num">1</span>
                  <div><strong>Submit</strong> your campaign for review.</div>
                </li>
                <li>
                  <span class="num is-muted">2</span>
                  <div>An <strong>admin approves</strong> it.</div>
                </li>
                <li>
                  <span class="num is-muted">3</span>
                  <div>It goes <strong>live</strong> and volunteers can donate.</div>
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </form>
    </div>

    <footer class="campaign-footer">
      <p id="requiredHint">Required: title, description, dates, and money and/or goods targets</p>
      <div class="footer-actions">
        <a class="btn btn-cancel" href="/donation">Cancel</a>
        <button type="submit" form="campaignForm" class="btn btn-draft" id="saveDraftBtn" data-mode="draft">Save as draft</button>
        <button type="submit" form="campaignForm" class="btn btn-submit" id="submitCampaignBtn" data-mode="submit">Submit for approval</button>
      </div>
    </footer>
  </main>
</body>
</html>
