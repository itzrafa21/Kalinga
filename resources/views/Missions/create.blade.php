<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Mission - Kalinga</title>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    @vite([
        'resources/css/app.css',
        'resources/js/app.js',
        'resources/js/auth-guard.js',
        'resources/js/organization-sidebar.js',
        'resources/js/organization-logout.js',
        'resources/js/mission-create.js',
    ])
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
    @include('partials.org-layout-styles')

    <style>
        .create-mission-page {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0 0 2.5rem;
            min-width: 0;
        }

        .create-mission-page .main-container {
            width: 100%;
            max-width: 100%;
            padding-left: 0;
            padding-right: 0;
            overflow-x: hidden;
        }

        .create-mission-hero {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .create-mission-back {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #fff;
            color: #1e3a2f;
            text-decoration: none;
            transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }

        .create-mission-back:hover {
            background: #f0fdf4;
            border-color: #86efac;
            color: #166534;
            transform: translateX(-2px);
        }

        .create-mission-hero-text h1 {
            margin: 0 0 0.35rem;
            font-size: 1.65rem;
            font-weight: 700;
            color: #1e3a2f;
            letter-spacing: -0.02em;
        }

        .create-mission-hero-text p {
            margin: 0;
            font-size: 0.95rem;
            color: #64748b;
            line-height: 1.5;
        }

        .create-mission-hero-text {
            flex: 1;
            min-width: 0;
        }

        .create-mission-form {
            display: block;
        }

        .create-mission-panel {
            background: #fff;
            border: 1px solid #e8ecef;
            border-radius: 14px;
            box-shadow: 0 1px 3px rgba(15, 36, 25, 0.06);
            overflow: hidden;
        }

        .form-block {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #eef2f0;
        }

        .form-block-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0 0 0.65rem;
            font-size: 1rem;
            font-weight: 600;
            color: #1e3a2f;
        }

        .form-block-title i {
            color: #15803d;
            font-size: 1.05rem;
        }

        .create-mission-form .form-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 0.4rem;
        }

        .create-mission-form .form-control,
        .create-mission-form .form-select {
            border-radius: 10px;
            border-color: #dde3e8;
            padding: 0.55rem 0.85rem;
            font-size: 0.95rem;
        }

        .create-mission-form .form-control:focus,
        .create-mission-form .form-select:focus {
            border-color: #4ade80;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
        }

        .create-mission-form textarea.form-control {
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

        .points-preview i {
            font-size: 0.95rem;
        }

        .form-block .map-search-wrap {
            position: relative;
            margin-bottom: 0.75rem;
        }

        .form-block #map,
        .form-block .map-wrap {
            margin-top: 0.5rem;
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

        .map-location-suggestion {
            padding: 0.7rem 1rem;
            cursor: pointer;
            border-bottom: none;
        }

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

        .map-location-suggestion:hover {
            background: #f0fdf4;
        }

        .map-location-suggestion--empty {
            cursor: default;
            color: #64748b;
        }

        .map-location-suggestion--empty:hover {
            background: transparent;
        }

        #map {
            height: 320px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid #dde3e8;
            overflow: hidden;
            image-rendering: -webkit-optimize-contrast;
            transform: translateZ(0);
        }

        .map-wrap {
            position: relative;
            width: 100%;
            max-width: 100%;
            margin-top: 0.5rem;
            min-width: 0;
        }

        .map-wrap #map,
        .form-block > #map,
        .form-block .map-wrap #map {
            width: 100%;
            max-width: 100%;
        }

        .map-wrap #map {
            margin-top: 0;
        }

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
            padding: 0.65rem 0.75rem;
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

        .mission-image-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
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

        .mission-image-actions .btn {
            border-radius: 10px;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.45rem 1rem;
        }

        .form-panel-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
            gap: 0.35rem;
            padding: 0.5rem 0.75rem;
            background: #f8faf9;
            border-top: 1px solid #eef2f0;
        }

        .form-panel-actions .btn {
            border-radius: 8px;
            font-size: 0.85rem;
            /* border 1px solid #275735; */
            font-weight: 600;
            padding: 0.4rem 0.85rem;
            min-width: 0;
            line-height: 1.25;
        }

        .form-panel-actions .btn i {
            font-size: 0.9rem;
        }

        .volunteers-input {
            width: 100%;
            max-width: 100%;
        }

        .form-block-split .form-split-col {
            min-width: 0;
        }

        @media (min-width: 768px) {
            .form-block-split .form-split-col + .form-split-col {
                border-left: 1px solid #eef2f0;
                padding-left: 1rem;
            }

            .form-block-split .form-split-col:first-child {
                padding-right: 1rem;
            }
        }

        .btn-create-mission {
            background: #275735;
            border-color: #22a447;
            color: #fff;
        }

        .btn-create-mission:hover {
            background: #22a447;
            border-color: #1d8f3c;
            color: #fff;
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

        .success-modal-confirm:hover {
            background: #1d8f3c;
        }

        .mapboxgl-canvas {
            image-rendering: -webkit-optimize-contrast !important;
        }

        @media (max-width: 992px) {
            .org-main-content:has(.create-mission-page) {
                padding: 1.25rem 1rem 1.75rem;
            }
        }

        @media (max-width: 768px) {
            .org-main-content:has(.create-mission-page) {
                padding: 1rem 0.75rem 1.5rem;
            }

            .create-mission-hero {
                flex-direction: row;
                align-items: center;
                gap: 0.75rem;
            }

            .create-mission-hero-text h1 {
                font-size: 1.35rem;
            }

            .create-mission-hero-text p {
                font-size: 0.88rem;
            }

            .form-block {
                padding: 0.65rem 0.75rem;
            }

            .form-block-split .form-split-col + .form-split-col {
                border-left: none;
                padding-left: 0;
                padding-top: 0.75rem;
                margin-top: 0.15rem;
                border-top: 1px solid #eef2f0;
            }

            .form-block-split .form-split-col:first-child {
                padding-right: 0;
            }

            .form-block-title {
                font-size: 0.95rem;
            }

            .form-panel-actions {
                flex-direction: column-reverse;
                align-items: stretch;
                padding: 0.45rem 0.65rem;
                gap: 0.3rem;
            }

            .form-panel-actions .btn {
                width: 100%;
                min-width: 0;
                padding: 0.45rem 0.75rem;
            }

            .volunteers-input {
                max-width: 100%;
            }

            .mission-image-preview {
                max-width: 100%;
            }

            .mission-image-actions {
                width: 100%;
            }

            .mission-image-actions .btn {
                flex: 1 1 auto;
                min-width: min(100%, 140px);
            }

            .points-preview {
                max-width: 100%;
                flex-wrap: wrap;
            }

            .map-pin-hint {
                left: 8px;
                right: 8px;
                top: 8px;
                max-width: calc(100% - 16px);
                font-size: 11px;
                padding: 6px 10px;
            }

            #map {
                height: 260px;
            }
        }

        @media (max-width: 576px) {
            .create-mission-hero {
                flex-direction: column;
                align-items: flex-start;
            }

            .create-mission-back {
                width: 38px;
                height: 38px;
            }

            .create-mission-hero-text h1 {
                font-size: 1.2rem;
            }

            .create-mission-panel {
                border-radius: 12px;
            }

            .option-card {
                padding: 0.6rem 0.65rem;
            }

            .mission-image-container {
                padding: 0.65rem;
            }

            .mission-image-preview {
                height: 140px;
            }

            #map {
                height: 220px;
                border-radius: 10px;
            }

            .map-search-wrap #locationSearch {
                font-size: 16px;
            }

            .create-mission-form .form-control,
            .create-mission-form .form-select {
                font-size: 16px;
            }
        }
    </style>
