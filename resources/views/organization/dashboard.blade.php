<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Dashboard - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-dashboard.js',
    'resources/js/mission-dashboard.js',
    'resources/js/organization-logout.js',
    'resources/js/organization-profile.js'
  ])
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f0f2f5;
      color: #333;
    }

    /* Header - logo left, user right */
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
    .topbar-user .org-name-display {
      font-weight: bold;
      font-style: italic;
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
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
    }

    /* Main content */
    .main-content {
      margin-left: 260px;
      padding: 1.5rem 2rem 2rem;
      min-height: 100vh;
    }

    /* Page title */
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
    }

    /* Toolbar - search, filters, primary button */
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
    .toolbar-actions { display: flex; align-items: center; gap: 0.75rem; }
    .create-btn {
      background: #28a745;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .create-btn:hover {
      background: #218838;
      transform: translateY(-1px);
    }

        /* Stats cards - header + body style */
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
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid #eee;
    }
    .stat-card-header {
      padding: 1.25rem 1.25rem 1rem;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 90px;
    }
    .stat-card-header.card-purple {
      background:rgb(255, 255, 255);
      color: #fff;
    }
    .stat-card-header .stat-card-icon i {
  color:rgb(0, 0, 0);   /* icon color — try #000000 for black */
}
    .stat-card-header.card-teal {
      background:rgb(255, 255, 255);
      color: #fff;
    }
    .stat-card-header .stat-card-title {
      font-size: 0.9rem;
      font-weight: 500;
      opacity: 0.95;
      margin-bottom: 0.35rem;
      color: #000000;
    }
    .stat-card-header .stat-card-value {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
      color: #000000;
    }
    .stat-card-header .stat-card-icon {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    /* Table */
    .table-wrap {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      overflow: hidden;
    }
    .missions table {
      width: 100%;
      border-collapse: collapse;
    }
    .missions th, .missions td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #eee;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .missions th {
      background:rgb(56, 107, 87);
      font-weight: 600;
      color:rgb(255, 255, 255);
    }
    .missions tbody tr:hover { background: #f8f9fa; }
    .missions tbody tr:nth-child(even) { background: #fafafa; }
    .missions tbody tr:nth-child(even):hover { background: #f0f4f0; }

    .edit-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      background: #ffc107;
      color: #000;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .edit-btn:hover { background: #e0a800; color: #000; }
    .delete-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      background: #dc3545;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      margin-left: 6px;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .delete-btn:hover { background: #c82333; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .topbar, .main-content { margin-left: 0; }
      .topbar { padding-left: 3rem; }
    }
  </style>
</head>
<body>

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
    <a href="/organization/dashboard" class="active"><i class="bi bi-grid-1x2"></i> Dashboard</a>
    <a href="/missions/history"><i class="bi bi-journal-text"></i> History of Missions</a>
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

<main class="main-content">
  <div class="page-header">
    <p class="page-welcome">
      Welcome, <span id="orgNameWelcome">Organization</span>!
    </p>
    <h1 class="page-title">Dashboard</h1>
  </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-card-header card-purple">
          <span class="stat-card-title">Total Missions</span>
          <p class="stat-card-value" id="totalMissions">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-journal-check"></i>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header card-teal">
          <span class="stat-card-title">Ongoing Missions</span>
          <p class="stat-card-value" id="ongoingMissions">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-clock-history"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="missions">
      <div class="toolbar">
        <input type="text" class="toolbar-search" id="missionSearch" placeholder="Search missions..." aria-label="Search missions">
        <div class="toolbar-actions">
          <button type="button" class="create-btn" onclick="window.location.href='/missions/create'">
            <i class="bi bi-plus-lg"></i> Create New Mission
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table id="missionsTable">
          <thead>
            <tr>
              <th>Missions</th>
              <th>Description</th>
              <th>Type</th>
              <th>Volunteers</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="missionsBody"></tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    // Optional: filter table by search
    document.getElementById('missionSearch')?.addEventListener('input', function() {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#missionsBody tr').forEach(function(tr) {
        tr.style.display = tr.textContent.toLowerCase().indexOf(q) === -1 ? 'none' : '';
      });
    });
  </script>
</body>
</html>