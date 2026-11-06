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
    .org-main-content.main-content { max-width: 960px; }
    .page-title { font-size: 1.45rem; font-weight: 700; color: #1e3a2f; margin: 0 0 0.35rem; }
    .meta { color: #64748b; margin-bottom: 1rem; }
    .panel {
      background: #fff; border-radius: 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 1.35rem 1.5rem; margin-bottom: 1.25rem;
    }
    .status-pill {
      display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
      background: #e2e8f0;
    }
    .status-pending_approval { background: #fef3c7; color: #92400e; }
    .status-published { background: #dcfce7; color: #166534; }
    .status-rejected, .status-closed { background: #fee2e2; color: #991b1b; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
    @media (max-width: 700px) { .stats { grid-template-columns: 1fr; } }
    .stat { background: #f8faf9; border-radius: 12px; padding: 1rem; text-align: center; }
    .stat strong { display: block; font-size: 1.25rem; color: #166534; }
    .progress-track { height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .progress-track span { display: block; height: 100%; background: #16a34a; width: 0; }
    #campaignCover { width: 100%; max-height: 320px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem; }
    .btn { border-radius: 10px; padding: 0.65rem 1rem; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none; display: inline-flex; }
    .btn-outline { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-primary { background: #16a34a; border: none; color: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th, td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #eef2f0; text-align: left; }
    .status-msg { margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 10px; background: #eff6ff; color: #1e40af; }
    .status-msg.is-error { background: #fef2f2; color: #991b1b; }
    .mode-chip {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
      background: #ecfdf5; color: #166534; margin-left: 0.35rem;
    }
    .goods-panel { margin-top: 1rem; }
    .goods-panel h3 { margin: 0 0 0.65rem; font-size: 0.95rem; color: #166534; }
    .goods-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
    .goods-list li {
      display: flex; justify-content: space-between; gap: 0.75rem; align-items: center;
      padding: 0.65rem 0.8rem; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8faf9;
      font-size: 0.9rem;
    }
    .goods-list strong { color: #111827; }
    .money-progress-wrap[hidden], .goods-panel[hidden] { display: none !important; }
  </style>
</head>
<body class="org-app" data-campaign-id="{{ $campaignId }}">
  @include('partials.org-sidebar', ['activeNav' => 'donation'])

  <main class="org-main-content main-content">
    <p><a href="/donation" style="color:#15803d;font-weight:600;text-decoration:none">← Donation Center</a></p>
    <div id="campaignDetailsStatus" class="status-msg" hidden></div>
    <img id="campaignCover" alt="Campaign cover" hidden>
    <h1 class="page-title" id="campaignTitle">Campaign</h1>
    <div class="meta">
      <span id="campaignCategory"></span> ·
      <span id="campaignStatus" class="status-pill"></span>
      <span id="campaignMode" class="mode-chip">Money</span> ·
      <span id="campaignDates"></span>
    </div>
    <div class="panel">
      <p id="campaignDescription" style="white-space:pre-wrap;line-height:1.55;margin:0"></p>
      <p style="margin:1rem 0 0;color:#64748b">Related mission: <strong id="campaignMission">—</strong></p>
      <div class="stats" id="moneyStats">
        <div class="stat"><strong id="raisedAmount">₱0.00</strong>Raised</div>
        <div class="stat"><strong id="targetAmount">₱0.00</strong>Target</div>
        <div class="stat"><strong id="donorCount">0</strong>Donors</div>
      </div>
      <div class="money-progress-wrap" id="moneyProgressWrap">
        <div class="progress-track"><span id="progressFill"></span></div>
        <p id="progressLabel" style="margin:0.5rem 0 0;color:#64748b;font-size:0.9rem">0% funded</p>
      </div>
      <div class="goods-panel" id="goodsPanel" hidden>
        <h3>Goods needed</h3>
        <ul class="goods-list" id="goodsList"></ul>
      </div>
      <div class="actions" id="campaignActions"></div>
    </div>

    <div class="panel">
      <h2 style="margin:0 0 1rem;font-size:1.1rem;color:#166534">Donation transactions</h2>
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
    </div>
  </main>
</body>
</html>
