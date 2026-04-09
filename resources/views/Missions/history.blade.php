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
  padding: 1.25rem 1.25rem 1.5rem;
  min-height: 100vh;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.page-title i { color: #22a447; font-size: 0.95rem; }

/* Stats cards */
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.card {
  background: #fff;
  border: 1px solid #e8edf2;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  padding: 0.85rem 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  text-align: left;
}
.card-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 1rem;
}
.card-icon.green { background: #eaf8ef; color: #22a447; }
.card-icon.blue { background: #ebf3ff; color: #2f80ed; }
.card-icon.purple { background: #f3edff; color: #8e61ff; }

.card h2 {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1;
  font-weight: 700;
  color: #111827;
}
.card p {
  margin: 0.22rem 0 0;
  font-size: 0.74rem;
  color: #6b7280;
  font-weight: 600;
}

/* History container */
.history-section {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8edf2;
  box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  padding: 0.9rem;
}
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.7rem;
}
.history-head h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.history-head h3 i { color: #22a447; font-size: 0.85rem; }

.history-search {
  width: 220px;
  max-width: 100%;
  height: 32px;
  border: 1px solid #e5eaf0;
  border-radius: 7px;
  font-size: 0.75rem;
  padding: 0 10px 0 30px;
  outline: none;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' fill='%239aa4b2' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.398 1.398l3.85 3.85a1 1 0 1 0 1.414-1.414l-3.85-3.85zM12 6.5a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 10px center;
}

/* Table */
.missions table {
  width: 100%;
  border-collapse: collapse;
}
.missions th, .missions td {
  padding: 10px 10px;
  text-align: left;
  border-bottom: 1px solid #eef2f6;
  font-size: 0.74rem;
}
.missions th {
  background: #f8fafc;
  color: #6b7280;
  font-weight: 700;
}
.missions tbody tr:hover { background: #f9fbfd; }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25px;
}
.status-completed {
  background: #def7e8;
  color: #1f9d55;
}
.status-completed::before {
  content: "✓";
  font-size: 0.62rem;
  line-height: 1;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
}
.empty-state h4 {
  margin: 0.4rem 0 0.25rem;
  color: #334155;
  font-size: 0.95rem;
}
.empty-state p {
  margin: 0;
  font-size: 0.82rem;
}

/* Footer row under table (for screenshot-like feel) */
.history-footer {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #6b7280;
  font-size: 0.73rem;
}
.pagination-mini {
  display: flex;
  gap: 6px;
  align-items: center;
}
.page-chip {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid #e5eaf0;
  display: grid;
  place-items: center;
  background: #fff;
  color: #6b7280;
  font-size: 0.73rem;
}
.page-chip.active {
  background: #22a447;
  color: #fff;
  border-color: #22a447;
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

  <main class="main-content">
  <h1 class="page-title">
    <i class="bi bi-list-check"></i>
    History of Missions
  </h1>

  <div class="stats">
    <div class="card">
      <div class="card-icon green"><i class="bi bi-check-circle-fill"></i></div>
      <div>
        <h2 id="totalCompletedMissions">0</h2>
        <p>Total Completed</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon blue"><i class="bi bi-calendar-event"></i></div>
      <div>
        <h2 id="thisMonthMissions">0</h2>
        <p>This Month</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon purple"><i class="bi bi-people"></i></div>
      <div>
        <h2 id="totalVolunteersHelped">0</h2>
        <p>Volunteers Helped</p>
      </div>
    </div>
  </div>

  <section class="history-section">
    <div class="history-head">
      <h3><i class="bi bi-clipboard-check"></i> Completed Missions</h3>
      <input type="text" id="historySearch" class="history-search" placeholder="Search missions...">
    </div>

    <div class="missions">
      <table id="missionsTable">
        <thead>
          <tr>
            <th></i> Mission Name</th>
            <th></i> Date</th>
            <th></i> Location</th>
            <th></i> Volunteers</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="historyMissionsBody">
          <!-- Populated by JavaScript -->
        </tbody>
      </table>
    </div>

    <div class="history-footer">
      <span id="historyCountText">Showing 0 missions</span>
      <div class="pagination-mini">
        <span class="page-chip"><i class="bi bi-chevron-left"></i></span>
        <span class="page-chip active">1</span>
        <span class="page-chip"><i class="bi bi-chevron-right"></i></span>
      </div>
    </div>
  </section>
</main>

  <script>
    // If you later want a mobile hamburger, you can hook it up here to toggle sidebar.open
  </script>
</body>
</html>