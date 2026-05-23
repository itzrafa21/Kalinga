<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteer Details - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/volunteer-details.js',
  ])
  @include('partials.org-layout-styles')
  <style>
    .org-main-content.main-content { padding: 1.25rem 1.5rem 2rem; }
    .page-title {
      font-size: 1.35rem; font-weight: 700; color: #1f2937;
      margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem;
    }
    .page-title i { color: #22a447; }
    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: #166534;
      text-decoration: none; margin-bottom: 1rem;
    }
    .back-link:hover { color: #15803d; }
    .profile-card {
      background: #fff; border: 1px solid #e8edf2; border-radius: 12px;
      padding: 1.25rem 1.35rem; margin-bottom: 1rem;
      box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    }
    .profile-card h2 { margin: 0 0 0.75rem; font-size: 1.25rem; color: #111827; }
    .profile-card p { margin: 0.35rem 0; font-size: 0.88rem; color: #475569; }
    .volunteers-section {
      background: #fff; border-radius: 10px; border: 1px solid #e8edf2;
      box-shadow: 0 1px 2px rgba(16,24,40,0.04); padding: 0.9rem;
    }
    .table-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.75rem;
    }
    .table-head h3 {
      margin: 0; font-size: 0.95rem; color: #1f2937; font-weight: 700;
      display: flex; align-items: center; gap: 0.45rem;
    }
    .table-head h3 i { color: #22a447; }
    .volunteers-table { width: 100%; border-collapse: collapse; }
    .volunteers-table th, .volunteers-table td {
      padding: 10px; text-align: left; border-bottom: 1px solid #eef2f6;
      font-size: 0.8rem; vertical-align: top;
    }
    .volunteers-table th { background: #d1d1d1; font-weight: 700; }
    .volunteers-table tbody tr:hover { background: #f9fbfd; }
    .mission-link { color: #166534; font-weight: 600; text-decoration: none; }
    .mission-link:hover { text-decoration: underline; }
    .mission-desc-cell {
      max-width: 420px; color: #475569; line-height: 1.45;
    }
  </style>
</head>
<body class="org-app">
  @include('partials.org-sidebar', ['activeNav' => 'volunteers'])

  <main class="org-main-content main-content">
    <a href="/organization/volunteers" class="back-link">
      <i class="bi bi-arrow-left"></i> Back to volunteers
    </a>

    <h1 class="page-title"><i class="bi bi-person-badge"></i> Volunteer details</h1>

    <p id="detailLoading" class="text-muted">Loading applicant…</p>

    <div id="detailContent" hidden>
      <section class="profile-card">
        <h2 id="applicantName">Volunteer</h2>
        <div id="applicantMeta"></div>
      </section>

      <section class="volunteers-section">
        <div class="table-head">
          <h3><i class="bi bi-calendar-check"></i> Missions Attended</h3>
          <span id="missionCountText" class="text-muted" style="font-size:0.85rem;">0 missions</span>
        </div>
        <div class="table-responsive">
          <table class="volunteers-table">
            <thead>
              <tr>
                <th>Mission Name</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody id="applicantMissionsBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</body>
</html>
