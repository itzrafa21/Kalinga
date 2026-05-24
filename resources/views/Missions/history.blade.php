<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>History of Missions - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/history-missions.js',
    'resources/js/organization-logout.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
    }

    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      flex: 1;
      min-width: 240px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #eee;
    }

    .stat-card-header {
      padding: 1.25rem 1.25rem 1rem;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 90px;
      background: #fff;
    }

    .stat-card-header .stat-card-title {
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 0.35rem;
      color: #374151;
    }

    .stat-card-header .stat-card-value {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
      color: #111827;
    }

    .stat-card-header .stat-card-icon {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(40, 167, 69, 0.35);
      background: rgba(40, 167, 69, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .stat-card-header .stat-card-icon i {
      color: #28a745;
    }

    .stat-card-header.card-teal .stat-card-icon {
      border-color: rgba(56, 107, 87, 0.35);
      background: rgba(56, 107, 87, 0.08);
    }

    .stat-card-header.card-teal .stat-card-icon i {
      color: rgb(56, 107, 87);
    }

    .stat-card-header.card-amber .stat-card-icon {
      border-color: rgba(217, 119, 6, 0.35);
      background: rgba(217, 119, 6, 0.1);
    }

    .stat-card-header.card-amber .stat-card-icon i {
      color: #d97706;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .toolbar-search {
      flex: 1;
      min-width: 200px;
      padding: 8px 14px 8px 36px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 12px center;
    }

    .toolbar-filter {
      min-width: 160px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #fff;
    }

    .table-wrap {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
      border: 1px solid #d8e8df;
      overflow-x: auto;
    }

    #missionsTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    #missionsTable th,
    #missionsTable td {
      padding: 8px 10px;
      font-size: 0.85rem;
      vertical-align: middle;
    }

    #missionsTable thead th {
      padding: 12px 14px;
      background: #386b57;
      font-weight: 600;
      color: #ffffff;
      text-align: left;
      white-space: nowrap;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      font-size: 14px;
      border-bottom: 2px solid #163d30;
      border-right: none;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }

    #missionsTable thead th:first-child {
      border-radius: 11px 0 0 0;
    }

    #missionsTable thead th:last-child {
      border-radius: 0 11px 0 0;
    }

    #missionsTable tbody td {
      font-weight: 400;
      color: #374151;
      text-align: left;
      word-break: break-word;
      background: #fff;
      border-bottom: 1px solid #c5d9ce;
      border-right: none;
    }

    #missionsTable th.col-volunteers,
    #missionsTable td.col-volunteers,
    #missionsTable th.col-status,
    #missionsTable td.col-status,
    #missionsTable th.col-actions,
    #missionsTable td.col-actions {
      text-align: center;
    }

    #missionsTable td.col-actions {
      white-space: nowrap;
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
      transition: background 0.2s;
    }

    .mission-action-btn:hover {
      background: #1d923e;
      color: #fff;
    }

    #missionsTable td.col-mission {
      color: #1e3a2f;
    }

    #missionsTable td.col-mission .mission-name-link {
      display: block;
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

    #missionsTable td.col-date {
      font-weight: 500;
      color: #1e3a2f;
      white-space: normal;
      max-width: none;
    }

    .mission-date-main {
      font-size: 12px;
      font-weight: 500;
      color: #1e3a2f;
    }

    .mission-time-sub {
      font-size: 12px;
      font-weight: 400;
      color: #64748b;
      margin-top: 0.1rem;
    }

    #missionsTable td.col-location {
      font-size: 12px;
      color: #4b5563;
    }

    .volunteer-progress {
      font-size: 12px;
      font-weight: 600;
      color: #1e3a2f;
    }

    #missionsTable tbody tr:hover td {
      background: #eef6f1;
    }

    #missionsTable tbody tr:nth-child(even) td {
      background: #f6faf8;
    }

    #missionsTable tbody tr:nth-child(even):hover td {
      background: #e8f3ec;
    }

    #missionsTable tbody tr:last-child td:first-child {
      border-radius: 0 0 0 11px;
    }

    #missionsTable tbody tr:last-child td:last-child {
      border-radius: 0 0 11px 0;
    }

    .mission-status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }

    .mission-status--completed { background: #dcfce7; color: #15803d; }
    .mission-status--rejected { background: #fee2e2; color: #b91c1c; }

    tr.history-mission-row.history-row-paged-out {
      display: none !important;
    }

    #missionsTable tbody tr:has(.missions-empty) td,
    #missionsTable tbody tr:has(.missions-loading) td,
    #missionsTable tbody tr:has(.missions-error) td {
      text-align: center !important;
      padding: 2rem 1rem !important;
    }

    .missions-empty,
    .missions-loading,
    .missions-error {
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      margin: 0 auto;
    }

    .missions-empty i,
    .missions-error i {
      font-size: 2rem;
      color: #94a3b8;
    }

    .missions-empty h4,
    .missions-error h4 {
      margin: 0 0 0.35rem;
      color: #334155;
      font-size: 1rem;
    }

    .missions-empty p,
    .missions-error p {
      margin: 0;
      font-size: 0.88rem;
    }

    .missions-loading-spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #166534;
      border-radius: 50%;
      animation: history-spin 1s linear infinite;
    }

    @keyframes history-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .history-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .history-pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .history-page-size-label {
      font-size: 0.85rem;
      color: #64748b;
      margin-right: 0.35rem;
    }

    .history-page-size,
    .history-page-btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.85rem;
      background: #fff;
    }

    .history-page-btn {
      font-weight: 600;
      cursor: pointer;
      color: #1e3a2f;
    }

    .history-page-btn:hover:not(:disabled) {
      background: #eef6f1;
      border-color: #86efac;
    }

    .history-page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #historyPageInfo {
      font-size: 0.85rem;
      color: #64748b;
      min-width: 6rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      .stat-card { min-width: 100%; }
      .toolbar { gap: 0.75rem; }
      .toolbar-search,
      .toolbar-filter { min-width: 100%; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'history'])

  <main class="org-main-content main-content">
    <h1 class="page-title">History of Missions</h1>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-card-header card-purple">
          <span class="stat-card-title">Total Completed</span>
          <p class="stat-card-value" id="totalCompletedMissions">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-check-circle"></i>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header card-teal">
          <span class="stat-card-title">This Month</span>
          <p class="stat-card-value" id="thisMonthMissions">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-calendar-month"></i>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header card-amber">
          <span class="stat-card-title">Volunteers Helped</span>
          <p class="stat-card-value" id="totalVolunteersHelped">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-people"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="missions">
      <div class="toolbar">
        <input
          type="search"
          id="historySearch"
          class="toolbar-search"
          placeholder="Search missions..."
          autocomplete="off"
          aria-label="Search history missions"
        >
        <select id="historyPeriodFilter" class="toolbar-filter" aria-label="Filter by period">
          <option value="this_month" selected>This month</option>
          <option value="last_month">Last month</option>
          <option value="older">Older</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div class="table-wrap">
        <table id="missionsTable">
          <colgroup>
            <col style="width: 14%">
            <col style="width: 24%">
            <col style="width: 22%">
            <col style="width: 12%">
            <col style="width: 12%">
            <col style="width: 16%">
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Mission</th>
              <th>Location</th>
              <th class="col-volunteers">Volunteers</th>
              <th class="col-status">Status</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="historyMissionsBody"></tbody>
        </table>
      </div>
      @include('partials.org-cache-hydrate')

      <div class="history-footer">
        <span id="historyCountText">Showing 0 missions</span>
        <div class="history-pagination">
          <label class="history-page-size-label" for="historyPageSize">Rows per page</label>
          <select id="historyPageSize" class="history-page-size" aria-label="Rows per page">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
          <div class="history-page-nav">
            <button type="button" class="history-page-btn" id="historyPrevPage" disabled>Previous</button>
            <span id="historyPageInfo">Page 1 of 1</span>
            <button type="button" class="history-page-btn" id="historyNextPage" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>
