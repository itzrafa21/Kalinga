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

    /* Sidebar (dashboard style) */
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
      width: 100%;
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
  padding: 1.25rem 1.25rem 1.5rem;
  min-height: 100vh;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.15rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.page-title i { color: #22a447; font-size: 0.95rem; }

.page-subtitle {
  margin: 0 0 0.85rem;
  color: #6b7280;
  font-size: 0.75rem;
}

/* Stats */
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
.card-icon.orange { background: #fff4e6; color: #f59e0b; }
.card-icon.blue { background: #ebf3ff; color: #2f80ed; }

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

/* Filter section */
.controls-section {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8edf2;
  box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  padding: 0.9rem;
  margin-bottom: 0.8rem;
}
.controls-header h3 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.controls-header h3 i { color: #22a447; font-size: 0.85rem; }

.controls-row {
  display: flex;
  gap: 1rem;
  align-items: end;
  flex-wrap: wrap;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.control-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
input, select {
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid #e5eaf0;
  outline: none;
  font-size: 0.78rem;
  min-width: 160px;
  background: #fff;
}
#searchInput {
  min-width: 240px;
  padding-left: 30px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' fill='%239aa4b2' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.398 1.398l3.85 3.85a1 1 0 1 0 1.414-1.414l-3.85-3.85zM12 6.5a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 10px center;
}

/* Table section */
.volunteers-section {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8edf2;
  box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  padding: 0.9rem;
}
.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.volunteers-section h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.volunteers-section h3 i { color: #22a447; font-size: 0.85rem; }

.export-btn {
  height: 30px;
  border: 1px solid #e5eaf0;
  background: #fff;
  color: #6b7280;
  border-radius: 7px;
  padding: 0 10px;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.volunteers-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
}
.volunteers-table th, .volunteers-table td {
  padding: 10px 10px;
  text-align: left;
  border-bottom: 1px solid #eef2f6;
  font-size: 0.73rem;
  vertical-align: middle;
}
.volunteers-table th {
  background:rgb(209, 209, 209);
  color:rgb(0, 0, 0);
  font-weight: 700;
}
.volunteers-table tbody tr:hover { background: #f9fbfd; }
.volunteers-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #666;
}
.volunteers-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.volunteers-page-size-label {
  font-size: 0.85rem;
  color: #555;
  margin-right: 0.35rem;
}
.volunteers-page-size {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
}
.volunteers-page-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.volunteers-page-btn {
  padding: 0.4rem 0.85rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}
.volunteers-page-btn:hover:not(:disabled) {
  background: #f0f4f0;
  border-color: #2d6a4f;
}
.volunteers-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
#volunteerPageInfo {
  font-size: 0.85rem;
  color: #555;
  min-width: 6rem;
  text-align: center;
}
tr.volunteer-application-row.volunteer-row-paged-out {
  display: none !important;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25px;
}
.pending-badge { background: #fff4db; color: #b7791f; box-shadow: none; }
.approved-badge { background: #def7e8; color: #1f9d55; box-shadow: none; }
.rejected-badge { background: #fee2e2; color: #b91c1c; box-shadow: none; }
.closed-badge { background: #e5e7eb; color: #4b5563; box-shadow: none; }
.unknown-badge { background: #e5e7eb; color: #4b5563; box-shadow: none; }

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  margin-right: 5px;
  text-decoration: none;
  white-space: nowrap;
}
.accept-btn { background: #22a447; color: #fff; box-shadow: none; }
.accept-btn:hover { background: #1d923e; transform: none; box-shadow: none; }
.reject-btn { background: #ef4444; color: #fff; box-shadow: none; }
.reject-btn:hover { background: #dc2626; transform: none; box-shadow: none; }

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

/* Responsive */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .topbar, .main-content { margin-left: 0; }
  .topbar { padding-left: 3rem; }

  .stats { grid-template-columns: 1fr; }
  .controls-row, .control-group { flex-direction: column; align-items: stretch; }
  input, select, #searchInput { min-width: auto; width: 100%; }
}
/* Reject reason modal */
.reject-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 36, 25, 0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 1rem;
}
.reject-modal-overlay.is-open {
  display: flex;
}
.reject-modal {
  background: #fff;
  border-radius: 16px;
  max-width: 440px;
  width: 100%;
  padding: 1.5rem 1.5rem 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.reject-modal h2 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
  color: #0f2419;
}
.reject-modal-help {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.45;
}
.reject-modal label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.4rem;
}
.reject-modal textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
.reject-modal textarea:focus {
  outline: none;
  border-color: #2d6a4f;
  box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.2);
}
.reject-modal-error {
  min-height: 1.25rem;
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: #b91c1c;
}
.reject-modal-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  margin-top: 1.15rem;
}
.reject-modal-actions button {
  border: none;
  border-radius: 10px;
  padding: 0.55rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
.reject-modal-cancel {
  background: #f1f5f9;
  color: #334155;
}
.reject-modal-cancel:hover {
  background: #e2e8f0;
}
.reject-modal-confirm {
  background: #ef4444;
  color: #fff;
}
.reject-modal-confirm:hover {
  background: #dc2626;
}
/* Volunteer status success modal */
.success-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 36, 25, 0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3100;
  padding: 1rem;
}
.success-modal-overlay.is-open {
  display: flex !important;
}
.success-modal-overlay[hidden] {
  display: none !important;
}
.success-modal {
  background: #fff;
  border-radius: 16px;
  max-width: 420px;
  width: 100%;
  padding: 1.75rem 1.5rem 1.25rem;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.success-modal-icon {
  font-size: 3rem;
  color: #2d6a4f;
  margin-bottom: 0.75rem;
  line-height: 1;
}
.success-modal h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: #0f2419;
}
.success-modal-message {
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.5;
}
.success-modal-actions {
  display: flex;
  justify-content: center;
}
.success-modal-confirm {
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  background: #2d6a4f;
  color: #fff;
}
.success-modal-confirm:hover {
  background: #245a42;
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
      <a href="/missions/history"><i class="bi bi-journal-text"></i> History of Missions</a>
      <a href="/organization/volunteers" class="active"><i class="bi bi-people"></i> Volunteers</a>
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

  <main class="main-content" id="mainContent">
  <h1 class="page-title">
    <i class="bi bi-people"></i>
    Volunteers
  </h1>
  <p class="page-subtitle">Manage volunteer applications and approvals</p>

  <div class="stats">
    <div class="card">
      <div class="card-icon green"><i class="bi bi-people"></i></div>
      <div>
        <h2 id="totalVolunteers">0</h2>
        <p>Total Volunteers</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon orange"><i class="bi bi-clock-history"></i></div>
      <div>
        <h2 id="pendingVolunteers">0</h2>
        <p>Pending Approval</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon blue"><i class="bi bi-shield-check"></i></div>
      <div>
        <h2 id="approvedVolunteers">0</h2>
        <p>Approved</p>
      </div>
    </div>
  </div>

  <section class="controls-section">
    <div class="controls-header">
      <h3><i class="bi bi-search"></i> Filter & Search</h3>
    </div>
    <motion.div class="controls-row">
      <div class="control-group">
        <label for="filterSelect">Period</label>
        <select id="filterSelect">
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="older">Older</option>
          <option value="all" selected>All time</option>
        </select>
      </div>
      <div class="control-group control-group--search">
        <label for="searchInput">Search</label>
        <input type="text" id="searchInput" placeholder="Search by name or email...">
      </div>
    </div>
  </section>

  <section class="volunteers-section">
    <div class="table-head">
      <h3><i class="bi bi-clipboard-check"></i> Volunteer Applications</h3>
    </div>

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
    <div class="volunteers-footer">
      <span id="volunteerCountText">Showing 0 applications</span>

      <div class="volunteers-pagination">
        <label class="volunteers-page-size-label" for="volunteerPageSize">Rows per page</label>
        <select id="volunteerPageSize" class="volunteers-page-size" aria-label="Rows per page">
          <option value="10" selected>10</option>
          <option value="20">20</option>
          <option value="30">30</option>
          <option value="50">50</option>
        </select>

        <div class="volunteers-page-nav">
          <button type="button" class="volunteers-page-btn" id="volunteerPrevPage" disabled>Previous</button>
          <span id="volunteerPageInfo">Page 1 of 1</span>
          <button type="button" class="volunteers-page-btn" id="volunteerNextPage" disabled>Next</button>
        </div>
      </div>
    </div>
  </section>
</main>

<div
    id="rejectReasonModal"
    class="reject-modal-overlay"
    hidden
    aria-modal="true"
    role="dialog"
    aria-labelledby="rejectModalTitle"
  >
    <div class="reject-modal" role="document">
      <h2 id="rejectModalTitle">Reason for rejection</h2>
      <p class="reject-modal-help">Explain why this application is being rejected. This may be shown to the volunteer.</p>
      <label for="rejectReasonInput">Reason (required)</label>
      <textarea
        id="rejectReasonInput"
        rows="4"
        placeholder="e.g. Mission capacity filled, schedule mismatch…"
        autocomplete="off"
      ></textarea>
      <p id="rejectReasonError" class="reject-modal-error" role="alert"></p>
      <div class="reject-modal-actions">
        <button type="button" class="reject-modal-cancel" id="rejectModalCancel">Cancel</button>
        <button type="button" class="reject-modal-confirm" id="rejectModalConfirm">Reject application</button>
      </div>
    </div>
  </div>

  <div
  id="volunteerStatusSuccessModal"
  class="success-modal-overlay"
  hidden
  aria-modal="true"
  role="dialog"
  aria-labelledby="volunteerStatusSuccessTitle"
>
  <div class="success-modal" role="document">
    <div class="success-modal-icon" aria-hidden="true">
      <i class="bi bi-check-circle-fill"></i>
    </div>
    <h2 id="volunteerStatusSuccessTitle">Success</h2>
    <p class="success-modal-message" id="volunteerStatusSuccessMessage"></p>
    <div class="success-modal-actions">
      <button type="button" class="success-modal-confirm" id="volunteerStatusSuccessOk">OK</button>
    </div>
  </div>
</div>
  

  <script>
    // Optional: if you add a mobile hamburger later, toggle sidebar.open here
  </script>
</body>
</html>