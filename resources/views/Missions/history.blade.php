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

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: #1e3a2f;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      padding: 1.5rem 0;
      z-index: 200;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .sidebar-logo {
      padding: 0 1.25rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 1rem;
    }
    .sidebar-logo span {
      font-weight: 700;
      font-size: 1.25rem;
      color: #fff;
    }
    .sidebar-nav {
      padding: 0 0.75rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .sidebar-section {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.5);
      padding: 1rem 0.75rem 0.5rem;
    }
    .sidebar a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      padding: 10px 14px;
      margin-bottom: 2px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .sidebar a:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .sidebar a.active {
      background: #28a745;
      color: #fff;
    }
    .sidebar a i { font-size: 1.1rem; width: 24px; text-align: center; }
    .sidebar-bottom {
      margin-top: auto;
      padding: 0 0.75rem 1rem;
    }

    .sidebar-logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: transparent;
      color: rgba(255,255,255,0.85);
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .sidebar-logout-btn i {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
    }

    .sidebar-logout-btn:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
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
    </nav>

    <div class="sidebar-bottom">
      <button type="button" id="logoutBtn" class="sidebar-logout-btn">
        <i class="bi bi-box-arrow-right"></i>
        Logout
      </button>
    </div>
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
    <section class="history-section">
      <h3><i class="bi bi-clipboard-check"></i> Completed Missions</h3>
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
    </section>
  </main>

  <script>
    // If you later want a mobile hamburger, you can hook it up here to toggle sidebar.open
  </script>
</body>
</html>