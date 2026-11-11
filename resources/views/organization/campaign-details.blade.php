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
      background: #f3f4f6;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.campaign-details-page {
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
    .page-title {
      margin: 0 0 0.45rem;
      font-size: 1.85rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem 0.55rem;
      color: #64748b;
      margin-bottom: 1.15rem;
      font-size: 0.92rem;
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
      grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.85fr);
      gap: 1.15rem;
      align-items: start;
    }
    .panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      padding: 1.25rem 1.35rem;
      margin-bottom: 1rem;
    }
    .panel h2 {
      margin: 0 0 1rem;
      font-size: 1.05rem;
      font-weight: 750;
      color: #111827;
    }
    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
    }
    .status-pending_approval { background: #fef3c7; color: #92400e; }
    .status-published { background: #dcfce7; color: #166534; }
    .status-rejected, .status-closed { background: #fee2e2; color: #991b1b; }
    .mode-chip {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #ecfdf5;
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
      line-height: 1.55;
      margin: 0;
      color: #374151;
      font-size: 0.98rem;
    }
    .mission-line {
      margin: 1rem 0 0;
      color: #64748b;
      font-size: 0.92rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.85rem;
      margin: 1.15rem 0;
    }
    .stat {
      background: #f8faf9;
      border: 1px solid #eef2f0;
      border-radius: 12px;
      padding: 1rem;
      text-align: center;
    }
    .stat strong {
      display: block;
      font-size: 1.25rem;
      color: #166534;
      margin-bottom: 0.2rem;
    }
    .stat span {
      color: #64748b;
      font-size: 0.85rem;
    }
    .progress-track {
      height: 10px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-track span {
      display: block;
      height: 100%;
      background: #16a34a;
      width: 0;
    }
    .progress-label {
      margin: 0.5rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
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
    .side-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: sticky;
      top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    th, td {
      padding: 0.8rem 0.55rem;
      border-bottom: 1px solid #eef2f0;
      text-align: left;
    }
    th {
      color: #64748b;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }
    .money-progress-wrap[hidden],
    .goods-panel[hidden],
    #moneyStats[hidden] { display: none !important; }
    @media (max-width: 1100px) {
      .details-layout { grid-template-columns: 1fr; }
      .side-stack { position: static; }
    }
    @media (max-width: 700px) {
      .stats { grid-template-columns: 1fr; }
      .campaign-scroll { padding: 1rem; }
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

  <main class="org-main-content main-content campaign-details-page" id="mainContent">
    <header class="campaign-topbar">
      <i class="bi bi-heart-fill" aria-hidden="true"></i>
      <p>Kalinga <span>/ Campaign details</span></p>
    </header>

    <div class="campaign-scroll">
      <a class="back-link" href="/donation">← Donation Center</a>
      <div id="campaignDetailsStatus" class="status-msg" hidden></div>

      <h1 class="page-title" id="campaignTitle">Campaign</h1>
      <div class="meta">
        <span id="campaignCategory"></span>
        <span id="campaignStatus" class="status-pill"></span>
        <span id="campaignMode" class="mode-chip">Money</span>
        <span id="campaignDates"></span>
      </div>

      <div class="details-layout">
        <div>
          <section class="panel">
            <div class="cover-wrap">
              <img id="campaignCover" alt="Campaign cover" hidden>
            </div>
            <p class="description" id="campaignDescription"></p>
            <p class="mission-line">Related mission: <strong id="campaignMission">—</strong></p>

            <div class="stats" id="moneyStats">
              <div class="stat"><strong id="raisedAmount">₱0.00</strong><span>Raised</span></div>
              <div class="stat"><strong id="targetAmount">₱0.00</strong><span>Target</span></div>
              <div class="stat"><strong id="donorCount">0</strong><span>Donors</span></div>
            </div>

            <div class="money-progress-wrap" id="moneyProgressWrap">
              <div class="progress-track"><span id="progressFill"></span></div>
              <p class="progress-label" id="progressLabel">0% funded</p>
            </div>

            <div class="goods-panel" id="goodsPanel" hidden>
              <h3>Goods needed</h3>
              <ul class="goods-list" id="goodsList"></ul>
            </div>

            <div class="actions" id="campaignActions"></div>
          </section>
        </div>

        <aside class="side-stack">
          <section class="panel">
            <h2>Donation transactions</h2>
            <div style="overflow-x:auto">
              <table>
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>When</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody id="donationsTableBody">
                  <tr><td colspan="5" class="text-center">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </main>
</body>
</html>