</head>
<body class="org-app">
@include('partials.org-sidebar', ['activeNav' => 'missions'])
<main class="org-main-content">
    <div class="container-fluid main-container">
        <div class="create-mission-page">
            <header class="create-mission-hero">
                <a href="/organization/dashboard" class="create-mission-back" aria-label="Back to dashboard">
                    <i class="bi bi-arrow-left"></i>
                </a>
                <div class="create-mission-hero-text">
                    <h1>Create mission</h1>
                    <p>Fill in the details below. Your mission will be submitted for admin approval before volunteers can see it.</p>
                </div>
            </header>

            <form id="createMissionForm" class="create-mission-form">
                @csrf

                <div class="create-mission-panel">
                    <div class="form-block" aria-labelledby="section-basics">
                        <h2 class="form-block-title" id="section-basics">
                            <i class="bi bi-card-text" aria-hidden="true"></i> Enter Mission Details
                        </h2>
                        <div class="mb-3">
                            <label for="name" class="form-label">Mission name</label>
                            <input type="text" id="name" class="form-control" placeholder="e.g. Coastal cleanup drive" required>
                        </div>
                        <div class="mb-0">
                            <label for="description" class="form-label">Description</label>
                            <textarea id="description" class="form-control" rows="4" placeholder="Goals, tasks, what volunteers should bring…" required></textarea>
                        </div>
                    </div>

                    <div class="form-block" aria-labelledby="section-schedule">
                        <h2 class="form-block-title" id="section-schedule">
                            <i class="bi bi-calendar-event" aria-hidden="true"></i> Schedule
                        </h2>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="date" class="form-label">Start date</label>
                                <input type="date" id="date" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label for="start_time" class="form-label">Start time</label>
                                <input type="time" id="start_time" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label for="end_date" class="form-label">End date</label>
                                <input type="date" id="end_date" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label for="end_time" class="form-label">End time</label>
                                <input type="time" id="end_time" class="form-control" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-block form-block-split">
                        <div class="row g-4">
                            <div class="col-md-6 form-split-col" aria-labelledby="section-type">
                                <h2 class="form-block-title" id="section-type">
                                    <i class="bi bi-tag" aria-hidden="true"></i> Mission type
                                </h2>
                                <label for="type" class="form-label">Type</label>
                                <select id="type" class="form-select" required>
                                    <option value="" disabled selected>Loading mission types…</option>
                                </select>
                                <p id="missionPointsPreview" class="points-preview mb-0">
                                    <i class="bi bi-star-fill" aria-hidden="true"></i>
                                    <span>Select a type and schedule to see earned points</span>
                                </p>
                            </div>
                            <div class="col-md-6 form-split-col" aria-labelledby="section-volunteers">
                                <h2 class="form-block-title" id="section-volunteers">
                                    <i class="bi bi-people" aria-hidden="true"></i> Volunteers
                                </h2>
                                <label for="volunteers" class="form-label">Volunteers needed</label>
                                <input type="number" id="volunteers" class="form-control volunteers-input" min="1" placeholder="e.g. 10" required>
                                <div class="option-card mt-3">
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" id="autoAcceptVolunteers" role="switch">
                                        <label class="form-check-label" for="autoAcceptVolunteers">Auto-accept volunteers</label>
                                    </div>
                                    <p class="text-muted small mb-0 mt-2">When enabled, new applications are approved automatically. When off, you review each applicant on the Volunteers page.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-block" aria-labelledby="section-location">
                        <h2 class="form-block-title" id="section-location">
                            <i class="bi bi-geo-alt" aria-hidden="true"></i> Set location
                        </h2>
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
                    </div>

                    <div class="form-block" aria-labelledby="section-image">
                        <h2 class="form-block-title" id="section-image">
                            <i class="bi bi-image" aria-hidden="true"></i> Upload poster
                        </h2>
                        <div class="mission-image-container" id="missionImageContainer">
                            <div class="mission-image-preview" id="missionImagePreview">
                                <span id="missionImagePlaceholder"><i class="bi bi-camera"></i></span>
                            </div>
                            <div class="mission-image-actions">
                                <input type="file" id="missionImageInput" accept="image/*" hidden>
                                <button type="button" class="btn btn-outline-success" onclick="document.getElementById('missionImageInput').click()">
                                    <i class="bi bi-upload"></i> Upload image
                                </button>
                                <button type="button" class="btn btn-outline-danger" id="removeMissionImage" hidden>
                                    <i class="bi bi-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="form-panel-actions">
                        <button type="button" class="btn btn-light" onclick="window.location.href='/organization/dashboard'">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-create-mission">
                            <i class="bi bi-send"></i> Submit mission
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</main>

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

<script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
@vite(['resources/js/mission-map.js'])
</body>
</html>
