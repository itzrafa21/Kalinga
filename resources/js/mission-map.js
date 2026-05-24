/**
 * Mapbox map + location search for mission create/edit forms.
 * Uses Mapbox Search Box API (supports POI: schools, malls, landmarks, etc.).
 * Requires mapbox-gl.js loaded globally before this module.
 */

const MAPBOX_TOKEN =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ||
    "pk.eyJ1Ijoia2FuZWVlY3Jhc2giLCJhIjoiY21nd2c4amVqMGMwMDJrc2R0ZXhxcTA2ZiJ9._ihHfQRKW2oW9wGup1yTNw";
const SEARCH_BOX_BASE = "https://api.mapbox.com/search/searchbox/v1";
const DEFAULT_CENTER = [123.9024, 10.2943];
const DEFAULT_ZOOM = 12;

let searchSessionToken = null;

function createSearchSessionToken() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSearchSessionToken() {
    if (!searchSessionToken) {
        searchSessionToken = createSearchSessionToken();
    }
    return searchSessionToken;
}

function resetSearchSession() {
    searchSessionToken = null;
}

function formatPinnedLabel(lat, lng, name) {
    if (name && String(name).trim()) return String(name).trim();
    return `Pinned location (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
}

function getFeatureProps(data) {
    if (!data) return {};
    return data.properties ? data.properties : data;
}

/** Saved/displayed location: establishment name for POIs, not street address. */
function formatLocationLabel(data) {
    const props = getFeatureProps(data);
    const featureType = props.feature_type;
    const name = String(props.name_preferred || props.name || "").trim();

    if (featureType === "poi" || featureType === "category") {
        return name || props.place_formatted || null;
    }

    if (name && featureType !== "address" && featureType !== "street") {
        return name;
    }

    return (
        props.full_address ||
        props.place_formatted ||
        props.address ||
        name ||
        null
    );
}

function formatFeatureLabel(feature) {
    return formatLocationLabel(feature);
}

function formatSuggestionTitle(suggestion) {
    const name = String(suggestion.name_preferred || suggestion.name || "").trim();
    if (name) return name;
    return suggestion.place_formatted || "Unknown place";
}

function formatSuggestionMeta(suggestion) {
    const parts = [];
    if (Array.isArray(suggestion.poi_category) && suggestion.poi_category.length) {
        parts.push(
            suggestion.poi_category
                .slice(0, 2)
                .map((c) => String(c).replace(/_/g, " "))
                .join(", ")
        );
    } else if (suggestion.feature_type) {
        parts.push(String(suggestion.feature_type).replace(/_/g, " "));
    }
    const addressLine =
        suggestion.address ||
        (suggestion.full_address &&
        !String(suggestion.full_address).startsWith(formatSuggestionTitle(suggestion))
            ? suggestion.full_address
            : "");
    if (addressLine) {
        parts.push(addressLine);
    } else if (suggestion.place_formatted) {
        parts.push(suggestion.place_formatted);
    }
    return parts.join(" · ");
}

function extractCoordinates(feature) {
    const props = feature?.properties || {};
    const coords = props.coordinates;
    if (coords?.longitude != null && coords?.latitude != null) {
        return { lng: coords.longitude, lat: coords.latitude };
    }
    const geometry = feature?.geometry?.coordinates;
    if (Array.isArray(geometry) && geometry.length >= 2) {
        return { lng: geometry[0], lat: geometry[1] };
    }
    return null;
}

function pickBestReverseFeature(features) {
    if (!features?.length) return null;
    const priority = ["poi", "address", "street", "place", "locality", "neighborhood"];
    for (const type of priority) {
        const match = features.find((f) => f.properties?.feature_type === type);
        if (match) return match;
    }
    return features[0];
}

async function reverseLookup(lng, lat) {
    const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        language: "en",
        limit: "5",
        country: "PH",
    });
    const url = `${SEARCH_BOX_BASE}/reverse?longitude=${lng}&latitude=${lat}&${params.toString()}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        console.error("[ERROR] Mapbox reverse lookup:", data.message || res.status);
        return null;
    }

    const best = pickBestReverseFeature(data.features);
    return best ? formatFeatureLabel(best) : null;
}

