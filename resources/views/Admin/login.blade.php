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
        <input type="password" id="adminPassword" class="form-control" placeholder="Admin Password" required>
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