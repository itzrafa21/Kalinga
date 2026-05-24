<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
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
      padding: 1.5rem 1.75rem 2.5rem;
      background: linear-gradient(165deg, #f4faf6 0%, #eef2f7 45%, #f8faf9 100%);
      min-height: 100vh;
    }
    .md-wrap {
      max-width: 1080px;
      margin: 0 auto;
    }
    .md-page-head {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
      margin-bottom: 1.25rem;
    }
    #mdPageBack {
      width: 100%;
    }
    #mdPageBack:empty {
      display: none;
    }
    .md-page-header {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e3a2f;
      margin: 0;
      letter-spacing: -0.02em;
    }
    #mdTopNav:empty {
      display: none;
    }
    #mdTopNav:not(:empty) {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
    .md-page {
      font-size: 13px;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .md-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
    }
    .md-b-green { background: #f0fdf4; color: #15803d; border: 0.5px solid #bbf7d0; }
    .md-b-amber { background: #fef3c7; color: #b45309; border: 0.5px solid #fde68a; }
    .md-b-blue { background: #eff6ff; color: #1d4ed8; border: 0.5px solid #bfdbfe; }
    .md-b-gray { background: #f3f4f6; color: #6b7280; border: 0.5px solid #e5e7eb; }
    .md-b-red { background: #fef2f2; color: #b91c1c; border: 0.5px solid #fca5a5; }
    .md-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 14px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #334155;
      text-decoration: none;
      font-family: inherit;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    }
    .md-btn:hover {
      background: #f8fafc;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .md-btn-g {
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
      color: #fff;
      border-color: #16a34a;
    }
    .md-btn-g:hover {
      background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
    }
    .md-btn-r { background: #fff; color: #b91c1c; border-color: #fca5a5; }
    .md-btn-r:hover { background: #fef2f2; }
    .md-btn-outline-g { background: #fff; color: #15803d; border-color: #bbf7d0; }
    .md-btn-outline-g:hover { background: #f0fdf4; }
    .md-btn-xs { padding: 4px 9px; font-size: 11px; border-radius: 6px; }
    .md-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .md-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #166534;
      font-weight: 600;
      text-decoration: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(22, 163, 74, 0.15);
      box-shadow: 0 1px 3px rgba(22, 101, 52, 0.08);
      transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    }
    .md-back:hover {
      background: #fff;
      box-shadow: 0 4px 12px rgba(22, 101, 52, 0.12);
      transform: translateX(-2px);
    }
    .md-back i { font-size: 16px; }
    .md-topbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .md-hero {
      padding: 1.75rem 1.75rem 1.5rem;
      border-radius: 16px;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 42%, #e8f8ef 100%);
      border: 1px solid rgba(34, 197, 94, 0.22);
      box-shadow:
        0 4px 24px rgba(22, 163, 74, 0.1),
        0 1px 0 rgba(255, 255, 255, 0.8) inset;
      position: relative;
      overflow: hidden;
    }
    .md-hero::before {
      content: "";
      position: absolute;
      top: -40%;
      right: -8%;
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, transparent 70%);
      pointer-events: none;
    }
    .md-hero-badge {
      position: absolute;
      top: 1.15rem;
      right: 1.15rem;
      z-index: 3;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: capitalize;
      border-radius: 999px;
      border-width: 2px;
      border-style: solid;
      line-height: 1.2;
      box-shadow:
        0 2px 10px rgba(15, 23, 42, 0.12),
        0 0 0 3px rgba(255, 255, 255, 0.95);
      white-space: nowrap;
    }
    .md-hero-badge.md-b-green {
      background: #fff;
      color: #15803d;
      border-color: #22c55e;
    }
    .md-hero-badge.md-b-amber {
      /* background: #fffbeb; */
      color: #b45309;
      border-color: #f59e0b;
    }
    .md-hero-badge.md-b-blue {
      background: #fff;
      color: #1d4ed8;
      border-color: #3b82f6;
    }
    .md-hero-badge.md-b-gray {
      background: #fff;
      color: #475569;
      border-color: #94a3b8;
    }
    .md-hero-badge.md-b-red {
      background: #fff;
      color: #b91c1c;
      border-color: #ef4444;
    }
    .md-hero-content { position: relative; z-index: 1; min-width: 0; padding-right: 7.5rem; }
    @media (max-width: 560px) {
      .md-hero-content { padding-right: 0; padding-top: 2.75rem; }
    }
    .md-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 12px;
      margin-bottom: 10px;
      padding-right: 0;
    }
    .md-title {
      font-size: 1.65rem;
      font-weight: 700;
      margin: 0;
      line-height: 1.25;
      color: #14532d;
      letter-spacing: -0.02em;
      flex: 1 1 auto;
      min-width: 0;
    }
    .md-type-badge {
      flex-shrink: 0;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .md-desc {
      font-size: 14px;
      color: #3f6212;
      line-height: 1.65;
      margin: 0 0 1.25rem;
      max-width: 52rem;
    }
    .md-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    @media (max-width: 900px) { .md-info-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .md-info-grid { grid-template-columns: 1fr; } }
    .md-cell {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 2px 8px rgba(22, 101, 52, 0.06);
      backdrop-filter: blur(4px);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .md-cell:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(22, 101, 52, 0.1);
    }
    .md-cell-label {
      font-size: 10px;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .md-cell-label i { font-size: 12px; color: #16a34a; }
    .md-cell-val { font-size: 13px; font-weight: 500; color: #111827; line-height: 1.3; }
    .md-cell-sub { font-size: 11px; color: #888; margin-top: 1px; }
    .md-pts-cell {
      background: linear-gradient(145deg, #fff 0%, #f0fdf4 100%);
      border-color: rgba(34, 197, 94, 0.35);
    }
    .md-pts-cell .md-cell-label { color: #16a34a; }
    .md-pts-cell .md-cell-val { color: #15803d; font-size: 1.05rem; }
    .md-body {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .md-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.35rem;
      border: 1px solid #e8ecef;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
    }
    .md-card--table { padding: 0; overflow: hidden; }
    .md-card--table .md-roster-head { padding: 1rem 1.25rem 0; }
    .md-sec-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
    }
    .md-sec-label--title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e3a2f;
      text-transform: none;
      letter-spacing: normal;
      margin-bottom: 0;
    }
    .md-prog-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .md-prog-wrap {
      height: 10px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .md-prog {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #16a34a);
      border-radius: 999px;
      transition: width 0.45s ease;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.35);
    }
    .md-slots-open { color: #16a34a; font-weight: 600; font-size: 13px; }
    .md-roster-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .md-roster-head .md-sec-label { margin-bottom: 0; }
    .md-table-wrap { overflow-x: auto; }
    .md-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 720px; }
    .md-table th {
      text-align: left;
      padding: 11px 16px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      border-bottom: 1px solid #eef2f6;
      background: #f8fafc;
      white-space: nowrap;
    }
    .md-table td {
      padding: 11px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .md-table tr:last-child td { border-bottom: none; }
    .md-table tbody tr:hover td { background: #f8fafc; }
    .md-av {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #f0fdf4;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 500;
      flex-shrink: 0;
    }
    .md-name-cell { display: flex; align-items: center; gap: 8px; }
    .md-muted { color: #888; }
    .md-dash { color: #bbb; font-size: 11px; }
    .md-pts-val { font-weight: 500; color: #15803d; }
    .md-action-group { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .md-status-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .md-status-actions .md-action-group { width: 100%; }
    .md-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.25rem 0.5rem;
      flex-wrap: wrap;
      gap: 10px;
    }
    .md-foot-meta { font-size: 12px; color: #94a3b8; }
    .md-foot-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .md-empty-roster {
      padding: 1.5rem;
      text-align: center;
      color: #888;
      font-size: 13px;
      border: 0.5px dashed #e5e7eb;
      border-radius: 8px;
    }
    .md-rejection {
      background: #fef2f2;
      border: 0.5px solid #fecaca;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.5;
    }
    .md-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 4rem 2rem;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      background: #fff;
      border-radius: 14px;
      border: 1px dashed #cbd5e1;
    }
    .md-loading .missions-loading-spinner {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #e2e8f0;
      border-top-color: #166534;
      border-radius: 50%;
      animation: md-detail-spin 1s linear infinite;
    }
    @keyframes md-detail-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .md-error { padding: 2rem; text-align: center; color: #b91c1c; }
    .reject-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 1rem;
    }
    .reject-modal-overlay.is-open { display: flex; }
    .reject-modal {
      background: #fff;
      border-radius: 12px;
      max-width: 440px;
      width: 100%;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .reject-modal h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
    .reject-modal-help { margin: 0 0 1rem; font-size: 0.9rem; color: #6b7280; }
    .reject-modal textarea {
      width: 100%;
      min-height: 90px;
      padding: 0.6rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;
    }
    .reject-modal-error { color: #b91c1c; font-size: 0.85rem; margin: 0.5rem 0 0; min-height: 1.2em; }
    .reject-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 1rem; }
    .reject-modal-cancel,
    .reject-modal-confirm {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
      border: 1px solid #d1d5db;
      background: #fff;
    }
    .reject-modal-confirm { background: #b91c1c; color: #fff; border-color: #b91c1c; }
  .roster-success-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 3100;
      padding: 1rem;
    }
    .roster-success-modal-overlay.is-open { display: flex !important; }
    .roster-success-modal-overlay[hidden] { display: none !important; }
    .roster-success-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.75rem 1.5rem 1.25rem;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .roster-success-modal-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
      line-height: 1;
    }
    .roster-success-modal-icon.is-approved { color: #2d6a4f; }
    .roster-success-modal-icon.is-rejected { color: #b91c1c; }
    .roster-success-modal h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: #0f2419;
    }
    .roster-success-modal-message {
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.5;
    }
    .roster-success-modal-actions { display: flex; justify-content: center; }
    .roster-success-modal-confirm {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: #2d6a4f;
      color: #fff;
    }
    .roster-success-modal-confirm:hover { background: #245a42; }
    .roster-success-modal-icon.is-warning { color: #b45309; }
    .roster-success-modal-confirm.is-amber {
      background: #d97706;
    }
    .roster-success-modal-confirm.is-amber:hover {
      background: #b45309;
    }
    .md-roster-accept-btn.is-mission-full {
      opacity: 0.72;
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'missions'])

  <main class="org-main-content main-content">
    <div class="md-wrap">
      <header class="md-page-head">
        <div id="mdPageBack"></div>
        <h1 class="md-page-header">Mission Details</h1>
        <nav id="mdTopNav" class="md-topbar-actions" aria-label="Mission actions"></nav>
      </header>
      <div id="detailsContainer"></div>
    </div>
  </main>

  <div
    id="rejectReasonModal"
    class="reject-modal-overlay"
    hidden
    role="dialog"
    aria-modal="true"
    aria-labelledby="rejectModalTitle"
  >
    <div class="reject-modal">
      <h2 id="rejectModalTitle">Reject application</h2>
      <p class="reject-modal-help">Explain why this application is being rejected. The volunteer may see this message.</p>
      <label for="rejectReasonInput">Reason</label>
      <textarea id="rejectReasonInput" placeholder="Enter rejection reason…"></textarea>
      <p id="rejectReasonError" class="reject-modal-error" role="alert"></p>
      <div class="reject-modal-actions">
        <button type="button" class="reject-modal-cancel" id="rejectModalCancel">Cancel</button>
        <button type="button" class="reject-modal-confirm" id="rejectModalConfirm">Reject application</button>
      </div>
    </div>
  </div>

  <div
    id="rosterStatusSuccessModal"
    class="roster-success-modal-overlay"
    hidden
    aria-modal="true"
    role="dialog"
    aria-labelledby="rosterStatusSuccessTitle"
  >
    <div class="roster-success-modal" role="document">
      <div class="roster-success-modal-icon is-approved" id="rosterStatusSuccessIcon" aria-hidden="true">
        <i class="ti ti-circle-check"></i>
      </div>
      <h2 id="rosterStatusSuccessTitle">Success</h2>
      <p class="roster-success-modal-message" id="rosterStatusSuccessMessage"></p>
      <div class="roster-success-modal-actions">
        <button type="button" class="roster-success-modal-confirm" id="rosterStatusSuccessOk">OK</button>
      </div>
    </div>
  </div>

  <div
    id="missionFullModal"
    class="roster-success-modal-overlay"
    hidden
    aria-modal="true"
    role="dialog"
    aria-labelledby="missionFullTitle"
  >
    <div class="roster-success-modal" role="document">
      <div class="roster-success-modal-icon is-warning" aria-hidden="true">
        <i class="ti ti-users-minus"></i>
      </div>
      <h2 id="missionFullTitle">Mission is full</h2>
      <p class="roster-success-modal-message" id="missionFullMessage">
        This mission has no open volunteer slots. You cannot accept more applicants.
      </p>
      <div class="roster-success-modal-actions">
        <button type="button" class="roster-success-modal-confirm is-amber" id="missionFullOk">OK</button>
      </div>
    </div>
  </div>
</body>
</html>
