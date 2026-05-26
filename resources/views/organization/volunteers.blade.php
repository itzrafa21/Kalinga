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
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/volunteer.js',
    'resources/js/firebase.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
    }

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
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #eee;
    }

    .stat-card-header {
      padding: 1.25rem 1.25rem 1rem;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 90px;
      background: #fff;
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

    .stat-card-header.card-teal .stat-card-icon {
      border-color: rgba(56, 107, 87, 0.35);
      background: rgba(56, 107, 87, 0.08);
    }

    .stat-card-header.card-teal .stat-card-icon i {
      color: rgb(56, 107, 87);
    }

    .stat-card-header.card-amber .stat-card-icon {
      border-color: rgba(217, 119, 6, 0.35);
      background: rgba(217, 119, 6, 0.1);
    }

    .stat-card-header.card-amber .stat-card-icon i {
      color: #d97706;
    }

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

    .toolbar-filter {
      min-width: 160px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #fff;
    }

    .table-wrap {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
      border: 1px solid #d8e8df;
      overflow-x: auto;
    }

    #volunteersTable {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    #volunteersTable th,
    #volunteersTable td {
      padding: 8px 10px;
      font-size: 0.85rem;
      vertical-align: middle;
    }

    #volunteersTable thead th {
      padding: 12px 14px;
      background: #386b57;
      font-weight: 600;
      color: #ffffff;
      text-align: left;
      white-space: nowrap;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      font-size: 14px;
      border-bottom: 2px solid #163d30;
      border-right: none;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }

    #volunteersTable thead th:first-child {
      border-radius: 11px 0 0 0;
    }

    #volunteersTable thead th:last-child {
      border-radius: 0 11px 0 0;
    }

    #volunteersTable tbody td {
      font-weight: 400;
      color: #374151;
      text-align: left;
      word-break: break-word;
      background: #fff;
      border-bottom: 1px solid #c5d9ce;
      border-right: none;
    }

    #volunteersTable th.col-actions,
    #volunteersTable td.col-actions {
      text-align: center;
    }

    #volunteersTable td.col-actions {
      white-space: nowrap;
    }

    .volunteer-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e3a2f;
    }

    #volunteersTable td.col-email,
    #volunteersTable td.col-phone {
      font-size: 12px;
      color: #4b5563;
    }

    .mission-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 6px;
      background: #275735;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }

    .mission-action-btn:hover {
      background: #1d923e;
      color: #fff;
    }

    #volunteersTable tbody tr:hover td {
      background: #eef6f1;
    }

    #volunteersTable tbody tr:nth-child(even) td {
      background: #f6faf8;
    }

    #volunteersTable tbody tr:nth-child(even):hover td {
      background: #e8f3ec;
    }

    #volunteersTable tbody tr:last-child td:first-child {
      border-radius: 0 0 0 11px;
    }

    #volunteersTable tbody tr:last-child td:last-child {
      border-radius: 0 0 11px 0;
    }

    tr.volunteer-application-row.volunteer-row-paged-out {
      display: none !important;
    }

    #volunteersTable tbody tr:has(.missions-empty) td,
    #volunteersTable tbody tr:has(.missions-loading) td,
    #volunteersTable tbody tr:has(.missions-error) td {
      text-align: center !important;
      padding: 2rem 1rem !important;
    }

    .missions-empty,
    .missions-loading {
      text-align: center;
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

    .missions-loading-spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #166534;
      border-radius: 50%;
      animation: vol-spin 1s linear infinite;
    }

    @keyframes vol-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .volunteers-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .volunteers-pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .volunteers-page-size-label {
      font-size: 0.85rem;
      color: #64748b;
      margin-right: 0.35rem;
    }

    .volunteers-page-size,
    .volunteers-page-btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.85rem;
      background: #fff;
    }

    .volunteers-page-btn {
      font-weight: 600;
      cursor: pointer;
      color: #1e3a2f;
    }

    .volunteers-page-btn:hover:not(:disabled) {
      background: #eef6f1;
      border-color: #86efac;
    }

    .volunteers-page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #volunteerPageInfo {
      font-size: 0.85rem;
      color: #64748b;
      min-width: 6rem;
      text-align: center;
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

    @media (max-width: 768px) {
      .stat-card { min-width: 100%; }
      .toolbar-search,
      .toolbar-filter { min-width: 100%; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'volunteers'])

  <main class="org-main-content main-content" id="mainContent">
    <h1 class="page-title">Volunteers</h1>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-card-header card-purple">
          <span class="stat-card-title">Total Volunteers</span>
          <p class="stat-card-value" id="totalVolunteers">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-people"></i>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header card-teal">
          <span class="stat-card-title">Total Volunteer Hours</span>
          <p class="stat-card-value" id="totalVolunteerHours">0</p>
          <div class="stat-card-icon">
            <i class="bi bi-clock-history"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="missions">
      <div class="toolbar">
        <input
          type="search"
          id="searchInput"
          class="toolbar-search"
          placeholder="Search by name or email..."
          autocomplete="off"
          aria-label="Search volunteers"
        >
        <select id="filterSelect" class="toolbar-filter" aria-label="Filter by period">
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="older">Older</option>
          <option value="all" selected>All time</option>
        </select>
      </div>

      <div class="table-wrap">
        <table id="volunteersTable">
          <colgroup>
            <col style="width: 24%">
            <col style="width: 28%">
            <col style="width: 18%">
            <col style="width: 30%">
          </colgroup>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="volunteerTableBody">
            <tr class="missions-loading-row">
              <td colspan="4">
                <div class="missions-loading">
                  <div class="missions-loading-spinner" aria-hidden="true"></div>
                  <span>Loading volunteers…</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      @include('partials.org-cache-hydrate')

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
    </div>
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
</body>
</html>
