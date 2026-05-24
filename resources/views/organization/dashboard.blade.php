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
    'resources/js/organization-sidebar.js',
    'resources/js/organization-dashboard.js',
    'resources/js/mission-dashboard.js',
    'resources/js/organization-logout.js',
  ])
  @include('partials.org-layout-styles')
  <style>

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
    .stat-card-header.card-teal {
      background:rgb(255, 255, 255);
      color: #fff;
    }
    .stat-card-header.card-amber {
      background: rgb(255, 255, 255);
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
    .stat-card-header.card-purple .stat-card-icon {
      border-color: rgba(56, 107, 87, 0.35);
      background: rgba(56, 107, 87, 0.08);
    }
    .stat-card-header.card-purple .stat-card-icon i {
      color: rgb(56, 107, 87);
    }
    .stat-card-header.card-amber .stat-card-icon {
      border-color: rgba(217, 119, 6, 0.35);
      background: rgba(217, 119, 6, 0.1);
    }
    .stat-card-header.card-amber .stat-card-icon i {
      color: #d97706;
    }
    .toolbar-filter {
      min-width: 160px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #fff;
    }
    .create-btn--sm {
      padding: 8px 14px;
      font-size: 0.85rem;
      margin-top: 0.75rem;
    }
    .table-wrap {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      overflow-x: auto;
    }
    #missionsTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    #missionsTable th,
    #missionsTable td {
      padding: 12px 14px;
      border-bottom: 1px solid #eee;
      font-size: 0.9rem;
      vertical-align: middle;
    }
    #missionsTable th {
      background: rgb(56, 107, 87);
      font-weight: 600;
      color: rgb(255, 255, 255);
      text-align: left;
      white-space: nowrap;
    }
    #missionsTable td {
      font-weight: 400;
      color: #333;
      text-align: left;
      word-break: break-word;
    }
    #missionsTable th.col-volunteers,
    #missionsTable td.col-volunteers,
    #missionsTable th.col-status,
    #missionsTable td.col-status,
    #missionsTable th.col-actions,
    #missionsTable td.col-actions {
      text-align: center;
    }
    #missionsTable td.col-description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 0;
    }
    #missionsTable td.col-mission {
      font-weight: 600;
      color: #1e3a2f;
    }
    .mission-name-link {
      color: #166534;
      font-weight: 600;
      text-decoration: none;
    }
    .mission-name-link:hover {
      color: #15803d;
      text-decoration: underline;
    }
    .mission-location-sub {
      font-size: 0.78rem;
      font-weight: 400;
      color: #64748b;
      margin-top: 0.2rem;
    }
    .mission-tag {
      display: inline-block;
      margin-left: 0.35rem;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      font-size: 0.68rem;
      font-weight: 600;
      vertical-align: middle;
    }
    .volunteer-progress {
      font-weight: 600;
      color: #1e3a2f;
    }
    .mission-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      border-radius: 6px;
      background: #22a447;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }
    .mission-action-btn:hover {
      background: #1d923e;
      color: #fff;
    }
    #missionsTable tbody tr.missions-loading-row td,
    #missionsTable tbody td.missions-error-cell {
      text-align: center !important;
      padding: 2rem 1rem !important;
      color: #64748b;
    }
    .missions-loading,
    .missions-error {
      text-align: center;
      color: #64748b;
    }
    .missions-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      margin: 0 auto;
      padding: 0.5rem 0;
    }
    .missions-loading-spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #166534;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .missions-loading i {
      animation: spin 1s linear infinite;
      margin-right: 0.35rem;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    #missionsTable tbody tr:has(.missions-empty) td {
      text-align: center !important;
      padding: 2rem 1rem !important;
    }
    .missions-empty {
      text-align: center;
      padding: 2rem 1rem;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      margin: 0 auto;
    }
    .missions-empty i {
      font-size: 2rem;
      color: #94a3b8;
      display: block;
      margin-bottom: 0.5rem;
    }
    .missions-empty h4 {
      margin: 0 0 0.35rem;
      color: #334155;
      font-size: 1rem;
    }
    .missions-empty p {
      margin: 0;
      font-size: 0.88rem;
    }
    #missionsTable tbody tr:hover { background: #f8f9fa; }
    #missionsTable tbody tr:nth-child(even) { background: #fafafa; }
    #missionsTable tbody tr:nth-child(even):hover { background: #f0f4f0; }
    .mission-status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }
    .mission-status--open { background: #dbeafe; color: #1d4ed8; }
    .mission-status--ongoing { background: #cffafe; color: #0e7490; }
    .mission-status--completed { background: #dcfce7; color: #15803d; }
    .mission-status--pending { background: #fef3c7; color: #b45309; }
    .mission-status--rejected { background: #fee2e2; color: #b91c1c; }
    .mission-status--default { background: #f3f4f6; color: #4b5563; }
    .missions td.col-actions {
      white-space: nowrap;
    }

  </style>
</head>
<body class="org-app">

@include('partials.org-sidebar', ['activeNav' => 'dashboard'])

<main class="org-main-content main-content">
  <div class="page-header">
    <p class="page-welcome">
      Welcome, <span id="orgNameWelcome">Organization</span>!
    </p>
    <h1 class="page-title">Mission Management</h1>
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
      <div class="stat-card">
        <div class="stat-card-header card-amber">
          <span class="stat-card-title">Pending Approval</span>
          <p class="stat-card-value" id="pendingMissions">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-hourglass-split"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="missions">
      <div class="toolbar">
        <input type="text" class="toolbar-search" id="missionSearch" placeholder="Search missions..." aria-label="Search missions">
        <select class="toolbar-filter" id="missionStatusFilter" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="ongoing">Ongoing</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <div class="toolbar-actions">
          <button type="button" class="create-btn" onclick="window.location.href='/missions/create'">
            <i class="bi bi-plus-lg"></i> Create New Mission
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table id="missionsTable">
          <colgroup>
            <col style="width: 22%">
            <col style="width: 14%">
            <col style="width: 14%">
            <col style="width: 12%">
            <col style="width: 12%">
            <col style="width: 12%">
          </colgroup>
          <thead>
            <tr>
              <th>Mission</th>
              <th>Date</th>
              <th>Type</th>
              <th class="col-volunteers">Volunteers</th>
              <th class="col-status">Status</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="missionsBody">
            <tr class="missions-loading-row">
              <td colspan="6">
                <div class="missions-loading">
                  <div class="missions-loading-spinner" aria-hidden="true"></div>
                  <span>Loading missions…</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</body>
</html>