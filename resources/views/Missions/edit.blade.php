<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Mission - Kalinga</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/firebase.js',
    'resources/js/mission-edit.js',
  ])
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
  @include('partials.org-layout-styles')

  <style>
    html, body.org-app {
      height: 100%;
      overflow: hidden;
      background: #effff4;
    }
    body.org-app { display: flex; }
    .org-main-content.main-content.mission-details-page {
      margin-left: 210px;
      max-width: none;
      width: calc(100% - 210px);
      height: 100vh;
      min-height: 100vh;
      padding: 65px 0 0;
      background: #effff4;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .md-wrap {
      flex: 1;
      min-height: 0;
      width: 100%;
      max-width: none;
      margin: 0;
      overflow-y: auto;
      padding: 1.25rem 3rem 1.75rem;
      box-sizing: border-box;
    }
    @media (max-width: 900px) {
      .org-main-content.main-content.mission-details-page {
        margin-left: 0;
        width: 100%;
      }
      .md-wrap { padding: 1.15rem 1.5rem 1.5rem; }
    }
    @media (max-width: 700px) {
      .md-wrap { padding: 1rem 1.1rem 1.25rem; }
    }
    .md-page-head {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
      margin-bottom: 1.25rem;
    }
    #mdPageBack { width: 100%; }
    #mdPageBack:empty { display: none; }
    #mdTopNav:empty { display: none; }
    #mdTopNav:not(:empty) {
      display: flex;
      justify-content: flex-end;
      width: 100%;
      gap: 8px;
      flex-wrap: wrap;
    }
    .md-page {
      font-size: 13px;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
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
      color: #fff;
    }
    .md-btn-outline-g { background: #fff; color: #15803d; border-color: #bbf7d0; }
    .md-btn-outline-g:hover { background: #f0fdf4; color: #15803d; }
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
      color: #166534;
    }
    .md-back i { font-size: 16px; }
    .md-hero {
      padding: 1.5rem 1.6rem 1.35rem;
      border-radius: 18px;
      background: #143528;
      border: none;
      box-shadow: 0 10px 28px rgba(15, 53, 40, 0.22);
      position: relative;
      overflow: hidden;
      color: #fff;
    }
    .md-hero-badge {
      position: absolute;
      top: 1.15rem;
      right: 1.15rem;
      z-index: 3;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: capitalize;
      border-radius: 999px;
      border: none;
      line-height: 1.2;
      white-space: nowrap;
      background: #fff !important;
      color: #166534 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    .md-hero-badge::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #3b82f6;
      flex-shrink: 0;
    }
    .md-hero-content { position: relative; z-index: 1; min-width: 0; padding-right: 6.5rem; }
    @media (max-width: 560px) {
      .md-hero-content { padding-right: 0; padding-top: 2.5rem; }
    }
    .md-title {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 0 0 0.35rem;
      line-height: 1.15;
      color: #fff;
      letter-spacing: -0.03em;
    }
    .md-hero-sub {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.72);
      line-height: 1.45;
      max-width: 40rem;
    }
    .md-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .md-card {
      background: #fff;
      border-radius: 16px;
      padding: 1.15rem 1.25rem;
      border: 1px solid #e8ecef;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .md-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .md-sec-label--title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .md-card-help {
      margin: 0 0 0.85rem;
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.4;
    }
    .md-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.95rem 1.15rem;
      flex-wrap: wrap;
      gap: 10px;
      background: #fff;
      border: 1px solid #e8ecef;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .md-foot-meta { font-size: 0.85rem; color: #94a3b8; }
    .md-foot-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .mission-form .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .mission-form .form-control,
    .mission-form .form-select {
      border-radius: 10px;
      border-color: #dde3e8;
      padding: 0.55rem 0.85rem;
      font-size: 0.95rem;
    }
    .mission-form .form-control:focus,
    .mission-form .form-select:focus {
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
    }
    .mission-form textarea.form-control {
      min-height: 110px;
      resize: vertical;
    }

    .points-preview {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin-top: 0.65rem;
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #166534;
    }
    .points-preview i { font-size: 0.95rem; }

    .map-search-wrap {
      position: relative;
      margin-bottom: 0.75rem;
    }
    #locationSearch {
      padding-left: 2.35rem;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 12px center;
    }
    #locationSuggestions {
      position: absolute;
      z-index: 99999;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 10px 24px rgba(15, 36, 25, 0.12);
      display: none;
      margin-top: 0.35rem;
      max-height: 240px;
      overflow-y: auto;
      list-style: none;
      padding: 0.35rem 0;
    }
    .map-location-suggestion { padding: 0.7rem 1rem; cursor: pointer; }
    .map-location-suggestion-title {
      font-weight: 600;
      color: #1e293b;
      font-size: 0.9rem;
    }
    .map-location-suggestion-meta {
      margin-top: 0.15rem;
      font-size: 0.78rem;
      color: #64748b;
    }
    .map-location-suggestion:hover { background: #f0fdf4; }
    .map-location-suggestion--empty { cursor: default; color: #64748b; }
    #map {
      height: 320px;
      width: 100%;
      border-radius: 12px;
      border: 1px solid #dde3e8;
      overflow: hidden;
      transform: translateZ(0);
    }
    .map-wrap {
      position: relative;
      width: 100%;
      margin-top: 0.5rem;
    }
    .map-wrap #map { margin-top: 0; }
    .map-pin-hint {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 2;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.3;
      color: #1e3a2f;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(30, 58, 47, 0.12);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
    }
    .map-pin-hint .bi {
      font-size: 13px;
      color: #16a34a;
      flex-shrink: 0;
    }

    .option-card {
      padding: 1rem 1.1rem;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e8ecef;
    }
    .option-card .form-check-input {
      width: 2.5em;
      height: 1.25em;
      cursor: pointer;
    }
    .option-card .form-check-input:checked {
      background-color: #22a447;
      border-color: #22a447;
    }
    .option-card .form-check-label {
      font-weight: 600;
      color: #1e3a2f;
      cursor: pointer;
    }

    .mission-docs-inline {
      margin-top: 1.15rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .mission-docs-inline .form-section-docs-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0 0 0.65rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #111827;
    }
    .mission-docs-box {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .mission-docs-hint {
      margin: 0;
      font-size: 0.8rem;
      color: #64748b;
      line-height: 1.4;
    }
    .mission-docs-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .mission-docs-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mission-doc-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      background: #f8fafc;
    }
    .mission-doc-row__icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #ecfdf3;
      color: #166534;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mission-doc-row__meta {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .mission-doc-row__name {
      font-size: 0.86rem;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mission-doc-row__size {
      font-size: 0.75rem;
      color: #64748b;
    }
    .mission-doc-row__remove {
      border: none;
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .mission-doc-row__remove:hover {
      background: #b91c1c;
      color: #fff;
    }
    .mission-docs-error {
      margin: 0;
      font-size: 0.82rem;
      color: #b91c1c;
      display: none;
    }
    .mission-docs-error.is-visible { display: block; }

    .mission-image-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      transition: border-color 0.2s, background 0.2s;
    }
    .mission-image-container:hover {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .mission-image-container.has-image {
      border-style: solid;
      border-color: #bbf7d0;
      background: #fff;
    }
    .mission-image-preview {
      width: 100%;
      max-width: 280px;
      height: 160px;
      border-radius: 10px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      color: #94a3b8;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .mission-image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .mission-image-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .success-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 36, 25, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 5000;
      padding: 1rem;
    }
    .success-modal-overlay.is-open { display: flex; }
    .success-modal-overlay[hidden] { display: none !important; }
    .success-modal {
      background: #fff;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 1.75rem 1.5rem 1.25rem;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    }
    .success-modal-icon {
      font-size: 3rem;
      color: #22a447;
      margin-bottom: 0.75rem;
      line-height: 1;
    }
    .success-modal h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      color: #0f2419;
    }
    .success-modal-message {
      margin: 0 0 1.25rem;
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.5;
    }
    .success-modal-confirm {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      background: #22a447;
      color: #fff;
    }
    .success-modal-confirm:hover { background: #1d8f3c; }

    .mapboxgl-canvas {
      image-rendering: -webkit-optimize-contrast !important;
    }

    @media (max-width: 768px) {
      .md-foot-actions { width: 100%; }
      .md-foot-actions .md-btn { flex: 1; justify-content: center; }
      #map { height: 260px; }
    }
  </style>
</head>
<body class="org-app">
@include('partials.org-sidebar', ['activeNav' => 'missions'])
@include('partials.org-topbar', ['pageTitle' => 'Edit Mission'])

<main class="org-main-content main-content mission-details-page" id="mainContent">
  <div class="md-wrap">
    <header class="md-page-head">
      <div id="mdPageBack">
        <a href="/organization/dashboard" class="md-back" id="editMissionBack">
          <i class="ti ti-arrow-left" aria-hidden="true"></i> Dashboard
        </a>
      </div>
      <nav id="mdTopNav" class="md-topbar-actions" aria-label="Edit mission actions">
        <a href="/organization/dashboard" class="md-btn md-btn-outline-g" id="editMissionViewLink">
          <i class="ti ti-eye" aria-hidden="true"></i> View mission
        </a>
      </nav>
    </header>

    <div class="md-page">
      <div class="md-hero">
        <span class="md-hero-badge">Editing</span>
        <div class="md-hero-content">
          <h1 class="md-title" id="editMissionHeroTitle">Edit mission</h1>
          <p class="md-hero-sub">Update your mission details below. Changes are saved across your organization dashboard.</p>
        </div>
      </div>

      <form id="editMissionForm" class="mission-form md-body">
        <input type="hidden" id="missionId">

        <section class="md-card" aria-labelledby="section-basics">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-basics">Basic details</h2>
          </div>
          <p class="md-card-help">Name and describe what volunteers will be doing.</p>
          <div class="mb-3">
            <label for="name" class="form-label">Mission name</label>
            <input type="text" id="name" class="form-control" placeholder="e.g. Coastal cleanup drive" required>
          </div>
          <div class="mb-0">
            <label for="description" class="form-label">Description</label>
            <textarea id="description" class="form-control" rows="4" placeholder="Goals, tasks, what volunteers should bring…" required></textarea>
          </div>
        </section>

        <section class="md-card" aria-labelledby="section-schedule">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-schedule">Schedule</h2>
          </div>
          <p class="md-card-help">When the mission starts and ends.</p>
          <div class="row g-3">
            <div class="col-md-6">
              <label for="date" class="form-label">Start date</label>
              <input type="date" id="date" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label for="startTime" class="form-label">Start time</label>
              <input type="time" id="startTime" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label for="endDate" class="form-label">End date</label>
              <input type="date" id="endDate" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label for="endTime" class="form-label">End time</label>
              <input type="time" id="endTime" class="form-control" required>
            </div>
          </div>
        </section>

        <section class="md-card" aria-labelledby="section-type">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-type">Mission type</h2>
          </div>
          <p class="md-card-help">Category affects volunteer points for this mission.</p>
          <label for="type" class="form-label">Type</label>
          <select id="type" class="form-select" required>
            <option value="" disabled selected>Loading mission types…</option>
          </select>
          <p id="missionPointsPreview" class="points-preview mb-0">
            <i class="bi bi-star-fill" aria-hidden="true"></i>
            <span>Select a type and schedule to see earned points</span>
          </p>

          <div class="mission-docs-inline" aria-labelledby="section-documents">
            <h3 class="form-section-docs-title" id="section-documents">
              <i class="bi bi-file-earmark-text" aria-hidden="true"></i> Attachments
            </h3>
            <div class="mission-docs-box">
              <p class="mission-docs-hint">Upload PDF, DOCX, or Excel files. Maximum 50MB per file.</p>
              <div class="mission-docs-actions">
                <input
                  type="file"
                  id="missionDocumentsInput"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  multiple
                  hidden
                >
                <button type="button" class="md-btn md-btn-outline-g" id="missionDocumentsPickBtn">
                  <i class="bi bi-upload"></i> Add documents
                </button>
              </div>
              <div class="mission-docs-list" id="missionDocumentsList"></div>
              <p class="mission-docs-error" id="missionDocumentsError" role="alert"></p>
            </div>
          </div>
        </section>

        <section class="md-card" aria-labelledby="section-location">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-location">Location</h2>
          </div>
          <p class="md-card-help">Search for a school, mall, or place—or click the map to drop a pin.</p>
          <div class="map-search-wrap">
            <input
              type="text"
              id="locationSearch"
              class="form-control"
              placeholder="Search for a school, mall, address, or place…"
              autocomplete="off"
              aria-label="Search location on map"
            >
            <ul id="locationSuggestions" role="listbox" aria-label="Location search results"></ul>
          </div>
          <input type="hidden" id="location" name="location">
          <input type="hidden" id="latitude" name="latitude">
          <input type="hidden" id="longitude" name="longitude">
          <div id="map"></div>
        </section>

        <section class="md-card" aria-labelledby="section-volunteers">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-volunteers">Volunteers</h2>
          </div>
          <p class="md-card-help">How many people you need for this mission.</p>
          <label for="volunteers" class="form-label">Volunteers needed</label>
          <input type="number" id="volunteers" class="form-control" min="1" placeholder="e.g. 10" required style="max-width: 200px;">
          <div class="option-card mt-3">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="autoAcceptVolunteers" role="switch">
              <label class="form-check-label" for="autoAcceptVolunteers">Auto-accept volunteers</label>
            </div>
            <p class="text-muted small mb-0 mt-2">When enabled, new applications are approved automatically. When off, you review each applicant on the Volunteers page.</p>
          </div>
        </section>

        <section class="md-card" aria-labelledby="section-image">
          <div class="md-card-head">
            <h2 class="md-sec-label--title" id="section-image">Cover image</h2>
          </div>
          <p class="md-card-help">Optional photo shown on the mission listing.</p>
          <div class="mission-image-container" id="missionImageContainer">
            <div class="mission-image-preview" id="missionImagePreview">
              <span id="missionImagePlaceholder"><i class="bi bi-camera"></i></span>
            </div>
            <div class="mission-image-actions">
              <input type="file" id="missionImageInput" accept="image/*" hidden>
              <button type="button" class="md-btn md-btn-outline-g" onclick="document.getElementById('missionImageInput').click()">
                <i class="bi bi-upload"></i> Upload image
              </button>
              <button type="button" class="md-btn" id="removeMissionImage" hidden style="color:#b91c1c;border-color:#fca5a5;">
                <i class="bi bi-trash"></i> Remove
              </button>
            </div>
          </div>
        </section>

        <div class="md-foot">
          <div class="md-foot-meta">Review your changes before saving.</div>
          <div class="md-foot-actions">
            <button type="button" class="md-btn" id="editMissionCancelBtn">Cancel</button>
            <button type="submit" class="md-btn md-btn-g">
              <i class="ti ti-check" aria-hidden="true"></i> Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</main>

<div
  id="missionEditSuccessModal"
  class="success-modal-overlay"
  hidden
  aria-modal="true"
  role="dialog"
  aria-labelledby="missionEditSuccessModalTitle"
>
  <div class="success-modal" role="document">
    <div class="success-modal-icon" aria-hidden="true">
      <i class="bi bi-check-circle-fill"></i>
    </div>
    <h2 id="missionEditSuccessModalTitle">Mission updated</h2>
    <p class="success-modal-message" id="missionEditSuccessModalMessage">
      Your mission changes were saved successfully.
    </p>
    <div class="success-modal-actions">
      <button type="button" class="success-modal-confirm" id="missionEditSuccessModalOk">OK</button>
    </div>
  </div>
</div>

<script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
@vite(['resources/js/mission-map.js'])
</body>
</html>
