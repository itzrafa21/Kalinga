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
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8f9fa;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container-fluid {
      height: 100vh;
    }
    .left-side {
      background: #eef6ff;
      height: 100%;
      padding: 0;
      position: relative;
    }
    .carousel-item img {
      object-fit: cover;
      height: 100vh;
      width: 100%;
      filter: brightness(0.7); /* fade look */
    }
    .right-side {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 50px;
      background: #fff;
      height: 100%;
    }
    .login-box {
      max-width: 400px;
      margin: auto;
      text-align: center;
    }
    .login-box img.logo {
      width: 250px;
      height: auto;
      margin-bottom: 5px;
      margin-top: -200px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .login-box h2 {
      font-weight: bold;
      margin-bottom: 15px;
    }
    .form-control {
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 6px;
    }
    .btn-login {
      background: #007bff;
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-weight: bold;
      width: 100%;
      margin-top: 10px;
    }
    .extra-links {
      margin-top: 15px;
      font-size: 14px;
    }
    .extra-links a {
      color: #007bff;
      text-decoration: none;
    }
    .register-text {
      margin-top: 10px;
      font-size: 14px;
    }
    .register-text a {
      color: #28a745;
      font-weight: bold;
      text-decoration: none;
    }
    .register-text a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container-fluid">
    <div class="row h-100">
      
      <!-- Left side (slideshow) -->
      <div class="col-md-6 left-side">
        <div id="welcomeCarousel" class="carousel slide h-100" data-bs-ride="carousel">
          <div class="carousel-inner h-100">
            <div class="carousel-item active" data-bs-interval="3000">
              <img src="{{ asset('images/welcome1.png') }}" class="d-block w-100" alt="Slide 1">
            </div>
            <div class="carousel-item" data-bs-interval="3000">
              <img src="{{ asset('images/welcome2.png') }}" class="d-block w-100" alt="Slide 2">
            </div>
            <div class="carousel-item" data-bs-interval="3000">
              <img src="{{ asset('images/welcome3.png') }}" class="d-block w-100" alt="Slide 3">
            </div>
          </div>
        </div>
      </div>

      <!-- Right side (login) -->
      <div class="col-md-6 right-side">
        <div class="login-box">
          <!-- Logo -->
          <img src="{{ asset('images/logo.png') }}" alt="Kalinga Logo" class="logo">

          <h2>Welcome To Kalinga!</h2>
          <p class="text-muted">Please Enter Your Credentials</p>

          <!-- Login form -->
          <form id="orgLoginForm">
            <input type="email" id="email" class="form-control" placeholder="Enter Email" required>
            <input type="password" id="password" class="form-control" placeholder="Enter Password" required>

            <button type="submit" class="btn btn-login">Login</button>

            <div class="extra-links">
        
            </div>

            <div class="register-text">
              Don’t have an account? <a href="/organization/register">Click here to register</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
