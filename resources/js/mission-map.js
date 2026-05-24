/**
 * Mapbox map + location search for mission create/edit forms.
 * Requires mapbox-gl.js loaded globally before this module.
 */

const MAPBOX_TOKEN =
    "pk.eyJ1Ijoia2FuZWVlY3Jhc2giLCJhIjoiY21nd2c4amVqMGMwMDJrc2R0ZXhxcTA2ZiJ9._ihHfQRKW2oW9wGup1yTNw";
const DEFAULT_CENTER = [123.9024, 10.2943];
const DEFAULT_ZOOM = 12;

function formatPinnedLabel(lat, lng, name) {
    if (name && String(name).trim()) return String(name).trim();
    return `Pinned location (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
}

async function reverseGeocode(lng, lat) {
    const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
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
            access_token: MAPBOX_TOKEN,
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

async function forwardGeocode(query) {
    const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        language: "en",
        limit: "6",
        types: "address,place,poi,locality,neighborhood",
        proximity: `${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}`,
        country: "PH",
    });
    const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        params.toString();

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        console.error("[ERROR] Mapbox forward geocoding:", data.message || res.status);
        return [];
    }

    return data.features || [];
}

function initLocationSearch(map, applyMapPoint) {
    const input = document.getElementById("locationSearch");
    const list = document.getElementById("locationSuggestions");
    if (!input || !list) return;

    let debounceTimer = null;

    function hideSuggestions() {
        list.style.display = "none";
        list.innerHTML = "";
    }

    function renderSuggestions(features) {
        if (!features.length) {
            list.innerHTML =
                '<li class="map-location-suggestion map-location-suggestion--empty">No results found</li>';
            list.style.display = "block";
            return;
        }

        list.innerHTML = features
            .map((feature, index) => {
                const [lng, lat] = feature.center || [];
                const label = feature.place_name || feature.text || "Unknown place";
                return `<li class="map-location-suggestion" role="option" data-index="${index}" data-lng="${lng}" data-lat="${lat}">${escapeHtml(label)}</li>`;
            })
            .join("");

        list.style.display = "block";

        list.querySelectorAll(".map-location-suggestion[data-lng]").forEach((li) => {
            li.addEventListener("click", async () => {
                const lng = parseFloat(li.dataset.lng);
                const lat = parseFloat(li.dataset.lat);
                const idx = parseInt(li.dataset.index, 10);
                const feature = features[idx];
                const label = feature?.place_name || feature?.text || null;

                input.value = label || input.value;
                hideSuggestions();

                map.flyTo({ center: [lng, lat], zoom: 15 });
                await applyMapPoint(lng, lat, label);
            });
        });
    }

    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (q.length < 2) {
            hideSuggestions();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const features = await forwardGeocode(q);
                renderSuggestions(features);
            } catch (err) {
                console.error("[ERROR] location search:", err);
                hideSuggestions();
            }
        }, 300);
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideSuggestions();
    });

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function initMissionLocationMap() {
    if (typeof mapboxgl === "undefined") {
        console.error("[ERROR] mapboxgl is not loaded");
        return;
    }

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pixelRatio: window.devicePixelRatio || 1,
        antialias: true,
    });

    let marker = null;

    function setLocationUI(label, lat, lng) {
        const locationEl = document.getElementById("location");
        const latEl = document.getElementById("latitude");
        const lngEl = document.getElementById("longitude");
        const display = document.getElementById("locationDisplay");
        const searchEl = document.getElementById("locationSearch");

        if (locationEl) locationEl.value = label;
        if (latEl) latEl.value = Number(lat).toFixed(6);
        if (lngEl) lngEl.value = Number(lng).toFixed(6);
        if (display) display.textContent = label;
        if (searchEl && label && !label.startsWith("Pinned location")) {
            searchEl.value = label;
        }
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
        marker = new mapboxgl.Marker({ draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);
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

    async function restoreMissionMapPin() {
        const existingLocation = document.getElementById("location")?.value?.trim();
        const existingLat = parseFloat(document.getElementById("latitude")?.value);
        const existingLng = parseFloat(document.getElementById("longitude")?.value);

        if (!Number.isFinite(existingLat) || !Number.isFinite(existingLng)) return;

        const label = existingLocation || null;
        await applyMapPoint(existingLng, existingLat, label);
        map.flyTo({ center: [existingLng, existingLat], zoom: 14 });
    }

    map.on("load", () => {
        map.resize();
        window.addEventListener("resize", () => map.resize());
        restoreMissionMapPin();
    });

    map.on("error", (e) => console.error("[ERROR] Map error:", e));

    map.on("click", (e) => {
        applyMapPoint(e.lngLat.lng, e.lngLat.lat, null);
    });

    initLocationSearch(map, applyMapPoint);
    window.restoreMissionMapPin = restoreMissionMapPin;
}

document.addEventListener("DOMContentLoaded", initMissionLocationMap);
