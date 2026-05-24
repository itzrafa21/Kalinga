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
    'resources/js/organization-logout.js'
  ])
@include('partials.org-layout-styles')
  <style>
        .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .page-title i { color: #28a745; }

    /* Stats cards */
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .card {
      flex: 1;
      min-width: 200px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 1.25rem 1.5rem;
      text-align: center;
      font-weight: bold;
      border: 1px solid #eee;
    }
    .card h2 {
      font-size: 1.75rem;
      margin: 0.25rem 0 0;
      color: #28a745;
    }
    .card p {
      margin: 0.35rem 0 0;
      font-size: 0.85rem;
      color: #666;
      font-weight: 500;
    }

    /* History section & table */
    .history-section {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.5rem 1.75rem 1.75rem;
    }
    .history-section h3 {
      margin: 0 0 1rem;
      font-size: 1.2rem;
      color: #1e3a2f;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;  
    }
    .history-section h3 i { color: #28a745; }

    .history-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .history-head h3 {
      margin: 0;
    }
    .history-search {
      min-width: 220px;
      flex: 1;
      max-width: 320px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .history-search:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.15);
    }

    .history-controls-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      justify-content: flex-end;
      flex-wrap: wrap;
      min-width: 280px;
    }
    .history-control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .history-control-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      white-space: nowrap;
    }
    .history-period-select {
      height: 38px;
      padding: 0 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #fff;
      min-width: 130px;
    }
    .history-controls-row .history-search {
      flex: 1;
      min-width: 180px;
      max-width: 320px;
    }
    .history-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #666;
    }

    .history-pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }
    .history-page-size-label {
      font-size: 0.85rem;
      color: #555;
      margin-right: 0.35rem;
    }
    .history-page-size {
      padding: 0.35rem 0.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #fff;
    }
    .history-page-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .history-page-btn {
      padding: 0.4rem 0.85rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .history-page-btn:hover:not(:disabled) {
      background: #f0f4f0;
      border-color: #28a745;
    }
    .history-page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #historyPageInfo {
      font-size: 0.85rem;
      color: #555;
      min-width: 6rem;
      text-align: center;
    }
    tr.history-mission-row.history-row-paged-out {
      display: none !important;
    }
    #missionsTable td.col-date {
      white-space: normal;
      vertical-align: middle;
    }
    .history-date-main {
      font-weight: 500;
      color: #1e3a2f;
      line-height: 1.35;
    }
    .history-time-sub {
      font-size: 0.78rem;
      font-weight: 400;
      color: #64748b;
      margin-top: 0.2rem;
      line-height: 1.3;
    }

    .missions table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.5rem;
    }
    .missions th, .missions td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #eee;
      font-size: 0.9rem;
    }
    .missions th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    .missions tbody tr:nth-child(even) { background: #fafafa; }
    .missions tbody tr:hover { background: #f0f4f0; }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-completed {
      background: #d4edda;
      color: #155724;
    }
    .status-rejected {
      background: #f8d7da;
      color: #721c24;
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem 2rem;
      color: #666;
    }
    .empty-state h4 {
      margin-bottom: 0.5rem;
      color: #333;
    }
    .empty-state p {
      margin: 0;
      font-size: 0.95rem;
    }

    @media (max-width: 768px) {
      .stats { flex-direction: column; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'history'])

  <main class="org-main-content main-content">
    <h1 class="page-title">
      <i class="bi bi-journal-text"></i>
      History of Missions
    </h1>

    <!-- Stats cards (IDs kept for JS) -->
    <div class="stats">
      <div class="card">
        <h2 id="totalCompletedMissions">0</h2>
        <p>Total Completed</p>
      </div>
      <div class="card">
        <h2 id="thisMonthMissions">0</h2>
        <p>This Month</p>
      </div>
      <div class="card">
        <h2 id="totalVolunteersHelped">0</h2>
        <p>Volunteers Helped</p>
      </div>
    </div>

        <!-- History table -->
        <div class="history-head">
        <h3><i class="bi bi-clipboard-check"></i> Completed Missions</h3>
        <div class="history-controls-row">
          <div class="history-control-group">
            <label for="historyPeriodFilter">Period</label>
            <select id="historyPeriodFilter" class="history-period-select">
              <option value="this_month" selected>This month</option>
              <option value="last_month">Last month</option>
              <option value="older">Older</option>
              <option value="all">All time</option>
            </select>
          </div>
          <input type="search" id="historySearch" class="history-search" placeholder="Search missions..." autocomplete="off">
        </div>
      </div>
      <div class="missions">
        <table id="missionsTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mission Name</th>
              <th>Location</th>
              <th>Volunteers</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="historyMissionsBody">
            <!-- Populated by JavaScript -->
          </tbody>
        </table>
      </div>
      <div.div class="history-footer">
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
    </section>
  </main>

  <script>
    // If you later want a mobile hamburger, you can hook it up here to toggle sidebar.open
  </script>
</body>
</html>