<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile - Kalinga</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/firebase.js',
    'resources/js/organization-profile.js'
  ])
  @include('partials.org-layout-styles')
  <style>
    html, body.org-app {
      height: 100%;
      overflow: hidden;
      font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
      background: #f3f4f6;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.profile-page {
      margin-left: 210px;
      max-width: none;
      width: calc(100% - 210px);
      height: 100vh;
      min-height: 100vh;
      padding: 0;
      background: #f3f4f6;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .profile-topbar {
      background: #166534;
      color: #fff;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-shrink: 0;
    }
    .profile-topbar i { font-size: 1rem; }
    .profile-topbar p { margin: 0; font-size: 0.95rem; font-weight: 600; }
    .profile-topbar span { opacity: 0.85; font-weight: 500; }
    .profile-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem 1.5rem 6.5rem;
    }

    .profile-hero {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.25rem 1.4rem;
      margin-bottom: 1.15rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .profile-hero-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;
    }
    .profile-avatar-wrap { flex-shrink: 0; }
    .profile-avatar-inner { position: relative; width: 72px; height: 72px; }
    .profile-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #374151;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.45rem;
      font-weight: 800;
      overflow: hidden;
      position: relative;
      cursor: pointer;
    }
    .profile-avatar img,
    #profileAvatarImg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .profile-avatar.has-photo #avatarInitial { display: none; }
    .pp-camera-badge {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #16a34a;
      color: #fff;
      border: 2px solid #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      cursor: pointer;
      padding: 0;
      z-index: 2;
    }
    .profile-avatar-remove {
      display: none;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: #dc2626;
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }
    .profile-info h1 {
      margin: 0 0 0.2rem;
      font-size: 1.35rem;
      font-weight: 800;
      color: #111827;
      display: inline;
      letter-spacing: -0.02em;
    }
    .type-chip {
      display: inline-flex;
      align-items: center;
      margin-left: 0.45rem;
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      background: #ede9fe;
      color: #6d28d9;
      font-size: 0.72rem;
      font-weight: 700;
      vertical-align: middle;
    }
    .profile-info > p {
      margin: 0.15rem 0 0;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .profile-tagline {
      margin: 0.35rem 0 0;
      color: #6b7280;
      font-size: 0.86rem;
    }
    .profile-stats {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      text-align: right;
    }
    .profile-stat strong {
      display: block;
      font-size: 1.2rem;
      color: #111827;
      font-weight: 800;
      line-height: 1.1;
    }
    .profile-stat span {
      color: #6b7280;
      font-size: 0.8rem;
    }

    .profile-layout {
      display: block;
    }
    .profile-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      position: relative;
      z-index: 1;
    }
    .profile-content {
      position: relative;
      z-index: 0;
    }
    .profile-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.95rem;
      border-radius: 999px;
      border: 1px solid #dbe4dc;
      background: #fff;
      color: #64748b;
      font-size: 0.86rem;
      font-weight: 650;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .profile-tab:hover {
      background: #f8faf9;
      color: #166534;
      border-color: #86efac;
    }
    .profile-tab.active {
      background: #ecfdf3;
      color: #166534;
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
    }

    .profile-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.25rem 1.35rem 1.35rem;
      margin-bottom: 0;
    }
    .profile-card[hidden] { display: none !important; }
    .profile-card h2 {
      margin: 0 0 1rem;
      font-size: 1.05rem;
      font-weight: 800;
      color: #111827;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem 1rem;
    }
    .form-group { margin: 0; }
    .form-group.full { grid-column: 1 / -1; }
    .form-label {
      display: block;
      margin: 0 0 0.35rem;
      font-size: 0.84rem;
      font-weight: 700;
      color: #374151;
    }
    .form-control,
    .form-select,
    .password-section .form-group input {
      width: 100%;
      height: 44px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #fff;
      padding: 0 14px;
      font: inherit;
      font-size: 0.92rem;
      color: #111827;
      box-sizing: border-box;
    }
    textarea.form-control {
      height: auto;
      min-height: 110px;
      padding: 12px 14px;
      resize: vertical;
    }
    .form-control:focus,
    .form-select:focus,
    .password-section .form-group input:focus {
      outline: none;
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.14);
    }
    .form-control[readonly],
    .locked-input {
      background: #f9fafb;
      color: #6b7280;
    }
    .field-hint {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.78rem;
      color: #9ca3af;
    }

    .input-lock-wrap {
      position: relative;
    }
    .input-lock-wrap .form-control {
      padding-right: 40px;
    }
    .input-lock-wrap i {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      font-size: 0.95rem;
      pointer-events: none;
    }
    .org-id-row {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }
    .org-id-row .input-lock-wrap { flex: 1; }
    .btn-copy-id {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #374151;
      border-radius: 10px;
      padding: 0 0.85rem;
      cursor: pointer;
    }
    .btn-copy-id:hover { background: #f3f4f6; }

    .multi-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .multi-field-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .multi-field-row { position: relative; display: flex; align-items: center; }
    .multi-field-row .form-control { width: 100%; padding-right: 46px; }
    .multi-field-action {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 8px;
      background: #ecfdf3;
      color: #166534;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .multi-field-action.is-remove { background: #fef2f2; color: #b91c1c; }

    .password-input-wrap { position: relative; }
    .password-input-wrap input { padding-right: 44px; width: 100%; }
    .toggle-pass {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px 8px;
    }
    .password-requirements {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.55rem 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 0.9rem 1rem;
      margin: 1rem 0;
    }
    .password-requirements ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: contents;
    }
    .password-requirements li {
      margin: 0;
      font-size: 0.84rem;
      color: #4b5563;
      padding-left: 1.35rem;
      position: relative;
    }
    .password-requirements li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.2rem;
      width: 0.85rem;
      height: 0.85rem;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      box-sizing: border-box;
    }
    .password-requirements li.met {
      color: #166534;
      font-weight: 600;
    }
    .password-requirements li.met::before {
      border-color: #16a34a;
      background: #16a34a;
      box-shadow: inset 0 0 0 2px #f0fdf4;
    }

    .change-password-submit {
      border: 1.5px solid #166534;
      background: #fff;
      color: #166534;
      border-radius: 10px;
      height: 44px;
      padding: 0 1.1rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .change-password-submit:hover { background: #f0fdf4; }
    .change-password-submit:disabled { opacity: 0.65; cursor: not-allowed; }

    .profile-page-footer {
      text-align: center;
      margin: 1.25rem 0 0.5rem;
      color: #9ca3af;
      font-size: 0.84rem;
    }
    .profile-page-footer p { margin: 0.15rem 0; }

    .profile-sticky-bar {
      position: fixed;
      left: 210px;
      right: 0;
      bottom: 0;
      z-index: 40;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06);
      transform: translateY(110%);
      transition: transform 0.2s ease;
    }
    .profile-sticky-bar.is-visible { transform: translateY(0); }
    .profile-sticky-bar p {
      margin: 0;
      color: #6b7280;
      font-size: 0.92rem;
      font-weight: 500;
    }
    .sticky-actions { display: flex; gap: 0.65rem; }
    .btn-discard {
      border: 1px solid #d1d5db;
      background: #fff;
      color: #374151;
      border-radius: 10px;
      height: 42px;
      padding: 0 1rem;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }
    .btn-discard:hover { background: #f9fafb; }
    .save-btn {
      border: none;
      background: #166534;
      color: #fff;
      border-radius: 10px;
      height: 42px;
      padding: 0 1.15rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .save-btn:hover { background: #14532d; }
    .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }

    .profile-success-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 5000;
      padding: 1rem;
    }
    .profile-success-overlay.is-open { display: flex; }
    .profile-success-overlay[hidden] { display: none !important; }
    .profile-success-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.5rem;
      text-align: center;
    }
    .profile-success-icon { color: #16a34a; font-size: 2rem; margin-bottom: 0.5rem; }
    .profile-success-modal h2 { margin: 0 0 0.4rem; font-size: 1.25rem; }
    .profile-success-message { margin: 0 0 1rem; color: #6b7280; }
    .profile-success-confirm {
      border: none;
      background: #166534;
      color: #fff;
      border-radius: 10px;
      padding: 0.6rem 1.4rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    html[data-theme="dark"] .profile-page,
    html[data-theme="dark"] .org-main-content.main-content.profile-page,
    html[data-theme="dark"] .profile-scroll {
      background: #0b1220 !important;
    }
    html[data-theme="dark"] .profile-hero,
    html[data-theme="dark"] .profile-card,
    html[data-theme="dark"] .profile-sticky-bar,
    html[data-theme="dark"] .profile-success-modal {
      background: #1e293b !important;
      border-color: #334155 !important;
      color: #e2e8f0 !important;
    }
    html[data-theme="dark"] .profile-info h1,
    html[data-theme="dark"] .profile-card h2,
    html[data-theme="dark"] .profile-stat strong,
    html[data-theme="dark"] .form-label {
      color: #f8fafc !important;
    }
    html[data-theme="dark"] .profile-tabs {
      background: #1e293b !important;
      border-color: #334155 !important;
    }
    html[data-theme="dark"] .profile-tab {
      background: #0f172a !important;
      border-color: #334155 !important;
      color: #94a3b8 !important;
    }
    html[data-theme="dark"] .profile-tab:hover,
    html[data-theme="dark"] .profile-tab.active {
      background: #14532d !important;
      border-color: #166534 !important;
      color: #bbf7d0 !important;
    }
    html[data-theme="dark"] .profile-avatar { background: #334155 !important; color: #e2e8f0 !important; }
    html[data-theme="dark"] .form-control,
    html[data-theme="dark"] .form-select,
    html[data-theme="dark"] .password-section .form-group input,
    html[data-theme="dark"] .btn-discard,
    html[data-theme="dark"] .btn-copy-id,
    html[data-theme="dark"] .change-password-submit {
      background: #0f172a !important;
      border-color: #334155 !important;
      color: #e2e8f0 !important;
    }
    html[data-theme="dark"] .password-requirements {
      background: #14532d !important;
      border-color: #166534 !important;
    }

    @media (max-width: 1000px) {
      .form-grid { grid-template-columns: 1fr; }
      .password-requirements { grid-template-columns: 1fr; }
    }
    @media (max-width: 900px) {
      .org-main-content.main-content.profile-page {
        margin-left: 0;
        width: 100%;
      }
      .profile-sticky-bar { left: 0; }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'profile'])

  <main class="org-main-content main-content profile-page" id="mainContent">
    <header class="profile-topbar">
      <i class="bi bi-heart-fill" aria-hidden="true"></i>
      <p>Kalinga <span>/ Profile</span></p>
    </header>

    <div class="profile-scroll">
      <section class="profile-hero">
        <div class="profile-hero-left">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar-inner">
              <div class="profile-avatar" id="profileAvatar" title="Change profile photo">
                <span id="avatarInitial">O</span>
              </div>
              <button type="button" class="pp-camera-badge" id="profileAvatarUploadBtn" aria-label="Upload profile photo">
                <i class="bi bi-check-lg"></i>
              </button>
            </div>
            <input type="file" id="profilePictureInput" accept="image/*" hidden>
            <button type="button" class="profile-avatar-remove" id="removeProfilePicture">Remove photo</button>
          </div>
          <div class="profile-info">
            <div>
              <h1 id="profileName">Organization Name</h1>
              <span class="type-chip" id="profileTypeBadge">Org</span>
            </div>
            <p id="profileEmail">organization@email.com</p>
            <p class="profile-tagline">Together, we can make a bigger impact.</p>
            @include('partials.org-cache-hydrate')
          </div>
        </div>
        <div class="profile-stats">
          <div class="profile-stat">
            <strong id="totalMissions">0</strong>
            <span>Total missions</span>
          </div>
          <div class="profile-stat">
            <strong id="activeMissions">0</strong>
            <span>Active missions</span>
          </div>
          <div class="profile-stat">
            <strong id="totalVolunteers">0</strong>
            <span>Volunteers</span>
          </div>
        </div>
      </section>

      <div class="profile-layout">
        <div class="profile-tabs" role="tablist" aria-label="Profile sections">
          <button type="button" class="profile-tab active" role="tab" aria-selected="true" data-profile-section="organization">Organization</button>
          <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-section="representative">Representative</button>
          <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-section="account">Account</button>
          <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-section="password">Password</button>
        </div>

        <div class="profile-content">
          <form id="profileForm">
            <section class="profile-card" id="section-organization" data-profile-panel="organization" role="tabpanel">
              <h2>Organization information</h2>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="orgName">Organization name</label>
                  <input type="text" id="orgName" name="orgName" class="form-control" placeholder="Official registered or recognized name" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="orgType">Organization type</label>
                  <select id="orgType" name="orgType" class="form-select">
                    <option value="" disabled selected>Select organization type</option>
                    <option value="Non-Government Organization">Non-Government Organization</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Government Agency / Office">Government Agency / Office</option>
                    <option value="Barangay">Barangay</option>
                    <option value="Public / Private Hospital">Public / Private Hospital</option>
                    <option value="Medical Clinic">Medical Clinic</option>
                    <option value="Cooperative">Cooperative</option>
                    <option value="University">University</option>
                  </select>
                </div>
                <div class="form-group full">
                  <label class="form-label" for="orgDescription">Description</label>
                  <textarea id="orgDescription" name="orgDescription" class="form-control" rows="4" placeholder="Brief background, purpose, and communities or causes served"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label" for="yearEstablished">Year established</label>
                  <input type="number" id="yearEstablished" name="yearEstablished" class="form-control" min="1800" max="2100" placeholder="e.g. 2015">
                </div>
                <div class="form-group">
                  <label class="form-label" for="orgScope">Organization scope</label>
                  <select id="orgScope" name="orgScope" class="form-select">
                    <option value="" disabled selected>Select scope</option>
                    <option value="Local">Local</option>
                    <option value="Provincial">Provincial</option>
                    <option value="Regional">Regional</option>
                    <option value="National">National</option>
                  </select>
                </div>
                <div class="form-group full">
                  <div class="multi-field" data-multi-field="orgWebsite">
                    <label class="form-label" for="orgWebsite">Website or social media</label>
                    <div class="multi-field-list">
                      <div class="multi-field-row">
                        <input type="url" id="orgWebsite" name="orgWebsite[]" class="form-control" placeholder="https://" data-multi-primary>
                        <button type="button" class="multi-field-action" data-multi-add aria-label="Add another website or social media account">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <div class="multi-field" data-multi-field="orgEmail">
                    <label class="form-label" for="orgEmail">Organization email</label>
                    <div class="multi-field-list">
                      <div class="multi-field-row">
                        <input type="email" id="orgEmail" name="orgEmail[]" class="form-control" placeholder="organization@email.com" data-multi-primary>
                        <button type="button" class="multi-field-action" data-multi-add aria-label="Add another organization email">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <div class="multi-field" data-multi-field="orgContactNumber">
                    <label class="form-label" for="orgContactNumber">Contact number</label>
                    <div class="multi-field-list">
                      <div class="multi-field-row">
                        <input type="tel" id="orgContactNumber" name="orgContactNumber[]" class="form-control" placeholder="Official telephone or mobile number" data-multi-primary>
                        <button type="button" class="multi-field-action" data-multi-add aria-label="Add another contact number">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-group full">
                  <label class="form-label" for="completeAddress">Complete address</label>
                  <input type="text" id="completeAddress" name="completeAddress" class="form-control" placeholder="Street / barangay / city">
                </div>
              </div>
            </section>

            <section class="profile-card" id="section-representative" data-profile-panel="representative" role="tabpanel" hidden>
              <h2>Authorized representative</h2>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="repFullName">Full name</label>
                  <input type="text" id="repFullName" name="repFullName" class="form-control" placeholder="Complete name of the representative">
                </div>
                <div class="form-group">
                  <label class="form-label" for="repPosition">Position / designation</label>
                  <input type="text" id="repPosition" name="repPosition" class="form-control" placeholder="e.g. President, Director, Coordinator">
                </div>
                <div class="form-group">
                  <label class="form-label" for="repEmail">Email address</label>
                  <input type="email" id="repEmail" name="repEmail" class="form-control" placeholder="representative@email.com">
                </div>
                <div class="form-group">
                  <label class="form-label" for="repContactNumber">Contact number</label>
                  <input type="tel" id="repContactNumber" name="repContactNumber" class="form-control" placeholder="Mobile or telephone number">
                </div>
              </div>
            </section>

            <section class="profile-card" id="section-account" data-profile-panel="account" role="tabpanel" hidden>
              <h2>Account</h2>
              <div class="form-grid">
                <div class="form-group full">
                  <label class="form-label" for="orgId">Organization ID</label>
                  <div class="org-id-row">
                    <div class="input-lock-wrap">
                      <input type="text" id="orgId" name="orgId" class="form-control locked-input" readonly>
                      <i class="bi bi-lock-fill" aria-hidden="true"></i>
                    </div>
                    <button type="button" class="btn-copy-id" onclick="copyOrgId()" title="Copy ID"><i class="bi bi-clipboard"></i></button>
                  </div>
                  <span class="field-hint">Unique identifier for your organization account.</span>
                </div>
                <div class="form-group">
                  <label class="form-label" for="username">Username</label>
                  <input type="text" id="username" name="username" class="form-control" placeholder="Unique username">
                </div>
                <div class="form-group">
                  <label class="form-label" for="email">Sign-in email</label>
                  <div class="input-lock-wrap">
                    <input type="email" id="email" name="email" class="form-control locked-input" readonly>
                    <i class="bi bi-lock-fill" aria-hidden="true"></i>
                  </div>
                  <span class="field-hint">Sign-in email cannot be changed here.</span>
                </div>
              </div>
            </section>
          </form>

          <section class="profile-card password-section" id="section-password" data-profile-panel="password" role="tabpanel" hidden>
            <h2>Change password</h2>
            <form id="passwordForm">
              <div class="form-grid">
                <div class="form-group full">
                  <label class="form-label" for="currentPassword">Current password</label>
                  <div class="password-input-wrap">
                    <input type="password" id="currentPassword" name="currentPassword" placeholder="Enter current password" autocomplete="current-password">
                    <button type="button" class="toggle-pass" data-toggle-password="currentPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="newPassword">New password</label>
                  <div class="password-input-wrap">
                    <input type="password" id="newPassword" name="newPassword" placeholder="New password" autocomplete="new-password">
                    <button type="button" class="toggle-pass" data-toggle-password="newPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="confirmPassword">Confirm new password</label>
                  <div class="password-input-wrap">
                    <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm new password" autocomplete="new-password">
                    <button type="button" class="toggle-pass" data-toggle-password="confirmPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
              </div>

              <div class="password-requirements">
                <ul>
                  <li id="req-len">At least 8 characters</li>
                  <li id="req-num">At least one number</li>
                  <li id="req-mix">Upper and lowercase letters</li>
                  <li id="req-spec">At least one special character</li>
                </ul>
              </div>

              <button type="submit" class="change-password-submit" id="changePasswordBtn">
                Update password
              </button>
            </form>
            <div class="success-message" id="successMessage"></div>
            <div class="error-message" id="errorMessage"></div>
          </section>

          <footer class="profile-page-footer">
            <p>Your account security is important to us.</p>
            <p id="profileFooterUpdated">Last updated: —</p>
          </footer>
        </div>
      </div>
    </div>

    <div class="profile-sticky-bar" id="profileStickyBar" aria-live="polite">
      <p id="unsavedHint">You have unsaved changes</p>
      <div class="sticky-actions">
        <button type="button" class="btn-discard" id="discardBtn">Discard</button>
        <button type="submit" form="profileForm" class="save-btn" id="saveBtn">Save changes</button>
      </div>
    </div>
  </main>

  <div
    id="profileSaveSuccessModal"
    class="profile-success-overlay"
    hidden
    aria-modal="true"
    role="dialog"
    aria-labelledby="profileSaveSuccessTitle"
  >
    <div class="profile-success-modal" role="document">
      <div class="profile-success-icon" aria-hidden="true">
        <i class="bi bi-check-circle-fill"></i>
      </div>
      <h2 id="profileSaveSuccessTitle">Profile updated</h2>
      <p class="profile-success-message" id="profileSaveSuccessMessage">
        Your organization details were saved successfully.
      </p>
      <button type="button" class="profile-success-confirm" id="profileSaveSuccessOk">OK</button>
    </div>
  </div>
</body>
</html>
