<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campaign Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/organization-campaign-details.js'
  ])
  @include('partials.org-layout-styles')
  <style>
    html, body.org-app {
      height: 100%;
      overflow: hidden;
      background: #effff4;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.campaign-details-page {
      margin-left: 210px;
      max-width: none;
      width: calc(100% - 210px);
      height: 100vh;
      min-height: 100vh;
      padding: 65px 0 0;
      background: #effff4;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .campaign-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem 1.5rem 1.5rem;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #166534;
      font-weight: 650;
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 0.85rem;
    }
    .back-link:hover { text-decoration: underline; }
    .page-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.1rem;
    }
    .page-title {
      margin: 0 0 0.45rem;
      font-size: 1.85rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.55rem;
      color: #6b7280;
      margin: 0;
      font-size: 0.92rem;
    }
    #campaignCategory:empty { display: none; }
    #campaignCategory:not(:empty) {
      color: #374151;
      font-weight: 500;
      margin-right: 0.15rem;
    }
    .status-msg {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: #eff6ff;
      color: #1e40af;
    }
    .status-msg.is-error { background: #fef2f2; color: #991b1b; }
    .details-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.9fr);
      gap: 1.15rem;
      align-items: start;
    }
    .panel {
      background: #fff;
      border: 1px solid #e7ebe9;
      border-radius: 16px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      padding: 1.35rem 1.4rem 1.2rem;
      margin-bottom: 0;
    }
    .panel h2 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 750;
      color: #111827;
    }
    .status-pill {
      display: inline-block;
      padding: 0.18rem 0.6rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 650;
      background: #e2e8f0;
      color: #334155;
    }
    .status-pending_approval { background: #fef3c7; color: #92400e; }
    .status-published { background: #dcfce7; color: #166534; }
    .status-rejected, .status-closed { background: #fee2e2; color: #991b1b; }
    .status-draft { background: #f3f4f6; color: #4b5563; }
    .mode-chip {
      display: inline-block;
      padding: 0.18rem 0.6rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 650;
      background: #ecfdf3;
      color: #166534;
    }
    .cover-wrap {
      margin-bottom: 1rem;
      border-radius: 14px;
      overflow: hidden;
      background: #e5e7eb;
      aspect-ratio: 16 / 7;
      max-height: 360px;
    }
    #campaignCover {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    #campaignCover[hidden] { display: none !important; }
    .cover-wrap:has(#campaignCover[hidden]) { display: none; }
    .description {
      white-space: pre-wrap;
      line-height: 1.5;
      margin: 0;
      color: #374151;
      font-size: 0.95rem;
    }
    .mission-line {
      margin: 0.85rem 0 0;
      color: #6b7280;
      font-size: 0.92rem;
    }
    .raised-kicker {
      margin: 0 0 0.35rem;
      color: #6b7280;
      font-size: 0.92rem;
    }
    .raised-line {
      margin: 0 0 0.8rem;
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.35rem 0.45rem;
    }
    .raised-line strong {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #111827;
      line-height: 1;
    }
    .raised-line > span {
      color: #6b7280;
      font-size: 0.98rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.35rem;
      margin: 1rem 0 0;
      background: #f4f6f5;
      border-radius: 12px;
      padding: 0.95rem 0.4rem;
    }
    .stat {
      text-align: center;
      padding: 0.1rem 0.25rem;
    }
    .stat strong {
      display: block;
      font-size: 1.02rem;
      font-weight: 750;
      color: #111827;
      margin-bottom: 0.12rem;
    }
    .stat span {
      color: #6b7280;
      font-size: 0.84rem;
    }
    .progress-track {
      height: 8px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-track span {
      display: block;
      height: 100%;
      background: #166534;
      width: 0;
      border-radius: 999px;
    }
    .about-block {
      margin-top: 1.15rem;
      padding-top: 1.1rem;
      border-top: 1px solid #eceeed;
    }
    .about-block h2 {
      margin: 0 0 0.45rem;
    }
    .summary-panel:not(:has(#moneyBlock:not([hidden]))):not(:has(#goodsPanel:not([hidden]))) .about-block {
      border-top: none;
      margin-top: 0;
      padding-top: 0;
    }
    .goods-panel { margin-top: 1.15rem; }
    .goods-panel h3 {
      margin: 0 0 0.65rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #166534;
    }
    .goods-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .goods-list li {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
      padding: 0.7rem 0.85rem;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f8faf9;
      font-size: 0.9rem;
    }
    .goods-list strong { color: #111827; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-top: 1.15rem;
    }
    .btn {
      border-radius: 10px;
      padding: 0.65rem 1rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .btn-outline {
      background: #fff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-primary {
      background: #16a34a;
      border: none;
      color: #fff;
    }
    .btn-add-update {
      background: #166534;
      border: none;
      color: #fff;
      border-radius: 12px;
      padding: 0.72rem 1.15rem;
      font-size: 0.95rem;
      font-weight: 650;
      flex-shrink: 0;
    }
    .btn-add-update:hover {
      background: #14532d;
      color: #fff;
    }
    .btn-add-update[hidden],
    .actions[hidden],
    #moneyBlock[hidden] { display: none !important; }
    .panel-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }
    .donation-total {
      color: #6b7280;
      font-size: 0.9rem;
      white-space: nowrap;
    }
    .donation-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .donation-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 0;
      border-bottom: 1px solid #eef1ef;
    }
    .donation-row:last-child { border-bottom: none; }
    .donor-avatar {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #e7f6ec;
      color: #166534;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .donor-avatar.is-anon {
      background: #f3f4f6;
      color: #9ca3af;
    }
    .donor-copy {
      flex: 1;
      min-width: 0;
    }
    .donor-copy strong {
      display: block;
      color: #111827;
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .donor-copy span {
      display: block;
      color: #6b7280;
      font-size: 0.82rem;
      margin-top: 0.1rem;
    }
    .donation-amount {
      font-weight: 700;
      color: #111827;
      font-size: 0.95rem;
      white-space: nowrap;
    }
    .donation-empty {
      color: #6b7280;
      font-size: 0.92rem;
      padding: 0.85rem 0 0.35rem;
    }
    .updates-panel {
      margin-top: 1rem;
    }
    .update-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 400;
      padding: 1rem;
    }
    .update-modal-overlay.is-open {
      display: flex;
    }
    .update-modal {
      width: min(760px, 100%);
      max-height: min(92vh, 900px);
      overflow: auto;
      background: #fff;
      border-radius: 16px;
      padding: 1.6rem 1.75rem 1.5rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    }
    .update-modal h2 {
      margin: 0 0 0.4rem;
      font-size: 1.35rem;
      color: #111827;
    }
    .update-modal__help {
      margin: 0 0 1.15rem;
      color: #64748b;
      font-size: 0.95rem;
    }
    .update-modal label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .update-modal textarea {
      width: 100%;
      min-height: 180px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font: inherit;
      font-size: 1rem;
      resize: vertical;
      margin-bottom: 1rem;
      box-sizing: border-box;
    }
    .update-modal textarea:focus {
      outline: none;
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
    }
    .update-photos-input {
      display: none;
    }
    .update-photo-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px dashed #86efac;
      background: #f0fdf4;
      color: #166534;
      border-radius: 10px;
      padding: 0.55rem 0.85rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      margin-bottom: 0.75rem;
    }
    .update-photo-picker:hover {
      background: #dcfce7;
    }
    .update-photo-previews {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    .update-photo-previews .preview {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      aspect-ratio: 1;
      background: #f8fafc;
    }
    .update-photo-previews img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .update-photo-previews button {
      position: absolute;
      top: 4px;
      right: 4px;
      border: none;
      background: rgba(15, 23, 42, 0.75);
      color: #fff;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
    }
    .update-modal-error {
      color: #b91c1c;
      font-size: 0.85rem;
      margin: 0 0 0.75rem;
      min-height: 1.1em;
    }
    .update-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
    }
    .update-modal-cancel {
      background: #fff;
      border: 1px solid #cbd5e1;
      color: #334155;
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .update-modal-save {
      background: #166534;
      border: none;
      color: #fff;
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .update-modal-save:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .side-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: sticky;
      top: 0;
    }
    .cover-wrap[hidden],
    .goods-panel[hidden] { display: none !important; }
    @media (max-width: 1100px) {
      .details-layout { grid-template-columns: 1fr; }
      .side-stack { position: static; }
    }
    @media (max-width: 700px) {
      .campaign-scroll { padding: 1rem; }
      .page-head { flex-direction: column; }
      .btn-add-update { width: 100%; justify-content: center; margin-top: 0; }
    }
    @media (max-width: 900px) {
      .org-main-content.main-content.campaign-details-page {
        margin-left: 0;
        width: 100%;
      }
    }
  </style>
</head>
<body class="org-app" data-campaign-id="{{ $campaignId }}">
  @include('partials.org-sidebar', ['activeNav' => 'donation'])
  @include('partials.org-topbar', ['pageTitle' => 'Campaign Details'])

  <main class="org-main-content main-content campaign-details-page" id="mainContent">
    <div class="campaign-scroll">
      <a class="back-link" href="/donation">← Back to donations</a>
      <div id="campaignDetailsStatus" class="status-msg" hidden></div>

      <div class="page-head">
        <div>
          <h2 class="page-title" id="campaignTitle">Campaign</h2>
          <div class="meta">
            <span id="campaignCategory"></span>
            <span id="campaignStatus" class="status-pill"></span>
            <span id="campaignMode" class="mode-chip">Money</span>
            <span id="campaignDates"></span>
          </div>
        </div>
        <button type="button" class="btn btn-add-update" id="addCampaignUpdateBtn" hidden>Add update</button>
      </div>

      <div class="details-layout">
        <section class="panel summary-panel">
          <div class="cover-wrap" hidden>
            <img id="campaignCover" alt="Campaign cover" hidden>
          </div>

          <div id="moneyBlock">
            <p class="raised-kicker">Raised so far</p>
            <p class="raised-line">
              <strong id="raisedAmount">₱0</strong>
              <span>of <span id="targetAmount">₱0</span> goal</span>
            </p>
            <div class="progress-track"><span id="progressFill"></span></div>
            <div class="stats" id="moneyStats">
              <div class="stat">
                <strong id="fundedPercent">0%</strong>
                <span>funded</span>
              </div>
              <div class="stat">
                <strong id="stillNeeded">₱0</strong>
                <span>still needed</span>
              </div>
              <div class="stat">
                <strong id="donorCount">0</strong>
                <span id="donorLabel">donors</span>
              </div>
            </div>
          </div>

          <div class="goods-panel" id="goodsPanel" hidden>
            <h3>Goods needed</h3>
            <ul class="goods-list" id="goodsList"></ul>
          </div>

          <div class="about-block">
            <h2>About this campaign</h2>
            <p class="description" id="campaignDescription"></p>
            <p class="mission-line">Related mission: <span id="campaignMission">none</span></p>
          </div>

          <div class="actions" id="campaignActions" hidden></div>
        </section>

        <aside class="side-stack">
          <section class="panel donations-panel">
            <div class="panel-head">
              <h2>Recent donations</h2>
              <span class="donation-total" id="donationTotal"></span>
            </div>
            <ul class="donation-list" id="donationsList">
              <li class="donation-empty">Loading…</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  </main>

  <div
    id="campaignUpdateModal"
    class="update-modal-overlay"
    hidden
    aria-modal="true"
    role="dialog"
    aria-labelledby="campaignUpdateModalTitle"
  >
    <div class="update-modal" role="document">
      <h2 id="campaignUpdateModalTitle">Add Update</h2>
      <p class="update-modal__help">
        Share how the campaign went — add a short story and photos from the field.
      </p>
      <label for="campaignUpdateText">What happened?</label>
      <textarea
        id="campaignUpdateText"
        placeholder="Describe how the campaign went, what was delivered, and the impact…"
        maxlength="4000"
      ></textarea>
      <label class="update-photo-picker" for="campaignUpdatePhotos">
        <i class="bi bi-image" aria-hidden="true"></i> Add pictures
      </label>
      <input
        id="campaignUpdatePhotos"
        class="update-photos-input"
        type="file"
        accept="image/*"
        multiple
      >
      <div class="update-photo-previews" id="campaignUpdatePhotoPreviews"></div>
      <p id="campaignUpdateError" class="update-modal-error" role="alert"></p>
      <div class="update-modal-actions">
        <button type="button" class="update-modal-cancel" id="campaignUpdateCancel">Cancel</button>
        <button type="button" class="update-modal-save" id="campaignUpdateSave">Post update</button>
      </div>
    </div>
  </div>
</body>
</html>
