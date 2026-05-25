<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotlines - Kalinga Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite(['resources/css/app.css', 'resources/js/admin-hotlines.js'])
  <style>
    :root {
      --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      --color-text-primary: #111827;
      --color-border: #e5e7eb;
      --color-muted: #6b7280;
      --color-accent: #16a34a;
      --color-accent-soft: #f0fdf4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      font-size: 14px;
      background: #f8faf9;
      color: var(--color-text-primary);
      height: 100vh;
      overflow: hidden;
    }
    .shell { display: flex; height: 100vh; overflow: hidden; }
    .sidebar {
      width: 210px; min-width: 210px; background: #fff;
      border-right: 1px solid var(--color-border);
      display: flex; flex-direction: column;
    }
    .sb-header { padding: 20px 16px 16px; border-bottom: 1px solid #f0f2f5; }
    .sb-brand { display: flex; align-items: center; gap: 10px; }
    .sb-logo-img {
      width: 32px; height: 32px; object-fit: contain; flex-shrink: 0; display: block;
    }
    .sb-title { font-size: 14px; font-weight: 600; }
    .sb-sub { font-size: 10px; color: #b0b0b0; margin-top: 1px; }
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
    .nav-item.active { background: var(--color-accent-soft); color: var(--color-accent); font-weight: 500; }
    .nav-item i { font-size: 17px; }
    .sb-footer { padding: 14px; border-top: 1px solid #f0f2f5; }
    .sb-user { font-size: 11px; color: #b0b0b0; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .logout-btn {
      display: flex; align-items: center; gap: 6px; font-size: 12px;
      color: #ef4444; cursor: pointer; background: none; border: none; font-family: inherit;
    }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
    .topbar {
      padding: 0 20px; height: 52px; border-bottom: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .topbar-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .topbar-user { font-size: 12px; color: var(--color-muted); }

    .content {
      flex: 1; overflow: hidden; display: flex; flex-direction: column;
      padding: 16px 20px 20px; background: #f8faf9;
    }
    .section-panel {
      background: #fff; border: 1px solid var(--color-border);
      border-radius: 12px; display: flex; flex-direction: column;
      flex: 1; min-height: 0; overflow: hidden;
    }
    .section-head {
      padding: 14px 16px; border-bottom: 1px solid #f3f4f6;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 13px; font-weight: 600; color: #111;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title i { font-size: 16px; color: var(--color-accent); }
    .section-desc { font-size: 11px; color: var(--color-muted); margin-top: 2px; font-weight: 400; }
    .section-body { padding: 12px 14px 14px; overflow-y: auto; flex: 1; }

    #hotline-categories {
      display: flex; flex-direction: column; gap: 14px;
    }

    .hotline-category {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fafafa;
      overflow: hidden;
    }
    .category-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; padding: 14px 16px;
      background: linear-gradient(180deg, #f0fdf4 0%, #fafafa 100%);
      border-bottom: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }
    .category-head-text {
      flex: 1;
      min-width: 0;
    }
    .category-name {
      font-size: 15px; font-weight: 700; color: #14532d;
      margin: 0 0 4px;
    }
    .category-location {
      font-size: 12px; color: var(--color-muted);
      margin: 0; line-height: 1.4;
    }
    .cat-name-in, .cat-location-in {
      width: 100%; max-width: 420px; height: 30px; padding: 0 10px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px;
      margin-bottom: 6px;
    }

    .numbers-block { padding: 12px 14px 14px; }
    .numbers-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px; gap: 8px;
    }
    .numbers-title {
      font-size: 11px; font-weight: 600; color: var(--color-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .numbers-list { display: flex; flex-direction: column; gap: 6px; }
    .numbers-empty {
      font-size: 12px; color: var(--color-muted);
      padding: 8px 0; font-style: italic;
    }

    .number-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 10px 12px;
      background: #fff; border: 1px solid #f3f4f6; border-radius: 8px;
    }
    .number-row:hover { border-color: #d1fae5; }
    .number-main { flex: 1; min-width: 0; }
    .number-label {
      display: block; font-size: 12px; font-weight: 600; color: #374151;
      margin-bottom: 2px;
    }
    a.number-value {
      font-size: 14px; font-weight: 700; color: #15803d;
      text-decoration: none;
      display: inline-block;
    }
    a.number-value:hover { text-decoration: underline; color: #166534; }
    .num-label-in, .num-value-in {
      display: block; width: 100%; max-width: 280px;
      height: 30px; padding: 0 10px; margin-bottom: 6px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px;
    }

    .cfg-right {
      display: flex; align-items: center; gap: 8px;
      flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;
    }

    .badge-pill {
      font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 20px;
    }
    .bp-green { background: var(--color-accent-soft); color: #15803d; }
    .bp-gray { background: #f3f4f6; color: #6b7280; }

    .toggle {
      width: 34px; height: 18px; background: #d1d5db; border-radius: 20px;
      cursor: pointer; position: relative; flex-shrink: 0;
    }
    .toggle.on { background: var(--color-accent); }
    .toggle::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.2s;
    }
    .toggle.on::after { left: 18px; }

    .btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 6px; font-size: 12px;
      cursor: pointer; border: 1px solid var(--color-border); background: #fff; color: #444;
    }
    .btn:hover { background: #f9fafb; }
    .btn-g { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
    .btn-g:hover { background: #15803d; }   
    .btn-r { color: #ef4444; border-color: #fecaca; }
    .btn-r:hover { background: #fef2f2; }
    .btn-sm { padding: 4px 8px; font-size: 11px; }
    .btn-edit { color: #2563eb; border-color: #bfdbfe; }
    .btn-edit:hover { background: #eff6ff; }

    .add-category-form-wrap { margin-bottom: 12px; }
    .add-row, .add-category-form-wrap .add-row {
      display: flex; gap: 6px; flex-wrap: wrap;
      padding: 12px; background: #fff;
      border: 1px dashed #d1d5db; border-radius: 8px;
    }
    .add-row input {
      flex: 1; min-width: 140px; height: 30px; padding: 0 10px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px;
    }
    .add-number-form { margin-top: 10px; }
    .hotline-empty {
      text-align: center; padding: 2rem 1rem; color: var(--color-muted); font-size: 13px;
    }
    .info-hint {
      font-size: 11px; color: var(--color-muted); line-height: 1.45;
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #f3f4f6;
    }
    .info-hint i { color: var(--color-accent); margin-right: 4px; }
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="sb-brand">
        @include('partials.kalinga-logo', ['size' => 32, 'class' => 'sb-logo-img'])
        <div>
          <div class="sb-title">Kalinga</div>
          <div class="sb-sub">Management System</div>
        </div>
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">Main</div>
      <a class="nav-item" href="/admin/dashboard"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> Dashboard</a>
      <a class="nav-item" href="/admin/dashboard#organizations"><i class="ti ti-building" aria-hidden="true"></i> Organizations</a>
      <a class="nav-item" href="/admin/dashboard#missions"><i class="ti ti-target" aria-hidden="true"></i> Missions</a>
      <a class="nav-item" href="/admin/dashboard#volunteers"><i class="ti ti-users" aria-hidden="true"></i> Volunteers</a>
      <div class="sb-section">Admin</div>
      <a class="nav-item" href="/admin/config"><i class="ti ti-adjustments-horizontal" aria-hidden="true"></i> Rules &amp; Rewards</a>
      <a class="nav-item active" href="/admin/hotlines"><i class="ti ti-phone" aria-hidden="true"></i> Hotlines</a>
    </nav>
    <div class="sb-footer">
      <div class="sb-user" id="adminEmailSidebar"></div>
      <button type="button" class="logout-btn" id="adminLogoutBtn">
        <i class="ti ti-logout" aria-hidden="true"></i> Logout
      </button>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="topbar-title">Emergency Hotlines</div>
      <div class="topbar-actions">
        <span class="topbar-user" id="adminEmail"></span>
      </div>
    </div>

    <div class="content">
      <section class="section-panel" aria-labelledby="hotlines-heading">
        <div class="section-head">
          <div>
            <div class="section-title" id="hotlines-heading">
              <i class="ti ti-phone-call" aria-hidden="true"></i> Hotline directory
            </div>
            <p class="section-desc">Group numbers by organization — e.g. all NDRRMC lines under NDRRMC, Red Cross under Philippine Red Cross</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" id="categoryAddBtn">
            <i class="ti ti-plus" style="font-size:12px"></i> Add Emergency Hotline
          </button>
        </div>
        <div class="section-body">
          <div id="add-category-form" class="add-category-form-wrap" hidden>
            <div class="add-row">
              <input id="nc-name" type="text" placeholder="Organization name (e.g. NDRRMC)" aria-label="Organization name" />
              <input id="nc-location" type="text" placeholder="Location (e.g. Metro Manila, Kalinga)" aria-label="Location" />
              <button type="button" class="btn btn-g btn-sm" id="categoryAddConfirmBtn">Add organization</button>
              <button type="button" class="btn btn-sm" id="categoryAddCancelBtn">Cancel</button>
            </div>
          </div>
          <div id="hotline-empty" class="hotline-empty" hidden>
            No organizations yet. Add one (e.g. NDRRMC) then add phone numbers inside it.
          </div>
          <div id="hotline-categories"></div>
          <p class="info-hint">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            Each card is one agency or organization. Use <strong>Add number</strong> inside a card for multiple lines (operations center, trunk line, etc.). Hidden organizations or numbers are not shown to volunteers.
          </p>
        </div>
      </section>
    </div>
  </div>
</div>
</body>
</html>
