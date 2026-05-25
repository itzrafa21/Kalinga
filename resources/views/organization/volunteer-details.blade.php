<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteer Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/volunteer-details.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .org-main-content.main-content { padding: 1.25rem 1.5rem 2rem; }

    .vd-page-head {
      margin-bottom: 1.25rem;
    }
    .vd-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #166534;
      text-decoration: none;
      margin-bottom: 0.65rem;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #c5d9ce;
      transition: background 0.2s, color 0.2s;
    }
    .vd-back:hover {
      background: #fff;
      color: #15803d;
    }
    .vd-page-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .vd-page-title i { color: #386b57; }

    #detailLoading {
      margin: 0 0 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    #detailLoading[hidden],
    #detailContent[hidden] {
      display: none !important;
    }
    .detail-loading-inner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #fff;
      border: 1px solid #d8e8df;
      border-radius: 12px;
    }
    .detail-loading-spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #386b57;
      border-radius: 50%;
      animation: detail-spin 1s linear infinite;
      flex-shrink: 0;
    }
    @keyframes detail-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .detail-loading-error {
      margin: 0;
      color: #b91c1c;
    }

    .vd-top-grid {
      display: grid;
      grid-template-columns: 1fr minmax(200px, 260px);
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      align-items: stretch;
    }
    @media (max-width: 768px) {
      .vd-top-grid { grid-template-columns: 1fr; }
    }

    .vd-profile-card {
      background: #fff;
      border: 1px solid #d8e8df;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
      overflow: hidden;
      position: relative;
    }
    .vd-profile-inner {
      display: flex;
      gap: 1.25rem;
      align-items: center;
      padding: 1.25rem 1.35rem 1.35rem;
    }
    @media (max-width: 540px) {
      .vd-profile-inner {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .vd-avatar-wrap {
      flex-shrink: 0;
      width: 88px;
      height: 88px;
      border-radius: 12px;
      overflow: hidden;
      background: #ecfdf5;
      border: 2px solid #c5d9ce;
      box-shadow: 0 2px 8px rgba(56, 107, 87, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vd-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .vd-avatar-img[hidden] {
      display: none !important;
    }
    .vd-avatar-wrap.has-photo .vd-avatar-initial { display: none; }
    .vd-avatar-initial {
      font-size: 1.65rem;
      font-weight: 700;
      color: #166534;
      letter-spacing: 0.02em;
    }

    .vd-profile-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .vd-profile-name {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e3a2f;
      line-height: 1.25;
    }
    .vd-profile-occupation {
      margin: 0;
      font-size: 0.88rem;
      color: #64748b;
    }
    .vd-profile-occupation[hidden] { display: none !important; }
    .vd-profile-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 0.15rem;
    }
    .vd-profile-email,
    .vd-profile-phone {
      margin: 0;
      font-size: 0.88rem;
      color: #475569;
      line-height: 1.45;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .vd-profile-email i,
    .vd-profile-phone i {
      font-size: 0.95rem;
      color: #386b57;
      flex-shrink: 0;
    }

    .vd-stat-card {
      background: #fff;
      border: 1px solid #d8e8df;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
      padding: 1.25rem 3.25rem 1.25rem 1.35rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      min-height: 140px;
    }
    .vd-stat-icon {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(56, 107, 87, 0.35);
      background: rgba(56, 107, 87, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      color: #386b57;
    }
    .vd-stat-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.65rem;
    }
    .vd-stat-metrics {
      display: flex;
      gap: 1.5rem;
      align-items: flex-end;
    }
    .vd-stat-metric {
      min-width: 0;
    }
    .vd-stat-value {
      font-size: 2.25rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.1;
      margin: 0;
    }
    .vd-stat-metric-label {
      margin: 0.2rem 0 0;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .vd-level-badge {
      display: inline-block;
      margin: 0 0 0.5rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .vd-level-badge[hidden] { display: none !important; }

    .vd-missions-panel {
      background: #fff;
      border: 1px solid #d8e8df;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
      overflow: hidden;
    }
    .vd-missions-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e8f3ec;
      background: #fafcfb;
    }
    .vd-missions-head h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1e3a2f;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .vd-missions-head h2 i { color: #386b57; }

    .table-wrap { overflow-x: auto; }

    #applicantMissionsTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    #applicantMissionsTable col.col-mission { width: 26%; }
    #applicantMissionsTable col.col-date { width: 14%; }
    #applicantMissionsTable col.col-desc { width: 42%; }
    #applicantMissionsTable col.col-action { width: 18%; }
    #applicantMissionsTable th,
    #applicantMissionsTable td {
      padding: 10px 14px;
      font-size: 12px;
      vertical-align: middle;
      text-align: left;
    }
    #applicantMissionsTable thead th {
      padding: 12px 14px;
      background: #386b57;
      font-weight: 600;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-size: 12px;
      border-bottom: 2px solid #163d30;
    }
    #applicantMissionsTable thead th.col-action,
    #applicantMissionsTable tbody td.col-action {
      text-align: center;
    }
    #applicantMissionsTable tbody td {
      border-bottom: 1px solid #e8f3ec;
      background: #fff;
      color: #374151;
    }
    #applicantMissionsTable tbody tr:nth-child(even) td {
      background: #f6faf8;
    }
    #applicantMissionsTable tbody tr:hover td {
      background: #eef6f1;
    }
    .mission-name-link {
      color: #166534;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      text-decoration: none;
    }
    .mission-name-link:hover {
      color: #15803d;
      text-decoration: underline;
    }
    .mission-date-main {
      font-size: 12px;
      font-weight: 500;
      color: #1e3a2f;
      white-space: nowrap;
    }
    .mission-desc-cell {
      color: #475569;
      line-height: 1.45;
      font-size: 12px;
      word-break: break-word;
    }
    .mission-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      border-radius: 6px;
      background: #275735;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .mission-action-btn:hover {
      background: #1d923e;
      color: #fff;
    }
    .vd-empty-cell {
      text-align: center !important;
      padding: 2.5rem 1rem !important;
      color: #64748b;
    }
    .vd-empty-cell i {
      display: block;
      font-size: 1.75rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'volunteers'])

  <main class="org-main-content main-content">
    <header class="vd-page-head">
      <a href="/organization/volunteers" class="vd-back">
        <i class="bi bi-arrow-left"></i> Back to volunteers
      </a>
      <h1 class="vd-page-title"><i class="bi bi-person-badge"></i> Volunteer details</h1>
    </header>

    <div id="detailLoading" aria-live="polite"></div>

    <div id="detailContent" hidden>
      <div class="vd-top-grid">
        <section class="vd-profile-card" aria-label="Volunteer profile">
          <div class="vd-profile-inner">
            <div class="vd-avatar-wrap" id="applicantAvatarWrap">
              <img id="applicantAvatarImg" class="vd-avatar-img" alt="" hidden>
              <span id="applicantAvatarInitial" class="vd-avatar-initial">?</span>
            </div>
            <div class="vd-profile-meta">
              <h2 class="vd-profile-name" id="applicantName">Volunteer</h2>
              <span class="vd-level-badge" id="applicantLevel" hidden></span>
              <p class="vd-profile-occupation" id="applicantOccupation" hidden></p>
              <div class="vd-profile-details">
                <p class="vd-profile-email"><i class="bi bi-envelope" aria-hidden="true"></i> <span id="applicantEmail">—</span></p>
                <p class="vd-profile-phone"><i class="bi bi-telephone" aria-hidden="true"></i> <span id="applicantPhone">—</span></p>
              </div>
            </div>
          </div>
        </section>

        <aside class="vd-stat-card" aria-label="Volunteer stats">
          <span class="vd-stat-icon" aria-hidden="true"><i class="bi bi-bar-chart"></i></span>
          <p class="vd-stat-label">Volunteer stats</p>
          <div class="vd-stat-metrics">
            <div class="vd-stat-metric">
              <p class="vd-stat-value" id="vdMissionsCount">0</p>
              <p class="vd-stat-metric-label">Missions</p>
            </div>
            <div class="vd-stat-metric">
              <p class="vd-stat-value" id="vdHoursCount">0</p>
              <p class="vd-stat-metric-label">Hours</p>
            </div>
          </div>
        </aside>
      </div>

      <section class="vd-missions-panel" aria-labelledby="vd-missions-heading">
        <div class="vd-missions-head">
          <div>
            <h2 id="vd-missions-heading"><i class="bi bi-list-check"></i> Missions attended</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table id="applicantMissionsTable">
            <colgroup>
              <col class="col-mission">
              <col class="col-date">
              <col class="col-desc">
              <col class="col-action">
            </colgroup>
            <thead>
              <tr>
                <th class="col-mission">Mission</th>
                <th class="col-date">Date</th>
                <th class="col-desc">Description</th>
                <th class="col-action">Action</th>
              </tr>
            </thead>
            <tbody id="applicantMissionsBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</body>
</html>
