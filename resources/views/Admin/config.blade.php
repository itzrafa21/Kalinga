<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rules &amp; Rewards - Kalinga Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite(['resources/css/app.css', 'resources/js/admin-config.js'])
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
    .sb-icon {
      width: 28px; height: 28px; background: var(--color-accent); border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
    }
    .sb-icon i { color: #fff; font-size: 15px; }
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
    .tbadge {
      font-size: 11px; color: #15803d; background: var(--color-accent-soft);
      padding: 3px 10px; border-radius: 20px; border: 1px solid #bbf7d0;
    }
    .topbar-user { font-size: 12px; color: var(--color-muted); }
    .btn-save-all {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      border: none; background: var(--color-accent); color: #fff; cursor: pointer;
    }
    .btn-save-all:hover { background: #15803d; }
    #configSaveToast { font-size: 11px; color: #15803d; padding: 4px 8px; background: var(--color-accent-soft); border-radius: 6px; }

    .content {
      flex: 1; overflow: hidden; display: flex; flex-direction: column;
      padding: 16px 20px 20px; background: #f8faf9;
    }
    .main-tabs {
      display: flex; gap: 6px; margin-bottom: 14px; flex-shrink: 0;
    }
    .main-tab {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; font-size: 13px; color: var(--color-muted);
      background: #fff; border: 1px solid var(--color-border); border-radius: 8px;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .main-tab i { font-size: 16px; }
    .main-tab:hover { color: #374151; border-color: #d1d5db; }
    .main-tab.active {
      color: var(--color-accent); border-color: #86efac;
      background: var(--color-accent-soft); font-weight: 500;
    }
    .tab-panel { display: none; flex: 1; min-height: 0; }
    .tab-panel.active { display: flex; flex-direction: column; }

    .split-layout {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      flex: 1; min-height: 0;
    }
    @media (max-width: 960px) {
      .split-layout { grid-template-columns: 1fr; overflow-y: auto; }
      .tab-panel.active { overflow-y: auto; }
    }

    .section-panel {
      background: #fff; border: 1px solid var(--color-border);
      border-radius: 12px; display: flex; flex-direction: column;
      min-height: 0; overflow: hidden;
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

    .cfg-row, .mult-row, .level-row, .badge-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border: 1px solid #f3f4f6; border-radius: 8px;
      margin-bottom: 6px; background: #fafafa;
    }
    .cfg-row:hover, .level-row:hover, .badge-row:hover { background: #f5f5f5; }
    .cfg-label, .mult-label, .level-name, .badge-name { font-size: 13px; font-weight: 500; }
    .cfg-sub, .mult-sub, .level-sub, .badge-desc { font-size: 11px; color: var(--color-muted); margin-top: 2px; }
    .cfg-right, .mult-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .pts-in, .range-in {
      width: 56px; height: 28px; padding: 0 6px;
      border: 1px solid var(--color-border); border-radius: 6px;
      font-size: 12px; text-align: center; outline: none;
    }
    .pts-in:focus, .range-in:focus { border-color: var(--color-accent); }
    .pts-unit, .range-sep { font-size: 11px; color: var(--color-muted); }

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

    .badge-pill {
      font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 20px;
    }
    .bp-blue { background: #eff6ff; color: #1d4ed8; }
    .bp-green { background: var(--color-accent-soft); color: #15803d; }
    .bp-gray { background: #f3f4f6; color: #6b7280; }

    .block-label {
      font-size: 10px; font-weight: 600; color: var(--color-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      margin: 12px 0 8px;
    }
    .block-label:first-child { margin-top: 0; }

    .calc-box {
      margin-top: 12px; padding: 12px; background: var(--color-accent-soft);
      border: 1px solid #bbf7d0; border-radius: 8px;
    }
    .calc-box label { font-size: 11px; color: #15803d; display: block; margin-bottom: 8px; }
    .calc-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .calc-select {
      flex: 1; min-width: 120px; height: 30px; font-size: 12px;
      border: 1px solid var(--color-border); border-radius: 6px; padding: 0 8px;
    }
    .calc-result-row {
      display: flex; align-items: center; justify-content: space-between;
    }
    .calc-result-row span:last-child { font-size: 18px; font-weight: 600; color: #15803d; }

    .info-hint {
      font-size: 11px; color: var(--color-muted); line-height: 1.45;
      margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;
    }
    .info-hint i { color: var(--color-accent); margin-right: 4px; }

    .add-row { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .add-row input, .add-row select {
      flex: 1; min-width: 100px; height: 30px; padding: 0 10px;
      font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px;
    }

    .level-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .level-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .range-row { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .badge-icon {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .badge-info { flex: 1; margin-left: 8px; min-width: 0; }
    .preview-chip {
      font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 20px; border: 1px solid;
    }
    .saved-flash { color: var(--color-accent); font-size: 11px; display: none; align-items: center; gap: 4px; }
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="sb-brand">
        <div class="sb-icon"><i class="ti ti-shield" aria-hidden="true"></i></div>
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
      <a class="nav-item active" href="/admin/config"><i class="ti ti-adjustments-horizontal" aria-hidden="true"></i> Rules &amp; Rewards</a>
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
      <div class="topbar-title">Rules &amp; Rewards</div>
      <div class="topbar-actions">
        <span id="configSaveToast" hidden><i class="ti ti-check"></i> Saved</span>
        <span class="tbadge">Platform settings</span>
        <button type="button" class="btn-save-all" id="configSaveAllBtn">
          <i class="ti ti-device-floppy" style="font-size:14px"></i> Save all
        </button>
        <span class="topbar-user" id="adminEmail"></span>
      </div>
    </div>

    <div class="content">
      <div class="main-tabs" role="tablist">
        <button type="button" class="main-tab active" onclick="switchTab('mission',this)">
          <i class="ti ti-target" aria-hidden="true"></i> Mission Setup
        </button>
        <button type="button" class="main-tab" onclick="switchTab('recognition',this)">
          <i class="ti ti-award" aria-hidden="true"></i> Recognition
        </button>
      </div>

      <!-- Mission Setup: types | points & multipliers -->
      <div class="tab-panel active" id="tab-mission">
        <div class="split-layout">
          <section class="section-panel" aria-labelledby="mission-types-heading">
            <div class="section-head">
              <div>
                <div class="section-title" id="mission-types-heading">
                  <i class="ti ti-tag" aria-hidden="true"></i> Mission types
                </div>
                <p class="section-desc">Categories and base point values</p>
              </div>
              <button type="button" class="btn btn-g btn-sm" onclick="showAddType()">
                <i class="ti ti-plus" style="font-size:12px"></i> Add
              </button>
            </div>
            <div class="section-body">
              <div id="type-list">
                <div class="cfg-row" id="mt-General" data-base-pts="5">
                  <div><div class="cfg-label">General</div><div class="cfg-sub">General volunteer missions</div></div>
                  <div class="cfg-right">
                    <span class="badge-pill bp-blue">5 pts</span>
                    <span class="badge-pill bp-green status-pill">Active</span>
                    <div class="toggle on" role="switch" aria-checked="true"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-type="General"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="cfg-row" id="mt-HealthMedical" data-base-pts="10">
                  <div><div class="cfg-label">Health / Medical</div><div class="cfg-sub">Health and medical missions</div></div>
                  <div class="cfg-right">
                    <span class="badge-pill bp-blue">10 pts</span>
                    <span class="badge-pill bp-green status-pill">Active</span>
                    <div class="toggle on" role="switch" aria-checked="true"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-type="HealthMedical"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="cfg-row" id="mt-Environment" data-base-pts="5">
                  <div><div class="cfg-label">Environment</div><div class="cfg-sub">Environmental programs</div></div>
                  <div class="cfg-right">
                    <span class="badge-pill bp-blue">5 pts</span>
                    <span class="badge-pill bp-green status-pill">Active</span>
                    <div class="toggle on" role="switch" aria-checked="true"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-type="Environment"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="cfg-row" id="mt-Education" data-base-pts="5">
                  <div><div class="cfg-label">Education</div><div class="cfg-sub">Educational outreach</div></div>
                  <div class="cfg-right">
                    <span class="badge-pill bp-blue">5 pts</span>
                    <span class="badge-pill bp-green status-pill">Active</span>
                    <div class="toggle on" role="switch" aria-checked="true"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-type="Education"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="cfg-row" id="mt-DisasterRelief" data-base-pts="10">
                  <div><div class="cfg-label">Disaster relief</div><div class="cfg-sub">Emergency response</div></div>
                  <div class="cfg-right">
                    <span class="badge-pill bp-blue">10 pts</span>
                    <span class="badge-pill bp-green status-pill">Active</span>
                    <div class="toggle on" role="switch" aria-checked="true"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-type="DisasterRelief"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div id="add-type-form" style="display:none;">
                  <div class="add-row">
                    <input id="nt-name" placeholder="Type name" />
                    <input id="nt-desc" placeholder="Description" />
                    <input id="nt-pts" type="number" placeholder="Pts" style="width:72px;flex:none;" min="1" />
                    <button type="button" class="btn btn-g btn-sm" onclick="addType()">Add</button>
                    <button type="button" class="btn btn-sm" onclick="document.getElementById('add-type-form').style.display='none'">Cancel</button>
                  </div>
                </div>
              </div>
              <p class="info-hint"><i class="ti ti-info-circle"></i> Inactive types are hidden from new missions.</p>
            </div>
          </section>

          <section class="section-panel" id="mission-points-panel" aria-labelledby="points-heading">
            <div class="section-head">
              <div>
                <div class="section-title" id="points-heading">
                  <i class="ti ti-star" aria-hidden="true"></i> Points &amp; multipliers
                </div>
                <p class="section-desc">Duration and volunteer hours</p>
              </div>
              <span id="pts-saved" class="saved-flash"><i class="ti ti-check"></i> Saved</span>
            </div>
            <div class="section-body">
              <div class="block-label">Base points per type</div>
              <div class="cfg-row"><div><div class="cfg-label">General</div></div><div class="cfg-right"><input type="number" class="pts-in" value="5" min="0" data-sync-key="General" onchange="flashSaved()" /><span class="pts-unit">pts</span></div></div>
              <div class="cfg-row"><div><div class="cfg-label">Health / Medical</div></div><div class="cfg-right"><input type="number" class="pts-in" value="10" min="0" data-sync-key="HealthMedical" onchange="flashSaved()" /><span class="pts-unit">pts</span></div></div>
              <div class="cfg-row"><div><div class="cfg-label">Environment</div></div><div class="cfg-right"><input type="number" class="pts-in" value="5" min="0" data-sync-key="Environment" onchange="flashSaved()" /><span class="pts-unit">pts</span></div></div>
              <div class="cfg-row"><div><div class="cfg-label">Education</div></div><div class="cfg-right"><input type="number" class="pts-in" value="5" min="0" data-sync-key="Education" onchange="flashSaved()" /><span class="pts-unit">pts</span></div></div>
              <div class="cfg-row"><div><div class="cfg-label">Disaster relief</div></div><div class="cfg-right"><input type="number" class="pts-in" value="10" min="0" data-sync-key="DisasterRelief" onchange="flashSaved()" /><span class="pts-unit">pts</span></div></div>
              <div id="extra-base-pts"></div>

              <div class="block-label">Duration multipliers</div>
              <div class="mult-row">
                <div><div class="mult-label">Short shift</div><div class="mult-sub">1 – 3 hours</div></div>
                <div class="mult-right"><span class="pts-unit">×</span><input type="number" class="pts-in mult-in" value="1" min="1" step="0.5" onchange="flashSaved()" /></div>
              </div>
              <div class="mult-row">
                <div><div class="mult-label">Half day</div><div class="mult-sub">4 – 6 hours</div></div>
                <div class="mult-right"><span class="pts-unit">×</span><input type="number" class="pts-in mult-in" value="2" min="1" step="0.5" onchange="flashSaved()" /></div>
              </div>
              <div class="mult-row">
                <div><div class="mult-label">Full day</div><div class="mult-sub">7+ hours</div></div>
                <div class="mult-right"><span class="pts-unit">×</span><input type="number" class="pts-in mult-in" value="3" min="1" step="0.5" onchange="flashSaved()" /></div>
              </div>

              <div class="calc-box">
                <label>Preview earned points</label>
                <div class="calc-row">
                  <select id="calc-type" class="calc-select" onchange="calcPoints()">
                    <option value="5">General (5)</option>
                    <option value="10">Health / Medical (10)</option>
                    <option value="5">Environment (5)</option>
                    <option value="5">Education (5)</option>
                    <option value="10">Disaster relief (10)</option>
                  </select>
                  <select id="calc-mult" class="calc-select" onchange="calcPoints()">
                    <option value="1">1–3 hrs (×1)</option>
                    <option value="2">4–6 hrs (×2)</option>
                    <option value="3">7+ hrs (×3)</option>
                  </select>
                </div>
                <div class="calc-result-row">
                  <span>Earned</span>
                  <span id="calc-result">5</span>
                </div>
              </div>
              <p class="info-hint"><i class="ti ti-calculator"></i> Final = base × duration multiplier</p>
            </div>
          </section>
        </div>
      </div>

      <!-- Recognition: badges | levels -->
      <div class="tab-panel" id="tab-recognition">
        <div class="split-layout">
          <section class="section-panel" aria-labelledby="badges-heading">
            <div class="section-head">
              <div>
                <div class="section-title" id="badges-heading">
                  <i class="ti ti-award" aria-hidden="true"></i> Badges
                </div>
                <p class="section-desc">Achievements and milestones</p>
              </div>
              <button type="button" class="btn btn-g btn-sm" onclick="showAddBadge()">
                <i class="ti ti-plus" style="font-size:12px"></i> Add
              </button>
            </div>
            <div class="section-body">
              <div id="badge-list">
                <div class="badge-row" id="bdg-FirstMission">
                  <div class="badge-icon" style="background:#eff6ff;"><i class="ti ti-rocket" style="color:#3b82f6;font-size:15px;"></i></div>
                  <div class="badge-info"><div class="badge-name">First mission</div><div class="badge-desc">Complete your first mission</div></div>
                  <div class="cfg-right">
                    <span class="preview-chip" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;">Milestone</span>
                    <div class="toggle on" role="switch"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-badge="FirstMission"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="badge-row" id="bdg-Helper">
                  <div class="badge-icon" style="background:#f0fdf4;"><i class="ti ti-star" style="color:#16a34a;font-size:15px;"></i></div>
                  <div class="badge-info"><div class="badge-name">Helper badge</div><div class="badge-desc">Reach Helper level</div></div>
                  <div class="cfg-right">
                    <span class="preview-chip" style="background:#f0fdf4;color:#15803d;border-color:#bbf7d0;">Level up</span>
                    <div class="toggle on" role="switch"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-badge="Helper"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="badge-row" id="bdg-Champion">
                  <div class="badge-icon" style="background:#faf5ff;"><i class="ti ti-trophy" style="color:#7c3aed;font-size:15px;"></i></div>
                  <div class="badge-info"><div class="badge-name">Champion badge</div><div class="badge-desc">Reach Champion level</div></div>
                  <div class="cfg-right">
                    <span class="preview-chip" style="background:#faf5ff;color:#6d28d9;border-color:#ddd6fe;">Level up</span>
                    <div class="toggle on" role="switch"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-badge="Champion"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="badge-row" id="bdg-10Missions">
                  <div class="badge-icon" style="background:#fff7ed;"><i class="ti ti-heart" style="color:#ea580c;font-size:15px;"></i></div>
                  <div class="badge-info"><div class="badge-name">Dedicated</div><div class="badge-desc">Complete 10 missions</div></div>
                  <div class="cfg-right">
                    <span class="preview-chip" style="background:#fff7ed;color:#c2410c;border-color:#fed7aa;">Achievement</span>
                    <div class="toggle on" role="switch"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-badge="10Missions"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div class="badge-row" id="bdg-Guardian">
                  <div class="badge-icon" style="background:#fffbeb;"><i class="ti ti-crown" style="color:#d97706;font-size:15px;"></i></div>
                  <div class="badge-info"><div class="badge-name">Guardian badge</div><div class="badge-desc">Reach Guardian level</div></div>
                  <div class="cfg-right">
                    <span class="preview-chip" style="background:#fffbeb;color:#92400e;border-color:#fde68a;">Level up</span>
                    <div class="toggle on" role="switch"></div>
                    <button type="button" class="btn btn-r btn-sm" data-remove-badge="Guardian"><i class="ti ti-trash" style="font-size:12px"></i></button>
                  </div>
                </div>
                <div id="add-badge-form" style="display:none;">
                  <div class="add-row">
                    <input id="nb-name" placeholder="Badge name" />
                    <input id="nb-desc" placeholder="Condition" />
                    <select id="nb-type">
                      <option>Milestone</option>
                      <option>Level up</option>
                      <option>Achievement</option>
                    </select>
                    <button type="button" class="btn btn-g btn-sm" onclick="addBadge()">Add</button>
                    <button type="button" class="btn btn-sm" onclick="document.getElementById('add-badge-form').style.display='none'">Cancel</button>
                  </div>
                </div>
              </div>
              <p class="info-hint"><i class="ti ti-info-circle"></i> Awarded automatically when conditions are met.</p>
            </div>
          </section>

          <section class="section-panel" aria-labelledby="levels-heading">
            <div class="section-head">
              <div>
                <div class="section-title" id="levels-heading">
                  <i class="ti ti-trophy" aria-hidden="true"></i> Volunteer levels
                </div>
                <p class="section-desc">Rankings by total points</p>
              </div>
              <button type="button" class="btn btn-g btn-sm" onclick="showAddLevel()">
                <i class="ti ti-plus" style="font-size:12px"></i> Add
              </button>
            </div>
            <div class="section-body">
              <div id="level-list">
                <div class="level-row" id="lv-Newcomer">
                  <div class="level-info"><div class="level-dot" style="background:#9ca3af;"></div><div><div class="level-name">Newcomer</div><div class="level-sub">Starting level</div></div></div>
                  <div class="range-row"><input class="range-in" type="number" value="0" min="0" /><span class="range-sep">–</span><input class="range-in" type="number" value="50" min="0" /><span class="pts-unit">pts</span><button type="button" class="btn btn-r btn-sm" data-remove-level="Newcomer"><i class="ti ti-trash" style="font-size:11px"></i></button></div>
                </div>
                <div class="level-row" id="lv-Helper">
                  <div class="level-info"><div class="level-dot" style="background:#60a5fa;"></div><div><div class="level-name">Helper</div><div class="level-sub">Early volunteer</div></div></div>
                  <div class="range-row"><input class="range-in" type="number" value="51" min="0" /><span class="range-sep">–</span><input class="range-in" type="number" value="150" min="0" /><span class="pts-unit">pts</span><button type="button" class="btn btn-r btn-sm" data-remove-level="Helper"><i class="ti ti-trash" style="font-size:11px"></i></button></div>
                </div>
                <div class="level-row" id="lv-Volunteer">
                  <div class="level-info"><div class="level-dot" style="background:#34d399;"></div><div><div class="level-name">Volunteer</div><div class="level-sub">Regular contributor</div></div></div>
                  <div class="range-row"><input class="range-in" type="number" value="150" min="0" /><span class="range-sep">–</span><input class="range-in" type="number" value="500" min="0" /><span class="pts-unit">pts</span><button type="button" class="btn btn-r btn-sm" data-remove-level="Volunteer"><i class="ti ti-trash" style="font-size:11px"></i></button></div>
                </div>
                <div class="level-row" id="lv-Champion">
                  <div class="level-info"><div class="level-dot" style="background:#a78bfa;"></div><div><div class="level-name">Champion</div><div class="level-sub">Dedicated volunteer</div></div></div>
                  <div class="range-row"><input class="range-in" type="number" value="500" min="0" /><span class="range-sep">–</span><input class="range-in" type="number" value="1200" min="0" /><span class="pts-unit">pts</span><button type="button" class="btn btn-r btn-sm" data-remove-level="Champion"><i class="ti ti-trash" style="font-size:11px"></i></button></div>
                </div>
                <div class="level-row" id="lv-Guardian">
                  <div class="level-info"><div class="level-dot" style="background:#fbbf24;"></div><div><div class="level-name">Guardian</div><div class="level-sub">Elite volunteer</div></div></div>
                  <div class="range-row"><input class="range-in" type="number" value="1200" min="0" /><span class="range-sep">–</span><input class="range-in" type="number" placeholder="∞" min="0" /><span class="pts-unit">pts</span><button type="button" class="btn btn-r btn-sm" data-remove-level="Guardian"><i class="ti ti-trash" style="font-size:11px"></i></button></div>
                </div>
                <div id="add-level-form" style="display:none;">
                  <div class="add-row">
                    <input id="nl-name" placeholder="Level name" />
                    <input id="nl-desc" placeholder="Description" />
                    <input id="nl-min" type="number" placeholder="Min" style="width:72px;flex:none;" min="0" />
                    <input id="nl-max" type="number" placeholder="Max" style="width:72px;flex:none;" min="0" />
                    <button type="button" class="btn btn-g btn-sm" onclick="addLevel()">Add</button>
                    <button type="button" class="btn btn-sm" onclick="document.getElementById('add-level-form').style.display='none'">Cancel</button>
                  </div>
                </div>
              </div>
              <p class="info-hint"><i class="ti ti-info-circle"></i> Ranges should not overlap between levels.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
