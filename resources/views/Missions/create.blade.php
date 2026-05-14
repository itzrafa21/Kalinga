<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Mission - Kalinga</title>

    @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/mission-create.js'])
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Mapbox CSS -->
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
    <link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.1/mapbox-gl-geocoder.css" rel="stylesheet" />

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
                                <input type="text" id="type" class="form-control" required
                                    placeholder="e.g. Medical, Outreach, or your own category"
                                    maxlength="120"
                                    autocomplete="off">
                            </div>

                            <div class="form-group">
                                <label for="locationInput">Location</label>
                                <input type="text" id="locationInput" class="form-control" placeholder="Search for a location..." value="">                                <ul id="suggestions" class="list-group mt-1"></ul>

                                <input type="hidden" id="location" name="location">
                                <input type="hidden" id="latitude" name="latitude">
                                <input type="hidden" id="longitude" name="longitude">

                                <!-- Add proper map container with data attributes -->
                                <div id="map" 
                                     data-mapbox-token="pk.eyJ1Ijoia2FuZWVlY3Jhc2giLCJhIjoiY21nd2c4amVqMGMwMDJrc2R0ZXhxcTA2ZiJ9._ihHfQRKW2oW9wGup1yTNw"
                                     style="position: relative; overflow: hidden;">
                                </div>
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

    <!-- Mapbox JS -->
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
    <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.1/mapbox-gl-geocoder.min.js"></script>

    <script>
    document.addEventListener("DOMContentLoaded", function() {
        mapboxgl.accessToken = "pk.eyJ1Ijoia2FuZWVlY3Jhc2giLCJhIjoiY21nd2c4amVqMGMwMDJrc2R0ZXhxcTA2ZiJ9._ihHfQRKW2oW9wGup1yTNw";

        const mapContainer = document.getElementById("map");
        if (!mapContainer) return;

        // Initialize Mapbox
        const map = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/mapbox/streets-v11",
            center: [123.9024, 10.2943], // Better center for Cebu
            zoom: 12, // Increased zoom for better detail
            // Add these properties to prevent blurriness
            pixelRatio: window.devicePixelRatio || 1, // Handle high-DPI displays
            antialias: true, // Enable antialiasing
            preserveDrawingBuffer: true, // Prevent canvas clearing issues
            // Add render world copies for better performance
            renderWorldCopies: false,
            // Optimize for performance
            optimizeForTerrain: false,
            // Better projection
            projection: 'mercator'
        });

        // Add map load event to ensure proper rendering
        map.on('load', function() {
            console.log('[SUCCESS] Map loaded successfully');
            // Force a resize to ensure proper rendering
            map.resize();
            
            // Add event listener for window resize
            window.addEventListener('resize', function() {
                map.resize();
            });
        });

        // Add error handling
        map.on('error', function(e) {
            console.error('[ERROR] Map error:', e);
        });

        // Add style load event
        map.on('style.load', function() {
            console.log('[SUCCESS] Map style loaded');
            map.resize(); // Force resize after style load
        });

        let marker = null;

        const MAP_LOCATION_FALLBACK = "Selected map location";

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
            const path = encodeURIComponent(lng + "," + lat);
            const url =
                "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
                path +
                ".json?access_token=" +
                encodeURIComponent(mapboxgl.accessToken) +
                "&limit=10&types=poi,address,place,locality,neighborhood,district,postcode";
            const res = await fetch(url);
            const data = await res.json();
            return pickBestReverseLabel(data.features);
        }

        function resolveMapLocationLabel(geocodeResult) {
            if (geocodeResult && String(geocodeResult).trim()) return geocodeResult;
            const prev = document.getElementById("locationInput").value.trim();
            if (prev) return document.getElementById("locationInput").value;
            return MAP_LOCATION_FALLBACK;
        }

        function bindMarkerDrag(m) {
            m.on("dragend", async () => {
                const { lng, lat } = m.getLngLat();
                document.getElementById("latitude").value = String(lat);
                document.getElementById("longitude").value = String(lng);
                try {
                    const picked = await reverseGeocode(lng, lat);
                    const label = resolveMapLocationLabel(picked);
                    document.getElementById("location").value = label;
                    document.getElementById("locationInput").value = label;
                } catch (err) {
                    console.error("[ERROR] reverseGeocode (drag):", err);
                    const label = resolveMapLocationLabel(null);
                    document.getElementById("location").value = label;
                    document.getElementById("locationInput").value = label;
                }
            });
        }

        async function applyMapPoint(lng, lat, displayLabel) {
            document.getElementById("latitude").value = String(lat);
            document.getElementById("longitude").value = String(lng);
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
                label = resolveMapLocationLabel(label);
            }
            document.getElementById("location").value = label;
            document.getElementById("locationInput").value = label;
        }

        map.on("click", (e) => {
            applyMapPoint(e.lngLat.lng, e.lngLat.lat, null);
        });

        const locationInput = document.getElementById("locationInput");
        const suggestionsBox = document.getElementById("suggestions");

        const GEOCODE_TYPES = "poi,address,place,locality,neighborhood,district,postcode";
        const CEBU_BBOX = "123.12,9.50,124.22,11.38";
        const CEBU_PROXIMITY = "123.9024,10.2943";

        function buildCebuGeocodeUrl(q) {
            const params = new URLSearchParams({
                access_token: mapboxgl.accessToken,
                autocomplete: "true",
                limit: "15",
                country: "ph",
                types: GEOCODE_TYPES,
                proximity: CEBU_PROXIMITY,
                bbox: CEBU_BBOX,
            });
            return (
                "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
                encodeURIComponent(q) +
                ".json?" +
                params.toString()
            );
        }

        let locationSearchDebounce = null;
        let locationSearchAbort = null;

        locationInput.addEventListener("blur", function() {
            if (this.value.trim()) {
                document.getElementById("location").value = this.value;
            }
        });

        locationInput.addEventListener("input", function() {
            const trimmed = this.value.trim();
            if (trimmed.length < 3) {
                if (locationSearchAbort) {
                    locationSearchAbort.abort();
                    locationSearchAbort = null;
                }
                clearTimeout(locationSearchDebounce);
                suggestionsBox.style.display = "none";
                return;
            }
            clearTimeout(locationSearchDebounce);
            locationSearchDebounce = setTimeout(function() {
                void runLocationSearch();
            }, 280);
        });

        async function runLocationSearch() {
            const query = locationInput.value.trim();
            if (query.length < 3) return;

            if (locationSearchAbort) locationSearchAbort.abort();
            const ac = new AbortController();
            locationSearchAbort = ac;

            console.log("[INFO] Searching for:", query);

            try {
                const searchStrategies = [
                    buildCebuGeocodeUrl(query),
                    buildCebuGeocodeUrl(query + ", Cebu, Philippines"),
                ];

                let allResults = [];

                for (const url of searchStrategies) {
                    try {
                        console.log("[INFO] Trying search strategy:", url);
                        const res = await fetch(url, { signal: ac.signal });
                        const data = await res.json();
                        if (data.features) {
                            allResults = allResults.concat(data.features);
                            console.log("[SUCCESS] Found", data.features.length, "results from strategy");
                        }
                    } catch (error) {
                        if (error.name === "AbortError") return;
                        console.log("[ERROR] Search strategy failed:", error);
                    }
                }

                const uniqueResults = allResults
                    .filter(
                        (place, index, self) =>
                            index === self.findIndex((p) => p.place_name === place.place_name)
                    )
                    .slice(0, 15);

                console.log("[INFO] Total unique results:", uniqueResults.length);

                suggestionsBox.innerHTML = "";

                if (uniqueResults.length > 0) {
                    console.log("[INFO] Showing API results");
                    uniqueResults.forEach((place) => {
                        const li = document.createElement("li");
                        const categoryIcon = getCategoryIcon(place.properties?.category);
                        li.innerHTML = `${categoryIcon} <strong>${place.text}</strong><br><small>${place.place_name}</small>`;
                        li.classList.add("list-group-item");

                        li.addEventListener("click", () => {
                            const lng = place.center[0];
                            const lat = place.center[1];
                            map.flyTo({ center: place.center, zoom: 15 });
                            applyMapPoint(lng, lat, place.place_name);
                            suggestionsBox.style.display = "none";
                        });
                        suggestionsBox.appendChild(li);
                    });
                }

                if (uniqueResults.length === 0) {
                    const li = document.createElement("li");
                    li.innerHTML = "No locations found. Try a different search term.";
                    li.classList.add("list-group-item", "text-muted");
                    suggestionsBox.appendChild(li);
                }

                suggestionsBox.style.display = "block";
            } catch (err) {
                if (err.name === "AbortError") return;
                console.error("Geocoding error:", err);
                suggestionsBox.innerHTML =
                    '<li class="list-group-item text-danger">Error searching locations. Please try again.</li>';
                suggestionsBox.style.display = "block";
            }
        }

        // Helper function to get category icons
        function getCategoryIcon(category) {
            const icons = {
                'school': '<i class="bi bi-mortarboard"></i>',
                'hospital': '<i class="bi bi-hospital"></i>',
                'restaurant': '<i class="bi bi-cup-straw"></i>',
                'shopping': '<i class="bi bi-bag"></i>',
                'government': '<i class="bi bi-bank"></i>',
                'religious': '<i class="bi bi-building"></i>',
                'tourism': '<i class="bi bi-bank"></i>',
                'business': '<i class="bi bi-building"></i>',
                'default': '<i class="bi bi-geo-alt"></i>'
            };
            return icons[category] || icons.default;
        }

        // Hide suggestions when clicking outside
        document.addEventListener("click", function(e) {
            if (!locationInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = "none";
            }
        });
    });
    </script>
</body>
</html>
