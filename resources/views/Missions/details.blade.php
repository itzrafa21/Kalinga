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
    'resources/js/organization-sidebar.js',
    'resources/js/mission-details.js',
    'resources/js/organization-logout.js'
  ])
  @include('partials.org-layout-styles')
  <style>
    .org-main-content.main-content {
      padding: 0;
      max-width: none;
    }
    .mission-details-wrap {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 0;
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
    .mission-status--rejected {
      background: #fee2e2;
      color: #b91c1c;
    }
    .mission-rejection-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }
    .mission-rejection-reason {
      font-size: 1.05rem;
      color: #991b1b;
      margin: 0.75rem 0;
      line-height: 1.5;
    }
    .mission-rejection-meta {
      font-size: 0.85rem;
      color: #6b7280;
      margin: 0;
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'missions'])

  <main class="org-main-content main-content">
    <div class="mission-details-wrap">
      <div id="detailsContainer">
        <p style="color:#9ca3af;padding:2rem;text-align:center;">Loading mission…</p>
      </div>
    </div>
  </main>
</body>
</html>