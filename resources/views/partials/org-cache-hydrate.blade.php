{{-- Restores org table/stats from sessionStorage before module JS runs (avoids loading flash). --}}
<script>
(function () {
  var P = "kalinga-org:";
  var uid = sessionStorage.getItem(P + "lastUid");
  if (!uid) return;

  function readPayload(key) {
    try {
      var raw = sessionStorage.getItem(P + uid + ":" + key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      return entry && entry.payload !== undefined ? entry.payload : null;
    } catch (e) {
      return null;
    }
  }

  function isLoadingHtml(html) {
    if (!html || typeof html !== "string") return true;
    var h = html.toLowerCase();
    return (
      h.indexOf("missions-loading") !== -1 ||
      h.indexOf("loading volunteers") !== -1 ||
      h.indexOf("loading missions") !== -1
    );
  }

  var missionsBody = document.getElementById("missionsBody");
  var dash = readPayload("dashboard");
  if (dash && missionsBody) {
    if (dash.tableHtml && !isLoadingHtml(dash.tableHtml)) {
      missionsBody.innerHTML = dash.tableHtml;
    }
    if (dash.stats) {
      var totalEl = document.getElementById("totalMissions");
      var ongoingEl = document.getElementById("ongoingMissions");
      var pendingEl = document.getElementById("pendingMissions");
      if (totalEl && dash.stats.total != null) totalEl.textContent = String(dash.stats.total);
      if (ongoingEl && dash.stats.ongoing != null) ongoingEl.textContent = String(dash.stats.ongoing);
      if (pendingEl && dash.stats.pending != null) pendingEl.textContent = String(dash.stats.pending);
    }
  }

  var profile = readPayload("profile");
  if (profile && profile.stats && !missionsBody) {
    var pTotal = document.getElementById("totalMissions");
    var pActive = document.getElementById("activeMissions");
    var pVol = document.getElementById("totalVolunteers");
    if (pTotal && profile.stats.total != null) pTotal.textContent = String(profile.stats.total);
    if (pActive && profile.stats.active != null) pActive.textContent = String(profile.stats.active);
    if (pVol && profile.stats.volunteers != null) pVol.textContent = String(profile.stats.volunteers);
  }

  // History: same as missions/volunteers — restore list before module JS runs.
  var hist = readPayload("history-v2") || readPayload("history");
  if (hist) {
    if (hist.stats) {
      var completedEl = document.getElementById("totalCompletedMissions");
      var monthEl = document.getElementById("thisMonthMissions");
      var helpedEl = document.getElementById("totalVolunteersHelped");
      if (completedEl && hist.stats.totalCompleted != null) {
        completedEl.textContent = String(hist.stats.totalCompleted);
      }
      if (monthEl && hist.stats.thisMonth != null) {
        monthEl.textContent = String(hist.stats.thisMonth);
      }
      if (helpedEl && hist.stats.totalVolunteers != null) {
        helpedEl.textContent = String(hist.stats.totalVolunteers);
      }
    }
    var histBody = document.getElementById("historyMissionsBody");
    if (histBody) {
      var histHtml = hist.tableHtml || hist.previewTableHtml || "";
      if (histHtml && !isLoadingHtml(histHtml)) {
        histBody.innerHTML = histHtml;
      } else if (hist.empty || (Array.isArray(hist.items) && !hist.items.length)) {
        histBody.innerHTML =
          '<tr><td colspan="6"><div class="missions-empty"><i class="bi bi-clipboard"></i><h4>No completed missions found</h4><p>Missions will appear here once they are completed</p></div></td></tr>';
      } else if (Array.isArray(hist.items) && hist.items.length) {
        // Older caches without tableHtml: build rows from items so list shows immediately.
        function esc(s) {
          return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }
        histBody.innerHTML = hist.items
          .slice(0, 10)
          .map(function (item) {
            var mission = item.mission || {};
            var name = mission.missionName || mission.name || "Untitled";
            var loc = mission.location || "N/A";
            var status =
              String(item.status || "").toLowerCase() === "rejected"
                ? "Rejected"
                : "Completed";
            var id = item.missionId || "";
            var href = "/missions/details?id=" + encodeURIComponent(id);
            var dateLabel = item.completedOnMs
              ? new Date(item.completedOnMs).toLocaleDateString()
              : "—";
            return (
              '<tr class="history-mission-row">' +
              "<td>" +
              esc(dateLabel) +
              "</td>" +
              '<td><a href="' +
              href +
              '" class="mission-name-link">' +
              esc(name) +
              "</a></td>" +
              "<td>" +
              esc(loc) +
              "</td>" +
              "<td>" +
              (status === "Rejected"
                ? "—"
                : String(item.actualVolunteers || 0) +
                  " / " +
                  String(item.totalNeeded || 0)) +
              "</td>" +
              "<td>" +
              status +
              "</td>" +
              '<td><a href="' +
              href +
              '" class="btn-table solid">View</a></td>' +
              "</tr>"
            );
          })
          .join("");
      }
    }
  }

  var vol = readPayload("volunteers");
  if (vol) {
    var volBody = document.getElementById("volunteerTableBody");
    if (volBody && vol.tableHtml && !isLoadingHtml(vol.tableHtml)) {
      volBody.innerHTML = vol.tableHtml;
    }
    if (vol.stats) {
      var volTotal = document.getElementById("totalVolunteers");
      var volHours = document.getElementById("totalVolunteerHours");
      if (volTotal && vol.stats.totalVolunteers != null) {
        volTotal.textContent = String(vol.stats.totalVolunteers);
      }
      if (volHours && vol.stats.totalHours != null) {
        var h = Number(vol.stats.totalHours);
        volHours.textContent =
          !isFinite(h) || h <= 0
            ? "0"
            : h % 1 === 0
              ? String(h)
              : String(Math.round(h * 10) / 10);
      }
    }
  }
})();
</script>
