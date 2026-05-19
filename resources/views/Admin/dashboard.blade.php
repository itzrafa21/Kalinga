<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite([
    'resources/css/app.css',
    'resources/js/admin-dashboard.js'
  ])
  <style>
    .org-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1040;
}
.org-modal-backdrop:not([hidden]) { display: block; }

.org-details-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92vw);
  max-height: 90vh;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  z-index: 1050;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}
#missionDetailsModal {
  z-index: 1060;
}
#missionDetailsBackdrop {
  z-index: 1055;
}
/* Mission reject modal */
.reject-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 36, 25, 0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}
.reject-modal-overlay.is-open {
  display: flex;
}
.reject-modal-overlay[hidden] {
  display: none !important;
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
  box-sizing: border-box;
}
.reject-modal textarea:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
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

/* Mission approve success modal */
.success-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 36, 25, 0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 1rem;
}
.success-modal-overlay.is-open {
  display: flex;
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
  color: #16a34a;
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
  background: #16a34a;
  color: #fff;
}
.success-modal-confirm:hover {
  background: #15803d;
}
.org-details-modal[hidden] { display: none !important; }

.org-details-modal__header {
  background: #16a34a;
  color: #fff;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.org-details-modal__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 0.95rem;
}
.org-details-modal__title-wrap h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.org-details-modal__close-x {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.9;
}
.org-details-modal__close-x:hover { opacity: 1; }

