<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Mission - Kalinga</title>

    @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/mission-create.js'])
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

        <!-- Mapbox CSS -->
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />

    <style>
        body {
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .main-container {
            min-height: 100vh;
            padding: 2rem 1rem;
        }

        .mission-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: none;
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

        .card-header {
    background: #28a745;
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

        #map {
            height: 400px; /* Increased height for better visibility */
            width: 100%;
            border-radius: 8px;
            margin-top: 1rem;
            border: 1px solid #ced4da;
            /* Add these properties to prevent blurriness */
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            transform: translateZ(0); /* Force hardware acceleration */
            -webkit-transform: translateZ(0);
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
        }

        #locationDisplay {
            font-size: 0.95rem;
            min-height: 1.5rem;
        }

        #suggestions {
            position: absolute;
            z-index: 99999;
            width: 100%;
            background: white;
            border: 1px solid #ced4da;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            display: none;
            margin-top: 0.25rem;
            max-height: 200px;
            overflow-y: auto;
        }

        #suggestions li {
            padding: 0.75rem 1rem;
            cursor: pointer;
            border-bottom: 1px solid #f8f9fa;
        }

        #suggestions li:hover {
            background-color: #f8f9fa;
        }

        #suggestions li:last-child {
            border-bottom: none;
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

        /* High-DPI display optimization */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            #map {
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                transform: scale(1);
            }
        }

        /* Prevent blurriness on all devices */
        .mapboxgl-canvas {
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
        }

        /* Ensure proper canvas rendering */
        .mapboxgl-canvas-container {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
    </style>
</head>
<body>
<div class="container-fluid main-container">
  <div class="row">
    <div class="col-12">
                <div class="card mission-card">
                <div class="card-header mission-header">
    <button type="button" class="btn btn-light btn-sm return-btn" onclick="window.location.href='/organization/dashboard'">
        <i class="bi bi-arrow-left"></i> Return to Dashboard
    </button>
    <h3 class="mission-title">Create New Mission</h3>
</div>
                    <div class="card-body position-relative">
                        <form id="createMissionForm">
                            @csrf

                            <div class="form-group">
                                <label for="name">Mission Name</label>
                                <input type="text" id="name" class="form-control" placeholder="Enter mission name" required>
                            </div>
                            <div class="form-group">
                                   <div class="form-group">
                                <label for="description">Mission Description</label>
                                <textarea id="description" class="form-control" rows="4" placeholder="Describe your mission objectives" required></textarea>
                            </div>
                            <div class="row g-3">
  <div class="col-md-6">
    <label for="date">Starting Date</label>
    <input type="date" id="date" class="form-control" required>
  </div>

  <div class="col-md-6">
    <label for="start_time">Start Time</label>
    <input type="time" id="start_time" class="form-control" required>
  </div>
</div>

<div class="row g-3 mt-1">
  <div class="col-md-6">
    <label for="end_date">End Date</label>
    <input type="date" id="end_date" class="form-control" required>
  </div>

  <div class="col-md-6">
    <label for="end_time">End Time</label>
    <input type="time" id="end_time" class="form-control" required>
  </div>
</div>
<div class="form-group">
    <label for="type">Mission Type</label>
    <select id="type" class="form-select" required>
        <option value="" disabled selected>Select mission type</option>
        <option value="General">General</option>
        <option value="Health/Medical">Health/Medical</option>
        <option value="Environment">Environment</option>
        <option value="Education">Education</option>
        <option value="Disaster Relief">Disaster Relief</option>
    </select>
</div>

                            <div class="form-group">
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
                                <input type="number" id="volunteers" class="form-control" min="1" placeholder="Enter number of volunteers needed" required>
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
    <button type="button" class="btn btn-secondary" onclick="window.location.href='/organization/dashboard'">
        Cancel
    </button>
    <button type="submit" class="btn btn-primary">
        Create Mission
    </button>
</div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mission created success modal -->
<div
  id="missionSuccessModal"
  class="success-modal-overlay"
  hidden
  aria-modal="true"
  role="dialog"
  aria-labelledby="missionSuccessModalTitle"
>
  <div class="success-modal" role="document">
  <div class="success-modal-icon" aria-hidden="true">
      <i class="bi bi-check-circle-fill"></i>
    </div>
    <h2 id="missionSuccessModalTitle">Mission submitted</h2>
    <p class="success-modal-message" id="missionSuccessModalMessage">
      Your mission was submitted successfully. It is now pending admin approval and will be visible to volunteers once approved.
    </p>
    <div class="success-modal-actions">
      <button type="button" class="success-modal-confirm" id="missionSuccessModalOk">OK</button>
    </div>
  </div>
</div>

        <!-- Mapbox JS -->
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

    function featureHasPlaceType(feature, typeId) {
        return Array.isArray(feature.place_type) && feature.place_type.indexOf(typeId) !== -1;
    }

    function pickBestReverseLabel(features) {
        if (!features || !features.length) return null;
        const priority = ["poi", "address", "place", "locality", "neighborhood", "district", "postcode"];
        for (let i = 0; i < priority.length; i++) {
            const t = priority[i];
            const match = features.find((f) => featureHasPlaceType(f, t) && f.place_name);
            if (match) return match.place_name;
        }
        return features[0].place_name || null;
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

        console.log("[DEBUG] Geocode status:", res.status, data);

        if (!res.ok) {
            console.error("[ERROR] Mapbox geocoding:", data.message || res.status);
            return null;
        }

        if (!data.features?.length) {
            // Fallback: try broader "place" if street address not found
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
            console.warn("[WARN] No features for", lng, lat);
            return null;
        }

        const f = data.features[0];
        const named = f.place_name || f.text || null;
        console.log("[INFO] Address:", named);
        return named;
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
});
</script>
</body>
</html>
