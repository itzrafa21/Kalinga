<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Kalinga</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
  ])
  @include('partials.org-layout-styles')

  <style>
    .org-main-content.main-content {
      max-width: 1100px;
    }

    .settings-page-header {
      margin-bottom: 1.5rem;
    }
    .settings-page-header h1 {
      margin: 0 0 0.35rem;
      font-size: 1.55rem;
      font-weight: 700;
      color: #1e3a2f;
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .settings-page-header h1 i { color: #28a745; }
    .settings-page-header p {
      margin: 0;
      color: #64748b;
      font-size: 0.95rem;
    }

    .settings-mock-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #ecfdf3;
      border: 1px solid #bbf7d0;
      color: #166534;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.35rem;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .settings-mock-banner i {
      font-size: 1.15rem;
      margin-top: 0.1rem;
      flex-shrink: 0;
    }

    .settings-layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
    }

    .settings-nav {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
      padding: 0.65rem;
      position: sticky;
      top: 1.25rem;
    }
    .settings-nav-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border: none;
      background: transparent;
      color: #334155;
      text-align: left;
      padding: 0.7rem 0.85rem;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .settings-nav-btn i {
      width: 1.15rem;
      text-align: center;
      color: #64748b;
    }
    .settings-nav-btn:hover {
      background: #f1f5f9;
    }
    .settings-nav-btn.is-active {
      background: #aaf0ba;
      color: #0f172a;
    }
    .settings-nav-btn.is-active i {
      color: #166534;
    }

    .settings-panel {
      display: none;
    }
    .settings-panel.is-active {
      display: block;
    }

    .settings-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
      padding: 1.5rem 1.6rem;
      margin-bottom: 1.15rem;
    }
    .settings-card h2 {
      margin: 0 0 0.35rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e3a2f;
    }
    .settings-card .card-desc {
      margin: 0 0 1.25rem;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .setting-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.25rem;
      padding: 1rem 0;
      border-top: 1px solid #eef2f7;
    }
    .setting-row:first-of-type {
      border-top: none;
      padding-top: 0;
    }
    .setting-row:last-of-type {
      padding-bottom: 0;
    }
    .setting-copy h3 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #0f172a;
    }
    .setting-copy p {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.4;
      max-width: 38rem;
    }

    .switch {
      position: relative;
      width: 48px;
      height: 28px;
      flex-shrink: 0;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .switch-slider {
      position: absolute;
      inset: 0;
      background: #cbd5e1;
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .switch-slider::before {
      content: "";
      position: absolute;
      width: 22px;
      height: 22px;
      left: 3px;
      top: 3px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s;
    }
    .switch input:checked + .switch-slider {
      background: #28a745;
    }
    .switch input:checked + .switch-slider::before {
      transform: translateX(20px);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem 1.15rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group.full {
      grid-column: 1 / -1;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    .form-group input,
    .form-group select,
    .form-group textarea {
      border: 1px solid #dbe3ea;
      border-radius: 10px;
      padding: 0.65rem 0.8rem;
      font-family: inherit;
      font-size: 0.92rem;
      color: #0f172a;
      background: #fff;
    }
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.15);
    }
    .form-hint {
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .settings-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      justify-content: flex-end;
      margin-top: 1.25rem;
      padding-top: 1.1rem;
      border-top: 1px solid #eef2f7;
    }
    .btn-settings {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.1rem;
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-settings-secondary {
      background: #f1f5f9;
      color: #334155;
    }
    .btn-settings-secondary:hover { background: #e2e8f0; }
    .btn-settings-primary {
      background: #28a745;
      color: #fff;
    }
    .btn-settings-primary:hover { background: #218838; }
    .btn-settings-danger {
      background: #fee2e2;
      color: #b91c1c;
    }
    .btn-settings-danger:hover { background: #fecaca; }

    .danger-card {
      border: 1px solid #fecaca;
      background: #fffafa;
    }
    .danger-card h2 { color: #b91c1c; }

    .toast-stack {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .settings-toast {
      background: #0f172a;
      color: #fff;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.88rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .settings-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 900px) {
      .settings-layout {
        grid-template-columns: 1fr;
      }
      .settings-nav {
        position: static;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.35rem;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'settings'])

  <main class="org-main-content main-content">
    <header class="settings-page-header">
      <h1><i class="bi bi-gear"></i> Settings</h1>
      <p>Manage how your organization works on Kalinga.</p>
    </header>

    <div class="settings-mock-banner" role="status">
      <i class="bi bi-info-circle"></i>
      <div>
        <strong>Mockup preview.</strong>
        Controls and save actions are UI-only for now — nothing is written to Firebase yet.
      </div>
    </div>

    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Settings sections">
        <button type="button" class="settings-nav-btn is-active" data-panel="notifications">
          <i class="bi bi-bell"></i> Notifications
        </button>
        <button type="button" class="settings-nav-btn" data-panel="missions">
          <i class="bi bi-clipboard-check"></i> Missions
        </button>
        <button type="button" class="settings-nav-btn" data-panel="privacy">
          <i class="bi bi-shield-check"></i> Privacy
        </button>
        <button type="button" class="settings-nav-btn" data-panel="danger">
          <i class="bi bi-exclamation-triangle"></i> Danger zone
        </button>
      </nav>

      <div class="settings-content">
        {{-- Notifications --}}
        <section class="settings-panel is-active" id="panel-notifications" aria-labelledby="notifications-title">
          <div class="settings-card">
            <h2 id="notifications-title">Notifications</h2>
            <p class="card-desc">Choose which email and in-app alerts you want for this organization.</p>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>New volunteer applications</h3>
                <p>Get notified when someone applies to one of your missions.</p>
              </div>
              <label class="switch" aria-label="New volunteer applications">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Mission approval updates</h3>
                <p>Alerts when an admin approves or rejects a submitted mission.</p>
              </div>
              <label class="switch" aria-label="Mission approval updates">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Mission ending soon</h3>
                <p>Reminder a few hours before a mission’s end time.</p>
              </div>
              <label class="switch" aria-label="Mission ending soon">
                <input type="checkbox">
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Weekly summary</h3>
                <p>A short weekly email with applications, completed missions, and volunteer totals.</p>
              </div>
              <label class="switch" aria-label="Weekly summary">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="settings-actions">
              <button type="button" class="btn-settings btn-settings-secondary" data-toast="Notification preferences discarded.">Cancel</button>
              <button type="button" class="btn-settings btn-settings-primary" data-toast="Notification preferences saved (mock).">
                <i class="bi bi-check-lg"></i> Save changes
              </button>
            </div>
          </div>
        </section>

        {{-- Missions --}}
        <section class="settings-panel" id="panel-missions" aria-labelledby="missions-title">
          <div class="settings-card">
            <h2 id="missions-title">Mission defaults</h2>
            <p class="card-desc">Defaults applied when you create a new mission. You can still change these per mission.</p>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Auto-accept volunteers by default</h3>
                <p>New missions start with auto-accept turned on. Applicants are approved without manual review.</p>
              </div>
              <label class="switch" aria-label="Auto-accept volunteers by default">
                <input type="checkbox">
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Show volunteer contact after approval</h3>
                <p>Approved volunteers can see your organization contact details on the mission page.</p>
              </div>
              <label class="switch" aria-label="Show volunteer contact after approval">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="form-grid" style="margin-top: 1rem;">
              <div class="form-group">
                <label for="defaultVolunteers">Default volunteers needed</label>
                <input type="number" id="defaultVolunteers" min="1" value="10">
                <span class="form-hint">Pre-fills the create-mission form.</span>
              </div>
              <div class="form-group">
                <label for="defaultMissionType">Preferred mission type</label>
                <select id="defaultMissionType">
                  <option value="">No preference</option>
                  <option selected>General</option>
                  <option>Environment</option>
                  <option>Education</option>
                  <option>Health</option>
                </select>
              </div>
              <div class="form-group full">
                <label for="missionNotesTemplate">Default mission notes template</label>
                <textarea id="missionNotesTemplate" rows="3" placeholder="Optional text to paste into new mission descriptions…">Bring water, wear comfortable clothes, and arrive 15 minutes early.</textarea>
              </div>
            </div>

            <div class="settings-actions">
              <button type="button" class="btn-settings btn-settings-secondary" data-toast="Mission defaults discarded.">Cancel</button>
              <button type="button" class="btn-settings btn-settings-primary" data-toast="Mission defaults saved (mock).">
                <i class="bi bi-check-lg"></i> Save changes
              </button>
            </div>
          </div>
        </section>

        {{-- Privacy --}}
        <section class="settings-panel" id="panel-privacy" aria-labelledby="privacy-title">
          <div class="settings-card">
            <h2 id="privacy-title">Privacy & visibility</h2>
            <p class="card-desc">Control what volunteers and the public can see about your organization.</p>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Public organization profile</h3>
                <p>Allow volunteers to view your profile page and past mission history summary.</p>
              </div>
              <label class="switch" aria-label="Public organization profile">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Show location on open missions</h3>
                <p>Display full address and map pin on approved missions. Turn off to show city only.</p>
              </div>
              <label class="switch" aria-label="Show location on open missions">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Appear in volunteer discovery</h3>
                <p>Let Kalinga suggest your open missions to nearby volunteers.</p>
              </div>
              <label class="switch" aria-label="Appear in volunteer discovery">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="settings-actions">
              <button type="button" class="btn-settings btn-settings-secondary" data-toast="Privacy settings discarded.">Cancel</button>
              <button type="button" class="btn-settings btn-settings-primary" data-toast="Privacy settings saved (mock).">
                <i class="bi bi-check-lg"></i> Save changes
              </button>
            </div>
          </div>
        </section>

        {{-- Danger zone --}}
        <section class="settings-panel" id="panel-danger" aria-labelledby="danger-title">
          <div class="settings-card danger-card">
            <h2 id="danger-title">Danger zone</h2>
            <p class="card-desc">Irreversible actions. These are mock buttons only — they do not delete data yet.</p>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Export organization data</h3>
                <p>Download a copy of missions, applications, and history for your records.</p>
              </div>
              <button type="button" class="btn-settings btn-settings-secondary" data-toast="Export started (mock).">
                <i class="bi bi-download"></i> Export
              </button>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Deactivate organization</h3>
                <p>Hide your org from volunteers and pause new applications. You can reactivate later.</p>
              </div>
              <button type="button" class="btn-settings btn-settings-danger" data-toast="Deactivate is mock-only.">
                Deactivate
              </button>
            </div>

            <div class="setting-row">
              <div class="setting-copy">
                <h3>Delete organization</h3>
                <p>Permanently remove this organization and its mission history. This cannot be undone.</p>
              </div>
              <button type="button" class="btn-settings btn-settings-danger" data-toast="Delete is mock-only.">
                Delete organization
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>

  <div class="toast-stack" id="settingsToastStack" aria-live="polite"></div>

  <script>
    (function () {
      const navButtons = document.querySelectorAll(".settings-nav-btn");
      const panels = document.querySelectorAll(".settings-panel");
      const toastStack = document.getElementById("settingsToastStack");

      function showPanel(id) {
        navButtons.forEach((btn) => {
          btn.classList.toggle("is-active", btn.dataset.panel === id);
        });
        panels.forEach((panel) => {
          panel.classList.toggle("is-active", panel.id === `panel-${id}`);
        });
      }

      navButtons.forEach((btn) => {
        btn.addEventListener("click", () => showPanel(btn.dataset.panel));
      });

      function showToast(message) {
        if (!toastStack || !message) return;
        const el = document.createElement("div");
        el.className = "settings-toast";
        el.textContent = message;
        toastStack.appendChild(el);
        requestAnimationFrame(() => el.classList.add("is-visible"));
        setTimeout(() => {
          el.classList.remove("is-visible");
          setTimeout(() => el.remove(), 200);
        }, 2400);
      }

      document.querySelectorAll("[data-toast]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (btn.tagName === "A") return;
          e.preventDefault();
          showToast(btn.dataset.toast);
        });
      });
    })();
  </script>
</body>
</html>
