<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  @vite([
    'resources/css/app.css',
    'resources/js/admin-login.js'
  ])
  <style>
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #66eaacff 0%, #55a24bff 100%);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .admin-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 450px;
      width: 100%;
      margin: 20px;
    }
    
    .admin-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .admin-logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #66eaacff 0%, #55a24bff 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
      color: white;
      font-weight: bold;
    }
    
    .admin-title {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    
    .admin-subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-control {
      padding: 15px;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s ease;
    }
    
    .form-control:focus {
      border-color: #28a745;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }

    .password-field {
      position: relative;
    }
    .password-field .form-control {
      padding-right: 48px;
      width: 100%;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #6b7280;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }
    .password-toggle:hover,
    .password-toggle:focus-visible {
      color: #28a745;
      outline: none;
      background: rgba(40, 167, 69, 0.1);
    }
    .password-toggle svg {
      width: 18px;
      height: 18px;
      display: block;
    }
    .password-toggle .icon-eye-off { display: none; }
    .password-toggle.is-visible .icon-eye { display: none; }
    .password-toggle.is-visible .icon-eye-off { display: block; }
    
    .btn-admin-login {
      background: linear-gradient(135deg, #66eaacff 0%, #55a24bff 100%);
      color: white;
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-weight: bold;
      font-size: 16px;
      width: 100%;
      transition: all 0.3s ease;
      margin-top: 10px;
    }
    
    .btn-admin-login:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    
    .admin-footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }
    
    .admin-footer a {
      color: #28a745;
      text-decoration: none;
      font-size: 14px;
    }
    
    .admin-footer a:hover {
      text-decoration: underline;
    }
    
    .alert {
      border-radius: 10px;
      margin-bottom: 20px;
    }
    
    .loading {
      display: none;
    }
    
    .loading.show {
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="admin-container">
    <div class="admin-header">
      <div class="admin-logo">A</div>
      <h1 class="admin-title">Admin Portal</h1>
      <p class="admin-subtitle">Kalinga Management System</p>
    </div>

    <div id="alertContainer"></div>

    <form id="adminLoginForm">
      <div class="form-group">
        <input type="email" id="adminEmail" class="form-control" placeholder="Admin Email" required>
      </div>
      
      <div class="form-group">
        <div class="password-field">
          <input type="password" id="adminPassword" class="form-control" placeholder="Admin Password" required autocomplete="current-password">
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

      <button type="submit" class="btn btn-admin-login">
        <span class="loading" id="loadingSpinner"><i class="bi bi-hourglass-split"></i></span>
        <span id="loginText">Login to Admin Panel</span>
      </button>
    </form>

    <div class="admin-footer">
      <a href="/organization/login"><i class="bi bi-arrow-left"></i> Back to Organization Login</a>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>