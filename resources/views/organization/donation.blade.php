<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donations - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/organization-donations.js'
  ])
  @include('partials.org-layout-styles')
  <style>
    html, body.org-app {
      height: 100%;
      overflow: hidden;
      background: #f3f4f6;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.donation-page {
      margin-left: 260px;
      max-width: none;
      width: calc(100% - 260px);
      height: 100vh;
      min-height: 100vh;
      padding: 0;
      background: #f3f4f6;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .donation-page__header {
      background: #166534;
      color: #fff;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-shrink: 0;
    }
    .donation-page__header i { font-size: 1rem; }
    .donation-page__header-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .donation-page__header-title span { opacity: 0.85; font-weight: 500; }
    .donation-page__body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.5rem 1.5rem 2.25rem;
    }
    .page-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.15rem;
    }
    .page-top h1 {
      margin: 0 0 0.3rem;
      font-size: 1.85rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .page-top p {
      margin: 0;
      color: #6b7280;
      font-size: 0.95rem;
      line-height: 1.45;
      max-width: 42rem;
    }
    .btn-primary, .btn-secondary, .btn-ghost, .btn-table {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border-radius: 10px;
      font-weight: 650;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      border: none;
      white-space: nowrap;
    }
    .btn-primary {
      background: #166534;
      color: #fff;
      padding: 0.7rem 1.05rem;
      font-size: 0.92rem;
    }
    .btn-primary:hover { background: #14532d; color: #fff; }
    .btn-secondary {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 0.55rem 0.9rem;
      font-size: 0.88rem;
    }
    .btn-secondary:hover { background: #f9fafb; }
    .btn-table {
      background: #fff;
      color: #166534;
      border: 1px solid #86efac;
      padding: 0.4rem 0.75rem;
      font-size: 0.82rem;
    }
    .btn-table.solid {
      background: #166534;
      color: #fff;
      border-color: #166534;
    }
    .btn-table.solid:hover { background: #14532d; color: #fff; }
    .btn-icon {
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #6b7280;
      cursor: pointer;
    }
    .btn-icon:hover { background: #f9fafb; color: #111827; }

    .paymongo-card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.85rem 1rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1rem 1.15rem;
      margin-bottom: 1.15rem;
    }
    .paymongo-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.1rem;
    }
    .paymongo-card__icon.is-off {
      background: #fee2e2;
      color: #b91c1c;
    }
    .paymongo-card__copy { flex: 1; min-width: 220px; }
    .paymongo-card__copy strong {
      display: block;
      font-size: 0.98rem;
      color: #111827;
      margin-bottom: 0.15rem;
    }
    .paymongo-card__copy span {
      color: #6b7280;
      font-size: 0.88rem;
    }
    .paymongo-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: #dcfce7;
      color: #166534;
    }
    .paymongo-badge.is-off {
      background: #fee2e2;
      color: #991b1b;
    }
    .paymongo-edit {
      width: 100%;
      display: none;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: end;
      padding-top: 0.85rem;
      border-top: 1px solid #f3f4f6;
      margin-top: 0.15rem;
    }
    .paymongo-edit.is-open { display: flex; }
    .paymongo-edit label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.3rem;
    }
    .paymongo-edit input {
      min-width: min(100%, 320px);
      width: 320px;
      max-width: 100%;
      padding: 0.6rem 0.8rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font: inherit;
    }
    .paymongo-edit input:focus {
      outline: none;
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.9rem;
      margin-bottom: 1.15rem;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.05rem 1.15rem;
    }
    .stat-card .label {
      margin: 0;
      color: #6b7280;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .stat-card .value {
      margin: 0.45rem 0 0.2rem;
      font-size: 1.55rem;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .stat-card .hint {
      margin: 0;
      color: #9ca3af;
      font-size: 0.82rem;
    }

    .campaigns-panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.15rem 1.2rem 1.25rem;
    }
    .campaigns-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 1rem;
    }
    .campaigns-panel__head h2 {
      margin: 0 0 0.2rem;
      font-size: 1.15rem;
      color: #111827;
      font-weight: 750;
    }
    .campaigns-panel__head p {
      margin: 0;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .filter-pills {
      display: inline-flex;
      background: #f3f4f6;
      border-radius: 999px;
      padding: 0.2rem;
      gap: 0.15rem;
    }
    .filter-pills button {
      border: none;
      background: transparent;
      color: #6b7280;
      font-weight: 650;
      font-size: 0.82rem;
      font-family: inherit;
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      cursor: pointer;
    }
    .filter-pills button.active {
      background: #166534;
      color: #fff;
    }
    .table-wrap { overflow-x: auto; }
    table.campaigns-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    table.campaigns-table th,
    table.campaigns-table td {
      padding: 0.95rem 0.65rem;
      border-bottom: 1px solid #f3f4f6;
      text-align: left;
      vertical-align: middle;
    }
    table.campaigns-table th {
      color: #9ca3af;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .campaign-title {
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.35rem;
    }
    .category-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      background: #f3e8ff;
      color: #6b21a8;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: #e5e7eb;
      color: #374151;
    }
    .status-published { background: #dcfce7; color: #166534; }
    .status-pending_approval { background: #fef3c7; color: #92400e; }
    .status-draft { background: #f3f4f6; color: #4b5563; }
    .status-rejected, .status-closed { background: #fee2e2; color: #991b1b; }
    .progress-line {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 160px;
    }
    .progress-bar {
      flex: 1;
      height: 7px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
      min-width: 90px;
    }
    .progress-bar span {
      display: block;
      height: 100%;
      background: #16a34a;
    }
    .progress-pct {
      color: #6b7280;
      font-size: 0.82rem;
      font-weight: 600;
      min-width: 2.2rem;
    }
    .progress-amounts {
      margin-bottom: 0.35rem;
      color: #374151;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .date-main { font-weight: 650; color: #111827; }
    .date-sub { color: #9ca3af; font-size: 0.82rem; margin-top: 0.15rem; }
    .row-actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      position: relative;
    }
    .more-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 4px);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      min-width: 140px;
      z-index: 5;
      padding: 0.35rem;
      display: none;
    }
    .more-menu.is-open { display: block; }
    .more-menu a, .more-menu button {
      display: block;
      width: 100%;
      text-align: left;
      border: none;
      background: transparent;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      color: #374151;
      font: inherit;
      font-weight: 600;
      font-size: 0.85rem;
      text-decoration: none;
      cursor: pointer;
    }
    .more-menu a:hover, .more-menu button:hover { background: #f3f4f6; }
    .share-cta {
      margin-top: 1rem;
      border: 1.5px dashed #cbd5e1;
      border-radius: 12px;
      padding: 1rem 1.1rem;
      display: none;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
      background: #fafafa;
    }
    .share-cta.is-visible { display: flex; }
    .share-cta p {
      margin: 0;
      color: #4b5563;
      font-size: 0.9rem;
      line-height: 1.45;
      max-width: 40rem;
    }
    .empty-state {
      text-align: center;
      color: #6b7280;
      padding: 2rem 1rem;
    }
    @media (max-width: 1100px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 768px) {
      .org-main-content.main-content.donation-page {
        margin-left: 0;
        width: 100%;
      }
      .stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'donation'])

  <main class="org-main-content main-content donation-page" id="mainContent">
    <header class="donation-page__header">
      <i class="bi bi-heart-fill" aria-hidden="true"></i>
      <p class="donation-page__header-title">Kalinga <span>/ Donation Center</span></p>
    </header>

    <div class="donation-page__body">
      <div class="page-top">
        <div>
          <h1>Donations</h1>
          <p>Run fundraising campaigns for your organization. Payments go directly to your PayMongo account.</p>
        </div>
        <a class="btn-primary" href="/donation/campaigns/create">
          <i class="bi bi-plus-lg"></i> Create campaign
        </a>
      </div>

      <section class="paymongo-card" id="paymongoCard">
        <div class="paymongo-card__icon" id="paymongoIcon"><i class="bi bi-shield-check"></i></div>
        <div class="paymongo-card__copy">
          <strong id="paymongoTitle">PayMongo account not connected</strong>
          <span id="paymongoHelp">Connect your Linked Account so donations settle to your organization — not Kalinga.</span>
        </div>
        <span class="paymongo-badge is-off" id="paymongoStatusBadge">Not connected</span>
        <button type="button" class="btn-secondary" id="editPaymongoBtn">Connect account</button>
        <form id="paymongoForm" class="paymongo-edit">
          <div>
            <label for="paymongoLinkedAccountId">Linked Account ID</label>
            <input id="paymongoLinkedAccountId" type="text" placeholder="acct_test_…" autocomplete="off">
          </div>
          <button type="submit" class="btn-primary" id="savePaymongoBtn">Save account</button>
        </form>
      </section>

      <section class="stats">
        <article class="stat-card">
          <p class="label">Total raised</p>
          <p class="value" id="totalDonations">₱0.00</p>
          <p class="hint" id="totalHint">Across all campaigns</p>
        </article>
        <article class="stat-card">
          <p class="label">This month</p>
          <p class="value" id="thisMonth">₱0.00</p>
          <p class="hint" id="monthHint">—</p>
        </article>
        <article class="stat-card">
          <p class="label">Donors</p>
          <p class="value" id="donorsCount">0</p>
          <p class="hint" id="donorsHint">No donations yet</p>
        </article>
        <article class="stat-card">
          <p class="label">Active campaigns</p>
          <p class="value" id="activeCampaigns">0</p>
          <p class="hint" id="activeHint">0 published</p>
        </article>
      </section>

      <section class="campaigns-panel">
        <div class="campaigns-panel__head">
          <div>
            <h2>Campaigns</h2>
            <p>Draft, submit for admin approval, and track progress.</p>
          </div>
          <div class="filter-pills" role="tablist" aria-label="Campaign filters">
            <button type="button" class="active" data-campaign-filter="all">All</button>
            <button type="button" data-campaign-filter="published">Published</button>
            <button type="button" data-campaign-filter="drafts">Drafts</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="campaigns-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="campaignsTableBody">
              <tr><td colspan="5" class="empty-state">Loading…</td></tr>
            </tbody>
          </table>
        </div>

        <div class="share-cta" id="shareCta">
          <p>Share your campaign to get your first donation. Send the link to your members and post it on your page.</p>
          <button type="button" class="btn-primary" id="copyPrimaryCampaignLink">
            <i class="bi bi-link-45deg"></i> Copy campaign link
          </button>
        </div>
      </section>
    </div>
  </main>
</body>
</html>
