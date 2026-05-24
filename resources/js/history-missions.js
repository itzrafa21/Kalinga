import { auth, db } from "./firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

let CURRENT_USER = null;
let historySearchListenerAttached = false;
let historyPageSize = 10;
let historyCurrentPage = 1;

async function populateSidebarUser(user) {
    try {
        const snap = await getDoc(doc(db, "organizations", user.uid));
        const data = snap.exists() ? snap.data() : {};

        const displayName =
            (data?.name && String(data.name).trim()) ||
            (data?.orgName && String(data.orgName).trim()) ||
            user?.displayName ||
            user?.email ||
            "Organization";

        const sidebarNameEl = document.getElementById("sidebarUserName");
        const sidebarInitialEl = document.getElementById("sidebarUserInitial");
        const avatarWrap = document.querySelector(".sidebar-user-avatar");
        const avatarImg = document.getElementById("sidebarUserAvatarImg");

        if (sidebarNameEl) sidebarNameEl.textContent = displayName;
        if (sidebarInitialEl) {
            const ch = displayName.charAt(0);
            sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
        }

        if (avatarWrap && avatarImg) {
            const pic = data?.profilePictureBase64 || data?.profilePictureURL;
            if (pic) {
                avatarImg.src = pic;
                avatarWrap.classList.add("has-photo");
            } else {
                avatarImg.removeAttribute("src");
                avatarWrap.classList.remove("has-photo");
            }
        }
    } catch (err) {
        console.error("[ERROR] populateSidebarUser:", err);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }

    console.log("[SUCCESS] User logged in:", user.uid);
    CURRENT_USER = user;

    await populateSidebarUser(user);

    // Load missions for this user
    await loadHistoryMissions(user);
});

function updateHistoryMissionFooter(visibleCount) {
    const el = document.getElementById("historyCountText");
    if (!el) return;
    el.textContent =
        visibleCount === 1 ? "Showing 1 mission" : `Showing ${visibleCount} missions`;
}

