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
    'resources/js/organization-logout.js',
    'resources/js/organization-profile.js'
  ])

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f0f2f5;
      color: #333;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: #1e3a2f;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      padding: 1.5rem 0;
      z-index: 200;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .sidebar-logo {
      padding: 0 1.25rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 1rem;
    }
    .sidebar-logo span {
      font-weight: 700;
      font-size: 1.25rem;
      color: #fff;
    }
    .sidebar-nav {
      padding: 0 0.75rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .sidebar-section {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.5);
      padding: 1rem 0.75rem 0.5rem;
    }
    .sidebar a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      padding: 10px 14px;
      margin-bottom: 2px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .sidebar a:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .sidebar a.active {
      background: #28a745;
      color: #fff;
    }
    .sidebar a i { font-size: 1.1rem; width: 24px; text-align: center; }

    .sidebar-bottom {
      margin-top: auto;
      padding: 0 0.75rem 1rem;
    }

    .sidebar-logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: transparent;
      bottom: none;
      color: rgba(255,255,255,0.85);
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .sidebar-logout-btn i {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
    }

    .sidebar-logout-btn:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    /* Topbar */
    .topbar {
      background: #fff;
      color: #333;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      margin-left: 260px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 1.25rem;
      color: #1e3a2f;
    }
    .topbar-brand i { font-size: 1.5rem; color: #28a745; }
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    .logout-btn {
      background: transparent;
      color: #28a745;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #28a745;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logout-btn:hover {
      background: #28a745;
      color: #fff;
    }

    /* Main content */
    .main-content {
      margin-left: 260px;
      padding: 1.5rem 2rem 2rem;
      min-height: 100vh;
      max-width: 1200px;
    }
    .main-content {
      margin-left: 260px;
      padding: 1.5rem 2rem 2.5rem;
      min-height: 100vh;
      max-width: 1280px;
    }

    .profile-header {
      background: #28a745;
      color: #fff;
      padding: 1.75rem 2rem;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 24px rgba(40, 167, 69, 0.28);
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
    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      border: 3px solid rgba(255, 255, 255, 0.45);
      flex-shrink: 0;
    }
    .profile-info { flex: 1; min-width: 200px; }
    .profile-info h1 {
      margin: 0 0 0.35rem;
      font-size: 1.85rem;
      font-weight: 700;
    }
    .profile-info > p {
      margin: 0 0 1rem;
      font-size: 1rem;
      opacity: 0.95;
    }
    .profile-stats {
      display: flex;
      align-items: center;
      gap: 1rem 1.25rem;
      flex-wrap: nowrap;
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
    }

    .profile-picture-section {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.5rem;
    }
    .card-heading { margin-bottom: 1rem; }
    .card-heading h3 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
      color: #1e3a2f;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card-heading h3 i { color: #28a745; }
    .card-heading .card-sub {
      margin: 0;
      font-size: 0.88rem;
      color: #6c757d;
    }
    .profile-picture-layout {
      display: flex;
      align-items: center;
      gap: 2rem;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .profile-picture-preview-wrap { position: relative; }
    .profile-picture-preview {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3.5rem;
      color: #6c757d;
      border: 3px solid #e1e5e9;
      overflow: hidden;
      position: relative;
    }
    .profile-picture-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .pp-camera-badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #28a745;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #fff;
      font-size: 1rem;
    }
    .profile-picture-actions-col {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn-upload-outline {
      padding: 10px 20px;
      border-radius: 10px;
      border: 2px solid #28a745;
      background: #fff;
      color: #28a745;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-upload-outline:hover {
      background: #e8f5e9;
    }
    .btn-remove-outline {
      padding: 10px 20px;
      border-radius: 10px;
      border: 2px solid #dc3545;
      background: #fff;
      color: #dc3545;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-remove-outline:hover {
      background: #fce8e8;
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



    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .topbar, .main-content { margin-left: 0; }
      .topbar { padding-left: 3rem; }
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
      .profile-picture-actions .btn {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo"><span>KALINGA</span></div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">Main</div>
      <a href="/organization/dashboard"><i class="bi bi-grid-1x2"></i> Dashboard</a>
      <a href="/missions/history"><i class="bi bi-journal-text"></i> History of Missions</a>
      <a href="/organization/volunteers"><i class="bi bi-people"></i> Volunteers</a>
      <a href="/donation"><i class="bi bi-heart"></i> Donation</a>

      <div class="sidebar-section">Settings</div>
      <a href="/settings"><i class="bi bi-gear"></i> Settings</a>

      <div class="sidebar-section">Account</div>
      <a href="/organization/profile" class="active"><i class="bi bi-person"></i> Profile</a>
    </nav>

    <div class="sidebar-bottom">
      <button type="button" id="logoutBtn" class="sidebar-logout-btn">
        <i class="bi bi-box-arrow-right"></i>
        Logout
      </button>
    </div>
  </aside>

  <!-- Topbar -->
  <header class="topbar">
    <div class="topbar-brand">
      <img src="{{ asset('images/kalinga-logo.jpg') }}" alt="Kalinga Logo" style="height: 28px; width: auto;">
      <span>Kalinga</span>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main-content" id="mainContent">
    <section class="profile-header">
      <div class="profile-header-content">
        <div class="profile-avatar" id="profileAvatar">
          <span id="avatarInitial">O</span>
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
        </div>
        <blockquote class="profile-hero-quote">Together, we can make a bigger impact.</blockquote>
      </div>
    </section>

    <section class="profile-picture-section">
      <div class="card-heading">
        <h3><i class="bi bi-camera"></i> Profile Picture</h3>
        <p class="card-sub">Add a profile picture to personalize your account.</p>
      </div>
      <div class="profile-picture-layout">
        <div class="profile-picture-preview-wrap">
          <div class="profile-picture-preview" id="profilePicturePreview">
            <span id="profilePicturePlaceholder"><i class="bi bi-person"></i></span>
          </div>
          <div class="pp-camera-badge" aria-hidden="true"><i class="bi bi-camera-fill"></i></div>
        </div>
        <div class="profile-picture-actions-col">
          <input type="file" id="profilePictureInput" accept="image/*" style="display:none;">
          <button type="button" class="btn-upload-outline" onclick="document.getElementById('profilePictureInput').click()">
            <i class="bi bi-cloud-upload"></i> Upload Photo
          </button>
          <button type="button" class="btn-remove-outline" id="removeProfilePicture" style="display:none;">
            <i class="bi bi-trash"></i> Remove Photo
          </button>
        </div>
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

  <script>
    // Your existing JS in organization-profile.js handles data.
    // If you later want a mobile hamburger, you can toggle sidebar.open here.
  </script>
</body>
</html>