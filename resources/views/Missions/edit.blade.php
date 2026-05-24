<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Mission - Kalinga</title>
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-sidebar.js',
    'resources/js/organization-logout.js',
    'resources/js/firebase.js',
    'resources/js/mission-edit.js'
  ])
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.min.css">
  @include('partials.org-layout-styles')
  <style>
  body.org-app {
    background-color: #f8f9fa;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .org-main-content .main-container {
    min-height: auto;
    padding: 1.5rem 1rem 2rem;
  }

  .mission-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: none;
  }

  .card-header {
    background: #28a745; /* green header */
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px 12px 0 0;
  }

  .mission-header {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 64px;
  }

  .mission-title {
    margin: 0;
    text-align: center;
    font-weight: 700;
  }

  .return-btn {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .mapboxgl-canvas {
    image-rendering: -webkit-optimize-contrast !important;
    image-rendering: crisp-edges !important;
  }

  .mapboxgl-canvas-container {
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }

  #map {
    height: 400px;
    width: 100%;
    margin-top: 1rem;
    border-radius: 8px;
    border: 1px solid #ced4da;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  #locationDisplay {
    font-size: 0.95rem;
    min-height: 1.5rem;
  }

  .map-search-wrap {
    position: relative;
    margin-bottom: 0.75rem;
  }

  #locationSearch {
    padding-left: 2.25rem;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat 12px center;
  }

  #locationSuggestions {
    position: absolute;
    z-index: 99999;
    left: 0;
    right: 0;
    width: 100%;
    background: white;
    border: 1px solid #ced4da;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    display: none;
    margin-top: 0.25rem;
    max-height: 220px;
    overflow-y: auto;
    list-style: none;
    padding: 0;
  }

  .map-location-suggestion {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.9rem;
    color: #334155;
  }

  .map-location-suggestion:hover {
    background-color: #f8fafc;
  }

  .map-location-suggestion:last-child {
    border-bottom: none;
  }

  .map-location-suggestion--empty {
    cursor: default;
    color: #64748b;
  }

  .map-location-suggestion--empty:hover {
    background: transparent;
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
  .success-modal-overlay.is-open {
    display: flex;
  }
  .success-modal-overlay[hidden] {
    display: none !important;
  }
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
    color: #28a745;
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
  .success-modal-actions {
    display: flex;
    justify-content: center;
  }
  .success-modal-confirm {
    border: none;
    border-radius: 10px;
    padding: 0.6rem 1.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    background: #28a745;
    color: #fff;
  }
  .success-modal-confirm:hover {
    background: #218838;
  }

  .mission-image-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px dashed #ddd;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .mission-image-preview {
    width: 200px;
    height: 150px;
    border-radius: 8px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: #6c757d;
    border: 2px solid #e9ecef;
    overflow: hidden;
    position: relative;
  }

  .mission-image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .mission-image-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .mission-image-actions .btn {
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
  }

  @media (max-width: 768px) {
    .mission-image-container {
      padding: 0.5rem;
    }

    .mission-image-preview {
      width: 150px;
      height: 120px;
    }

    .mission-image-actions {
      flex-direction: column;
      width: 100%;
    }

    .mission-image-actions .btn {
      width: 100%;
    }
  }
  </style>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
</head>
<body class="org-app">
@include('partials.org-sidebar', ['activeNav' => 'missions'])
<main class="org-main-content">
<div class="container-fluid main-container">
  <div class="row">
    <div class="col-12">
      <div class="card mission-card">
        <div class="card-header mission-header">
          <button type="button" class="btn btn-light btn-sm return-btn" onclick="window.location.href='/organization/dashboard'">
            <i class="bi bi-arrow-left"></i> Return to Dashboard
          </button>
          <h3 class="mission-title">Edit Mission</h3>
        </div>

        <div class="card-body position-relative">
          <form id="editMissionForm">
            <input type="hidden" id="missionId">

            <div class="form-group">
              <label for="name">Mission Name</label>
              <input type="text" id="name" class="form-control" required>
            </div>

            <div class="form-group">
              <label for="description">Mission Description</label>
              <textarea id="description" class="form-control" required></textarea>
            </div>

            <div class="form-group">
    <label for="type">Mission Type</label>
    <select id="type" class="form-select" required>
        <option value="" disabled selected>Loading mission types…</option>
    </select>
</div>

            <div class="row g-3">
              <div class="col-md-6">
                <label for="date">Starting Date</label>
                <input type="date" id="date" class="form-control" required>
              </div>
              <div class="col-md-6">
                <label for="startTime">Start Time</label>
                <input type="time" id="startTime" class="form-control" required>
              </div>
            </div>

            <div class="row g-3 mt-1">
              <div class="col-md-6">
                <label for="endDate">End Date</label>
                <input type="date" id="endDate" class="form-control" required>
              </div>
              <div class="col-md-6">
                <label for="endTime">End Time</label>
                <input type="time" id="endTime" class="form-control" required>
              </div>
            </div>

            <div class="form-group mt-3">
              <label>Mission location</label>
              <p class="text-muted small mb-2">Search for a place, or click the map to place a pin. Drag the pin to adjust.</p>
              <div class="map-search-wrap">
                <input
                  type="text"
                  id="locationSearch"
                  class="form-control"
                  placeholder="Search for an address or place…"
                  autocomplete="off"
                  aria-label="Search location on map"
                >
                <ul id="locationSuggestions" role="listbox" aria-label="Location search results"></ul>
              </div>
              <p id="locationDisplay" class="text-secondary mb-2">No location pinned yet</p>

              <input type="hidden" id="location" name="location">
              <input type="hidden" id="latitude" name="latitude">
              <input type="hidden" id="longitude" name="longitude">

              <div id="map" style="position: relative; overflow: hidden;"></div>
            </div>

            <div class="form-group">
              <label for="volunteers">Volunteers Needed</label>
              <input type="number" id="volunteers" class="form-control" required>
            </div>

            <div class="form-group">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="autoAcceptVolunteers" role="switch" />
                <label class="form-check-label" for="autoAcceptVolunteers">Auto-accept volunteers</label>
              </div>
              <p class="text-muted small mb-0 mt-1">When enabled, new volunteer applications are approved automatically.</p>
            </div>

            <div class="form-group">
              <label for="missionImage">Mission Image (Optional)</label>
              <div class="mission-image-container">
                <div class="mission-image-preview" id="missionImagePreview">
                  <span id="missionImagePlaceholder"><i class="bi bi-camera"></i></span>
                </div>
                <div class="mission-image-actions">
                  <input type="file" id="missionImageInput" accept="image/*" style="display: none;">
                  <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('missionImageInput').click()">
                    <i class="bi bi-folder2-open"></i> Upload Image
                  </button>
                  <button type="button" class="btn btn-outline-danger" id="removeMissionImage" style="display: none;">
                    <i class="bi bi-trash"></i> Remove Image
                  </button>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-end gap-3 mt-4">
              <button type="button" class="btn btn-secondary" onclick="window.location.href='/organization/dashboard'">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
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