function filterHistoryMissionsTable() {
    const tbody = document.getElementById("historyMissionsBody");
    if (!tbody) return;

    const q = (document.getElementById("historySearch")?.value || "").trim().toLowerCase();
    const period = document.getElementById("historyPeriodFilter")?.value || "all";
    const rows = tbody.querySelectorAll("tr.history-mission-row");

    rows.forEach((tr) => {
        const rowPeriod = tr.dataset.period || "older";
        const periodMatch = period === "all" || rowPeriod === period;

        const date = (tr.cells[0]?.textContent || "").toLowerCase();
        const name = (tr.cells[1]?.textContent || "").toLowerCase();
        const loc = (tr.cells[2]?.textContent || "").toLowerCase();
        const haystack = `${name} ${date} ${loc}`;
        const searchMatch = !q || haystack.includes(q);

        const match = periodMatch && searchMatch;
        tr.style.display = match ? "" : "none";
        tr.classList.remove("history-row-paged-out");
    });

    historyCurrentPage = 1;
    applyHistoryPagination();
}

    function getVisibleHistoryRows() {
        const tbody = document.getElementById("historyMissionsBody");
        if (!tbody) return [];
        return Array.from(tbody.querySelectorAll("tr.history-mission-row")).filter(
            (tr) => tr.style.display !== "none"
        );
    }
    
    function applyHistoryPagination() {
        const allVisible = getVisibleHistoryRows();
        const total = allVisible.length;
        const totalPages = Math.max(1, Math.ceil(total / historyPageSize));
    
        if (historyCurrentPage > totalPages) {
            historyCurrentPage = totalPages;
        }
        if (historyCurrentPage < 1) {
            historyCurrentPage = 1;
        }
    
        const start = (historyCurrentPage - 1) * historyPageSize;
        const end = start + historyPageSize;
    
        const tbody = document.getElementById("historyMissionsBody");
        if (tbody) {
            tbody.querySelectorAll("tr.history-mission-row").forEach((tr) => {
                tr.classList.remove("history-row-paged-out");
            });
            allVisible.forEach((tr, index) => {
                if (index < start || index >= end) {
                    tr.classList.add("history-row-paged-out");
                }
            });
        }
    
        const prevBtn = document.getElementById("historyPrevPage");
        const nextBtn = document.getElementById("historyNextPage");
        const pageInfo = document.getElementById("historyPageInfo");
    
        if (prevBtn) prevBtn.disabled = historyCurrentPage <= 1 || total === 0;
        if (nextBtn) nextBtn.disabled = historyCurrentPage >= totalPages || total === 0;
        if (pageInfo) pageInfo.textContent = `Page ${historyCurrentPage} of ${totalPages}`;
    
        const countEl = document.getElementById("historyCountText");
        if (countEl) {
            if (total === 0) {
                countEl.textContent = "Showing 0 missions";
            } else {
                const from = start + 1;
                const to = Math.min(end, total);
                countEl.textContent =
                    total === 1
                        ? "Showing 1 mission"
                        : `Showing ${from}–${to} of ${total} missions`;
            }
        }
    }
    
    function initHistoryPaginationControls() {
        const sizeSelect = document.getElementById("historyPageSize");
        const prevBtn = document.getElementById("historyPrevPage");
        const nextBtn = document.getElementById("historyNextPage");
    
        if (sizeSelect && !sizeSelect.dataset.bound) {
            sizeSelect.dataset.bound = "1";
            sizeSelect.addEventListener("change", () => {
                historyPageSize = parseInt(sizeSelect.value, 10) || 10;
                historyCurrentPage = 1;
                applyHistoryPagination();
            });
        }
    
        if (prevBtn && !prevBtn.dataset.bound) {
            prevBtn.dataset.bound = "1";
            prevBtn.addEventListener("click", () => {
                if (historyCurrentPage > 1) {
                    historyCurrentPage--;
                    applyHistoryPagination();
                }
            });
        }
    
        if (nextBtn && !nextBtn.dataset.bound) {
            nextBtn.dataset.bound = "1";
            nextBtn.addEventListener("click", () => {
                historyCurrentPage++;
                applyHistoryPagination();
            });
        }
    }


    function ensureHistorySearchListener() {
        const input = document.getElementById("historySearch");
        const periodSelect = document.getElementById("historyPeriodFilter");
    
        if (input && !historySearchListenerAttached) {
            historySearchListenerAttached = true;
            input.addEventListener("input", filterHistoryMissionsTable);
        }
    
        if (periodSelect && !periodSelect.dataset.bound) {
            periodSelect.dataset.bound = "1";
            periodSelect.addEventListener("change", filterHistoryMissionsTable);
        }
    
        filterHistoryMissionsTable();
    }
function toJsDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatHistoryTimeLabel(t) {
    if (!t || t === "N/A") return "";
    const raw = String(t).trim();
    if (/am|pm/i.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return raw;
    let h = parseInt(match[1], 10);
    const minutes = match[2];
    if (Number.isNaN(h) || h < 0 || h > 23) return raw;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${minutes} ${period}`;
}

function getHistoryDateParts(mission) {
    const rawDate = mission.date || mission.endDate;
    if (!rawDate) {
        return { datePart: "N/A", timePart: "" };
    }

    const datePart = (() => {
        const d = new Date(`${rawDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return String(rawDate);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    })();

    const start = formatHistoryTimeLabel(mission.startTime);
    const end = formatHistoryTimeLabel(mission.endTime);
    let timePart = "";
    if (start && end) timePart = `${start} – ${end}`;
    else if (start) timePart = start;
    else if (end) timePart = end;

    return { datePart, timePart };
}

function renderHistoryDateCellHtml(mission) {
    const { datePart, timePart } = getHistoryDateParts(mission);
    if (!timePart) {
        return `<div class="mission-date-main">${escapeHtml(datePart)}</div>`;
    }
    return `
        <div class="mission-date-main">${escapeHtml(datePart)}</div>
        <div class="mission-time-sub">${escapeHtml(timePart)}</div>`;
}

function getHistoryStatusClass(status) {
    return status === "rejected"
        ? "mission-status--rejected"
        : "mission-status--completed";
}

