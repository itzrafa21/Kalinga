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
    color: #86efac !important;
  }
  html[data-theme="dark"] .admin-topbar .org-topbar-theme-btn:hover {
    background: #1f2937 !important;
    color: #bbf7d0 !important;
  }
</style>
