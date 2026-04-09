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
      filter: brightness(70%); /* fade effect */
    }
    .right-side {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 50px;
      background: #fff;
      height: 100%;
    }
    .register-box {
      max-width: 400px;
      margin: auto;
      text-align: center;
    }
    .register-box img.logo {
      width: 250px;
      height: auto;
      margin-bottom: 10px;
      margin-top: -200px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .register-box h2 {
      font-weight: bold;
      margin-bottom: 15px;
    }
    .form-control {
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 6px;
    }
    .btn-register {
      background: #28a745;
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
  </style>
</head>
<body>
  <div class="container-fluid">
    <div class="row h-100">
      
      <!-- Left side (slideshow) -->
      <div class="col-md-6 left-side">
        <div id="registerCarousel" class="carousel slide h-100" data-bs-ride="carousel">
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

      <!-- Right side (register form) -->
      <div class="col-md-6 right-side">
        <div class="register-box">
          <!-- Logo -->
          <img src="{{ asset('images/logo.png') }}" alt="Kalinga Logo" class="logo">

          <h2>Organization Register</h2>
          <p class="text-muted">Create your organization account</p>

          <!-- Fixed Register Form (no Laravel route, handled by JS) -->
          <form id="registerForm">
            @csrf
            <input type="text" id="orgName" class="form-control" placeholder="Organization Name" required>
            <input type="email" id="email" class="form-control" placeholder="Email address" required>
            <input type="password" id="password" class="form-control" placeholder="Password" required>
            <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm Password" required>

            <button type="submit" class="btn btn-register">Register</button>

            <div class="extra-links">
              Already have an account? <a href="/organization/login">Click here to login</a>
            </div>
          </form>
        </div>
      </div>

    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <!-- Attach your Firebase registration JS -->
  <script type="module" src="{{ asset('js/organization-register-page.js') }}"></script>

</body>
</html>
