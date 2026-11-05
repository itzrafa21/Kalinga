<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteer Details - Kalinga Admin</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite(['resources/css/app.css', 'resources/js/admin-volunteer-details.js'])
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
      padding: 24px;
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .org-page {
      background: #fff;
      border: 1px solid #eaecef;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
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
    .org-page__status {
      padding: 2rem 1.5rem;
      color: #64748b;
    }
    .org-page__status.is-error { color: #b91c1c; }
    .org-page__body {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .org-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 860px) {
      .org-fields { grid-template-columns: 1fr; }
    }
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
    }
    .org-detail-row--wide { grid-column: 1 / -1; }
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
      align-items: flex-start;
      gap: 1rem;
      min-width: 0;
    }
    .org-detail-row__label {
      font-weight: 600;
      color: #333;
      font-size: 0.92rem;
      flex-shrink: 0;
    }
    .org-detail-row__value {
      color: #555;
      font-size: 0.92rem;
      text-align: right;
      word-break: break-word;
    }
    .vol-status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: #fff;
    }
    .vol-status-badge.top-performer { background: #16a34a; }
    .vol-status-badge.active { background: #2563eb; }
    .vol-status-badge.registered { background: #64748b; }
    .vol-status-badge.inactive { background: #ef4444; }
    .org-page__footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #eee;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: flex-end;
      align-items: center;
      flex-shrink: 0;
      background: #fff;
    }
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
    .org-action--back {
      background: #16a34a;
      color: #fff;
      border: none;
      padding: 0.65rem 2.5rem;
    }
    .org-action--back:hover { background: #15803d; color: #fff; }
  </style>
</head>
<body data-volunteer-id="{{ $volunteerId }}">
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
      <a class="nav-item active" href="/admin/dashboard#volunteers"><i class="ti ti-users"></i> Volunteers</a>
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
      <a class="topbar-title" href="/admin/dashboard#volunteers">Volunteers</a>
      <span class="topbar-user" id="adminEmail"></span>
    </div>
    <div class="content">
      <section class="org-page" aria-labelledby="volunteerDetailsTitle">
        <header class="org-page__header">
          <i class="fas fa-hands-helping" aria-hidden="true"></i>
          <h1 id="volunteerDetailsTitle">VOLUNTEER DETAILS</h1>
        </header>
        <div class="org-page__status" id="volunteerPageStatus">Loading volunteer…</div>
        <div class="org-page__body" id="volunteerPageBody" hidden></div>
        <footer class="org-page__footer" id="volunteerPageFooter" hidden>
          <a class="org-action org-action--back" href="/admin/dashboard#volunteers">Back</a>
        </footer>
      </section>
    </div>
  </div>
</div>
</body>
</html>
