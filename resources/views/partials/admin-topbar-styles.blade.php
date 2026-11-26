{{-- Match organization topbar look inside the admin shell --}}
<script>
  (function () {
    try {
      if (localStorage.getItem("kalinga-org-theme") === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    } catch (e) {}
  })();
</script>
<style>
  html[data-theme="dark"] {
    color-scheme: dark;
  }
  .admin-topbar.org-topbar {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    z-index: 10;
    height: 65px;
    background: #ffffff;
    color: #166534;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1.5rem;
    box-sizing: border-box;
    flex-shrink: 0;
  }
  .admin-topbar .org-topbar-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #166534;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
  }
  .admin-topbar a.org-topbar-title:hover {
    color: #14532d;
  }
  .admin-topbar-end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .admin-topbar .org-topbar-theme-btn {
    margin-left: 0;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #166534;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .admin-topbar .org-topbar-theme-btn:hover {
    background: #f0fdf4;
    color: #14532d;
  }
  .admin-topbar .org-topbar-theme-btn i {
    font-size: 1.25rem;
    line-height: 1;
  }
  .admin-topbar .org-topbar-theme-btn .org-theme-icon-sun {
    color: #ca8a04;
  }
  html[data-theme="dark"] .admin-topbar.org-topbar {
    background: #111827 !important;
    border-bottom-color: #1f2937 !important;
    color: #86efac !important;
  }
  html[data-theme="dark"] .admin-topbar .org-topbar-title {
    color: #86efac !important;
  }
  html[data-theme="dark"] .admin-topbar .org-topbar-theme-btn {
    color: #fbbf24 !important;
  }
  html[data-theme="dark"] .admin-topbar .org-topbar-theme-btn:hover {
    background: rgba(251, 191, 36, 0.12) !important;
    color: #fde68a !important;
  }
  html[data-theme="dark"] .admin-topbar .org-theme-icon-sun {
    color: #fbbf24 !important;
  }

  /* ===== Uniform Admin UI aligned with Organization UI ===== */
  body.admin-app {
    font-family: 'Poppins', Arial, sans-serif;
  }
  html:not([data-theme="dark"]) body.admin-app,
  html:not([data-theme="dark"]) body.admin-app .main,
  html:not([data-theme="dark"]) body.admin-app .content {
    background: #f0f2f5;
    color: #333;
  }
  body.admin-app .sidebar {
    width: 210px;
    min-width: 210px;
    border-right: 1px solid #eaecef;
  }
  html:not([data-theme="dark"]) body.admin-app .sidebar {
    background: #ffffff;
  }
  body.admin-app .sidebar .nav-item {
    font-weight: 500;
    font-size: 13px;
    padding: 9px 11px;
    border-radius: 8px;
    gap: 9px;
  }
  body.admin-app .sidebar .sb-section {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #c8c8c8;
  }
  body.admin-app .sidebar .logout-btn {
    width: 100%;
    padding: 9px 11px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    gap: 9px;
    transition: background 0.12s, color 0.12s;
  }
  html:not([data-theme="dark"]) body.admin-app .sidebar .logout-btn {
    color: #666;
  }
  html:not([data-theme="dark"]) body.admin-app .sidebar .logout-btn:hover {
    background: #f4f5f7;
    color: #222;
  }

  /* Stat cards matching Organization Dashboard */
  body.admin-app .stat-card,
  body.admin-app .settlement-stat {
    position: relative;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 1.15rem 1.25rem;
  }
  html:not([data-theme="dark"]) body.admin-app .stat-card,
  html:not([data-theme="dark"]) body.admin-app .settlement-stat {
    background: #ffffff;
    border: 1px solid #eee;
  }
  body.admin-app .stat-card .stat-icon {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(40, 167, 69, 0.35);
    background: rgba(40, 167, 69, 0.08);
    color: #28a745;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    margin-bottom: 0;
  }
  body.admin-app .stat-card .stat-val,
  body.admin-app .settlement-stat .value {
    font-size: 1.85rem;
    font-weight: 700;
    line-height: 1.2;
    padding-right: 48px;
  }
  html:not([data-theme="dark"]) body.admin-app .stat-card .stat-val,
  html:not([data-theme="dark"]) body.admin-app .settlement-stat .value {
    color: #111827;
  }
  body.admin-app .stat-card .stat-label,
  body.admin-app .settlement-stat .label {
    font-size: 0.85rem;
    font-weight: 500;
    margin-top: 0.35rem;
  }
  html:not([data-theme="dark"]) body.admin-app .stat-card .stat-label,
  html:not([data-theme="dark"]) body.admin-app .settlement-stat .label {
    color: #374151;
  }

  /* Cards, panels, and charts matching Organization UI */
  body.admin-app .admin-card,
  body.admin-app .chart-card,
  body.admin-app .section-panel {
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(56, 107, 87, 0.08);
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card,
  html:not([data-theme="dark"]) body.admin-app .chart-card,
  html:not([data-theme="dark"]) body.admin-app .section-panel {
    background: #ffffff;
    border: 1px solid #d8e8df;
  }
  body.admin-app .admin-card .card-header,
  body.admin-app .section-head {
    font-weight: 600;
    border-radius: 12px 12px 0 0;
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card .card-header,
  html:not([data-theme="dark"]) body.admin-app .section-head {
    background: #ffffff;
    border-bottom: 1px solid #e8f0ec;
    color: #1e3a2f;
  }
  html:not([data-theme="dark"]) body.admin-app .chart-title,
  html:not([data-theme="dark"]) body.admin-app .section-title {
    color: #1e3a2f;
    font-weight: 600;
  }

  /* Tables matching Organization table header & dividers */
  body.admin-app .admin-card .table-responsive {
    border-radius: 12px;
    overflow-x: auto;
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card .table-responsive {
    border: 1px solid #d8e8df;
  }
  body.admin-app .admin-card .table {
    margin-bottom: 0;
    border-collapse: collapse;
  }
  body.admin-app .admin-card .table thead th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.03em;
    padding: 12px 14px;
    white-space: nowrap;
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card .table thead th {
    background: #386b57;
    color: #ffffff;
    border-bottom: 2px solid #163d30;
  }
  body.admin-app .admin-card .table tbody td {
    font-size: 0.85rem;
    vertical-align: middle;
    padding: 10px 12px;
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card .table tbody td {
    color: #374151;
    border-bottom: 1px solid #c5d9ce;
    background: #ffffff;
  }
  html:not([data-theme="dark"]) body.admin-app .admin-card .table tbody tr:hover td {
    background: #f0fdf4;
  }

  /* Primary buttons, headers & inputs aligned to Organization green palette */
  body.admin-app .btn-admin,
  body.admin-app .btn-save-all,
  body.admin-app .org-details-modal__close-btn,
  body.admin-app .approve-modal__btn {
    background: #275735;
    border-color: #275735;
    color: #ffffff;
    border-radius: 8px;
    font-weight: 600;
  }
  body.admin-app .btn-admin:hover,
  body.admin-app .btn-save-all:hover,
  body.admin-app .org-details-modal__close-btn:hover,
  body.admin-app .approve-modal__btn:hover {
    background: #1e4529;
    border-color: #1e4529;
    color: #ffffff;
  }
  html:not([data-theme="dark"]) body.admin-app .org-page__header {
    background: #386b57;
    color: #ffffff;
  }
  body.admin-app .search-box,
  body.admin-app .filter-dropdown {
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
  }
  html:not([data-theme="dark"]) body.admin-app .search-box,
  html:not([data-theme="dark"]) body.admin-app .filter-dropdown {
    border: 1px solid #ddd;
    background: #ffffff;
  }
  html:not([data-theme="dark"]) body.admin-app .search-box:focus,
  html:not([data-theme="dark"]) body.admin-app .filter-dropdown:focus {
    border-color: #386b57;
    box-shadow: 0 0 0 3px rgba(56, 107, 87, 0.15);
    outline: none;
  }
</style>
