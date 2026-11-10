{{-- Apply saved theme before paint to avoid a light flash --}}
<script>
  (function () {
    try {
      var theme = localStorage.getItem("kalinga-org-theme");
      if (theme === "dark") {
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
  html[data-theme="dark"],
  html[data-theme="dark"] body.org-app {
    background: #0b1220 !important;
    color: #e2e8f0 !important;
  }
  html[data-theme="dark"] .org-sidebar {
    background: #111827 !important;
  }
  html[data-theme="dark"] .org-main-content,
  html[data-theme="dark"] .org-main-content.main-content {
    background: #0b1220 !important;
    color: #e2e8f0 !important;
  }
</style>
