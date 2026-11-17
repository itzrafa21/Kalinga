{{-- Apply saved theme + cached access rights before paint to avoid flashes --}}
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

    function hasModule(session, moduleId) {
      if (!session || session.status === "disabled") return false;
      if (session.isOwner) return true;
      if (!moduleId) return true;
      if (moduleId === "users") return false;
      var rights = session.accessRights || {};
      var mod = rights[moduleId];
      if (!mod || typeof mod !== "object") return false;
      for (var key in mod) {
        if (Object.prototype.hasOwnProperty.call(mod, key) && mod[key] === true) return true;
      }
      return false;
    }

    try {
      var lastUid = localStorage.getItem("kalinga-org-session:lastAuthUid");
      if (!lastUid) return;
      var raw = localStorage.getItem("kalinga-org-session:" + lastUid);
      if (!raw) return;
      var session = JSON.parse(raw);
      if (!session || !session.orgId) return;

      // Hide owner-only Users link early for team accounts.
      document.documentElement.setAttribute(
        "data-org-owner",
        session.isOwner ? "1" : "0"
      );

      if (session.isOwner) return;

      if (session.status === "disabled") {
        document.documentElement.setAttribute("data-org-access-boot", "pending");
        window.location.replace("/organization/login");
        return;
      }

      var modules = ["missions", "history", "volunteers", "donations", "settings", "account"];
      for (var m = 0; m < modules.length; m++) {
        if (!hasModule(session, modules[m])) {
          document.documentElement.setAttribute("data-deny-" + modules[m], "1");
        }
      }

      // Hide main content until live rights confirm (stops flash of disabled pages/data).
      // Denied pages stay hidden here; JS then shows a centered Access Denied message.
      document.documentElement.setAttribute("data-org-access-boot", "pending");
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

  /* Team users: hide page body until live rights confirm (prevents flash of denied data). */
  html[data-org-access-boot="pending"] .org-main-content,
  html[data-org-access-boot="pending"] .org-main-content.main-content {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  html[data-org-owner="0"] #orgNavUsers {
    display: none !important;
  }
  html[data-org-owner="0"][data-deny-missions] .org-sidebar a[data-access-module="missions"],
  html[data-org-owner="0"][data-deny-history] .org-sidebar a[data-access-module="history"],
  html[data-org-owner="0"][data-deny-volunteers] .org-sidebar a[data-access-module="volunteers"],
  html[data-org-owner="0"][data-deny-donations] .org-sidebar a[data-access-module="donations"],
  html[data-org-owner="0"][data-deny-settings] .org-sidebar a[data-access-module="settings"],
  html[data-org-owner="0"][data-deny-account] .org-sidebar a[data-access-module="account"] {
    display: none !important;
  }
</style>
