<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotlines - Kalinga Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
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
    .saved-flash {
      display: none; align-items: center; gap: 4px;
      color: var(--color-accent); font-size: 12px; font-weight: 500;
    }
    .saved-flash:not([hidden]) { display: inline-flex; }

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
    .number-contacts {
      display: flex; flex-direction: column; gap: 2px;
    }
    a.number-value {
      font-size: 14px; font-weight: 700; color: #15803d;
      text-decoration: none;
      display: inline-block;
    }
    a.number-value:hover { text-decoration: underline; color: #166534; }
    a.number-email { font-size: 12px; font-weight: 600; color: #2563eb; }
    a.number-email:hover { color: #1d4ed8; }
    .number-missing { font-size: 12px; font-weight: 500; color: var(--color-muted); }
    .num-label-in, .num-value-in, .num-email-in {
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
    .add-category-panel {
      padding: 14px; background: #fff;
      border: 1px dashed #d1d5db; border-radius: 10px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .add-category-panel .add-row {
      display: flex; gap: 6px; flex-wrap: wrap;
      padding: 0; background: transparent; border: none; border-radius: 0;
    }
    .add-row, .add-category-form-wrap .add-row {
      display: flex; gap: 6px; flex-wrap: wrap;
      padding: 12px; background: #fff;
      border: 1px dashed #d1d5db; border-radius: 8px;
    }
    .add-row input {
      flex: 1; min-width: 140px; height: 30px; padding: 0 10px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px;
    }
    .add-category-actions {
      display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;
    }
    .add-category-panel .hotline-map-block {
      padding: 0; border-bottom: none;
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

    .hotline-map-block {
      padding: 0 14px 14px;
      border-bottom: 1px solid #f3f4f6;
    }
    .hotline-map-title {
      font-size: 11px; font-weight: 600; color: var(--color-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      margin: 12px 0 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .hotline-map-title i { font-size: 14px; color: var(--color-accent); }
    .map-search-wrap { position: relative; margin-bottom: 8px; }
    .hotline-map-search {
      width: 100%; height: 34px; padding: 0 12px 0 34px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 8px;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 12px center;
    }
    .hotline-map-suggestions {
      position: absolute; z-index: 40; left: 0; right: 0;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      box-shadow: 0 10px 24px rgba(15, 36, 25, 0.12);
      display: none; margin-top: 4px; max-height: 220px; overflow-y: auto;
      list-style: none; padding: 4px 0;
    }
    .map-location-suggestion { padding: 8px 12px; cursor: pointer; }
    .map-location-suggestion-title { font-weight: 600; color: #1e293b; font-size: 12px; }
    .map-location-suggestion-meta { margin-top: 2px; font-size: 11px; color: #64748b; }
    .map-location-suggestion:hover { background: #f0fdf4; }
    .map-location-suggestion--empty { cursor: default; color: #64748b; }
    .map-location-suggestion--empty:hover { background: transparent; }
    .map-wrap { position: relative; width: 100%; }
    .hotline-map {
      height: 220px; width: 100%;
      border-radius: 10px; border: 1px solid #dde3e8; overflow: hidden;
    }
    .map-pin-hint {
      position: absolute; top: 10px; left: 10px; z-index: 2;
      pointer-events: none; display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 500;
      color: #1e3a2f; background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(30, 58, 47, 0.12);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
    }
    .mapboxgl-canvas { outline: none; }
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="sb-brand">
        @include('partials.sidebar-logo-mark')
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">Main</div>
      <a class="nav-item" href="/admin/dashboard"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> Dashboard</a>
      <a class="nav-item" href="/admin/dashboard#organizations"><i class="ti ti-building" aria-hidden="true"></i> Organizations</a>
      <a class="nav-item" href="/admin/dashboard#missions"><i class="ti ti-target" aria-hidden="true"></i> Missions</a>
      <a class="nav-item" href="/admin/dashboard#volunteers"><i class="ti ti-users" aria-hidden="true"></i> Volunteers</a>
      <a class="nav-item" href="/admin/dashboard#campaigns"><i class="ti ti-gift" aria-hidden="true"></i> Campaigns</a>
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
        <span id="hotlinesSaveToast" class="saved-flash" hidden><i class="ti ti-check" aria-hidden="true"></i> Saved to Firestore</span>
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
            <p class="section-desc">Add an organization with phone, email, and a map pin — each contact needs both a number and an email</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" id="categoryAddBtn">
            <i class="ti ti-plus" style="font-size:12px"></i> Add Emergency Hotline
          </button>
        </div>
        <div class="section-body">
          <div id="add-category-form" class="add-category-form-wrap" hidden>
            <div class="add-category-panel">
              <div class="add-row">
                <input id="nc-name" type="text" placeholder="Organization name (e.g. NDRRMC)" aria-label="Organization name" />
                <input id="nc-label" type="text" placeholder="Contact label (e.g. Operations Center)" aria-label="Contact label" />
              </div>
              <div class="add-row">
                <input id="nc-phone" type="text" placeholder="Phone number" aria-label="Phone number" />
                <input id="nc-email" type="email" placeholder="Email" aria-label="Email" required />
              </div>
              <div class="hotline-map-block">
                <div class="hotline-map-title"><i class="ti ti-map-pin" aria-hidden="true"></i> Pin location</div>
                <div class="map-search-wrap">
                  <input
                    type="text"
                    id="nc-search"
                    class="hotline-map-search"
                    placeholder="Search place, barangay, landmark…"
                    autocomplete="off"
                    aria-label="Search hotline location"
                  />
                  <ul id="nc-suggestions" class="hotline-map-suggestions" role="listbox" aria-label="Location suggestions"></ul>
                </div>
                <input type="hidden" id="nc-location" value="" />
                <input type="hidden" id="nc-lat" value="" />
                <input type="hidden" id="nc-lng" value="" />
                <div class="map-wrap">
                  <div id="nc-map" class="hotline-map" aria-label="New hotline location map"></div>
                </div>
              </div>
              <div class="add-category-actions">
                <button type="button" class="btn btn-g btn-sm" id="categoryAddConfirmBtn">Add emergency hotline</button>
                <button type="button" class="btn btn-sm" id="categoryAddCancelBtn">Cancel</button>
              </div>
            </div>
          </div>
          <div id="hotline-empty" class="hotline-empty" hidden>
            No organizations yet. Add one with a phone number, email, and map pin.
          </div>
          <div id="hotline-categories"></div>
          <p class="info-hint">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            Each card is one agency or organization. Use <strong>Add Emergency Hotline</strong> to set phone, email, and map pin together. You can still add more contacts later. Hidden organizations or contacts are not shown to volunteers.
          </p>
        </div>
      </section>
    </div>
  </div>
</div>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
</body>
</html>
