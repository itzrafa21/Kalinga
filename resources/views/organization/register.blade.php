<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Register - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/organization-register-page.js'
  ])
  <style>
    :root {
      --panel: #f3f4f7;
      --text: #1f2430;
      --muted: #6b7280;
      --input: #eceef2;
      --btn: #275735;
      --btn-hover: #1e4529;
      --white: #fff;
      --shadow: 0 22px 40px rgba(20, 18, 28, 0.25);
      --line: #e5e7eb;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      min-height: 100%;
      width: 100%;
    }

    body {
      font-family: "Poppins", "Segoe UI", Tahoma, sans-serif;
      background: #ffffff;
      color: var(--text);
    }

    .auth-shell {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #fff;
    }

    .auth-form-side {
      width: 100%;
      flex: 1;
      padding: 0;
      background: #fff;
    }

    .auth-box {
      width: 100%;
      max-width: none;
      margin: 0;
      background: #fff;
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 1.5rem 1.25rem 2.5rem;
      min-height: 100vh;
    }

    .auth-box h2 {
      margin: 0 0 8px;
      font-size: 2rem;
      line-height: 1.15;
      color: var(--text);
      font-weight: 700;
    }

    .auth-sub {
      margin: 0 0 1.35rem;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .reg-section {
      margin: 0 0 1.35rem;
      padding: 1.15rem 1.1rem 0.5rem;
      border: 1px solid #86efac;
      border-radius: 14px;
    }

    .reg-section h3 {
      margin: 0 0 0.85rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #275735;
      letter-spacing: 0.02em;
    }

    .form-label {
      display: block;
      margin: 0 0 0.3rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
    }

    .form-control,
    .form-select {
      height: 44px;
      border: 1.5px solid #a7f3d0;
      border-radius: 10px;
      background: #fff;
      padding: 0 14px;
      font-size: 14px;
      margin-bottom: 0.85rem;
      box-shadow: none;
    }

    textarea.form-control {
      height: auto;
      min-height: 96px;
      padding: 12px 14px;
      resize: vertical;
    }

    .form-control:focus,
    .form-select:focus {
      background: #fff;
      border-color: #275735;
      box-shadow: 0 0 0 3px rgba(39, 87, 53, 0.14);
      outline: none;
    }

    .file-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
    }

    .file-box .hint {
      font-size: 0.75rem;
      color: var(--muted);
    }

    .field-error {
      display: none;
      align-items: center;
      gap: 0.45rem;
      margin: -0.45rem 0 0.85rem;
      color: #e07a6a;
      font-size: 0.84rem;
      font-weight: 500;
      line-height: 1.3;
    }
    .field-error.is-visible { display: flex; }
    .field-error-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #f3c1b8;
      color: #3b1f1a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      flex-shrink: 0;
      line-height: 1;
    }
    .form-control.is-invalid,
    .form-select.is-invalid {
      box-shadow: 0 0 0 2px rgba(224, 122, 106, 0.35);
      background: #fff7f5;
    }
    .terms-row.is-invalid {
      outline: 2px solid rgba(224, 122, 106, 0.35);
      outline-offset: 4px;
      border-radius: 8px;
    }

    .file-box input[type="file"].form-control {
      display: none;
    }

    .file-upload {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      min-height: 52px;
      padding: 0.65rem 0.85rem;
      border: 2px dashed #6ee7b7;
      border-radius: 12px;
      background: #f3faf5;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .file-upload:hover {
      border-color: #275735;
      background: #ecfdf3;
    }

    .file-upload-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #fff;
      border: 1px solid #e5e7eb;
      color: #275735;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1rem;
    }

    .file-upload-copy {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .file-upload-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: #1f2430;
    }

    .file-upload-name {
      font-size: 0.78rem;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-upload.has-file {
      border-style: solid;
      border-color: #86efac;
      background: #f0fdf4;
    }

    .file-upload.has-file .file-upload-name {
      color: #166534;
      font-weight: 600;
    }

    .file-upload-btn {
      flex-shrink: 0;
      border: none;
      border-radius: 8px;
      padding: 0.45rem 0.8rem;
      background: #275735;
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
      pointer-events: none;
    }

    .terms-row {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin: 0.35rem 0 1rem;
      font-size: 0.85rem;
      color: #374151;
    }

    .terms-row input { margin-top: 0.2rem; }

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
      text-align: center;
    }

    .auth-links a {
      color: var(--btn);
      text-decoration: none;
      font-weight: 600;
    }

    .auth-links a:hover { text-decoration: underline; }

    .auth-art-side { display: none; }

    .reg-page-inner {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
    }

    @media (min-width: 768px) {
      .auth-box { padding: 2rem 3rem 3rem; }
    }

    @media (min-width: 1200px) {
      .auth-box { padding: 2.25rem 4rem 3.5rem; }
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
    .register-success-overlay.is-open { display: flex; }
    .register-success-overlay[hidden] { display: none !important; }
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
      background: rgba(39, 87, 53, 0.12);
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
    .register-success-btn {
      border: none;
      border-radius: 10px;
      padding: 0.65rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: var(--btn);
      color: var(--white);
    }

    .reg-steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin: 0 0 1.15rem;
    }
    .reg-step-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f3f4f6;
      color: #6b7280;
      border: 1.5px solid #d1d5db;
    }
    .reg-step-pill.active {
      background: #ecfdf3;
      color: #166534;
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
    }
    .reg-step-pill.done {
      background: #f0fdf4;
      color: #15803d;
      border-color: #86efac;
    }
    .reg-section[hidden] { display: none !important; }
    .reg-nav {
      display: flex;
      gap: 0.65rem;
      margin-top: 0.35rem;
    }
    .reg-nav .btn-auth { margin-top: 0; }
    .btn-back {
      width: 100%;
      height: 48px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #fff;
      color: #374151;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-back:hover { background: #f9fafb; }
    .btn-back[hidden],
    .btn-next[hidden],
    .btn-submit[hidden] { display: none !important; }

    .reg-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--line);
      text-decoration: none;
      color: inherit;
    }
    .reg-brand-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .reg-brand-text {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .reg-brand-name {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #1e3a2f;
      line-height: 1.1;
    }
    .reg-brand-tag {
      font-size: 0.78rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="auth-shell">
    <div class="auth-form-side">
      <div class="auth-box">
        <div class="reg-page-inner">
        <a href="/organization/login" class="reg-brand" aria-label="Kalinga">
          <img
            src="{{ asset('images/logo-kalinga.svg') }}"
            alt="Kalinga logo"
            class="reg-brand-logo"
            width="64"
            height="64"
            decoding="async"
          >
          <span class="reg-brand-text">
            <span class="reg-brand-name">KALINGA</span>
            <span class="reg-brand-tag">Organization registration</span>
          </span>
        </a>
        <h2>Create organization account</h2>
        <p class="auth-sub" id="regStepSubtitle">Step 1 of 4 — Organization Information</p>

        <div class="reg-steps" aria-label="Registration steps">
          <span class="reg-step-pill active" data-step-pill="0">A. Organization</span>
          <span class="reg-step-pill" data-step-pill="1">B. Representative</span>
          <span class="reg-step-pill" data-step-pill="2">Documents</span>
          <span class="reg-step-pill" data-step-pill="3">C. Account</span>
        </div>

        <form id="registerForm">
          @csrf

          <section class="reg-section reg-step" data-step="0" aria-labelledby="section-org-info">
            <h3 id="section-org-info">A. Organization Information</h3>

            <label class="form-label" for="orgName">Organization Name</label>
            <input type="text" id="orgName" class="form-control" placeholder="Official registered or recognized name">

            <label class="form-label" for="orgType">Organization Type</label>
            <select id="orgType" class="form-select">
              <option value="" disabled selected>Select organization type</option>
              <option value="NGO">NGO</option>
              <option value="Foundation">Foundation</option>
              <option value="Government Agency / Office">Government Agency / Office</option>
              <option value="Barangay">Barangay</option>
              <option value="Public / Private Hospital">Public / Private Hospital</option>
              <option value="Medical Clinic">Medical Clinic</option>
              <option value="Cooperative">Cooperative</option>
              <option value="University">University</option>
            </select>

            <label class="form-label" for="orgDescription">Organization Description</label>
            <textarea id="orgDescription" class="form-control" rows="3" placeholder="Brief background, purpose, and communities or causes served"></textarea>

            <div class="file-box">
              <label class="form-label" for="orgLogo">Organization Logo</label>
              <input type="file" id="orgLogo" class="form-control" accept="image/*">
              <label class="file-upload" for="orgLogo" data-file-for="orgLogo">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-image"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload logo</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
              <span class="hint">Official logo or institutional image</span>
            </div>

            <label class="form-label" for="yearEstablished">Year Established</label>
            <input type="number" id="yearEstablished" class="form-control" min="1800" max="2100" placeholder="e.g. 2015">

            <label class="form-label" for="orgWebsite">Official Website / Social Media Account</label>
            <input type="url" id="orgWebsite" class="form-control" placeholder="https://">

            <label class="form-label" for="orgEmail">Organization Email</label>
            <input type="email" id="orgEmail" class="form-control" placeholder="organization@email.com">

            <label class="form-label" for="orgContactNumber">Contact Number</label>
            <input type="tel" id="orgContactNumber" class="form-control" placeholder="Official telephone or mobile number">

            <label class="form-label" for="completeAddress">Complete Address</label>
            <textarea id="completeAddress" class="form-control" rows="2" placeholder="Street/building, barangay, city/municipality, province, region"></textarea>

            <label class="form-label" for="orgScope">Organization Scope</label>
            <select id="orgScope" class="form-select">
              <option value="" disabled selected>Select scope</option>
              <option value="Local">Local</option>
              <option value="Provincial">Provincial</option>
              <option value="Regional">Regional</option>
              <option value="National">National</option>
            </select>
          </section>

          <section class="reg-section reg-step" data-step="1" hidden aria-labelledby="section-rep-info">
            <h3 id="section-rep-info">B. Authorized Representative Information</h3>

            <label class="form-label" for="repFullName">Full Name</label>
            <input type="text" id="repFullName" class="form-control" placeholder="Complete name of the representative">

            <label class="form-label" for="repPosition">Position / Designation</label>
            <input type="text" id="repPosition" class="form-control" placeholder="e.g. President, Director, Coordinator">

            <label class="form-label" for="repEmail">Email Address</label>
            <input type="email" id="repEmail" class="form-control" placeholder="representative@email.com">

            <label class="form-label" for="repContactNumber">Contact Number</label>
            <input type="tel" id="repContactNumber" class="form-control" placeholder="Mobile or telephone number">

            <div class="file-box">
              <label class="form-label" for="repGovId">Government-issued ID</label>
              <input type="file" id="repGovId" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="repGovId" data-file-for="repGovId">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-person-vcard"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload ID</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
              <span class="hint">Valid government-issued ID of the authorized representative</span>
            </div>

            <div class="file-box">
              <label class="form-label" for="repAuthorization">Proof of Authorization</label>
              <input type="file" id="repAuthorization" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="repAuthorization" data-file-for="repAuthorization">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-file-earmark-text"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload authorization document</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
              <span class="hint">Authorization letter, board resolution, or equivalent</span>
            </div>
          </section>

          <section class="reg-section reg-step" data-step="2" hidden aria-labelledby="section-docs">
            <h3 id="section-docs">Supporting Documents</h3>

            <div class="file-box">
              <label class="form-label" for="docRegistration">Certificate of Registration / Legal Recognition</label>
              <input type="file" id="docRegistration" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="docRegistration" data-file-for="docRegistration">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-file-earmark-check"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload registration certificate</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
            </div>

            <div class="file-box">
              <label class="form-label" for="docArticles">Articles of Incorporation and By-Laws (if applicable)</label>
              <input type="file" id="docArticles" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="docArticles" data-file-for="docArticles">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-journal-text"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload articles / by-laws</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
            </div>

            <div class="file-box">
              <label class="form-label" for="docAddress">Proof of Official Address</label>
              <input type="file" id="docAddress" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="docAddress" data-file-for="docAddress">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-geo-alt"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload proof of address</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
            </div>

            <div class="file-box">
              <label class="form-label" for="docTypeSpecific">Additional document for organization type</label>
              <input type="file" id="docTypeSpecific" class="form-control" accept="image/*,.pdf">
              <label class="file-upload" for="docTypeSpecific" data-file-for="docTypeSpecific">
                <span class="file-upload-icon" aria-hidden="true"><i class="bi bi-folder2-open"></i></span>
                <span class="file-upload-copy">
                  <span class="file-upload-title">Upload type-specific document</span>
                  <span class="file-upload-name">No file chosen</span>
                </span>
                <span class="file-upload-btn">Choose file</span>
              </label>
              <span class="hint">e.g. SEC, DOH LTO, CDA, CHED, barangay certification — whichever applies</span>
            </div>
          </section>

          <section class="reg-section reg-step" data-step="3" hidden aria-labelledby="section-account">
            <h3 id="section-account">C. Account Credentials</h3>

            <label class="form-label" for="username">Username</label>
            <input type="text" id="username" class="form-control" placeholder="Unique username">

            <label class="form-label" for="email">Email Address (sign-in)</label>
            <input type="email" id="email" class="form-control" placeholder="Used to sign in and receive notifications">

            <label class="form-label" for="password">Password</label>
            <input type="password" id="password" class="form-control" placeholder="At least 6 characters" minlength="6">

            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" class="form-control" placeholder="Re-enter password" minlength="6">

            <label class="terms-row">
              <input type="checkbox" id="acceptTerms">
              <span>I have reviewed and accept the platform’s terms, privacy notice, and relevant policies.</span>
            </label>
          </section>

          <div class="reg-nav">
            <button type="button" class="btn-back" id="regBackBtn" hidden>Back</button>
            <button type="button" class="btn-auth btn-next" id="regNextBtn">Next</button>
            <button type="submit" class="btn-auth btn-submit" id="regSubmitBtn" hidden>Create account</button>
          </div>

          <div class="auth-links">
            Already have an account? <a href="/organization/login">Login</a>
          </div>
        </form>
        </div>
      </div>
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
        Your organization account has been created. An administrator will review your registration before you can sign in.
      </p>
      <div class="register-success-actions">
        <button type="button" class="register-success-btn" id="registerSuccessOk">
          Go to login
        </button>
      </div>
    </div>
  </div>
</body>
</html>
