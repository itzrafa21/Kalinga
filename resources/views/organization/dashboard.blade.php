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
          <colgroup>
            <col style="width: 18%">
            <col style="width: 30%">
            <col style="width: 14%">
            <col style="width: 10%">
            <col style="width: 12%">
            <col style="width: 16%">
          </colgroup>
          <thead>
            <tr>
              <th>Missions</th>
              <th>Description</th>
              <th>Type</th>
              <th class="col-volunteers">Volunteers</th>
              <th class="col-status">Status</th>
              <th class="col-actions">Actions</th>
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