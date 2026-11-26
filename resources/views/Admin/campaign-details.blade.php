<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campaign Details - Kalinga Admin</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite(['resources/css/app.css', 'resources/js/admin-campaign-details.js'])
  @include('partials.admin-topbar-styles')
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Poppins', Arial, sans-serif;
      background: #f0f2f5;
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
      flex: 1; overflow: hidden; background: #f0f2f5;
      display: flex; flex-direction: column; min-width: 0;
    }
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
      background: #386b57;
      color: #fff;
      padding: 1.1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-shrink: 0;
    }
    .org-page__header h1 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .org-page__body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem 2rem;
      align-content: start;
      align-items: start;
    }
    @media (max-width: 900px) {
      .org-page__body { grid-template-columns: 1fr; }
    }
    .org-page__col { min-width: 0; }
    .org-page__section-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #166534;
      margin: 0 0 0.75rem;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .org-page__status {
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.95rem;
      flex: 1;
    }
    .org-page__status.is-error { color: #b91c1c; }
    .org-detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.9rem;
    }
    .org-detail-row:last-child { margin-bottom: 0; }
    .org-detail-icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #e8f5ee;
      color: #15803d;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.8rem;
      margin-top: 0.1rem;
    }
    .org-detail-text {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      font-size: 0.92rem;
      line-height: 1.45;
      min-width: 0;
      word-break: break-word;
    }
    .org-detail-text strong {
      font-size: 0.78rem;
      color: #6b7280;
      font-weight: 600;
    }
    .org-detail-text span { color: #111827; }
    .campaign-cover-wrap {
      grid-column: 1 / -1;
      width: 100%;
    }
    .campaign-cover-img {
      width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      display: block;
    }
    .org-status-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #fff;
    }
    .org-status-badge.published { background: #16a34a; }
    .org-status-badge.pending_approval { background: #f59e0b; color: #111; }
    .org-status-badge.rejected { background: #dc2626; }
    .org-status-badge.draft { background: #6b7280; }
    .org-page__footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #eef0f3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .org-page__actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .org-action {
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.2rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      text-decoration: none;
      font-family: inherit;
    }
    .org-action--approve { background: #275735; color: #fff; }
    .org-action--approve:hover { background: #1e4529; color: #fff; }
    .org-action--reject { background: #ef4444; color: #fff; }
    .org-action--reject:hover { background: #dc2626; color: #fff; }
    .org-action--back { background: #f1f5f9; color: #334155; margin-left: auto; }
    .org-action--back:hover { background: #e2e8f0; color: #0f172a; }
    .reject-modal-overlay, .success-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .reject-modal-overlay.is-open, .success-modal-overlay.is-open { display: flex; }
    .reject-modal, .success-modal {
      background: #fff;
      border-radius: 14px;
      max-width: 440px;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .success-modal { text-align: center; }
    .success-modal-icon { font-size: 3rem; color: #16a34a; margin-bottom: 0.75rem; line-height: 1; }
    .reject-modal h2, .success-modal h2 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #0f2419; }
    .reject-modal-help, .success-modal-message { margin: 0 0 1rem; font-size: 0.9rem; color: #64748b; line-height: 1.5; }
    .reject-modal label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem; }
    .reject-modal textarea {
      width: 100%; border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 0.65rem 0.75rem; font-size: 0.9rem; font-family: inherit; resize: vertical;
    }
    .reject-modal-error { min-height: 1.1rem; margin: 0.35rem 0 0.75rem; font-size: 0.82rem; color: #dc2626; }
    .reject-modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .reject-modal-cancel {
      border: none; border-radius: 8px; padding: 0.5rem 1rem;
      font-size: 0.9rem; font-weight: 600; cursor: pointer; background: #f1f5f9; color: #334155;
    }
    .reject-modal-confirm {
      border: none; border-radius: 8px; padding: 0.5rem 1.1rem;
      font-size: 0.9rem; font-weight: 600; cursor: pointer; background: #ef4444; color: #fff;
    }
    .success-modal-confirm {
      border: none; border-radius: 10px; padding: 0.6rem 1.75rem;
      font-size: 0.95rem; font-weight: 600; cursor: pointer; background: #275735; color: #fff;
    }
  </style>
</head>
<body class="admin-app" data-campaign-id="{{ $campaignId }}">
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
      <a class="nav-item" href="/admin/dashboard#missions"><i class="ti ti-target"></i> Missions</a>
      <a class="nav-item" href="/admin/dashboard#volunteers"><i class="ti ti-users"></i> Volunteers</a>
      <a class="nav-item active" href="/admin/dashboard#campaigns"><i class="ti ti-gift"></i> Campaigns</a>
      <a class="nav-item" href="/admin/dashboard#settlements"><i class="ti ti-cash"></i> Settlements</a>
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
    @include('partials.admin-topbar', [
      'pageTitle' => 'Campaigns',
      'titleHref' => '/admin/dashboard#campaigns',
    ])
    <div class="content">
      <section class="org-page" aria-labelledby="campaignDetailsTitle">
        <header class="org-page__header">
          <i class="fas fa-hand-holding-heart" aria-hidden="true"></i>
          <h1 id="campaignDetailsTitle">CAMPAIGN DETAILS</h1>
        </header>
        <div class="org-page__status" id="campaignPageStatus">Loading campaign…</div>
        <div class="org-page__body" id="campaignPageBody" hidden></div>
        <footer class="org-page__footer" id="campaignPageFooter" hidden>
          <div class="org-page__actions" id="campaignPageActions"></div>
          <a class="org-action org-action--back" href="/admin/dashboard#campaigns">Back</a>
        </footer>
      </section>
    </div>
  </div>
</div>

<div id="campaignApproveSuccessModal" class="success-modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="campaignApproveSuccessTitle">
  <div class="success-modal" role="document">
    <div class="success-modal-icon" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
    <h2 id="campaignApproveSuccessTitle">Campaign approved</h2>
    <p class="success-modal-message">The campaign was approved and published. Donors can now contribute to it.</p>
    <button type="button" class="success-modal-confirm" id="campaignApproveSuccessOk">OK</button>
  </div>
</div>

<div id="campaignRejectModal" class="reject-modal-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="campaignRejectModalTitle">
  <div class="reject-modal" role="document">
    <h2 id="campaignRejectModalTitle">Reject campaign</h2>
    <p class="reject-modal-help">Please provide a reason for rejecting this campaign. The organization may see this message.</p>
    <label for="campaignRejectReasonInput">Reason (required)</label>
    <textarea id="campaignRejectReasonInput" rows="4" placeholder="e.g. Incomplete details, policy violation…" autocomplete="off"></textarea>
    <p id="campaignRejectReasonError" class="reject-modal-error" role="alert"></p>
    <div class="reject-modal-actions">
      <button type="button" class="reject-modal-cancel" id="campaignRejectCancel">Cancel</button>
      <button type="button" class="reject-modal-confirm" id="campaignRejectConfirm">Reject campaign</button>
    </div>
  </div>
</div>
</body>
</html>
