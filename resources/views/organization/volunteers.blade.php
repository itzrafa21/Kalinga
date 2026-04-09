<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteers - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-logout.js',
    'resources/js/volunteer.js',
    'resources/js/firebase.js'
  ])
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f0f2f5;
      color: #333;
    }

    /* Sidebar (same as dashboard/history) */
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

    /* Controls / filter/search */
    .controls-section {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.5rem;
    }
    .controls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .controls-header h3 {
      font-size: 1.1rem;
      color: #1e3a2f;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .controls-header h3 i { color: #28a745; }
    .controls-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .control-group label {
      font-weight: 500;
      color: #555;
      white-space: nowrap;
    }
    input, select {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #ddd;
      outline: none;
      font-size: 14px;
      transition: border-color 0.2s ease-in-out;
      min-width: 200px;
      background: #fff;
    }
    input:focus, select:focus {
      border-color: #28a745;
      box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.1);
    }

    /* Volunteers table section */
    .volunteers-section {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.75rem 1.75rem 2rem;
    }
    .volunteers-section h3 {
      margin-bottom: 1.25rem;
      font-size: 1.2rem;
      color: #1e3a2f;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .volunteers-section h3 i { color: #28a745; }

    .volunteers-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
    }
    .volunteers-table th, .volunteers-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #eee;
      font-size: 0.9rem;
      vertical-align: middle;
    }
    .volunteers-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    .volunteers-table tbody tr:nth-child(even) { background: #fafafa; }
    .volunteers-table tbody tr:hover { background: #f0f4f0; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: capitalize;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .pending-badge {
      background: linear-gradient(135deg, #ffc107, #ff8f00);
      color: #fff;
      box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);
    }
    .approved-badge {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: #fff;
      box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }
    .rejected-badge {
      background: linear-gradient(135deg, #dc3545, #e74c3c);
      color: #fff;
      box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
    }
    .unknown-badge {
      background: linear-gradient(135deg, #6c757d, #495057);
      color: #fff;
      box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 6px;
      text-decoration: none;
      white-space: nowrap;
    }
    .accept-btn {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: #fff;
      box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }
    .accept-btn:hover {
      background: linear-gradient(135deg, #218838, #1e7e34);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
    }
    .reject-btn {
      background: linear-gradient(135deg, #dc3545, #e74c3c);
      color: #fff;
      box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
    }
    .reject-btn:hover {
      background: linear-gradient(135deg, #c82333, #bd2130);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.4);
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
      .controls-row {
        flex-direction: column;
        align-items: stretch;
      }
      .control-group {
        flex-direction: column;
        align-items: stretch;
      }
      input, select {
        min-width: auto;
        width: 100%;
      }
      .volunteers-table {
        font-size: 0.9rem;
      }
      .volunteers-table th, .volunteers-table td {
        padding: 10px 8px;
      }
      .action-btn {
        padding: 4px 8px;
        font-size: 0.8rem;
        margin-right: 4px;
      }
      .status-badge {
        padding: 4px 8px;
        font-size: 0.8rem;
      }
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
      <a href="/missions/history"><i class="bi bi-journal-text"></i> History of Missions</a>
      <a href="/organization/volunteers" class="active"><i class="bi bi-people"></i> Volunteers</a>
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
  <main class="main-content" id="mainContent">
    <h1 class="page-title">
      <i class="bi bi-people"></i>
      Volunteers
    </h1>

    <!-- Stats Cards (IDs kept for JS) -->
    <div class="stats">
      <div class="card">
        <h2 id="totalVolunteers">0</h2>
        <p>Total Volunteers</p>
      </div>
      <div class="card">
        <h2 id="pendingVolunteers">0</h2>
        <p>Pending Approval</p>
      </div>
      <div class="card">
        <h2 id="approvedVolunteers">0</h2>
        <p>Approved</p>
      </div>
    </div>

    <!-- Filter & Search -->
    <section class="controls-section">
      <div class="controls-header">
        <h3><i class="bi bi-search"></i> Filter & Search</h3>
      </div>
      <div class="controls-row">
        <div class="control-group">
          <label for="filterSelect">Mission:</label>
          <select id="filterSelect">
            <option value="">All Missions</option>
            <!-- Missions will be loaded dynamically here -->
          </select>
        </div>
        <div class="control-group">
          <label for="searchInput">Search:</label>
          <input type="text" id="searchInput" placeholder="Search by name or email">
        </div>
      </div>
    </section>

    <!-- Volunteers Table -->
    <section class="volunteers-section">
      <h3><i class="bi bi-clipboard-check"></i> Volunteer Applications</h3>
      <table class="volunteers-table" id="volunteerTable">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Email</th>
            <th>Mobile Number</th>
            <th>Occupation</th>
            <th>Mission</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="volunteerTableBody">
          <!-- Filled dynamically -->
        </tbody>
      </table>
    </section>
  </main>

  <script>
    // Optional: if you add a mobile hamburger later, toggle sidebar.open here
  </script>
</body>
</html>