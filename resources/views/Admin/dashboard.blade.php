<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Kalinga</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  @vite([
    'resources/css/app.css',
    'resources/js/admin-dashboard.js'
  ])
  <style>
    body {
      background: #f8f9fa;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .admin-header {
      background: linear-gradient(135deg, #66eaacff  0%, #55a24bff  100%);
      color: white;
      padding: 20px 0;
      margin-bottom: 30px;
    }
    
    .admin-navbar {
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 15px 0;
      margin-bottom: 30px;
    }
    
    .admin-card {
      border: none;
      border-radius: 15px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
      margin-bottom: 20px;
    }
    
    .admin-card:hover {
      transform: translateY(-5px);
    }
    
    .stats-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .organizations-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    
    .missions-card {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }
    
    .volunteers-card {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }
    
    .admin-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      margin: 0 auto 15px;
      background: rgba(255, 255, 255, 0.2);
    }
    
    .nav-pills .nav-link {
      border-radius: 25px;
      margin: 0 5px;
    }
    
    .nav-pills .nav-link.active {
      background: linear-gradient(135deg, #66eaacff 0%, #55a24bff 100%);
    }
    
    .table-responsive {
      border-radius: 15px;
      overflow: hidden;
    }
    
    .btn-admin {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 500;
    }
    
    .btn-admin:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }
    
    .search-box {
      border-radius: 25px;
      border: 2px solid #e9ecef;
      padding: 10px 20px;
    }
    
    .search-box:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }
    
    .filter-dropdown {
      border-radius: 8px;
      border: 2px solid #e9ecef;
    }
    
    .notification-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <!-- Admin Header -->
  <div class="admin-header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-md-6">
          <h1 class="mb-0"><i class="fas fa-shield-alt"></i> Admin Dashboard</h1>
          <p class="mb-0">Kalinga Management System</p>
        </div>
        <div class="col-md-6 text-end">
          <span id="adminEmail" class="badge bg-light text-dark fs-6"></span>
          <button id="adminLogoutBtn" type="button" class="btn btn-outline-light ms-3">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Admin Navigation -->
  <div class="admin-navbar">
    <div class="container">
      <ul class="nav nav-pills justify-content-center">
        <li class="nav-item">
          <a class="nav-link active" href="#dashboard" data-tab="dashboard">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#users" data-tab="users">
            <i class="fas fa-users"></i> Users & Organizations
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#missions" data-tab="missions">
            <i class="fas fa-bullseye"></i> Missions
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#volunteers" data-tab="volunteers">
            <i class="fas fa-hands-helping"></i> Volunteers
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#analytics" data-tab="analytics">
            <i class="fas fa-chart-bar"></i> Analytics
          </a>
        </li>
        </li>
          </a>
        </li>
      </ul>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container">
    <!-- Dashboard Tab -->
    <div id="dashboard-tab" class="tab-content">
      <!-- Stats Cards -->
      <div class="row mb-4">
        <div class="col-md-3 mb-3">
          <div class="card admin-card stats-card">
            <div class="card-body text-center">
              <div class="admin-icon">
                <i class="fas fa-users"></i>
              </div>
              <h3 id="totalUsers">-</h3>
              <p class="mb-0">Total Users</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3 mb-3">
          <div class="card admin-card organizations-card">
            <div class="card-body text-center">
              <div class="admin-icon">
                <i class="fas fa-building"></i>
              </div>
              <h3 id="totalOrganizations">-</h3>
              <p class="mb-0">Organizations</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3 mb-3">
          <div class="card admin-card missions-card">
            <div class="card-body text-center">
              <div class="admin-icon">
                <i class="fas fa-bullseye"></i>
              </div>
              <h3 id="totalMissions">-</h3>
              <p class="mb-0">Active Missions</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3 mb-3">
          <div class="card admin-card volunteers-card">
            <div class="card-body text-center">
              <div class="admin-icon">
                <i class="fas fa-hands-helping"></i>
              </div>
              <h3 id="totalVolunteers">-</h3>
              <p class="mb-0">Volunteers</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card admin-card">
            <div class="card-header">
              <h5 class="mb-0"><i class="fas fa-bolt"></i> Quick Actions</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-3 mb-2">
                  <button class="btn btn-admin w-100" onclick="showTab('missions')">
                    <i class="fas fa-check-circle"></i> Test
                  </button>
                </div>
                <div class="col-md-3 mb-2">
                  <button class="btn btn-admin w-100" onclick="showTab('users')">
                    <i class="fas fa-user-check"></i> Test
                  </button>
                </div>
                <div class="col-md-3 mb-2">
                  <button class="btn btn-admin w-100" onclick="showTab('analytics')">
                    <i class="fas fa-download"></i> Test
                  </button>
                </div>
                <div class="col-md-3 mb-2">
                  <button class="btn btn-admin w-100" onclick="showTab('notifications')">
                    <i class="fas fa-bullhorn"></i> Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users & Organizations Tab -->
    <div id="users-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-users"></i> Users & Organizations Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="userSearch" placeholder="Search users...">
            <select class="form-select filter-dropdown" id="userFilter">
              <option value="all">All Users</option>
              <option value="organizations">Organizations</option>
              <option value="volunteers">Volunteers</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="usersTableBody">
                <!-- Users will be loaded here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Missions Tab -->
    <div id="missions-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-bullseye"></i> Mission Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="missionSearch" placeholder="Search missions...">
            <select class="form-select filter-dropdown" id="missionFilter">
              <option value="all">All Missions</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Mission Name</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="missionsTableBody">
                <!-- Missions will be loaded here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Volunteers Tab -->
    <div id="volunteers-tab" class="tab-content" style="display: none;">
      <div class="card admin-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-hands-helping"></i> Volunteer Management</h5>
          <div class="d-flex gap-2">
            <input type="text" class="form-control search-box" id="volunteerSearch" placeholder="Search volunteers...">
            <select class="form-select filter-dropdown" id="volunteerFilter">
              <option value="all">All Volunteers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="top">Top Performers</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Missions Joined</th>
                  <th>Hours Volunteered</th>
                  <th>Badges</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="volunteersTableBody">
                <!-- Volunteers will be loaded here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div id="analytics-tab" class="tab-content" style="display: none;">
      <div class="row">
        <div class="col-md-6 mb-4">
          <div class="card admin-card">
            <div class="card-header">
              <h5 class="mb-0"><i class="fas fa-chart-bar"></i> Activity Analytics</h5>
            </div>
            <div class="card-body">
              <canvas id="activityChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-4">
          <div class="card admin-card">
            <div class="card-header">
              <h5 class="mb-0"><i class="fas fa-chart-pie"></i> Mission Types</h5>
            </div>
            <div class="card-body">
              <canvas id="missionTypesChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row">
        <div class="col-12">
          <div class="card admin-card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="fas fa-download"></i> Export Reports</h5>
              <div class="d-flex gap-2">
                <button class="btn btn-admin" onclick="exportReport('csv')">
                  <i class="fas fa-file-csv"></i> Export CSV
                </button>
                <button class="btn btn-admin" onclick="exportReport('pdf')">
                  <i class="fas fa-file-pdf"></i> Export PDF
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Report Type</label>
                    <select class="form-select" id="reportType">
                      <option value="users">Users Report</option>
                      <option value="missions">Missions Report</option>
                      <option value="volunteers">Volunteers Report</option>
                      <option value="donations">Donations Report</option>
                      <option value="attendance">Attendance Report</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Date From</label>
                    <input type="date" class="form-control" id="dateFrom">
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="form-group">
                    <label>Date To</label>
                    <input type="date" class="form-control" id="dateTo">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <!-- Emergency Tab Navigation Fix -->
  <script>
    console.log("[INFO] Emergency tab navigation script loaded");
    
    // Immediate tab navigation fix
    document.addEventListener('DOMContentLoaded', function() {
      console.log("[INFO] DOM loaded - setting up emergency tab navigation");
      
      // Add click handlers to all nav links
      const navLinks = document.querySelectorAll('.nav-link[data-tab]');
      console.log("[INFO] Found nav links:", navLinks.length);
      
      navLinks.forEach((link, index) => {
        const tabName = link.getAttribute('data-tab');
        console.log(`[INFO] Setting up nav link ${index}:`, tabName);
        
        link.addEventListener('click', function(e) {
          e.preventDefault();
          console.log("[INFO] Emergency tab click:", tabName);
          
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
          });
          
          // Remove active class from all nav links
          document.querySelectorAll('.nav-link').forEach(navLink => {
            navLink.classList.remove('active');
          });
          
          // Show selected tab
          const selectedTab = document.getElementById(tabName + '-tab');
          if (selectedTab) {
            selectedTab.style.display = 'block';
            console.log("[INFO] Showing tab:", selectedTab.id);
          } else {
            console.error("[ERROR] Tab not found:", tabName + '-tab');
          }
          
          // Add active class to clicked nav link
          link.classList.add('active');
          
          // Show success message
          console.log("[SUCCESS] Tab switched successfully to:", tabName);
        });
      });
      
      console.log("[SUCCESS] Emergency tab navigation set up complete");
    });
  </script>
</body>
</html>