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
              <p class="text-muted small mb-2">Click the map to place a pin. Drag the pin to adjust.</p>
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
  <script>
  document.addEventListener("DOMContentLoaded", function() {
    mapboxgl.accessToken = "pk.eyJ1Ijoia2FuZWVlY3Jhc2giLCJhIjoiY21nd2c4amVqMGMwMDJrc2R0ZXhxcTA2ZiJ9._ihHfQRKW2oW9wGup1yTNw";

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [123.9024, 10.2943],
      zoom: 12,
      pixelRatio: window.devicePixelRatio || 1,
      antialias: true,
    });

    map.on("load", () => {
      map.resize();
      window.addEventListener("resize", () => map.resize());
      restoreMissionMapPin();
    });

    map.on("error", (e) => console.error("[ERROR] Map error:", e));

    let marker = null;

    function formatPinnedLabel(lat, lng, name) {
      if (name && String(name).trim()) return String(name).trim();
      return `Pinned location (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
    }

    function setLocationUI(label, lat, lng) {
      document.getElementById("location").value = label;
      document.getElementById("latitude").value = Number(lat).toFixed(6);
      document.getElementById("longitude").value = Number(lng).toFixed(6);
      const display = document.getElementById("locationDisplay");
      if (display) display.textContent = label;
    }

    async function reverseGeocode(lng, lat) {
      const params = new URLSearchParams({
        access_token: mapboxgl.accessToken,
        language: "en",
        types: "address",
        limit: "5",
      });
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        params.toString();

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error("[ERROR] Mapbox geocoding:", data.message || res.status);
        return null;
      }

      if (!data.features?.length) {
        const params2 = new URLSearchParams({
          access_token: mapboxgl.accessToken,
          language: "en",
          types: "place",
          limit: "1",
        });
        const url2 =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
          params2.toString();
        const res2 = await fetch(url2);
        const data2 = await res2.json();
        if (res2.ok && data2.features?.length) {
          return data2.features[0].place_name || data2.features[0].text;
        }
        return null;
      }

      const f = data.features[0];
      return f.place_name || f.text || null;
    }

    function bindMarkerDrag(m) {
      m.on("dragend", async () => {
        const { lng, lat } = m.getLngLat();
        try {
          const picked = await reverseGeocode(lng, lat);
          setLocationUI(formatPinnedLabel(lat, lng, picked), lat, lng);
        } catch (err) {
          console.error("[ERROR] reverseGeocode (drag):", err);
          setLocationUI(formatPinnedLabel(lat, lng, null), lat, lng);
        }
      });
    }

    async function applyMapPoint(lng, lat, displayLabel) {
      if (marker) marker.remove();
      marker = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map);
      bindMarkerDrag(marker);

      let label = displayLabel;
      if (label == null) {
        try {
          label = await reverseGeocode(lng, lat);
        } catch (err) {
          console.error("[ERROR] reverseGeocode:", err);
          label = null;
        }
      }
      setLocationUI(formatPinnedLabel(lat, lng, label), lat, lng);
    }

    map.on("click", (e) => {
      applyMapPoint(e.lngLat.lng, e.lngLat.lat, null);
    });

    async function restoreMissionMapPin() {
      const existingLocation = document.getElementById("location")?.value?.trim();
      const existingLat = parseFloat(document.getElementById("latitude")?.value);
      const existingLng = parseFloat(document.getElementById("longitude")?.value);

      if (!Number.isFinite(existingLat) || !Number.isFinite(existingLng)) return;

      const label = existingLocation || null;
      await applyMapPoint(existingLng, existingLat, label);
      map.flyTo({ center: [existingLng, existingLat], zoom: 14 });
    }

    window.restoreMissionMapPin = restoreMissionMapPin;
  });
  </script>
</body>
</html>
