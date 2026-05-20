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
    'resources/js/history-missions.js',
    'resources/js/organization-logout.js'
  ])
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f0f2f5;
      color: #333;
    }

        /* Sidebar — reference layout */
        .sidebar {
      width: 260px;
      background: #ffffff;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      padding: 1.25rem 0 1rem;
      z-index: 200;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.12);
    }
    .sidebar-logo {
      padding: 0 1rem 1rem 1.25rem;
      border-bottom: 1px solid rgba(31, 31, 31, 0.08);
      margin-bottom: 1rem;
    }
    .sidebar-logo span {
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: 0.12em;
      color: #000000;
    }
    .sidebar-user-card {
      margin: 0 0.85rem 1.25rem;
      padding: 1rem;
      border-radius: 14px;
      background: rgba(39, 39, 39, 0.06);
      border: 1px solid rgba(39, 39, 39, 0.06);
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .sidebar-user-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .sidebar-user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #2d6a4f;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.15rem;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }
    .sidebar-user-avatar .sidebar-user-avatar-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      display: none;
    }
    .sidebar-user-avatar.has-photo .sidebar-user-avatar-img {
      display: block;
    }
    .sidebar-user-avatar.has-photo #sidebarUserInitial {
      display: none;
    }
    .sidebar-user-status-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      background: #2ee59d;
      border-radius: 50%;
      border: 2px solid #0f2419;
    }
    .sidebar-user-info {
      min-width: 0;
      flex: 1;
    }
    .sidebar-user-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: #000000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sidebar-user-role {
      font-size: 0.78rem;
      color: #8fb3a0;
      margin-top: 2px;
    }
    .sidebar-user-active-label {
      font-size: 0.72rem;
      color: #2ee59d;
      margin-top: 4px;
      font-weight: 600;
    }
    .sidebar-nav {
      padding: 0 0.75rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 2px;
    }
    .sidebar-section {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.55px;
      color: #000000;
      padding: 1rem 0.75rem 0.45rem;
    }
    .sidebar a {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: #000000;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 500;
      font-size: 0.92rem;
      transition: background 0.2s, color 0.2s;
    }
    .sidebar a:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #000000;
    }
    .sidebar a.active {
      background: #28a745;
      color: #000000;
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.35);
    }
    .sidebar a i {
      font-size: 1.05rem;
      width: 22px;
      text-align: center;
      color: #000000;
    }
    .sidebar a:hover i,
    .sidebar a.active i {
      color: #000000;
    }
    #logoutBtn.sidebar-logout-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-top: 2px;
      padding: 10px 14px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #000000;
      font-weight: 500;
      font-size: 0.92rem;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s, color 0.2s;
    }
    #logoutBtn.sidebar-logout-link:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #000000;
    }
    #logoutBtn.sidebar-logout-link i {
      font-size: 1.05rem;
      width: 22px;
      text-align: center;
      color: #000000;
    }

    /* Topbar */
    .topbar {
      background: #fff;
      color: #333;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      margin-left: 260px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 1.25rem;
      color: #1e3a2f;
    }
    .topbar-brand i { font-size: 1.5rem; color: #28a745; }
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    .logout-btn {
      background: transparent;
      color: #28a745;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #28a745;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logout-btn:hover {
      background: #28a745;
      color: #fff;
    }

    /* Main content */
    .main-content {
      margin-left: 260px;
      padding: 1.5rem 2rem 2rem;
      min-height: 100vh;
    }
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
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .topbar, .main-content { margin-left: 0; }
      .topbar { padding-left: 3rem; }
      .stats { flex-direction: column; }
    }
  </style>
</head>
<body>
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo"><span>KALINGA</span></div>

    <div class="sidebar-user-card">
      <div class="sidebar-user-avatar-wrap">
        <div class="sidebar-user-avatar">
          <img id="sidebarUserAvatarImg" alt="" class="sidebar-user-avatar-img" width="48" height="48">
          <span id="sidebarUserInitial">?</span>
        </div>
        <span class="sidebar-user-status-dot" aria-hidden="true"></span>
      </div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="sidebarUserName">Organization</div>
        <div class="sidebar-user-role">Coordinator</div>
        <div class="sidebar-user-active-label">● Active</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-section">Main</div>
      <a href="/organization/dashboard"><i class="bi bi-grid-1x2"></i> Dashboard</a>
      <a href="/missions/history" class="active"><i class="bi bi-journal-text"></i> History of Missions</a>
      <a href="/organization/volunteers"><i class="bi bi-people"></i> Volunteers</a>
      <a href="/donation"><i class="bi bi-heart"></i> Donation</a>

      <div class="sidebar-section">Settings</div>
      <a href="/settings"><i class="bi bi-gear"></i> Settings</a>

      <div class="sidebar-section">Account</div>
      <a href="/organization/profile"><i class="bi bi-person"></i> Profile</a>
      <button type="button" id="logoutBtn" class="sidebar-logout-link">
        <i class="bi bi-box-arrow-right"></i> Logout
      </button>
    </nav>
  </aside>

  <!-- Header -->
  <header class="topbar">
    <div class="topbar-brand">
      <img src="{{ asset('images/kalinga-logo.jpg') }}" alt="Kalinga Logo" style="height: 28px; width: auto;">
      <span>Kalinga</span>
    </div>
  </header>

  <!-- Main -->
  <main class="main-content">
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
              <th>Mission Name</th>
              <th>Date</th>
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