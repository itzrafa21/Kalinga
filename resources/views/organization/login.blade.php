<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
@vite([
  'resources/css/app.css',
  'resources/js/organization-login.js'
])
<style>
  :root {
    --bg: #b78374;
    --panel: #f3f4f7;
    --text: #1f2430;
    --muted: #6b7280;
    --input: #eceef2;
    --btn: #9b6a7b;
    --btn-hover:rgb(139, 52, 219);
    --white: #fff;
    --shadow: 0 22px 40px rgba(20, 18, 28, 0.25);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: "Poppins", "Segoe UI", Tahoma, sans-serif;
    background: #ffffff;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .auth-shell {
    width: min(1100px, 100%);
    background: var(--panel);
    border-radius: 24px;
    box-shadow: var(--shadow);
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 620px;
  }

  .auth-form-side {
    padding: 56px 64px;
    display: flex;
    background-color: #ffffff;
    align-items: center;
    justify-content: center;
  }

  .auth-box {
    width: 100%;
    max-width: 380px;
  }

  .auth-box h2 {
    margin: 0 0 10px;
    font-size: 44px;
    line-height: 1.05;
    color: var(--text);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .auth-sub {
    margin: 0 0 26px;
    color: var(--muted);
    font-size: 13px;
  }

  .form-control {
    height: 48px;
    border: none;
    border-radius: 10px;
    background: var(--input);
    padding: 0 14px;
    font-size: 14px;
    margin-bottom: 12px;
    box-shadow: none;
  }

  .form-control:focus {
    background: #e6e9ef;
    box-shadow: 0 0 0 2px rgba(155, 106, 123, 0.16);
  }

  .password-field {
    position: relative;
    margin-bottom: 12px;
  }
  .password-field .form-control {
    margin-bottom: 0;
    padding-right: 44px;
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
    color: rgb(110, 40, 167);
    outline: none;
    background: rgba(110, 40, 167, 0.08);
  }
  .password-toggle svg {
    width: 18px;
    height: 18px;
    display: block;
  }
  .password-toggle .icon-eye-off { display: none; }
  .password-toggle.is-visible .icon-eye { display: none; }
  .password-toggle.is-visible .icon-eye-off { display: block; }

  .btn-auth {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 10px;
    background:rgb(110, 40, 167);
    color: var(--white);
    font-weight: 600;
    margin-top: 6px;
    transition: background 0.2s ease;
  }

  .btn-auth:hover { background: var(--btn-hover); color: var(--white); }

  .auth-links {
    margin-top: 12px;
    font-size: 13px;
    color: var(--muted);
  }

  .auth-links a {
    color: rgb(110, 40, 167);
    text-decoration: none;
    font-weight: 600;
  }

  .auth-links a:hover { text-decoration: underline; }

  .auth-art-side {
    position: relative;
    background:rgb(255, 255, 255);
    padding: 12px;
  }

  .auth-art-side img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
    display: block;
  }

  @media (max-width: 900px) {
    .auth-shell {
      grid-template-columns: 1fr;
      min-height: auto;
    }
    .auth-art-side {
      min-height: 280px;
      order: -1;
    }
    .auth-form-side {
      padding: 32px 24px;
    }
    .auth-box h2 {
      font-size: 34px;
    }
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
  .login-error-overlay.is-open {
    display: flex;
  }
  .login-error-overlay[hidden] {
    display: none !important;
  }
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
  .login-error-actions {
    display: flex;
    justify-content: center;
  }
  .login-error-btn {
    border: none;
    border-radius: 10px;
    padding: 0.65rem 1.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    background: rgb(110, 40, 167);
    color: var(--white);
    transition: background 0.2s ease;
  }
  .login-error-btn:hover {
    background: var(--btn-hover);
  }
</style>
</head>
<body>
<div class="auth-shell">
  <div class="auth-form-side">
    <div class="auth-box">
      <h2>Welcome back</h2>
      <p class="auth-sub">Please enter your credentials</p>

      <form id="orgLoginForm">
        <input type="email" id="email" class="form-control" placeholder="Email" required>
        <div class="password-field">
          <input type="password" id="password" class="form-control" placeholder="Password" required autocomplete="current-password">
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

        <button type="submit" class="btn-auth">Login</button>

        <div class="auth-links">
          Don’t have an account? <a href="/organization/register">Register</a>
        </div>
      </form>
    </div>
  </div>

  <div class="auth-art-side">
    <img src="{{ asset('images/welcome2.png') }}" alt="Scenic artwork">
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

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
