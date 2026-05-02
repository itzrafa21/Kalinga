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
      padding: 0;
      min-height: 100vh;
      background: #12151a;
    }
    .mission-details-wrap {
      padding: 1rem 1.5rem 2rem;
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
    }
    .mission-page {
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    }
    .mission-hero {
      background: #22a447;
      color: #fff;
      padding: 1.75rem 2rem 2rem;
    }
    .mission-hero__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .mission-kicker {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }
    .mission-status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      text-transform: capitalize;
      background: rgba(255,255,255,0.12);
      color: #e8fff0;
    }
    .mission-status--open,
    .mission-status--ongoing,
    .mission-status--approved {
      background: rgba(34, 197, 94, 0.25);
      color: #bbf7d0;
    }
    .mission-status--pending {
      background: rgba(250, 204, 21, 0.2);
      color: #fef08a;
    }
    .mission-status--muted {
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.85);
    }
    .mission-title {
      margin: 0 0 1rem;
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      line-height: 1.2;
    }
    .mission-hero__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1.25rem;
    }
    .mission-chip {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background: rgba(0,0,0,0.2);
      color: rgba(255,255,255,0.95);
    }
    .mission-location {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.88);
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .mission-location i { color: #f87171; }
    .mission-body {
      background:rgb(250, 250, 250);
      color: #e5e7eb;
      padding: 1.75rem 2rem 2rem;
    }
    .mission-section { margin: 0; }
    .mission-label {
      margin: 0 0 0.5rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
    }
    .mission-label--inline { margin: 0; }
    .mission-desc {
      margin: 0;
      font-size: 1rem;
      line-height: 1.6;
      color:rgb(0, 0, 0);
    }
    .mission-divider {
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 1.5rem 0;
    }
    .mission-dt-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    @media (max-width: 600px) {
      .mission-dt-grid { grid-template-columns: 1fr; }
    }
    .mission-dt-card {
      background: #262c35;
      border-radius: 12px;
      padding: 1rem 1.15rem;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .mission-dt-label {
      font-size: 0.75rem;
      color: #9ca3af;
      display: block;
      margin-bottom: 0.35rem;
    }
    .mission-dt-date {
      margin: 0;
      font-weight: 700;
      font-size: 1.05rem;
      color: #fff;
    }
    .mission-dt-time {
      margin: 0.25rem 0 0;
      font-size: 0.9rem;
      color: #9ca3af;
    }
    .mission-vol__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.65rem;
    }
    .mission-vol__cap {
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
    }
    .mission-progress {
      height: 8px;
      border-radius: 999px;
      background: #343b47;
      overflow: hidden;
    }
    .mission-progress__fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #22c55e, #4ade80);
      transition: width 0.35s ease;
    }
    .mission-vol__sub {
      margin: 0.5rem 0 0;
      font-size: 0.85rem;
      color: #9ca3af;
    }
    .mission-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .mission-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .mission-btn:hover { opacity: 0.92; transform: translateY(-1px); }
    .mission-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .mission-btn--primary {
      background: #22a447;
      color:rgb(255, 255, 255);
    }
    .mission-btn--ghost {
      background: #22a447;
      color:rgb(255, 255, 255);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .mission-error {
      color: #fca5a5;
      padding: 2rem;
      text-align: center;
    }
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
    <div class="mission-details-wrap">
      <div id="detailsContainer">
        <p style="color:#9ca3af;padding:2rem;text-align:center;">Loading mission…</p>
      </div>
    </div>
  </main>
</body>
</html>