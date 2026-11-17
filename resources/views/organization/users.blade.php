<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Users - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/organization-users.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .users-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .users-toolbar p {
      margin: 0;
      max-width: 36rem;
      color: #64748b;
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .btn-users {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.05rem;
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-users-primary {
      background: #28a745;
      color: #fff;
    }
    .btn-users-primary:hover { background: #218838; }
    .btn-users-secondary {
      background: #f1f5f9;
      color: #334155;
    }
    .btn-users-secondary:hover { background: #e2e8f0; }
    .btn-users-danger {
      background: #fee2e2;
      color: #b91c1c;
    }
    .btn-users-danger:hover { background: #fecaca; }
    .btn-users:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .users-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .users-stat {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      padding: 1rem 1.15rem;
    }
    .users-stat span {
      display: block;
      color: #64748b;
      font-size: 0.82rem;
      margin-bottom: 0.35rem;
    }
    .users-stat strong {
      font-size: 1.6rem;
      color: #0f172a;
      font-weight: 700;
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .users-card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      padding: 1rem 1.15rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .users-card.is-disabled {
      opacity: 0.78;
      background: #f8fafc;
    }
    .users-card-main {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      min-width: 0;
    }
    .users-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #dcfce7;
      color: #166534;
      display: grid;
      place-items: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    .users-card h3 {
      margin: 0 0 0.15rem;
      font-size: 1rem;
      color: #0f172a;
    }
    .users-card p {
      margin: 0;
      color: #64748b;
      font-size: 0.88rem;
    }
    .users-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.45rem;
    }
    .users-chip,
    .users-status {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.15rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .users-chip {
      background: #ecfdf5;
      color: #166534;
    }
    .users-status.is-on {
      background: #dcfce7;
      color: #166534;
    }
    .users-status.is-off {
      background: #fee2e2;
      color: #b91c1c;
    }

    .users-empty {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      padding: 2.5rem 1.5rem;
      text-align: center;
    }
    .users-empty i {
      font-size: 2rem;
      color: #86efac;
    }
    .users-empty h2 {
      margin: 0.75rem 0 0.35rem;
      font-size: 1.15rem;
      color: #0f172a;
    }
    .users-empty p {
      margin: 0 0 1.1rem;
      color: #64748b;
      font-size: 0.92rem;
    }
    .users-loading {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 0.85rem;
    }

    .users-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 4000;
      padding: 1rem;
    }
    .users-modal-overlay.is-open { display: flex; }
    .users-modal-overlay[hidden] { display: none !important; }
    .users-modal {
      background: #fff;
      border-radius: 16px;
      width: min(480px, 100%);
      padding: 1.35rem 1.4rem 1.25rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .users-modal h2 {
      margin: 0 0 0.35rem;
      font-size: 1.15rem;
      color: #0f172a;
    }
    .users-modal-desc {
      margin: 0 0 1.1rem;
      color: #64748b;
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .users-form-grid {
      display: grid;
      gap: 0.85rem;
    }
    .users-form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .users-form-group label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #334155;
    }
    .users-form-group input,
    .users-form-group select {
      border: 1px solid #dbe3ea;
      border-radius: 10px;
      padding: 0.65rem 0.8rem;
      font-family: inherit;
      font-size: 0.92rem;
      color: #0f172a;
      background: #fff;
    }
    .users-form-group input:focus,
    .users-form-group select:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.15);
    }
    .users-form-hint {
      font-size: 0.76rem;
      color: #94a3b8;
    }
    .users-form-error {
      margin: 0.85rem 0 0;
      color: #b91c1c;
      font-size: 0.85rem;
      min-height: 1.2em;
    }
    .users-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
      margin-top: 1.15rem;
    }

    .toast-stack {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .users-toast {
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
    .users-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    html[data-theme="dark"] .users-stat,
    html[data-theme="dark"] .users-card,
    html[data-theme="dark"] .users-empty,
    html[data-theme="dark"] .users-modal {
      background: #1e293b !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
    }
    html[data-theme="dark"] .users-toolbar p,
    html[data-theme="dark"] .users-stat span,
    html[data-theme="dark"] .users-card p,
    html[data-theme="dark"] .users-empty p,
    html[data-theme="dark"] .users-modal-desc,
    html[data-theme="dark"] .users-loading {
      color: #94a3b8 !important;
    }
    html[data-theme="dark"] .users-stat strong,
    html[data-theme="dark"] .users-card h3,
    html[data-theme="dark"] .users-empty h2,
    html[data-theme="dark"] .users-modal h2 {
      color: #f8fafc !important;
    }
    html[data-theme="dark"] .users-form-group label { color: #cbd5e1 !important; }
    html[data-theme="dark"] .users-form-group input,
    html[data-theme="dark"] .users-form-group select {
      background: #0f172a !important;
      border-color: #334155 !important;
      color: #e2e8f0 !important;
    }
    html[data-theme="dark"] .btn-users-secondary {
      background: #334155 !important;
      color: #e2e8f0 !important;
    }
    html[data-theme="dark"] .users-card.is-disabled {
      background: #0f172a !important;
    }

    @media (max-width: 720px) {
      .users-stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'users'])
  @include('partials.org-topbar', ['pageTitle' => 'Users'])

  <main class="org-main-content main-content">
    <div class="users-toolbar">
      <p>Add people who can sign in to this organization account. You can disable access anytime without deleting their login.</p>
      <button type="button" class="btn-users btn-users-primary" id="openAddUserBtn">
        <i class="bi bi-person-plus"></i> Add user
      </button>
    </div>

    <div class="users-stats">
      <div class="users-stat">
        <span>Total users</span>
        <strong id="usersTotalCount">0</strong>
      </div>
      <div class="users-stat">
        <span>Active</span>
        <strong id="usersActiveCount">0</strong>
      </div>
      <div class="users-stat">
        <span>Disabled</span>
        <strong id="usersDisabledCount">0</strong>
      </div>
    </div>

    <p class="users-loading" id="usersLoading" hidden>Loading users…</p>

    <div class="users-empty" id="usersEmpty" hidden>
      <i class="bi bi-people"></i>
      <h2>No users yet</h2>
      <p>Create the first account so someone else can help manage this organization.</p>
      <button type="button" class="btn-users btn-users-primary" id="emptyAddUserBtn">
        <i class="bi bi-person-plus"></i> Add user
      </button>
    </div>

    <div class="users-list" id="usersList"></div>
  </main>

  <div class="users-modal-overlay" id="addUserModal" hidden>
    <div class="users-modal" role="dialog" aria-modal="true" aria-labelledby="addUserTitle">
      <h2 id="addUserTitle">Add user</h2>
      <p class="users-modal-desc">They will sign in on the organization login page with the username and password you set.</p>
      <form id="addUserForm">
        <div class="users-form-grid">
          <div class="users-form-group">
            <label for="userRole">Role</label>
            <select id="userRole" name="role" required></select>
          </div>
          <div class="users-form-group">
            <label for="userName">Name</label>
            <input id="userName" name="name" type="text" required maxlength="80" placeholder="Full name" autocomplete="name">
          </div>
          <div class="users-form-group">
            <label for="userUsername">Username</label>
            <input id="userUsername" name="username" type="text" required minlength="3" maxlength="32" placeholder="e.g. maria.coord" autocomplete="off">
            <span class="users-form-hint">Letters, numbers, dots, dashes, and underscores only.</span>
          </div>
          <div class="users-form-group">
            <label for="userPassword">Password</label>
            <input id="userPassword" name="password" type="password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password">
          </div>
        </div>
        <p class="users-form-error" id="addUserError" role="alert"></p>
        <div class="users-modal-actions">
          <button type="button" class="btn-users btn-users-secondary" id="cancelAddUserBtn">Cancel</button>
          <button type="submit" class="btn-users btn-users-primary" id="submitAddUserBtn">
            <i class="bi bi-check-lg"></i> Create user
          </button>
        </div>
      </form>
      <button type="button" id="closeAddUserBtn" hidden aria-hidden="true"></button>
    </div>
  </div>

  <div class="toast-stack" id="usersToastStack" aria-live="polite"></div>
</body>
</html>
