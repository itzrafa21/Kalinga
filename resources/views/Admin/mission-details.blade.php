<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Details - Kalinga Admin</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite(['resources/css/app.css', 'resources/js/admin-mission-details.js'])
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f6f8;
      height: 100vh;
      color: #111;
    }
    .shell { display: flex; height: 100vh; overflow: hidden; }
    .sidebar {
      width: 210px; min-width: 210px; background: #fff;
      border-right: 1px solid #eaecef;
      display: flex; flex-direction: column; height: 100vh;
    }
    .sb-header { padding: 20px 16px 16px; border-bottom: 1px solid #f0f2f5; }
    @include('partials.sidebar-logo-mark-styles')
    .sb-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
    .sb-section {
      font-size: 10px; color: #c8c8c8; padding: 10px 8px 5px;
      letter-spacing: .07em; text-transform: uppercase; font-weight: 500;
    }
    .nav-item {
      display: flex; align-items: center; gap: 9px;
      padding: 9px 11px; border-radius: 8px; font-size: 13px; color: #666;
      text-decoration: none; margin-bottom: 2px;
    }
    .nav-item:hover { background: #f4f5f7; color: #222; }
    .nav-item.active { background: #aaf0ba; color: #000000; font-weight: 500; }
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
      flex: 1; overflow: hidden; background: #f5f6f8;
      display: flex; flex-direction: column; min-width: 0;
    }
    .topbar {
      background: #fff; border-bottom: 1px solid #eaecef;
      padding: 0 24px; height: 50px;
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .topbar-title {
      font-size: 14px;
      font-weight: 600;
      color: #111;
      text-decoration: none;
      cursor: pointer;
    }
    .topbar-title:hover { color: #16a34a; text-decoration: underline; }
    .topbar-user { font-size: 12px; color: #b0b0b0; }
    .content {
      padding: 0;
      flex: 1;
      min-height: 0;
      display: flex;
      background: #fff;
    }
    .org-page {
      background: #fff;
      border: none;
      border-radius: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      height: 100%;
    }
    .org-page__header {
      background: #16a34a;
      color: #fff;
      padding: 1.1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    .org-page__header h1 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .org-page__header i { font-size: 1.1rem; }
    .org-page__status[hidden],
    .org-page__body[hidden],
    .org-page__footer[hidden] { display: none !important; }
    .org-page__status { padding: 2rem 1.5rem; color: #64748b; }
    .org-page__status.is-error { color: #b91c1c; }
    .org-page__body { overflow-y: auto; flex: 1; min-height: 0; }
    .org-fields { display: grid; grid-template-columns: 1fr; }
    .org-section-label {
      grid-column: 1 / -1;
      padding: 0.85rem 1.5rem 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #16a34a;
      background: #f8faf9;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #f3f4f6;
    }
    .org-section-label:first-child { border-top: none; }
    .org-detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #eee;
      min-width: 0;
      grid-column: 1 / -1;
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
      margin-top: 0.1rem;
    }
    .org-detail-row__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0.35rem;
      min-width: 0;
    }
    .org-detail-row__label {
      font-weight: 600;
      color: #333;
      font-size: 0.92rem;
    }
    .org-detail-row__value {
      color: #555;
      font-size: 0.92rem;
      text-align: justify;
      text-justify: inter-word;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
      width: 100%;
    }
    .org-detail-row__value a {
      color: #15803d;
      text-decoration: none;
    }
    .org-detail-row__value a:hover { text-decoration: underline; }
    .org-detail-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding: 1rem 1.5rem 0.85rem;
      border-bottom: 1px solid #eef2f0;
      background: #fff;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .org-detail-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      border: 1px solid #dbe4dc;
      background: #fff;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .org-detail-tab:hover {
      background: #f8faf9;
      color: #166534;
      border-color: #86efac;
    }
    .org-detail-tab.active {
      background: #ecfdf3;
      color: #166534;
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
    }
    .org-detail-panel[hidden] { display: none !important; }
    .org-detail-panel__title {
      margin: 0;
      padding: 1rem 1.5rem 0.35rem;
      font-size: 1rem;
      font-weight: 700;
      color: #14532d;
    }
    .org-doc-meta {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      width: 100%;
      max-width: 100%;
    }
    .org-doc-meta__sub {
      font-size: 0.78rem;
      color: #64748b;
    }
    .org-doc-meta a,
    .org-doc-download {
      color: #15803d;
      text-decoration: underline;
      font-weight: 600;
      word-break: break-word;
    }
    .org-doc-meta a:hover,
    .org-doc-download:hover {
      color: #166534;
    }
    .mission-docs {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      align-items: flex-start;
      width: 100%;
    }
    .org-status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      background: #64748b;
      color: #fff;
    }
    .org-status-badge.pending { background: #f59e0b; color: #111; }
    .org-status-badge.rejected { background: #ef4444; }
    .org-status-badge.open,
    .org-status-badge.approved,
    .org-status-badge.active,
    .org-status-badge.ongoing { background: #16a34a; }
    .org-status-badge.completed { background: #0284c7; }
    .org-page__footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #eee;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      background: #fff;
    }
    .org-page__actions { display: flex; flex-wrap: wrap; gap: 0.65rem; }
    .org-action {
      border-radius: 8px;
      padding: 0.65rem 1.15rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      text-decoration: none;
    }
    .org-action--reject {
      background: #fff;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    .org-action--reject:hover { background: #fef2f2; }
    .org-action--verify {
      background: #16a34a;
      color: #fff;
      border: none;
    }
    .org-action--verify:hover { background: #15803d; }
    .org-action--back {
      background: #16a34a;
      color: #fff;
      border: none;
      padding: 0.65rem 2.5rem;
    }
    .org-action--back:hover { background: #15803d; color: #fff; }
    .org-action:disabled { opacity: 0.6; cursor: not-allowed; }

    .reject-modal-overlay,
    .success-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .reject-modal-overlay.is-open,
    .success-modal-overlay.is-open { display: flex; }
    .reject-modal-overlay[hidden],
    .success-modal-overlay[hidden] { display: none !important; }
    .reject-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      padding: 1.5rem 1.5rem 1.25rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .reject-modal h2 { margin: 0 0 0.35rem; font-size: 1.15rem; color: #0f2419; }
    .reject-modal-help { margin: 0 0 1rem; font-size: 0.9rem; color: #64748b; line-height: 1.45; }
    .reject-modal label { display: block; font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem; }
    .reject-modal textarea {
      width: 100%; min-height: 100px; padding: 0.65rem 0.75rem;
      border: 1px solid #e2e8f0; border-radius: 10px; font-family: inherit;
      font-size: 0.9rem; resize: vertical;
    }
    .reject-modal textarea:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2); }
    .reject-modal-error { min-height: 1.25rem; margin: 0.5rem 0 0; font-size: 0.82rem; color: #b91c1c; }
    .reject-modal-actions { display: flex; gap: 0.65rem; justify-content: flex-end; margin-top: 1.15rem; }
    .reject-modal-actions button {
      border: none; border-radius: 10px; padding: 0.55rem 1rem;
      font-size: 0.88rem; font-weight: 600; cursor: pointer;
    }
    .reject-modal-cancel { background: #f1f5f9; color: #334155; }
    .reject-modal-confirm { background: #ef4444; color: #fff; }
    .success-modal {
      background: #fff; border-radius: 16px; max-width: 420px; width: 100%;
      padding: 1.75rem 1.5rem 1.25rem; text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .success-modal-icon { font-size: 3rem; color: #16a34a; margin-bottom: 0.75rem; line-height: 1; }
    .success-modal h2 { margin: 0 0 0.5rem; font-size: 1.25rem; color: #0f2419; }
    .success-modal-message { margin: 0 0 1.25rem; font-size: 0.95rem; color: #64748b; line-height: 1.5; }
    .success-modal-confirm {
      border: none; border-radius: 10px; padding: 0.6rem 1.75rem;
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
      background: #16a34a; color: #fff;
    }
  </style>
</head>
<body data-mission-id="{{ $missionId }}">
<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="sb-brand">
        @include('partials.sidebar-logo-mark')
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">Main</div>
      <a class="nav-item" href="/admin/dashboard#dashboard"><i class="ti ti-layout-dashboard"></i> Dashboard</a>
      <a class="nav-item" href="/admin/dashboard#organizations"><i class="ti ti-building"></i> Organizations</a>
      <a class="nav-item active" href="/admin/dashboard#missions"><i class="ti ti-target"></i> Missions</a>
      <a class="nav-item" href="/admin/dashboard#volunteers"><i class="ti ti-users"></i> Volunteers</a>
      <div class="sb-section">Admin</div>
      <a class="nav-item" href="/admin/config"><i class="ti ti-adjustments-horizontal"></i> Rules &amp; Rewards</a>
      <a class="nav-item" href="/admin/hotlines"><i class="ti ti-phone"></i> Hotlines</a>
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
      <a class="topbar-title" href="/admin/dashboard#missions">Missions</a>
      <span class="topbar-user" id="adminEmail"></span>
    </div>
    <div class="content">
      <section class="org-page" aria-labelledby="missionDetailsTitle">
        <header class="org-page__header">
          <i class="fas fa-bullseye" aria-hidden="true"></i>
          <h1 id="missionDetailsTitle">MISSION DETAILS</h1>
        </header>
        <div class="org-page__status" id="missionPageStatus">Loading mission…</div>
        <div class="org-page__body" id="missionPageBody" hidden></div>
        <footer class="org-page__footer" id="missionPageFooter" hidden>
          <div class="org-page__actions" id="missionPageActions"></div>
          <a class="org-action org-action--back" href="/admin/dashboard#missions">Back</a>
        </footer>
      </section>
    </div>
  </div>
</div>

<div id="missionApproveSuccessModal" class="success-modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="missionApproveSuccessTitle">
  <div class="success-modal" role="document">
    <div class="success-modal-icon" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
    <h2 id="missionApproveSuccessTitle">Mission approved</h2>
    <p class="success-modal-message">The mission was approved and published. It is now visible to volunteers.</p>
    <button type="button" class="success-modal-confirm" id="missionApproveSuccessOk">OK</button>
  </div>
</div>

<div id="missionRejectModal" class="reject-modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="missionRejectModalTitle">
  <div class="reject-modal" role="document">
    <h2 id="missionRejectModalTitle">Reject mission</h2>
    <p class="reject-modal-help">Please provide a reason for rejecting this mission. The organization may see this message.</p>
    <label for="missionRejectReasonInput">Reason (required)</label>
    <textarea id="missionRejectReasonInput" rows="4" placeholder="e.g. Incomplete details, policy violation…" autocomplete="off"></textarea>
    <p id="missionRejectReasonError" class="reject-modal-error" role="alert"></p>
    <div class="reject-modal-actions">
      <button type="button" class="reject-modal-cancel" id="missionRejectCancel">Cancel</button>
      <button type="button" class="reject-modal-confirm" id="missionRejectConfirm">Reject mission</button>
    </div>
  </div>
</div>
</body>
</html>
