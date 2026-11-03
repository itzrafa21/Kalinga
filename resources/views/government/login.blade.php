<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Government Office Login - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/government-login.js'
  ])
  <style>
    :root {
      --text: #0f172a;
      --muted: #64748b;
      --input: #eef2f7;
      --btn: #1e3a5f;
      --btn-hover: #152a45;
      --accent: #0f766e;
      --white: #fff;
      --shadow: 0 22px 40px rgba(15, 23, 42, 0.18);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Poppins", "Segoe UI", Tahoma, sans-serif;
      background: linear-gradient(145deg, #e8eef5 0%, #f4f7fb 45%, #e6f4f1 100%);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .auth-shell {
      width: min(980px, 100%);
      background: #fff;
      border-radius: 24px;
      box-shadow: var(--shadow);
      overflow: hidden;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      min-height: 560px;
    }
    .auth-form-side {
      padding: 48px 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .auth-box { width: 100%; max-width: 380px; }
    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: #e6f4f1;
      color: #0f766e;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .auth-box h2 {
      margin: 0 0 8px;
      font-size: 2rem;
      color: var(--text);
      font-weight: 700;
    }
    .auth-sub {
      margin: 0 0 1.5rem;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .form-control {
      height: 48px;
      border: none;
      border-radius: 10px;
      background: var(--input);
      padding: 0 14px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .form-control:focus {
      background: #e4eaf2;
      box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.18);
    }
    .btn-auth {
      width: 100%;
      height: 48px;
      border: none;
      border-radius: 10px;
      background: var(--btn);
      color: var(--white);
      font-weight: 600;
      margin-top: 6px;
    }
    .btn-auth:hover { background: var(--btn-hover); color: var(--white); }
    .auth-links {
      margin-top: 14px;
      font-size: 13px;
      color: var(--muted);
    }
    .auth-links a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    .auth-links a:hover { text-decoration: underline; }
    .auth-art-side {
      background: linear-gradient(160deg, #1e3a5f 0%, #0f766e 100%);
      color: #fff;
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1rem;
    }
    .auth-art-side h3 {
      margin: 0;
      font-size: 1.55rem;
      line-height: 1.3;
    }
    .auth-art-side p {
      margin: 0;
      opacity: 0.9;
      line-height: 1.55;
      font-size: 0.95rem;
    }
    .login-error-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .login-error-overlay.is-open { display: flex; }
    .login-error-overlay[hidden] { display: none !important; }
    .login-error-modal {
      background: #fff;
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
    .login-error-modal h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
    .login-error-message { margin: 0 0 1.25rem; color: var(--muted); }
    .login-error-btn {
      border: none;
      border-radius: 10px;
      padding: 0.65rem 1.75rem;
      font-weight: 600;
      cursor: pointer;
      background: var(--btn);
      color: #fff;
    }
    @media (max-width: 900px) {
      .auth-shell { grid-template-columns: 1fr; }
      .auth-art-side { order: -1; min-height: 220px; }
      .auth-form-side { padding: 32px 24px; }
    }
  </style>
</head>
<body>
<div class="auth-shell">
  <div class="auth-form-side">
    <div class="auth-box">
      <div class="auth-badge"><i class="bi bi-building"></i> Government Offices</div>
      <h2>Sign in</h2>
      <p class="auth-sub">Review and approve request letters submitted by organizations for their missions.</p>

      <form id="govLoginForm">
        <input type="email" id="email" class="form-control" placeholder="Office email" required>
        <input type="password" id="password" class="form-control" placeholder="Password" required>
        <button type="submit" class="btn-auth">Login</button>
        <div class="auth-links">
          Don’t have an account? <a href="/government/register">Register office</a><br>
          <a href="/organization/login">Organization login</a>
        </div>
      </form>
    </div>
  </div>
  <div class="auth-art-side">
    <h3>Mission request letters, in one place</h3>
    <p>Organizations generate and submit letters when creating a mission. Your office can approve or return them for revision.</p>
  </div>
</div>

<div id="loginErrorModal" class="login-error-overlay" hidden role="alertdialog" aria-modal="true" aria-labelledby="loginErrorTitle">
  <div class="login-error-modal">
    <div class="login-error-icon" aria-hidden="true">!</div>
    <h2 id="loginErrorTitle">Login failed</h2>
    <p class="login-error-message" id="loginErrorMessage">The email or password you entered is incorrect.</p>
    <button type="button" class="login-error-btn" id="loginErrorOk">Try again</button>
  </div>
</div>
</body>
</html>