.org-details-modal__body {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.org-detail-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #eee;
}
.org-detail-row__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f5ee;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.9rem;
}
.org-detail-row__content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}
.org-detail-row__label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}
.org-detail-row__value {
  color: #555;
  font-size: 0.9rem;
  text-align: right;
  word-break: break-word;
}
.org-status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: #28a745;
  color: #fff;
}
.org-status-badge.registered { background: #6c757d; }

.org-details-modal__footer {
  padding: 1.25rem;
  text-align: center;
  border-top: 1px solid #eee;
}
.org-details-modal__close-btn {
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 2.5rem;
  font-weight: 600;
  cursor: pointer;
}
.org-details-modal__close-btn:hover { background: #15803d; }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f6f8;
      height: 100vh;
    }
    .shell { display: flex; height: 100vh; overflow: hidden; }

    .sidebar {
      width: 210px; min-width: 210px; background: #fff;
      border-right: 1px solid #eaecef;
      display: flex; flex-direction: column; height: 100vh;
    }
    .sb-header { padding: 20px 16px 16px; border-bottom: 1px solid #f0f2f5; }
    .sb-brand { display: flex; align-items: center; gap: 10px; }
    .sb-icon {
      width: 28px; height: 28px; background: #16a34a; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sb-icon i { color: #fff; font-size: 15px; }
    .sb-title { font-size: 14px; font-weight: 600; color: #111; }
    .sb-sub { font-size: 10px; color: #b0b0b0; margin-top: 1px; }
    .sb-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
    .sb-section {
      font-size: 10px; color: #c8c8c8; padding: 10px 8px 5px;
      letter-spacing: .07em; text-transform: uppercase; font-weight: 500;
    }
    .nav-item {
      display: flex; align-items: center; gap: 9px;
      padding: 9px 11px; border-radius: 8px; font-size: 13px; color: #666;
      cursor: pointer; margin-bottom: 2px; text-decoration: none;
      transition: background .12s, color .12s;
    }
    .nav-item:hover { background: #f4f5f7; color: #222; }
    .nav-item.active { background: #f0fdf4; color: #16a34a; font-weight: 500; }
    .nav-item i { font-size: 17px; }
    .sb-footer { padding: 14px; border-top: 1px solid #f0f2f5; }
    .sb-user {
      font-size: 11px; color: #b0b0b0; margin-bottom: 8px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .logout-btn {
      display: flex; align-items: center; gap: 6px; font-size: 12px;
      color: #ef4444; cursor: pointer; background: none; border: none;
      padding: 0; font-family: inherit;
    }
    .logout-btn:hover { color: #dc2626; }

    .main {
      flex: 1; overflow-y: auto; background: #f5f6f8;
      display: flex; flex-direction: column;
    }
    .topbar {
      background: #fff; border-bottom: 1px solid #eaecef;
      padding: 0 24px; height: 50px;
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .topbar-title { font-size: 14px; font-weight: 600; color: #111; }
    .topbar-user { font-size: 12px; color: #b0b0b0; }
    .content { padding: 24px; flex: 1; }

    .stat-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 12px; margin-bottom: 20px;
    }
    @media (max-width: 992px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 576px) { .stat-grid { grid-template-columns: 1fr; } }
    .stat-card {
      background: #fff; border: 1px solid #eaecef;
      border-radius: 10px; padding: 16px 18px;
    }
    .stat-icon { font-size: 20px; color: #16a34a; margin-bottom: 8px; }
    .stat-val { font-size: 26px; font-weight: 600; color: #111; line-height: 1; }
    .stat-label { font-size: 11px; color: #aaa; margin-top: 4px; }

    .chart-row {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 14px; margin-bottom: 20px;
    }
    @media (max-width: 768px) { .chart-row { grid-template-columns: 1fr; } }
    .chart-card {
      background: #fff; border: 1px solid #eaecef;
      border-radius: 10px; padding: 18px;
    }
    .chart-title { font-size: 13px; font-weight: 500; color: #444; margin-bottom: 10px; }

    .admin-card {
      border: 1px solid #eaecef; border-radius: 10px;
      box-shadow: none; margin-bottom: 14px; background: #fff;
    }
    .admin-card:hover { transform: none; }
    .admin-card .card-header {
      background: #fff; border-bottom: 1px solid #f0f2f5;
      font-size: 14px; font-weight: 600;
    }
    .table-responsive { border-radius: 10px; overflow: hidden; }
    .search-box, .filter-dropdown {
      border-radius: 8px; border: 1px solid #e5e7eb; padding: 7px 12px; font-size: 12px;
    }
    .search-box:focus, .filter-dropdown:focus {
      border-color: #16a34a; box-shadow: 0 0 0 2px #dcfce7;
    }
    .btn-admin {
      background: #16a34a; border: none; color: #fff; border-radius: 8px;
      padding: 8px 16px; font-weight: 500;
    }
    .btn-admin:hover { background: #15803d; transform: none; box-shadow: none; }
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="sb-brand">
        <div class="sb-icon"><i class="ti ti-shield"></i></div>
        <div>
          <div class="sb-title">Kalinga</div>
          <div class="sb-sub">Management System</div>
        </div>
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">Main</div>
      <a class="nav-item active" href="#dashboard" data-tab="dashboard">
        <i class="ti ti-layout-dashboard"></i> Dashboard
      </a>
      <a class="nav-item" href="#organizations" data-tab="organizations">
        <i class="ti ti-building"></i> Organizations
      </a>
      <a class="nav-item" href="#missions" data-tab="missions">
        <i class="ti ti-target"></i> Missions
      </a>
      <a class="nav-item" href="#volunteers" data-tab="volunteers">
        <i class="ti ti-users"></i> Volunteers
      </a>
      <div class="sb-section">System</div>
      <a class="nav-item" href="#analytics" data-tab="analytics">
        <i class="ti ti-chart-bar"></i> Analytics
      </a>
    </nav>
    <div class="sb-footer">
      <div class="sb-user" id="adminEmailSidebar"></div>
      <button type="button" class="logout-btn" id="adminLogoutBtn">
        <i class="ti ti-logout"></i> Logout
      </button>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <span class="topbar-title" id="topbarTitle">Dashboard</span>
      <span class="topbar-user" id="adminEmail"></span>
    </div>
    <div class="content">

    <div id="dashboard-tab" class="tab-content">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon"><i class="ti ti-users"></i></div>
          <div class="stat-val" id="totalUsers">-</div>
          <div class="stat-label">Total users</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="ti ti-building"></i></div>
          <div class="stat-val" id="totalOrganizations">-</div>
          <div class="stat-label">Organizations</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="ti ti-target"></i></div>
          <div class="stat-val" id="totalMissions">-</div>
          <div class="stat-label">Active missions</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="ti ti-award"></i></div>
          <div class="stat-val" id="totalVolunteers">-</div>
          <div class="stat-label">Volunteers</div>
        </div>
      </div>
    </div>

    <!-- Organizations Tab -->
    <div id="organizations-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-building"></i> Organization Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="orgSearch" placeholder="Search organizations...">
            <select class="form-select filter-dropdown" id="orgFilter">
              <option value="all">All organizations</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Contact email</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="organizationsTableBody">
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Missions Tab -->
    <div id="missions-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-bullseye"></i> Mission Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="missionSearch" placeholder="Search missions...">
            <select class="form-select filter-dropdown" id="missionFilter">
              <option value="all">All Missions</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Mission Name</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="missionsTableBody">
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Volunteers Tab -->
    <div id="volunteers-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-hands-helping"></i> Volunteer Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="volunteerSearch" placeholder="Search volunteers...">
            <select class="form-select filter-dropdown" id="volunteerFilter">
              <option value="all">All Volunteers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="top">Top Performers</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Missions Joined</th>
                  <th>Hours Volunteered</th>
                  <th>Badges</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="volunteersTableBody">
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div id="analytics-tab" class="tab-content" style="display: none;">
      <div class="row">
        <div class="col-md-6 mb-4">
          <div class="card admin-card">
            <div class="card-header">
              <h5 class="mb-0"><i class="fas fa-chart-bar"></i> Activity Analytics</h5>
            </div>
            <div class="card-body">
              <canvas id="activityChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-4">
          <div class="card admin-card">
            <div class="card-header">
              <h5 class="mb-0"><i class="fas fa-chart-pie"></i> Mission Types</h5>
            </div>
            <div class="card-body">
              <canvas id="missionTypesChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="card admin-card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-download"></i> Export Reports</h5>
              <div class="d-flex gap-2">
                <button class="btn btn-admin" onclick="exportReport('csv')">
                  <i class="fas fa-file-csv"></i> Export CSV
                </button>
                <button class="btn btn-admin" onclick="exportReport('pdf')">
                  <i class="fas fa-file-pdf"></i> Export PDF
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Report Type</label>
                    <select class="form-select" id="reportType">
                      <option value="users">Users Report</option>
                      <option value="missions">Missions Report</option>
                      <option value="volunteers">Volunteers Report</option>
                      <option value="donations">Donations Report</option>
                      <option value="attendance">Attendance Report</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Date From</label>
                    <input type="date" class="form-control" id="dateFrom">
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Date To</label>
                    <input type="date" class="form-control" id="dateTo">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>
  </div>
</div>

<!-- Organization details modal -->
<div class="org-modal-backdrop" id="orgDetailsBackdrop" hidden></div>
<div class="org-details-modal" id="orgDetailsModal" role="dialog" aria-labelledby="orgDetailsTitle" hidden>
  <div class="org-details-modal__header">
    <div class="org-details-modal__title-wrap">
      <i class="fas fa-building"></i>
      <h2 id="orgDetailsTitle">ORGANIZATION DETAILS</h2>
    </div>
    <button type="button" class="org-details-modal__close-x" id="orgDetailsCloseX" aria-label="Close">&times;</button>
  </div>
  <div class="org-details-modal__body" id="orgDetailsBody"></div>
  <div class="org-details-modal__footer">
    <button type="button" class="org-details-modal__close-btn" id="orgDetailsCloseBtn">Close</button>
  </div>
</div>

<!-- Mission details modal -->
<div class="org-modal-backdrop" id="missionDetailsBackdrop" hidden></div>
<div class="org-details-modal" id="missionDetailsModal" role="dialog" aria-labelledby="missionDetailsTitle" hidden>
  <div class="org-details-modal__header">
    <div class="org-details-modal__title-wrap">
      <i class="fas fa-bullseye"></i>
      <h2 id="missionDetailsTitle">MISSION DETAILS</h2>
    </div>
    <button type="button" class="org-details-modal__close-x" id="missionDetailsCloseX" aria-label="Close">&times;</button>
  </div>
  <div class="org-details-modal__body" id="missionDetailsBody"></div>
  <div class="org-details-modal__footer">
    <button type="button" class="org-details-modal__close-btn" id="missionDetailsCloseBtn">Close</button>
  </div>
</div>

<!-- Mission approve success modal -->
<div
  id="missionApproveSuccessModal"
  class="success-modal-overlay"
  hidden
  aria-modal="true"
  role="dialog"
  aria-labelledby="missionApproveSuccessTitle"
>
  <div class="success-modal" role="document">
    <div class="success-modal-icon" aria-hidden="true">
      <i class="fas fa-check-circle"></i>
    </motion.div>
    <h2 id="missionApproveSuccessTitle">Mission approved</h2>
    <p class="success-modal-message">
      The mission was approved and published. It is now visible to volunteers.
    </p>
    <div class="success-modal-actions">
      <button type="button" class="success-modal-confirm" id="missionApproveSuccessOk">OK</button>
    </div>
  </div>
</div>

<!-- Mission reject reason modal -->
<div
  id="missionRejectModal"
  class="reject-modal-overlay"
  hidden
  aria-modal="true"
  role="dialog"
  aria-labelledby="missionRejectModalTitle"
>
<div class="reject-modal" role="document">
    <h2 id="missionRejectModalTitle">Reject mission</h2>
    <p class="reject-modal-help">Please provide a reason for rejecting this mission. The organization may see this message.</p>
    <label for="missionRejectReasonInput">Reason (required)</label>
    <textarea
      id="missionRejectReasonInput"
      rows="4"
      placeholder="e.g. Incomplete details, policy violation…"
      autocomplete="off"
    ></textarea>
    <p id="missionRejectReasonError" class="reject-modal-error" role="alert"></p>
    <div class="reject-modal-actions">
      <button type="button" class="reject-modal-cancel" id="missionRejectCancel">Cancel</button>
      <button type="button" class="reject-modal-confirm" id="missionRejectConfirm">Reject mission</button>
    </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</body>
</html>
