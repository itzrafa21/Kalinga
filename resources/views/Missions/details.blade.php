<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/mission-details.js',
    'resources/js/organization-logout.js'
  ])
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      background: #f0f2f5;
      color: #333;
    }
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
    .topbar-user { display: flex; align-items: center; gap: 0.5rem; }
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
    .logout-btn:hover { background: #28a745; color: #fff; }
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
    }
    .sidebar-logo {
      padding: 0 1.25rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 1rem;
    }
    .sidebar-logo span { font-weight: 700; font-size: 1.25rem; color: #fff; }
    .sidebar-nav { padding: 0 0.75rem; }
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
    .sidebar a:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .sidebar a.active { background: #28a745; color: #fff; }
    .sidebar a i { font-size: 1.1rem; width: 24px; text-align: center; }
    .main-content {
      margin-left: 260px;
      padding: 1.5rem 2rem 2rem;
      min-height: 100vh;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .page-title i { color: #28a745; }
    .back-btn {
      background: #6c757d;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 1.5rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .back-btn:hover { background: #5a6268; color: #fff; transform: translateY(-1px); }
    .details-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #eee;
      padding: 1.75rem 2rem;
      margin-top: 0.5rem;
    }
    .details-card h2 {
      font-size: 1.5rem;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #28a745;
    }
    .details-card .detail-row {
      display: flex;
      padding: 0.6rem 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.95rem;
    }
    .details-card .detail-row:last-child { border-bottom: none; }
    .details-card .detail-row strong {
      min-width: 160px;
      color: #555;
    }
    .details-card .detail-row span { color: #333; }
    .mission-details-card { margin-top: 0; }
    .mission-details-card h2 {
      font-size: 1.5rem;
      color: #1e3a2f;
      margin: 0 0 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #28a745;
    }
    .mission-details-card p {
      margin: 0;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.95rem;
      display: flex;
      gap: 0.5rem;
    }
    .details-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.edit-mission-btn {
  background: #28a745;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-mission-btn:hover {
  background: #218838;
}
    .mission-details-card p:last-child { border-bottom: none; }
    .mission-details-card strong { min-width: 140px; color: #555; }
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .topbar, .main-content { margin-left: 0; }
    }
  </style>
</head>
<body>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <img src="{{ asset('images/kalinga-logo.jpg') }}" alt="Kalinga" style="height: 32px; width: auto; margin-bottom: 0.35rem;">
      <span>Kalinga</span>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">Main</div>
      <a href="/organization/dashboard"><i class="bi bi-grid-1x2"></i> Dashboard</a>
      <a href="/missions/history"><i class="bi bi-journal-text"></i> History of Missions</a>
      <a href="/organization/volunteers"><i class="bi bi-people"></i> Volunteers</a>
      <a href="/donation"><i class="bi bi-heart"></i> Donation</a>
      <div class="sidebar-section">Account</div>
      <a href="/organization/profile"><i class="bi bi-person"></i> Profile</a>
    </nav>
  </aside>

  <header class="topbar">
    <div class="topbar-brand">
      <img src="{{ asset('images/kalinga-logo.jpg') }}" alt="Kalinga Logo" style="height: 28px; width: auto;">
      <span>Kalinga</span>
    </div>
    <div class="topbar-user">
      <button id="logoutBtn" class="logout-btn">Logout</button>
    </div>
  </header>

  <main class="main-content">
    <h1 class="page-title">
      <i class="bi bi-journal-text"></i>
      Mission Details
    </h1>

    <div id="detailsContainer">
      <p style="color:#666;">Loading mission...</p>
    </div>
  </main>
</body>
</html>