<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Register - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
@vite([
  'resources/css/app.css',
  'resources/js/organization-register-page.js'
])
<style>
  :root {
    --bg: #b78374;
    --panel: #f3f4f7;
    --text: #1f2430;
    --muted: #6b7280;
    --input: #eceef2;
    --btn: #9b6a7b;
    --btn-hover: #87596a;
    --white: #fff;
    --shadow: 0 22px 40px rgba(20, 18, 28, 0.25);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: "Poppins", "Segoe UI", Tahoma, sans-serif;
    background: var(--bg);
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

  .btn-auth {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 10px;
    background: var(--btn);
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
    color: var(--btn);
    text-decoration: none;
    font-weight: 600;
  }

  .auth-links a:hover { text-decoration: underline; }

  .auth-art-side {
    position: relative;
    background: #d7d6df;
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

  .register-success-overlay {
    position: fixed;
    inset: 0;
    background: rgba(31, 36, 48, 0.55);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1rem;
  }
  .register-success-overlay.is-open {
    display: flex;
  }
  .register-success-overlay[hidden] {
    display: none !important;
  }
  .register-success-modal {
    background: var(--white);
    border-radius: 16px;
    max-width: 420px;
    width: 100%;
    padding: 1.75rem 1.5rem 1.35rem;
    text-align: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
  }
  .register-success-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 0.85rem;
    border-radius: 50%;
    background: rgba(155, 106, 123, 0.14);
    color: var(--btn);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    font-weight: 700;
  }
  .register-success-modal h2 {
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
    color: var(--text);
  }
  .register-success-message {
    margin: 0 0 1.25rem;
    font-size: 0.95rem;
    color: var(--muted);
    line-height: 1.55;
  }
  .register-success-message strong {
    color: var(--text);
    font-weight: 600;
  }
  .register-success-actions {
    display: flex;
    justify-content: center;
  }
  .register-success-btn {
    border: none;
    border-radius: 10px;
    padding: 0.65rem 1.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--btn);
    color: var(--white);
    transition: background 0.2s ease;
  }
  .register-success-btn:hover {
    background: var(--btn-hover);
  }
</style>
</head>
<body>
  <div class="auth-shell">
    <div class="auth-form-side">
      <div class="auth-box">
        <h2>Create account</h2>
        <p class="auth-sub">Create your organization account</p>

        <form id="registerForm">
          @csrf
          <input type="text" id="orgName" class="form-control" placeholder="Organization Name" required>
          <input type="email" id="email" class="form-control" placeholder="Email" required>
          <input type="password" id="password" class="form-control" placeholder="Password" required>
          <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm Password" required>

          <button type="submit" class="btn-auth">Create account</button>

          <div class="auth-links">
            Already have an account? <a href="/organization/login">Login</a>
          </div>
        </form>
      </div>
    </div>

    <div class="auth-art-side">
      <img src="{{ asset('images/welcome2.png') }}" alt="Scenic artwork">
    </div>
  </div>

  <div
    id="registerSuccessModal"
    class="register-success-overlay"
    hidden
    role="dialog"
    aria-modal="true"
    aria-labelledby="registerSuccessTitle"
  >
    <div class="register-success-modal">
      <div class="register-success-icon" aria-hidden="true">✓</div>
      <h2 id="registerSuccessTitle">Registration complete</h2>
      <p class="register-success-message" id="registerSuccessMessage">
        Your organization account has been created successfully. You can now sign in.
      </p>
      <div class="register-success-actions">
        <button type="button" class="register-success-btn" id="registerSuccessOk">
          Go to login
        </button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>