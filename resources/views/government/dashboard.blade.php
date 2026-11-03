<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Letters - Government Offices</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/government-auth-guard.js',
    'resources/js/government-logout.js',
    'resources/js/government-dashboard.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .gov-page-title {
      margin: 0 0 0.35rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a5f;
    }
    .gov-page-sub {
      margin: 0 0 1.25rem;
      color: #64748b;
      font-size: 0.95rem;
    }
    .gov-welcome {
      margin: 0 0 0.35rem;
      color: #334155;
      font-size: 0.95rem;
    }
    .gov-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .gov-filter-btn {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
      border-radius: 999px;
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .gov-filter-btn.active {
      background: #1e3a5f;
      border-color: #1e3a5f;
      color: #fff;
    }
    .gov-letter-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .gov-letter-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .gov-letter-top {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.55rem;
    }
    .gov-letter-title {
      margin: 0;
      font-size: 1.05rem;
      color: #0f172a;
      font-weight: 700;
    }
    .gov-letter-meta {
      margin: 0.15rem 0 0;
      color: #64748b;
      font-size: 0.85rem;
    }
    .gov-status {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      height: fit-content;
    }
    .gov-status.pending { background: #fef3c7; color: #b45309; }
    .gov-status.approved { background: #dcfce7; color: #15803d; }
    .gov-status.rejected { background: #fee2e2; color: #b91c1c; }
    .gov-letter-body {
      white-space: pre-wrap;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.9rem 1rem;
      color: #334155;
      font-size: 0.9rem;
      line-height: 1.55;
      margin: 0.75rem 0;
      max-height: 180px;
      overflow: auto;
    }
    .gov-letter-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .gov-letter-actions button {
      border: none;
      border-radius: 10px;
      padding: 0.5rem 0.95rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .gov-btn-approve { background: #15803d; color: #fff; }
    .gov-btn-reject { background: #b91c1c; color: #fff; }
    .gov-empty {
      background: #fff;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      padding: 2rem 1.25rem;
      text-align: center;
      color: #64748b;
    }
  </style>
</head>
<body class="org-app">
  @include('partials.gov-sidebar', ['activeNav' => 'dashboard'])

  <main class="org-main-content main-content">
    <p class="gov-welcome">Welcome, <span id="govOfficeWelcome">Government Office</span></p>
    <h1 class="gov-page-title">Request Letters</h1>
    <p class="gov-page-sub">Letters submitted by organizations for mission approval appear here.</p>

    <div class="gov-filters" role="tablist" aria-label="Filter letters by status">
      <button type="button" class="gov-filter-btn active" data-filter="pending">Pending</button>
      <button type="button" class="gov-filter-btn" data-filter="approved">Approved</button>
      <button type="button" class="gov-filter-btn" data-filter="rejected">Rejected</button>
      <button type="button" class="gov-filter-btn" data-filter="all">All</button>
    </div>

    <div id="govLettersList" class="gov-letter-list" aria-live="polite"></div>
  </main>
</body>
</html>
