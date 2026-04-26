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
      background: #0f2419;
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 1rem;
    }
    .sidebar-logo span {
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: 0.12em;
      color: #fff;
    }
    .sidebar-user-card {
      margin: 0 0.85rem 1.25rem;
      padding: 1rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
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
      color: #fff;
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
      color: rgba(255, 255, 255, 0.38);
      padding: 1rem 0.75rem 0.45rem;
    }
    .sidebar a {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: #a8c5b0;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 500;
      font-size: 0.92rem;
      transition: background 0.2s, color 0.2s;
    }
    .sidebar a:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #e8f5e9;
    }
    .sidebar a.active {
      background: #28a745;
      color: #fff;
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.35);
    }
    .sidebar a i {
      font-size: 1.05rem;
      width: 22px;
      text-align: center;
    }
    .sidebar a.active i {
      color: #fff;
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
      color: #a8c5b0;
      font-weight: 500;
      font-size: 0.92rem;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s, color 0.2s;
    }
    #logoutBtn.sidebar-logout-link:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #e8f5e9;
    }
    #logoutBtn.sidebar-logout-link i {
      font-size: 1.05rem;
      width: 22px;
      text-align: center;
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
  margin-left: 260px; /* keep space for sidebar */
  padding: 20px 16px 24px;
  min-height: 100vh;
}

.page-welcome {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.page-title {
  margin: 2px 0 14px;
  font-size: 42px;
  font-weight: 700;
  line-height: 1.1;
  color: #1f2937;
}

/* Cards */
.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.stat-card {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e7ebf0;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
}

.stat-card-header {
  background: #22a447;
  color: #fff;
  padding: 12px 14px;
  min-height: 82px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-card-header .stat-card-title {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.95;
  margin-bottom: 4px;
}

.stat-card-header .stat-card-value {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.stat-card-header .stat-card-icon {
  position: absolute;
  right: 12px;
  top: 10px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  display: grid;
  place-items: center;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.12);
}

.stat-card-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  background: #fff;
  padding: 10px 12px;
}

.stat-mini {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 8px;
  border-right: 1px solid #edf1f5;
}

.stat-mini:last-child {
  border-right: 0;
}

.stat-mini-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transform: translateY(-1px);
}

.dot-orange { background: #f59e0b; }
.dot-green { background: #22c55e; }
.dot-blue { background: #3b82f6; }
.dot-purple { background: #a855f7; }

.stat-mini strong {
  font-size: 13px;
  color: #111827;
}

.stat-mini span {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-search {
  flex: 1;
  height: 40px;
  border: 1px solid #e6eaf0;
  border-radius: 8px;
  font-size: 14px;
  padding: 0 12px 0 36px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.398 1.398l3.85 3.85a1 1 0 1 0 1.414-1.414l-3.85-3.85zM12 6.5a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 12px center;
}

.toolbar-actions {
  display: flex;
  align-items: center;
}

#missionsTable th:last-child,
#missionsTable td:last-child {
  width: 120px;
  white-space: nowrap;
}


.create-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #22a447;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.create-btn:hover {
  background: #1d923e;
}

/* Table */
.table-wrap {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border: 1px solid #eee;
  overflow: hidden;
}

.table-title {
  display: none; /* hide extra title to match old look */
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
  background: rgb(56, 107, 87); /* dark green header */
  color: #fff;
  font-weight: 600;
}

.missions tbody tr:hover { background: #f8f9fa; }
.missions tbody tr:nth-child(even) { background: #fafafa; }
.missions tbody tr:nth-child(even):hover { background: #f0f4f0; }

/* Bring back yellow View Details button style */
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
.edit-btn:hover {
  background: #e0a800;
  color: #000;
}

/* Keep sidebar behavior on mobile */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .topbar, .main-content { margin-left: 0; }
  .topbar { padding-left: 3rem; }

  .stats { grid-template-columns: 1fr; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .create-btn { width: 100%; justify-content: center; }
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
    <img src="{{ asset('images/kalinga-logo.jpg') }}" alt="Kalinga Logo" style="height:24px;width:auto;">
    <span>Kalinga</span>
  </div>
</header>

<main class="main-content">
  <div class="page-header">
    <p class="page-welcome">Welcome back, <span id="orgNameWelcome">Organization</span>!</p>
    <h1 class="page-title">Dashboard</h1>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-card-header card-purple">
        <span class="stat-card-title">Total Missions</span>
        <p class="stat-card-value" id="totalMissions">0</p>
        <div class="stat-card-icon"><i class="bi bi-journal-check"></i></div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header card-teal">
        <span class="stat-card-title">Ongoing Missions</span>
        <p class="stat-card-value" id="ongoingMissions">0</p>
        <div class="stat-card-icon"><i class="bi bi-clock-history"></i></div>
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
      <div class="table-title">Missions</div>
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
        <tbody id="missionsBody">
          <tr class="empty-row">
            <td colspan="6">
              <div class="empty-icon"><i class="bi bi-inbox"></i></div>
              <div class="empty-title">No missions yet</div>
              <div class="empty-sub">Create your first mission to get started.</div>
            </td>
          </tr>
        </tbody>
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