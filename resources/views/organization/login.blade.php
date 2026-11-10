<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome back - Kalinga</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/organization-login.js'
  ])
  <style>
    :root {
      --bg: #eef1f4;
      --card: #ffffff;
      --panel: #eef6f0;
      --text: #111827;
      --muted: #6b7280;
      --label: #374151;
      --border: #e5e7eb;
      --green: #166534;
      --green-hover: #14532d;
      --green-soft: #ecfdf5;
      --input-bg: #fff;
      --shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
      --white: #fff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
      background: var(--bg);
      display: grid;
      place-items: center;
      padding: 28px 20px;
      color: var(--text);
    }

    .auth-shell {
      width: min(1080px, 100%);
      background: var(--card);
      border-radius: 28px;
      box-shadow: var(--shadow);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 640px;
    }

    .auth-form-side {
      padding: 42px 48px 36px;
      display: flex;
      flex-direction: column;
      background: var(--card);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--green);
      font-weight: 800;
      font-size: 1.05rem;
      text-decoration: none;
      margin-bottom: 2.4rem;
    }
    .brand i { font-size: 1.15rem; }

    .auth-box {
      width: 100%;
      max-width: 390px;
      margin: auto 0;
    }

    .auth-box h1 {
      margin: 0 0 0.45rem;
      font-size: clamp(2rem, 3vw, 2.55rem);
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text);
    }

    .auth-sub {
      margin: 0 0 1.75rem;
      color: var(--muted);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .form-group { margin-bottom: 1rem; }

    .field-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.4rem;
    }

    label {
      display: block;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--label);
      margin-bottom: 0.4rem;
    }

    .field-label-row label { margin-bottom: 0; }

    .forgot-link {
      color: var(--green);
      font-size: 0.86rem;
      font-weight: 650;
      text-decoration: none;
    }
    .forgot-link:hover { text-decoration: underline; }

    .form-control {
      width: 100%;
      height: 48px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--input-bg);
      padding: 0 14px;
      font-size: 0.95rem;
      font-family: inherit;
      color: var(--text);
      box-shadow: none;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-control::placeholder { color: #9ca3af; }

    .form-control:focus {
      border-color: #86efac;
      box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.12);
    }

    .password-field {
      position: relative;
    }
    .password-field .form-control {
      padding-right: 46px;
    }
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

    .remember-row {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin: 0.35rem 0 1.15rem;
      color: #4b5563;
      font-size: 0.92rem;
      font-weight: 500;
      user-select: none;
    }
    .remember-row input {
      width: 1rem;
      height: 1rem;
      accent-color: var(--green);
      cursor: pointer;
    }
    .remember-row label {
      margin: 0;
      font-weight: 500;
      color: #4b5563;
      cursor: pointer;
    }

    .btn-auth {
      width: 100%;
      height: 50px;
      border: none;
      border-radius: 12px;
      background: var(--green);
      color: var(--white);
      font-weight: 700;
      font-size: 1rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .btn-auth:hover:not(:disabled) { background: var(--green-hover); }
    .btn-auth:disabled { opacity: 0.75; cursor: wait; }

    .auth-footer {
      margin-top: 1.35rem;
      text-align: center;
      font-size: 0.92rem;
      color: var(--muted);
    }
    .auth-footer a {
      color: var(--green);
      text-decoration: none;
      font-weight: 700;
    }
    .auth-footer a:hover { text-decoration: underline; }

    .auth-art-side {
      background: var(--panel);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 40px;
    }

    .auth-art-side img {
      width: min(320px, 78%);
      height: auto;
      display: block;
      margin: 0 auto 1.5rem;
      filter: drop-shadow(0 18px 30px rgba(22, 101, 52, 0.12));
    }

    .art-title {
      margin: 0 0 0.55rem;
      font-size: clamp(1.35rem, 2vw, 1.7rem);
      font-weight: 800;
      color: var(--green);
      letter-spacing: -0.02em;
      max-width: 18ch;
      line-height: 1.25;
    }

    .art-copy {
      margin: 0;
      color: #4b5563;
      font-size: 0.95rem;
      line-height: 1.55;
      max-width: 32ch;
    }

    @media (max-width: 900px) {
      .auth-shell {
        grid-template-columns: 1fr;
        min-height: auto;
      }
      .auth-art-side {
        order: -1;
        padding: 36px 24px 28px;
        min-height: 280px;
      }
      .auth-art-side img {
        width: min(220px, 60%);
        margin-bottom: 1rem;
      }
      .auth-form-side {
        padding: 28px 22px 32px;
      }
      .brand { margin-bottom: 1.5rem; }
    }

    .login-error-overlay {
      position: fixed;
      inset: 0;
      background: rgba(31, 36, 48, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .login-error-overlay.is-open { display: flex; }
    .login-error-overlay[hidden] { display: none !important; }
    .login-error-modal {
      background: var(--white);
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.75rem 1.5rem 1.35rem;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
    }
    .login-error-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 0.85rem;
      border-radius: 50%;
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 700;
    }
    .login-error-modal h2 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
      color: var(--text);
    }
    .login-error-message {
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
      color: var(--muted);
      line-height: 1.55;
    }
    .login-error-actions { display: flex; justify-content: center; }
    .login-error-btn {
      border: none;
      border-radius: 10px;
      padding: 0.65rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: var(--green);
      color: var(--white);
      font-family: inherit;
      transition: background 0.2s ease;
    }
    .login-error-btn:hover { background: var(--green-hover); }
  </style>
</head>
<body>
  <div class="auth-shell">
    <div class="auth-form-side">
      <a class="brand" href="/organization/login">
        <i class="bi bi-heart-fill" aria-hidden="true"></i>
        Kalinga
      </a>

      <div class="auth-box">
        <h1>Welcome back</h1>
        <p class="auth-sub">Sign in to manage missions, volunteers, and donations.</p>

        <form id="orgLoginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              class="form-control"
              placeholder="you@organization.org"
              autocomplete="username"
              required
            >
          </div>

          <div class="form-group">
            <div class="field-label-row">
              <label for="password">Password</label>
              <a class="forgot-link" href="#" id="forgotPasswordLink">Forgot password?</a>
            </div>
            <div class="password-field">
              <input
                type="password"
                id="password"
                class="form-control"
                placeholder="Enter your password"
                required
                autocomplete="current-password"
              >
              <button
                type="button"
                class="password-toggle"
                id="passwordToggle"
                aria-label="Show password"
                aria-pressed="false"
                aria-controls="password"
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

          <div class="remember-row">
            <input type="checkbox" id="keepSignedIn" checked>
            <label for="keepSignedIn">Keep me signed in</label>
          </div>

          <button type="submit" class="btn-auth">Log in</button>

          <p class="auth-footer">
            Don’t have an account? <a href="/organization/register">Register</a>
          </p>
        </form>
      </div>
    </div>

    <div class="auth-art-side">
      <img src="{{ asset('images/kalinga-logo.png') }}" alt="Kalinga — care that reaches communities">
      <h2 class="art-title">Care that reaches communities</h2>
      <p class="art-copy">Coordinate volunteers, run medical missions, and raise funds in one place.</p>
    </div>
  </div>

  <div
    id="loginErrorModal"
    class="login-error-overlay"
    hidden
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="loginErrorTitle"
  >
    <div class="login-error-modal">
      <div class="login-error-icon" aria-hidden="true">!</div>
      <h2 id="loginErrorTitle">Login failed</h2>
      <p class="login-error-message" id="loginErrorMessage">
        The email or password you entered is incorrect. Please try again.
      </p>
      <div class="login-error-actions">
        <button type="button" class="login-error-btn" id="loginErrorOk">Try again</button>
      </div>
    </div>
  </div>
</body>
</html>
