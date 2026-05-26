<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile - Kalinga</title>

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
    .org-main-content.main-content {
      max-width: 1200px;
    }

    .profile-header {
      background: #d4d4d4;
      color: #000000;
      padding: 1.75rem 2rem;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 24px rgba(95, 95, 95, 0.28);
      position: relative;
    }
    .profile-header-content {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }
    .profile-avatar-wrap {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .profile-avatar-inner {
      position: relative;
      width: 100px;
      height: 100px;
    }
    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(37, 37, 37, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      border: 3px solid rgba(36, 36, 36, 0.45);
      position: relative;
      overflow: hidden;
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
    .profile-avatar.has-photo #avatarInitial {
      display: none;
    }
    .profile-avatar-inner .pp-camera-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #28a745;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #d4d4d4;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0;
      z-index: 2;
    }
    .profile-avatar-inner .pp-camera-badge:hover {
      background: #218838;
    }
    .profile-avatar-remove {
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: #dc3545;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      display: none;
    }
    .profile-avatar-remove:hover {
      color: #a71d2a;
    }
    .profile-info { flex: 1; min-width: 200px; }
    .profile-info h1 {
      margin: 0 0 0.35rem;
      font-size: 1.85rem;
      font-weight: 700;
      color: #000000;
    }
    .profile-info > p {
      margin: 0 0 1rem;
      font-size: 1rem;
      opacity: 0.95;
      color: #000000;
    }
    .profile-stats {
      display: flex;
      align-items: center;
      gap: 1rem 1.25rem;
      flex-wrap: nowrap;
      color: #000000;
    }
    .profile-stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.95;
    }
    .profile-stat i {
      font-size: 1.25rem;
      opacity: 0.9;
    }
    .profile-stat strong {
      font-size: 1.15rem;
      margin-right: 0.35rem;
    }
    .profile-hero-quote {
      margin: 0;
      flex: 1 1 220px;
      font-size: 1.05rem;
      font-style: italic;
      opacity: 0.92;
      text-align: right;
      align-self: center;
      border: none;
      padding: 0 0.5rem;
      color: #000000;
    }

    .profile-sections {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 1.5rem;
    }
    .profile-section,
    .password-section {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.5rem 1.75rem 1.75rem;
    }
    .section-title-block { margin-bottom: 1.25rem; }
    .section-title-block h3 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
      color: #1e3a2f;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-title-block h3 i { color: #28a745; }
    .section-title-block p {
      margin: 0;
      font-size: 0.88rem;
      color: #6c757d;
    }

    .org-id-row {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }
    .org-id-row input { flex: 1; }
    .btn-copy-id {
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid #28a745;
      background: #fff;
      color: #28a745;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-copy-id:hover { background: #e8f5e9; }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group { margin-bottom: 1.1rem; }
    .form-group label {
      display: block;
      margin-bottom: 0.35rem;
      font-weight: 600;
      color: #555;
      font-size: 0.9rem;
    }
    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.12);
    }
    .form-group input[readonly] {
      background: #f8f9fa;
      color: #6c757d;
    }
    .form-group small { color: #6c757d; font-size: 0.78rem; }

    .password-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-wrap input {
      padding-right: 44px;
    }
    .toggle-pass {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 1.1rem;
    }
    .toggle-pass:hover { color: #28a745; }

    .password-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .password-row-full { grid-column: 1 / -1; }

    .password-requirements {
      background: #e8f5e9;
      border: 1px solid #c3e6cb;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin: 1rem 0;
    }
    .password-requirements ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.85rem;
      color: #555;
    }
    .password-requirements li {
      margin: 0.35rem 0;
      list-style: none;
      position: relative;
      padding-left: 1.35rem;
    }
    .password-requirements li::before {
      content: "○";
      position: absolute;
      left: 0;
      color: #aaa;
    }
    .password-requirements li.met::before {
      content: "✓";
      color: #28a745;
      font-weight: 700;
    }

    .save-btn, .change-password-submit {
      width: 100%;
      margin-top: 0.5rem;
      padding: 14px 24px;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background:  #28a745;
      color: #fff;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.28);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .save-btn:hover, .change-password-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(40, 167, 69, 0.35);
    }
    .save-btn:disabled, .change-password-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
    }

    .profile-page-footer {
      text-align: center;
      margin-top: 2rem;
      padding-bottom: 1rem;
      font-size: 0.82rem;
      color: #888;
      line-height: 1.6;
    }
    .profile-page-footer p { margin: 0.2rem 0; }

    .success-message, .error-message { display: none; }

    .profile-success-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    .profile-success-overlay.is-open {
      display: flex;
    }
    .profile-success-overlay[hidden] {
      display: none !important;
    }
    .profile-success-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.75rem 1.5rem 1.25rem;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .profile-success-icon {
      font-size: 3rem;
      color: #28a745;
      margin-bottom: 0.75rem;
      line-height: 1;
    }
    .profile-success-modal h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: #1f2430;
    }
    .profile-success-message {
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
      color: #6b7280;
      line-height: 1.5;
    }
    .profile-success-confirm {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: #28a745;
      color: #fff;
    }
    .profile-success-confirm:hover {
      background: #218838;
    }

    @media (max-width: 768px) {
      .profile-header-content {
        flex-direction: column;
        text-align: center;
      }
      .profile-stats { justify-content: center; }
      .profile-sections {
        grid-template-columns: 1fr;
      }
      .password-form {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'profile'])

  <main class="org-main-content main-content" id="mainContent">
    <section class="profile-header">
      <div class="profile-header-content">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar-inner">
            <div class="profile-avatar" id="profileAvatar" title="Change profile photo">
              <span id="avatarInitial">O</span>
            </div>
            <button type="button" class="pp-camera-badge" id="profileAvatarUploadBtn" aria-label="Upload profile photo">
              <i class="bi bi-camera-fill"></i>
            </button>
          </div>
          <input type="file" id="profilePictureInput" accept="image/*" hidden>
          <button type="button" class="profile-avatar-remove" id="removeProfilePicture">Remove photo</button>
        </div>
        <div class="profile-info">
          <h1 id="profileName">Organization Name</h1>
          <p id="profileEmail">organization@email.com</p>
          <div class="profile-stats">
            <div class="profile-stat">
              <i class="bi bi-journal-check"></i>
              <span><strong id="totalMissions">0</strong> Total Missions</span>
            </div>
            <div class="profile-stat">
              <i class="bi bi-lightning-charge"></i>
              <span><strong id="activeMissions">0</strong> Active Missions</span>
            </div>
            <div class="profile-stat">
              <i class="bi bi-people"></i>
              <span><strong id="totalVolunteers">0</strong> Volunteers</span>
            </div>
          </div>
          @include('partials.org-cache-hydrate')
        </div>
        <blockquote class="profile-hero-quote">Together, we can make a bigger impact.</blockquote>
      </div>
    </section>


    <section class="profile-sections">
      <div class="profile-section">
        <div class="section-title-block">
          <h3><i class="bi bi-building"></i> Organization Information</h3>
          <p>Update your organization details.</p>
        </div>
        <form id="profileForm">
          <div class="form-group">
            <label>Organization ID</label>
            <div class="org-id-row">
              <input type="text" id="orgId" name="orgId" readonly>
              <button type="button" class="btn-copy-id" onclick="copyOrgId()" title="Copy ID"><i class="bi bi-clipboard"></i></button>
            </div>
            <small>This is your unique organization identifier</small>
          </div>

          <div class="form-group">
            <label>Organization Name *</label>
            <input type="text" id="orgName" name="orgName" required>
          </div>

          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="email" name="email" readonly>
          </div>

          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" id="phone" name="phone" placeholder="+63 912 345 6789">
          </div>

          <div class="form-group">
            <label>Address</label>
            <textarea id="address" name="address" rows="3" placeholder="Enter your organization's full address"></textarea>
          </div>

          <div class="form-grid-2">
            <div class="form-group" style="margin-bottom:0;">
              <label>City</label>
              <input type="text" id="city" name="city" placeholder="City">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>State/Province</label>
              <input type="text" id="state" name="state" placeholder="State or province">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Postal Code</label>
              <input type="text" id="postalCode" name="postalCode" placeholder="Postal code">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Country</label>
              <select id="country" name="country">
                <option value="">Select country</option>
                <option value="Philippines">Philippines</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Japan">Japan</option>
                <option value="Australia">Australia</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button type="submit" class="save-btn" id="saveBtn">
            <i class="bi bi-save"></i> Save Changes
          </button>
        </form>
      </div>

      <div class="password-section">
        <div class="section-title-block">
          <h3><i class="bi bi-lock"></i> Change Password</h3>
          <p>Ensure your account is using a strong password.</p>
        </div>
        <form id="passwordForm">
          <div class="form-group password-row-full">
            <label>Current Password</label>
            <div class="password-input-wrap">
              <input type="password" id="currentPassword" name="currentPassword" placeholder="Enter current password" autocomplete="current-password">
              <button type="button" class="toggle-pass" data-toggle-password="currentPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
            </div>
          </div>

          <div class="password-form">
            <div class="form-group" style="margin-bottom:0;">
              <label>New Password</label>
              <div class="password-input-wrap">
                <input type="password" id="newPassword" name="newPassword" placeholder="New password" autocomplete="new-password">
                <button type="button" class="toggle-pass" data-toggle-password="newPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Confirm New Password</label>
              <div class="password-input-wrap">
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm new password" autocomplete="new-password">
                <button type="button" class="toggle-pass" data-toggle-password="confirmPassword" aria-label="Show password"><i class="bi bi-eye"></i></button>
              </div>
            </div>
          </div>

          <div class="password-requirements">
            <ul>
              <li id="req-len">At least 8 characters.</li>
              <li id="req-mix">Includes uppercase and lowercase letters.</li>
              <li id="req-num">Includes a number.</li>
              <li id="req-spec">Includes a special character.</li>
            </ul>
          </div>

          <button type="submit" class="change-password-submit" id="changePasswordBtn">
            <i class="bi bi-lock"></i> Change Password
          </button>
        </form>

        <div class="success-message" id="successMessage"></div>
        <div class="error-message" id="errorMessage"></div>
      </div>
    </section>

    <footer class="profile-page-footer">
      <p>Your account security is important to us.</p>
      <p id="profileFooterUpdated">Last updated: —</p>
    </footer>
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

  <script>
    // Your existing JS in organization-profile.js handles data.
    // If you later want a mobile hamburger, you can toggle sidebar.open here.
  </script>
</body>
</html>