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

      var modules = ["missions", "history", "volunteers", "donations", "account"];
      for (var m = 0; m < modules.length; m++) {
        if (!hasModule(session, modules[m])) {
          document.documentElement.setAttribute("data-deny-" + modules[m], "1");
        }
      }

      // Only hide when cached rights deny this route. Allowed pages stay visible
      // so History/Missions lists can paint from cache immediately.
      function moduleForPath(path) {
        if (path.indexOf("/missions/history") === 0) return "history";
        if (path.indexOf("/organization/volunteers") === 0) return "volunteers";
        if (path.indexOf("/donation") === 0) return "donations";
        if (
          path.indexOf("/organization/profile") === 0 ||
          path.indexOf("/organization/settings") === 0
        ) {
          return "account";
        }
        if (path.indexOf("/organization/users") === 0) return "users";
        if (
          path.indexOf("/missions") === 0 ||
          path.indexOf("/organization/dashboard") === 0
        ) {
          return "missions";
        }
        return "";
      }
      var pathMod = moduleForPath(window.location.pathname || "");
      if (pathMod === "users" || (pathMod && !hasModule(session, pathMod))) {
        document.documentElement.setAttribute("data-org-access-boot", "pending");
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
  html[data-org-owner="0"][data-deny-account] .org-sidebar a[data-access-module="account"] {
    display: none !important;
  }
</style>
