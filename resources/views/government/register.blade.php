<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Government Office Register - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/government-register.js'
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
      width: min(720px, 100%);
      background: #fff;
      border-radius: 24px;
      box-shadow: var(--shadow);
      padding: 2.25rem 2rem;
    }
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
    h1 {
      margin: 0 0 0.4rem;
      font-size: 1.75rem;
      color: var(--text);
    }
    .auth-sub {
      margin: 0 0 1.5rem;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .form-label {
      font-weight: 600;
      font-size: 0.85rem;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .form-control, .form-select {
      height: 46px;
      border: none;
      border-radius: 10px;
      background: var(--input);
      margin-bottom: 0.85rem;
    }
    .form-control:focus, .form-select:focus {
      background: #e4eaf2;
      box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.18);
    }
    .btn-auth {
      width: 100%;
      height: 48px;
      border: none;
      border-radius: 10px;
      background: var(--btn);
      color: #fff;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .btn-auth:hover { background: var(--btn-hover); color: #fff; }
    .auth-links {
      margin-top: 14px;
      font-size: 13px;
      color: var(--muted);
      text-align: center;
    }
    .auth-links a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    .success-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .success-overlay.is-open { display: flex; }
    .success-overlay[hidden] { display: none !important; }
    .success-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.75rem 1.5rem;
      text-align: center;
    }
    .success-modal i { font-size: 2.5rem; color: #0f766e; }
    .success-modal h2 { margin: 0.75rem 0 0.5rem; font-size: 1.2rem; }
    .success-modal p { color: var(--muted); margin: 0 0 1.1rem; }
    .success-modal button {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.5rem;
      background: var(--btn);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="auth-shell">
    <div class="auth-badge"><i class="bi bi-building"></i> Government Offices</div>
    <h1>Register your office</h1>
    <p class="auth-sub">Create an account so your office can receive and decide on mission request letters from organizations.</p>

    <form id="govRegisterForm">
      <label class="form-label" for="officeName">Office name</label>
      <input type="text" id="officeName" class="form-control" placeholder="e.g. City Social Welfare Office" required>

      <label class="form-label" for="department">Department / unit</label>
      <input type="text" id="department" class="form-control" placeholder="e.g. Community Affairs">

      <label class="form-label" for="email">Office email</label>
      <input type="email" id="email" class="form-control" placeholder="office@gov.ph" required>

      <label class="form-label" for="password">Password</label>
      <input type="password" id="password" class="form-control" placeholder="At least 6 characters" required minlength="6">

      <label class="form-label" for="confirmPassword">Confirm password</label>
      <input type="password" id="confirmPassword" class="form-control" placeholder="Repeat password" required minlength="6">

      <button type="submit" class="btn-auth">Create office account</button>
    </form>

    <div class="auth-links">
      Already registered? <a href="/government/login">Sign in</a>
    </div>
  </div>

  <div id="registerSuccessModal" class="success-overlay" hidden role="dialog" aria-modal="true">
    <div class="success-modal">
      <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
      <h2>Office registered</h2>
      <p id="registerSuccessMessage">Your government office account is ready. You can now sign in.</p>
      <button type="button" id="registerSuccessOk">Go to login</button>
    </div>
  </div>
</body>
</html>
