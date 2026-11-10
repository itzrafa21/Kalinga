<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - Kalinga</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/admin-login.js'
  ])
  <style>
    :root {
      --bg: #f3f4f6;
      --card: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --label: #374151;
      --border: #e5e7eb;
      --green: #166534;
      --green-hover: #14532d;
      --green-soft: #ecfdf5;
      --green-icon: #15803d;
      --shadow: 0 18px 48px rgba(15, 23, 42, 0.1);
      --white: #fff;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --danger-border: #fecaca;
      --success: #166534;
      --success-bg: #ecfdf5;
      --success-border: #bbf7d0;
      --warning: #92400e;
      --warning-bg: #fffbeb;
      --warning-border: #fde68a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--text);
      font-weight: 800;
      font-size: 1.15rem;
      text-decoration: none;
      margin-bottom: 1.35rem;
      letter-spacing: -0.02em;
    }
    .brand i {
      color: var(--green);
      font-size: 1.2rem;
    }

    .admin-card {
      width: min(420px, 100%);
      background: var(--card);
      border-radius: 18px;
      box-shadow: var(--shadow);
      border: 1px solid rgba(229, 231, 235, 0.9);
      padding: 1.75rem 1.65rem 1.45rem;
    }

    .admin-badge {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--green-soft);
      color: var(--green-icon);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      margin-bottom: 1rem;
    }

    .admin-card h1 {
      margin: 0 0 0.3rem;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text);
      line-height: 1.15;
    }

    .admin-sub {
      margin: 0 0 1.35rem;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .form-group { margin-bottom: 1rem; }

    label {
      display: block;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--label);
      margin-bottom: 0.4rem;
    }

    .form-control {
      width: 100%;
      height: 48px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      padding: 0 14px;
      font-size: 0.95rem;
      font-family: inherit;
      color: var(--text);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-control::placeholder { color: #9ca3af; }

    .form-control:focus {
      border-color: #86efac;
      box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.12);
    }

    .password-field { position: relative; }
    .password-field .form-control { padding-right: 46px; }

    .password-toggle {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .password-toggle:hover,
    .password-toggle:focus-visible {
      color: var(--green);
      outline: none;
      background: var(--green-soft);
    }
    .password-toggle .icon-eye-off { display: none; }
    .password-toggle.is-visible .icon-eye { display: none; }
    .password-toggle.is-visible .icon-eye-off { display: block; }
    .password-toggle svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    .btn-admin-login {
      width: 100%;
      height: 50px;
      margin-top: 0.35rem;
      border: none;
      border-radius: 12px;
      background: var(--green);
      color: var(--white);
      font-weight: 700;
      font-size: 0.98rem;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      transition: background 0.2s ease;
    }
    .btn-admin-login:hover:not(:disabled) { background: var(--green-hover); }
    .btn-admin-login:disabled { opacity: 0.75; cursor: wait; }

    .loading { display: none; }
    .loading.show { display: inline-flex; align-items: center; }

    .admin-note {
      margin: 1.15rem 0 0;
      color: #9ca3af;
      font-size: 0.82rem;
      text-align: center;
    }

    .login-alert {
      border-radius: 12px;
      padding: 0.75rem 0.9rem;
      margin-bottom: 1rem;
      font-size: 0.88rem;
      line-height: 1.45;
      border: 1px solid transparent;
    }
    .login-alert.danger {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      color: var(--danger);
    }
    .login-alert.success {
      background: var(--success-bg);
      border-color: var(--success-border);
      color: var(--success);
    }
    .login-alert.warning {
      background: var(--warning-bg);
      border-color: var(--warning-border);
      color: var(--warning);
    }
  </style>
</head>
<body>
  <a class="brand" href="/admin/login">
    <i class="bi bi-heart-fill" aria-hidden="true"></i>
    Kalinga
  </a>

  <div class="admin-card">
    <div class="admin-badge" aria-hidden="true">
      <i class="bi bi-shield-check"></i>
    </div>
    <h1>Admin Portal</h1>
    <p class="admin-sub">Kalinga Management System</p>

    <div id="alertContainer"></div>

    <form id="adminLoginForm">
      <div class="form-group">
        <label for="adminEmail">Admin email</label>
        <input
          type="email"
          id="adminEmail"
          class="form-control"
          placeholder="admin@kalinga.org"
          autocomplete="username"
          required
        >
      </div>

      <div class="form-group">
        <label for="adminPassword">Password</label>
        <div class="password-field">
          <input
            type="password"
            id="adminPassword"
            class="form-control"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
          >
          <button
            type="button"
            class="password-toggle"
            id="adminPasswordToggle"
            aria-label="Show password"
            aria-pressed="false"
            aria-controls="adminPassword"
          >
            <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-5.94"></path>
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19"></path>
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>
        </div>
      </div>

      <button type="submit" class="btn-admin-login">
        <span class="loading" id="loadingSpinner"><i class="bi bi-hourglass-split"></i></span>
        <span id="loginText">Log in to Admin Panel</span>
      </button>
    </form>

  </div>

  <p class="admin-note">Authorized administrators only.</p>
</body>
</html>