function getMissionCompletionDate(mission) {
    const fromFields = toJsDate(mission.movedToHistoryAt)
        || toJsDate(mission.completedAt)
        || toJsDate(mission.lastStatusUpdate);

    if (fromFields) return fromFields;

    const endDate = mission.endDate || mission.date;
    const endTime = mission.endTime;
    if (endDate && endTime) {
        try {
            if (endTime.includes("AM") || endTime.includes("PM")) {
                const [time, period] = endTime.split(" ");
                const [hours, minutes] = time.split(":");
                let hour24 = parseInt(hours, 10);
                if (period === "AM" && hour24 === 12) hour24 = 0;
                else if (period === "PM" && hour24 !== 12) hour24 += 12;
                const parsed = toJsDate(
                    `${endDate}T${hour24.toString().padStart(2, "0")}:${minutes}`
                );
                if (parsed) return parsed;
            } else {
                const parsed = toJsDate(`${endDate}T${endTime}`);
                if (parsed) return parsed;
            }
        } catch {
            /* fall through */
        }
    }

    if (!endDate) return null;
    return toJsDate(`${endDate}T12:00:00`);
}

function isInCurrentMonth(date) {
    if (!date) return false;
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );
}function getPeriodBucket(date) {
    if (!date) return "older";
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (date >= thisMonthStart) return "this_month";
    if (date >= lastMonthStart) return "last_month";
    return "older";
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function processHistoryMission(docSnap, userId) {
    const mission = docSnap.data();
    const missionId = docSnap.id;
    const status = (mission.status || "").toLowerCase();
    const mainMissionSnap = await getDoc(doc(db, "missions", missionId));
    const showInHistory = status === "rejected" || mainMissionSnap.exists();

    if (!showInHistory) {
        try {
            await deleteDoc(doc(db, "organizations", userId, "history", missionId));
        } catch (deleteError) {
            console.error(
                `[ERROR] Error removing mission ${missionId} from history:`,
                deleteError
            );
        }
        return { removed: true };
    }

    const actualVolunteers =
        status === "rejected"
            ? 0
            : await getActualVolunteerCount(
                  missionId,
                  mission.orgId || mission.organizationId || userId
              );
    const totalNeeded = parseInt(mission.volunteers, 10) || 0;
    const volunteerDisplay =
        status === "rejected"
            ? "—"
            : `${actualVolunteers}/${totalNeeded} volunteers`;

    const completedOn = getMissionCompletionDate(mission);
    const periodBucket = getPeriodBucket(completedOn);
    const statusLabel = status === "rejected" ? "Rejected" : "Completed";
    const statusClass = getHistoryStatusClass(status);
    const missionName = mission.missionName || mission.name || "Untitled";
    const detailsUrl = `/missions/details?id=${encodeURIComponent(missionId)}`;

    const row = `
        <tr class="history-mission-row" data-period="${periodBucket}">
            <td class="col-date">${renderHistoryDateCellHtml(mission)}</td>
            <td class="col-mission">
                <a href="${detailsUrl}" class="mission-name-link">${escapeHtml(missionName)}</a>
            </td>
            <td class="col-location">${escapeHtml(mission.location || "N/A")}</td>
            <td class="col-volunteers">
                <span class="volunteer-progress">${escapeHtml(volunteerDisplay)}</span>
            </td>
            <td class="col-status">
                <span class="mission-status ${statusClass}">${escapeHtml(statusLabel)}</span>
            </td>
            <td class="col-actions">
                <a href="${detailsUrl}" class="mission-action-btn">View details</a>
            </td>
        </tr>`;

    return {
        removed: false,
        row,
        actualVolunteers,
        status,
        completedOn,
    };
}

// Function to fetch and render completed missions
async function loadHistoryMissions(user) {
    const historyTableBody = document.getElementById("historyMissionsBody");
    if (!historyTableBody) return;

    try {
        console.log("[INFO] Loading history missions...");
        
        historyTableBody.innerHTML = `
            <tr class="missions-loading-row">
                <td colspan="6">
                    <div class="missions-loading">
                        <div class="missions-loading-spinner" aria-hidden="true"></div>
                        <span>Loading missions…</span>
                    </div>
                </td>
            </tr>
        `;

        const historyRef = collection(db, "organizations", user.uid, "history");
        const historySnapshot = await getDocs(query(historyRef));

        if (historySnapshot.empty) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="missions-empty">
                            <i class="bi bi-clipboard"></i>
                            <h4>No completed missions found</h4>
                            <p>Missions will appear here once they are completed</p>
                        </div>
                    </td>
                </tr>
            `;
            updateStats(0, 0, 0);
            updateHistoryMissionFooter(0);
            console.log("[INFO] No missions in history collection");
            return;
        }

        console.log(`[INFO] Found ${historySnapshot.docs.length} missions in history collection`);

        const results = await Promise.all(
            historySnapshot.docs.map((docSnap) =>
                processHistoryMission(docSnap, user.uid).catch((checkError) => {
                    console.error(
                        `[ERROR] Error checking mission ${docSnap.id}:`,
                        checkError
                    );
                    return null;
                })
            )
        );

        let validMissionsCount = 0;
        let removedMissionsCount = 0;
        let totalVolunteersHelped = 0;
        let thisMonthCount = 0;
        const validResults = [];

        for (const result of results) {
            if (!result) continue;
            if (result.removed) {
                removedMissionsCount++;
                continue;
            }

            validMissionsCount++;
            validResults.push(result);

            if (result.status !== "rejected") {
                totalVolunteersHelped += result.actualVolunteers;
                if (isInCurrentMonth(result.completedOn)) {
                    thisMonthCount++;
                }
            }
        }

        validResults.sort((a, b) => {
            const aTime = a.completedOn?.getTime() ?? 0;
            const bTime = b.completedOn?.getTime() ?? 0;
            return bTime - aTime;
        });

        const rows = validResults.map((result) => result.row);

        // Update stats
        updateStats(validMissionsCount, thisMonthCount, totalVolunteersHelped);

        // If no valid missions remain, show empty message
        if (validMissionsCount === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="missions-empty">
                            <i class="bi bi-clipboard"></i>
                            <h4>No completed missions found</h4>
                            <p>Missions will appear here once they are completed</p>
                        </div>
                    </td>
                </tr>
            `;
            updateHistoryMissionFooter(0);
        } else {
            historyTableBody.innerHTML = rows.join("");
            ensureHistorySearchListener();
            initHistoryPaginationControls();
            historyCurrentPage = 1;
            applyHistoryPagination();
        }

        console.log(`[SUCCESS] History cleanup complete:`);
        console.log(`   - Valid missions shown: ${validMissionsCount}`);
        console.log(`   - Removed missions: ${removedMissionsCount}`);
        console.log(`   - Total volunteers helped: ${totalVolunteersHelped}`);
        
        // Show a message if missions were cleaned up
        if (removedMissionsCount > 0) {
            console.log(`[INFO] Cleaned up ${removedMissionsCount} deleted missions from history`);
        }

    } catch (error) {
        console.error("[ERROR] Error fetching history missions:", error);
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="missions-error">
                        <i class="bi bi-x-circle"></i>
                        <h4>Error loading missions</h4>
                        <p>Please refresh the page and try again</p>
                    </div>
                </td>
            </tr>
        `;
        updateHistoryMissionFooter(0);
    }
}

// Function to get actual volunteer count from mission applications
// (subcollection + root "applications", same sources as volunteer.js / mission-details.js)
async function getActualVolunteerCount(missionId, orgId = null) {
    if (orgId) {
        try {
            const rosterSnap = await getDocs(
                collection(db, "organizations", orgId, "missions", missionId, "volunteers")
            );
            if (!rosterSnap.empty) {
                return rosterSnap.size;
            }
        } catch (err) {
            console.warn("[WARN] volunteers subcollection count:", err);
        }
    }

    const approvedKeys = new Set();
    const addIfApproved = (data, docId) => {
        const st = (data.status || "").toLowerCase();
        if (st !== "approved" && st !== "accepted") return;
        const u = data.userId;
        approvedKeys.add(u ? `u:${u}` : `d:${docId}`);
    };

    try {
        const applicationsSnapshot = await getDocs(
            collection(db, "missions", missionId, "applications")
        );
        applicationsSnapshot.forEach((docSnap) => {
            addIfApproved(docSnap.data(), docSnap.id);
        });
        return approvedKeys.size;
    } catch (error) {
        console.error(`[ERROR] Error getting volunteer count for mission ${missionId}:`, error);
        return 0;
    }
}


// Function to update stats cards
function updateStats(totalCompleted, thisMonth, totalVolunteers) {
    document.getElementById("totalCompletedMissions").textContent = totalCompleted;
    document.getElementById("thisMonthMissions").textContent = thisMonth;
    document.getElementById("totalVolunteersHelped").textContent = totalVolunteers;
    
    console.log(`[INFO] Stats updated - Completed: ${totalCompleted}, This Month: ${thisMonth}, Volunteers: ${totalVolunteers}`);
}