async function searchSuggestions(query, map) {
    const center = map?.getCenter?.() || { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] };
    const params = new URLSearchParams({
        q: query,
        access_token: MAPBOX_TOKEN,
        session_token: getSearchSessionToken(),
        language: "en",
        limit: "8",
        proximity: `${center.lng},${center.lat}`,
        country: "PH",
    });

    const url = `${SEARCH_BOX_BASE}/suggest?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        console.error("[ERROR] Mapbox search suggest:", data.message || res.status);
        return [];
    }

    return data.suggestions || [];
}

async function retrieveSuggestion(mapboxId) {
    const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        session_token: getSearchSessionToken(),
    });
    const url = `${SEARCH_BOX_BASE}/retrieve/${encodeURIComponent(mapboxId)}?${params.toString()}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        console.error("[ERROR] Mapbox search retrieve:", data.message || res.status);
        return null;
    }

    resetSearchSession();
    return data.features?.[0] || null;
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

    function renderSuggestions(suggestions) {
        if (!suggestions.length) {
            list.innerHTML =
                '<li class="map-location-suggestion map-location-suggestion--empty">No results found</li>';
            list.style.display = "block";
            return;
        }

        list.innerHTML = suggestions
            .map((suggestion, index) => {
                const title = formatSuggestionTitle(suggestion);
                const meta = formatSuggestionMeta(suggestion);
                const metaHtml = meta
                    ? `<div class="map-location-suggestion-meta">${escapeHtml(meta)}</div>`
                    : "";
                return `<li class="map-location-suggestion" role="option" data-index="${index}" data-mapbox-id="${escapeHtml(suggestion.mapbox_id || "")}">
                    <div class="map-location-suggestion-title">${escapeHtml(title)}</div>
                    ${metaHtml}
                </li>`;
            })
            .join("");

        list.style.display = "block";

        list.querySelectorAll(".map-location-suggestion[data-mapbox-id]").forEach((li) => {
            li.addEventListener("click", async () => {
                const mapboxId = li.dataset.mapboxId;
                const idx = parseInt(li.dataset.index, 10);
                const suggestion = suggestions[idx];
                if (!mapboxId) return;

                input.value = formatSuggestionTitle(suggestion);
                hideSuggestions();

                try {
                    const feature = await retrieveSuggestion(mapboxId);
                    if (!feature) return;

                    const coords = extractCoordinates(feature);
                    if (!coords) return;

                    const label =
                        formatLocationLabel(feature) ||
                        formatLocationLabel(suggestion);
                    map.flyTo({ center: [coords.lng, coords.lat], zoom: 16 });
                    await applyMapPoint(coords.lng, coords.lat, label);
                } catch (err) {
                    console.error("[ERROR] retrieving location:", err);
                }
            });
        });
    }

    input.addEventListener("focus", () => {
        if (!searchSessionToken) {
            getSearchSessionToken();
        }
    });

    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (q.length < 2) {
            hideSuggestions();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const suggestions = await searchSuggestions(q, map);
                renderSuggestions(suggestions);
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
        if (display) {
            const span = display.querySelector("span");
            const text = label || "No location pinned yet";
            const isEmpty = !label || text === "No location pinned yet";
            if (span) {
                span.textContent = isEmpty ? "No location pinned yet" : text;
            } else {
                display.textContent = text;
            }
            display.classList.toggle("location-pinned--empty", isEmpty);
        }
        if (searchEl && label && !label.startsWith("Pinned location")) {
            searchEl.value = label;
        }
    }

    function bindMarkerDrag(m) {
        m.on("dragend", async () => {
            const { lng, lat } = m.getLngLat();
            try {
                const picked = await reverseLookup(lng, lat);
                setLocationUI(formatPinnedLabel(lat, lng, picked), lat, lng);
            } catch (err) {
                console.error("[ERROR] reverseLookup (drag):", err);
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
                label = await reverseLookup(lng, lat);
            } catch (err) {
                console.error("[ERROR] reverseLookup:", err);
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
