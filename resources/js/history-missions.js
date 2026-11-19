import { auth, db } from "./firebase";
import {
    collection,
    getCountFromServer,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    assertOrgVerified,
    getOrgProfileOnce,
} from "./org-verification.js";
import {
    blockPageContent,
    requireOrgPageAccess,
    sessionCan,
} from "./org-session.js";
import {
    ORG_CACHE_KEYS,
    NAV_FRESH_MS,
    LAST_ORG_UID_KEY,
    readOrgCache,
    writeOrgCache,
    isOrgCacheFresh,
    isLoadingTableHtml,
    tableHtmlForCache,
} from "./org-data-cache.js";
import {
    parseSortableDateMs,
    compareDateMs,
    wireDateSortHeader,
} from "./table-date-sort.js";

let CURRENT_USER = null;
let historySearchListenerAttached = false;
let historyPageSize = 10;
let historyCurrentPage = 1;
/** Full history list kept in memory; only the active filter is painted into the DOM. */
let historyItems = [];
/** Stats snapshot for cache writes. */
let historyStats = { totalCompleted: 0, thisMonth: 0, totalVolunteers: 0 };
/** Same as mission page: show full list by default; period filter is optional. */
let activeHistoryPeriod = "all";
/** @type {'created'|'date'} */
let historySortField = "date";
/** @type {'asc'|'desc'} */
let historyCreatedSortDir = "asc";
/** @type {'asc'|'desc'} */
let historyDateSortDir = "asc";

async function populateSidebarUser(user) {
    try {
        const cached = readOrgCache(user.uid, ORG_CACHE_KEYS.SIDEBAR);
        const data =
            cached?.payload?.orgData ||
            (await getOrgProfileOnce(user.uid)) ||
            {};

        const displayName =
            cached?.payload?.displayName ||
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

/** Paint history from sessionStorage before auth (same as mission dashboard). */
function tryEarlyHistoryPaint() {
    const historyTableBody = document.getElementById("historyMissionsBody");
    if (!historyTableBody) return false;
    if (historyTableBody.querySelector("tr.history-mission-row, .missions-empty")) {
        return true;
    }
    let uid = "";
    try {
        uid = sessionStorage.getItem(LAST_ORG_UID_KEY) || "";
    } catch {
        uid = "";
    }
    if (!uid) return false;
    const cached = readOrgCache(uid, ORG_CACHE_KEYS.HISTORY);
    if (!cached?.payload) return false;
    applyCachedHistory(cached.payload);
    return true;
}

function bootHistoryPage() {
    // Instant table paint from sessionStorage (before auth / Firestore).
    tryEarlyHistoryPaint();

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/organization/login";
            return;
        }
        if (!(await assertOrgVerified(user))) return;
        const access = await requireOrgPageAccess(user);
        if (!access) return;
        if (!sessionCan(access.session, "history")) {
            blockPageContent(
                "Your account does not include History of Missions access. Ask the organization owner to update your rights."
            );
            return;
        }

        const actor = access.actor;
        console.log(
            "[SUCCESS] User logged in:",
            access.session.authUid,
            "org:",
            actor.uid
        );
        CURRENT_USER = actor;
        initHistoryDateSort();

        const cached = readOrgCache(actor.uid, ORG_CACHE_KEYS.HISTORY);
        const ready = isReadyHistoryCache(cached?.payload);
        if (cached?.payload) {
            applyCachedHistory(cached.payload);
        }

        void populateSidebarUser(actor);

        const fresh =
            ready &&
            isOrgCacheFresh(actor.uid, ORG_CACHE_KEYS.HISTORY, NAV_FRESH_MS);

        // Soft nav: reuse ready tableHtml. Otherwise refresh now; refine counts in background.
        if (!ready) {
            void loadHistoryMissions(actor, {
                refresh: true,
                silent: Boolean(cached?.payload),
            });
        } else if (!fresh) {
            void loadHistoryMissions(actor, {
                refresh: true,
                silent: true,
            });
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootHistoryPage);
} else {
    bootHistoryPage();
}

function updateHistoryMissionFooter(visibleCount) {
    const el = document.getElementById("historyCountText");
    if (!el) return;
    el.textContent =
        visibleCount === 1 ? "Showing 1 mission" : `Showing ${visibleCount} missions`;
}

function getActiveHistoryPeriod() {
    return activeHistoryPeriod || "all";
}

function syncHistoryPeriodSelect() {
    const periodSelect = document.getElementById("historyPeriodFilter");
    if (!periodSelect) return;
    if (periodSelect.value !== activeHistoryPeriod) {
        periodSelect.value = activeHistoryPeriod;
    }
}

function getActiveHistorySearch() {
    return (document.getElementById("historySearch")?.value || "")
        .trim()
        .toLowerCase();
}

function historyItemMatchesFilters(item, period, q) {
    const completedOn =
        item.completedOn instanceof Date
            ? item.completedOn
            : toJsDate(item.completedOn) ||
              (item.completedOnMs ? new Date(item.completedOnMs) : null);
    const periodBucket =
        getPeriodBucket(completedOn) || item.periodBucket || "older";
    const periodMatch = period === "all" || periodBucket === period;
    if (!periodMatch) return false;
    if (!q) return true;
    const haystack = `${item.searchText || ""}`.toLowerCase();
    return haystack.includes(q);
}

function getFilteredHistoryItems() {
    const period = getActiveHistoryPeriod();
    const q = getActiveHistorySearch();
    const filtered = historyItems.filter((item) =>
        historyItemMatchesFilters(item, period, q)
    );
    const sortDir =
        historySortField === "created"
            ? historyCreatedSortDir
            : historyDateSortDir;
    return filtered.sort((a, b) => {
        if (historySortField === "created") {
            return compareDateMs(
                a.createdAtMs || 0,
                b.createdAtMs || 0,
                sortDir
            );
        }
        return compareDateMs(
            a.dateMs || a.completedOnMs || 0,
            b.dateMs || b.completedOnMs || 0,
            sortDir
        );
    });
}

function initHistoryDateSort() {
    wireDateSortHeader(document.getElementById("historyCreatedSortHeader"), {
        getDir: () => historyCreatedSortDir,
        setDir: (d) => {
            historyCreatedSortDir = d === "desc" ? "desc" : "asc";
            historySortField = "created";
        },
        onSort: () => paintFilteredHistoryTable({ keepPage: true }),
    });
    wireDateSortHeader(document.getElementById("historyDateSortHeader"), {
        getDir: () => historyDateSortDir,
        setDir: (d) => {
            historyDateSortDir = d === "desc" ? "desc" : "asc";
            historySortField = "date";
        },
        onSort: () => paintFilteredHistoryTable({ keepPage: true }),
    });
}

function filterHistoryMissionsTable() {
    historyCurrentPage = 1;
    paintFilteredHistoryTable();
}

    function applyHistoryPagination() {
        paintFilteredHistoryTable({ keepPage: true });
    }

    function updateHistoryPaginationUi(total) {
        const totalPages = Math.max(1, Math.ceil(total / historyPageSize));
        if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
        if (historyCurrentPage < 1) historyCurrentPage = 1;

        const start = (historyCurrentPage - 1) * historyPageSize;
        const end = start + historyPageSize;
        const prevBtn = document.getElementById("historyPrevPage");
        const nextBtn = document.getElementById("historyNextPage");
        const pageInfo = document.getElementById("historyPageInfo");

        if (prevBtn) prevBtn.disabled = historyCurrentPage <= 1 || total === 0;
        if (nextBtn) nextBtn.disabled = historyCurrentPage >= totalPages || total === 0;
        if (pageInfo) {
            pageInfo.textContent = `Page ${historyCurrentPage} of ${totalPages}`;
        }

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

        return { start, end, totalPages };
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

        syncHistoryPeriodSelect();

        if (input && !historySearchListenerAttached) {
            historySearchListenerAttached = true;
            input.addEventListener("input", filterHistoryMissionsTable);
        }

        if (periodSelect && !periodSelect.dataset.bound) {
            periodSelect.dataset.bound = "1";
            periodSelect.addEventListener("change", () => {
                activeHistoryPeriod = periodSelect.value || "all";
                filterHistoryMissionsTable();
            });
        }
    }
function getCreatedAtMs(value) {
    return parseSortableDateMs(value);
}

function formatCreatedAtLabel(value) {
    const ms = getCreatedAtMs(value);
    if (!ms) return "—";
    return new Date(ms).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

async function resolveHistoryCreatedAt(missionId, mission = {}) {
    const local = mission.createdAt ?? mission.submittedAt ?? null;
    if (getCreatedAtMs(local)) return local;
    try {
        const globalSnap = await getDoc(doc(db, "missions", missionId));
        if (!globalSnap.exists()) return local;
        const data = globalSnap.data() || {};
        return data.createdAt ?? data.submittedAt ?? local;
    } catch (err) {
        console.warn("[WARN] Could not read missions.createdAt:", missionId, err);
        return local;
    }
}

async function enrichHistoryCreatedAt(items = []) {
    const next = await Promise.all(
        items.map(async (item) => {
            if (item.createdAtMs) return item;
            const createdAt = await resolveHistoryCreatedAt(
                item.missionId,
                item.mission || {}
            );
            const createdAtMs = getCreatedAtMs(createdAt);
            if (!createdAtMs) return item;
            const createdAtLabel = formatCreatedAtLabel(createdAtMs);
            const mission = {
                ...(item.mission || {}),
                createdAt,
            };
            const enriched = {
                ...item,
                mission,
                createdAtMs,
                createdAtLabel,
            };
            enriched.row = buildHistoryRow(enriched);
            return enriched;
        })
    );
    return next;
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
    // Prefer the mission's actual schedule date for period filters
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

    if (endDate) {
        const parsed = toJsDate(`${endDate}T12:00:00`);
        if (parsed) return parsed;
    }

    // Fallback only if schedule is missing
    return (
        toJsDate(mission.movedToHistoryAt) ||
        toJsDate(mission.completedAt) ||
        toJsDate(mission.lastStatusUpdate) ||
        null
    );
}

function isInCurrentMonth(date) {
    if (!date) return false;
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );
}
function getPeriodBucket(date) {
    if (!date) return "older";

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (date >= thisMonthStart && date < nextMonthStart) return "this_month";
    if (date >= lastMonthStart && date < thisMonthStart) return "last_month";
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

function readStoredVolunteerCount(mission = {}) {
    const keys = [
        "approvedVolunteers",
        "volunteersJoined",
        "actualVolunteers",
        "volunteerCount",
        "currentVolunteers",
        "acceptedCount",
        "approvedCount",
    ];
    for (const key of keys) {
        const n = Number(mission[key]);
        if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
}

function buildHistoryRow(item) {
    const {
        missionId,
        mission,
        status,
        actualVolunteers,
        totalNeeded,
        periodBucket,
    } = item;
    const statusLabel = status === "rejected" ? "Rejected" : "Completed";
    const statusClass = getHistoryStatusClass(status);
    const missionName = mission.missionName || mission.name || "Untitled";
    const detailsUrl = `/missions/details?id=${encodeURIComponent(missionId)}`;
    const volunteerDisplay =
        status === "rejected"
            ? "—"
            : `${actualVolunteers}/${totalNeeded} volunteers`;

    const createdLabel =
        item.createdAtLabel ||
        formatCreatedAtLabel(mission.createdAt ?? mission.submittedAt);

    return `
        <tr class="history-mission-row" data-period="${periodBucket}" data-mission-id="${escapeHtml(missionId)}">
            <td class="col-created">
                <div class="mission-date-main">${escapeHtml(createdLabel || "—")}</div>
            </td>
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
}

function processHistoryMissionLocal(docSnap, userId) {
    const mission = docSnap.data() || {};
    const missionId = docSnap.id;
    const status = (mission.status || "").toLowerCase();
    const totalNeeded = parseInt(mission.volunteers, 10) || 0;
    const storedCount = readStoredVolunteerCount(mission);
    const actualVolunteers = status === "rejected" ? 0 : storedCount ?? 0;
    const completedOn = getMissionCompletionDate(mission);
    const periodBucket = getPeriodBucket(completedOn);
    const missionName = mission.missionName || mission.name || "Untitled";
    const { datePart, timePart } = getHistoryDateParts(mission);
    const createdAt = mission.createdAt ?? mission.submittedAt ?? null;
    const createdAtMs = getCreatedAtMs(createdAt);
    const createdAtLabel = formatCreatedAtLabel(createdAt);
    const dateMs = parseSortableDateMs(mission.date || mission.endDate || "");
    const searchText = [
        missionName,
        createdAtLabel,
        datePart,
        timePart,
        mission.location || "",
    ].join(" ");

    const item = {
        missionId,
        orgId: mission.orgId || mission.organizationId || userId,
        mission,
        status,
        actualVolunteers,
        needsCountFetch: status !== "rejected" && storedCount == null,
        completedOn,
        completedOnMs: completedOn?.getTime?.() || 0,
        createdAtMs,
        createdAtLabel,
        dateMs,
        totalNeeded,
        periodBucket,
        searchText,
    };
    item.row = buildHistoryRow(item);
    return item;
}

/** Non-blocking cleanup: drop history rows whose global mission was hard-deleted. */
async function cleanupOrphanHistoryEntries(userId, missionIds = []) {
    if (!userId || !missionIds.length) return 0;
    const checks = await Promise.all(
        missionIds.map(async (missionId) => {
            try {
                const snap = await getDoc(doc(db, "missions", missionId));
                return { missionId, exists: snap.exists() };
            } catch (err) {
                console.warn("[WARN] history orphan check:", missionId, err);
                return { missionId, exists: true };
            }
        })
    );

    let removed = 0;
    await Promise.all(
        checks
            .filter((item) => !item.exists)
            .map(async ({ missionId }) => {
                try {
                    await deleteDoc(
                        doc(db, "organizations", userId, "history", missionId)
                    );
                    removed += 1;
                } catch (deleteError) {
                    console.error(
                        `[ERROR] Error removing mission ${missionId} from history:`,
                        deleteError
                    );
                }
            })
    );
    return removed;
}

async function refineHistoryVolunteerCounts(items = []) {
    const pending = items.filter((item) => item.needsCountFetch);
    if (!pending.length) {
        return {
            items,
            totalVolunteers: items.reduce(
                (sum, item) =>
                    item.status === "rejected" ? sum : sum + (item.actualVolunteers || 0),
                0
            ),
        };
    }

    const counts = await Promise.all(
        pending.map(async (item) => {
            const count = await getActualVolunteerCount(item.missionId, item.orgId);
            return { missionId: item.missionId, count };
        })
    );

    const countById = new Map(counts.map((c) => [c.missionId, c.count]));
    let totalVolunteers = 0;

    const refined = items.map((item) => {
        if (item.status === "rejected") return item;
        const nextCount = countById.has(item.missionId)
            ? countById.get(item.missionId)
            : item.actualVolunteers;
        totalVolunteers += nextCount;
        if (nextCount === item.actualVolunteers && !item.needsCountFetch) {
            return item;
        }

        const progress = document.querySelector(
            `tr.history-mission-row[data-mission-id="${CSS.escape(item.missionId)}"] .volunteer-progress`
        );
        if (progress) {
            progress.textContent = `${nextCount}/${item.totalNeeded} volunteers`;
        }

        const next = {
            ...item,
            actualVolunteers: nextCount,
            needsCountFetch: false,
        };
        next.row = buildHistoryRow(next);
        return next;
    });

    return { items: refined, totalVolunteers };
}

function historyEmptyHtml() {
    return `
            <tr>
                <td colspan="7">
                    <div class="missions-empty">
                        <i class="bi bi-clipboard"></i>
                        <h4>No completed missions found</h4>
                        <p>Missions will appear here once they are completed</p>
                    </div>
                </td>
            </tr>`;
}

function slimHistoryMission(mission = {}) {
    return {
        missionName: mission.missionName || mission.name || "Untitled",
        name: mission.name || mission.missionName || "",
        location: mission.location || "",
        date: mission.date || "",
        endDate: mission.endDate || "",
        startTime: mission.startTime || "",
        endTime: mission.endTime || "",
        volunteers: mission.volunteers,
        status: mission.status || "",
        createdAt: mission.createdAt ?? null,
        submittedAt: mission.submittedAt ?? null,
    };
}

function serializeHistoryItems(items = []) {
    // Keep cache small so sessionStorage writes succeed (full mission docs were too heavy).
    return items.map((item) => ({
        missionId: item.missionId,
        orgId: item.orgId,
        mission: slimHistoryMission(item.mission || {}),
        status: item.status,
        actualVolunteers: item.actualVolunteers,
        needsCountFetch: false,
        completedOnMs: item.completedOnMs || item.completedOn?.getTime?.() || 0,
        createdAtMs: item.createdAtMs || 0,
        createdAtLabel: item.createdAtLabel || "",
        dateMs: item.dateMs || 0,
        totalNeeded: item.totalNeeded,
        periodBucket: item.periodBucket,
        searchText: item.searchText,
    }));
}

function rehydrateHistoryItems(items = []) {
    return items.map((item) => {
        const completedOn =
            item.completedOn instanceof Date
                ? item.completedOn
                : toJsDate(item.completedOn) ||
                  (item.completedOnMs ? new Date(item.completedOnMs) : null);
        const mission = item.mission || {};
        const createdAtMs =
            item.createdAtMs ||
            getCreatedAtMs(mission.createdAt ?? mission.submittedAt);
        const createdAtLabel =
            item.createdAtLabel ||
            formatCreatedAtLabel(mission.createdAt ?? mission.submittedAt);
        const dateMs =
            item.dateMs ||
            parseSortableDateMs(mission.date || mission.endDate || "");
        const next = {
            ...item,
            mission,
            completedOn,
            completedOnMs: completedOn?.getTime?.() || item.completedOnMs || 0,
            createdAtMs,
            createdAtLabel,
            dateMs,
            periodBucket:
                item.periodBucket || getPeriodBucket(completedOn) || "older",
        };
        next.row = buildHistoryRow(next);
        return next;
    });
}

/** Same pattern as mission dashboard / volunteer details — ready tableHtml for hydrate. */
function saveHistoryCache(orgId) {
    if (!orgId) return;
    const tbody = document.getElementById("historyMissionsBody");
    const html = tableHtmlForCache(tbody?.innerHTML || "");
    writeOrgCache(orgId, ORG_CACHE_KEYS.HISTORY, {
        empty: !historyItems.length,
        items: serializeHistoryItems(historyItems),
        stats: historyStats,
        period: activeHistoryPeriod || "all",
        // Always store painted rows (or empty-state HTML) for instant next visit.
        tableHtml: html || tableHtmlForCache(historyEmptyHtml()),
        ready: true,
    });
}

function isReadyHistoryCache(payload) {
    if (!payload) return false;
    if (payload.empty === true) return true;
    if (payload.tableHtml && !isLoadingTableHtml(payload.tableHtml)) return true;
    return payload.ready === true && Array.isArray(payload.items);
}

function paintFilteredHistoryTable({ keepPage = false, persist = true } = {}) {
    const historyTableBody = document.getElementById("historyMissionsBody");
    if (!historyTableBody) return;

    if (!historyItems.length) {
        historyTableBody.innerHTML = historyEmptyHtml();
        updateHistoryMissionFooter(0);
        updateHistoryPaginationUi(0);
        if (persist && CURRENT_USER?.uid) saveHistoryCache(CURRENT_USER.uid);
        return;
    }

    const filtered = getFilteredHistoryItems();
    if (!keepPage) historyCurrentPage = 1;
    const { start, end } = updateHistoryPaginationUi(filtered.length);
    const pageItems = filtered.slice(start, end);

    if (!filtered.length) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="missions-empty">
                        <i class="bi bi-clipboard"></i>
                        <h4>No missions in this period</h4>
                        <p>Try another period filter or search term</p>
                    </div>
                </td>
            </tr>
        `;
        if (persist && CURRENT_USER?.uid) saveHistoryCache(CURRENT_USER.uid);
        return;
    }

    historyTableBody.innerHTML = pageItems.map((item) => item.row).join("");
    if (persist && CURRENT_USER?.uid) saveHistoryCache(CURRENT_USER.uid);
}

function setHistoryItems(items = [], stats = null) {
    historyItems = Array.isArray(items) ? items : [];
    if (stats) {
        historyStats = {
            totalCompleted: Number(stats.totalCompleted) || 0,
            thisMonth: Number(stats.thisMonth) || 0,
            totalVolunteers: Number(stats.totalVolunteers) || 0,
        };
        updateStats(
            historyStats.totalCompleted,
            historyStats.thisMonth,
            historyStats.totalVolunteers
        );
    }
    ensureHistorySearchListener();
    initHistoryPaginationControls();
    paintFilteredHistoryTable();
}

/** Apply cache like volunteer/mission details — paint tableHtml first, rehydrate after. */
function applyCachedHistory(payload) {
    if (!payload) return;

    activeHistoryPeriod = payload.period || "all";
    syncHistoryPeriodSelect();
    ensureHistorySearchListener();
    initHistoryPaginationControls();

    if (payload.stats) {
        historyStats = {
            totalCompleted: Number(payload.stats.totalCompleted) || 0,
            thisMonth: Number(payload.stats.thisMonth) || 0,
            totalVolunteers: Number(payload.stats.totalVolunteers) || 0,
        };
        updateStats(
            historyStats.totalCompleted,
            historyStats.thisMonth,
            historyStats.totalVolunteers
        );
    }

    const historyTableBody = document.getElementById("historyMissionsBody");
    const cachedHtml = payload.tableHtml || "";
    const hasItems =
        Array.isArray(payload.items) && payload.items.length > 0;

    // Instant path: paint ready tableHtml before rebuilding item rows.
    if (
        historyTableBody &&
        cachedHtml &&
        !isLoadingTableHtml(cachedHtml) &&
        cachedHtml.includes("col-created")
    ) {
        historyTableBody.innerHTML = cachedHtml;
        const rowCount = historyTableBody.querySelectorAll(
            "tr.history-mission-row"
        ).length;
        updateHistoryPaginationUi(
            Math.max(rowCount, Number(payload.stats?.totalCompleted) || 0)
        );
        if (rowCount > 0) {
            updateHistoryMissionFooter(rowCount);
        } else if (payload.empty || !hasItems) {
            updateHistoryMissionFooter(0);
        }

        // Rehydrate filter/search data after first paint.
        if (hasItems) {
            historyItems = rehydrateHistoryItems(payload.items);
        } else {
            historyItems = [];
        }
        if (CURRENT_USER?.uid) saveHistoryCache(CURRENT_USER.uid);
        return;
    }

    if (hasItems) {
        historyItems = rehydrateHistoryItems(payload.items);
    } else {
        historyItems = [];
    }

    if (payload.empty || !hasItems) {
        if (historyTableBody) historyTableBody.innerHTML = historyEmptyHtml();
        updateHistoryMissionFooter(0);
        updateHistoryPaginationUi(0);
        if (CURRENT_USER?.uid) saveHistoryCache(CURRENT_USER.uid);
        return;
    }

    // No tableHtml yet — rebuild once and persist ready tableHtml for next visit.
    paintFilteredHistoryTable({ persist: true });
}

async function loadHistoryMissions(user, { silent = false, refresh = true } = {}) {
    const historyTableBody = document.getElementById("historyMissionsBody");
    if (!historyTableBody) return;

    const cached = readOrgCache(user.uid, ORG_CACHE_KEYS.HISTORY);
    const hasUsableCache =
        cached?.payload &&
        (cached.payload.empty === true ||
            Array.isArray(cached.payload.items) ||
            Boolean(cached.payload.tableHtml));
    const ready = isReadyHistoryCache(cached?.payload);

    // Never blank the table while loading — paint cache first.
    if (hasUsableCache) {
        applyCachedHistory(cached.payload);
    }

    if (ready && !refresh) {
        return;
    }

    try {
        const historyRef = collection(db, "organizations", user.uid, "history");
        const historySnapshot = await getDocs(historyRef);

        if (historySnapshot.empty) {
            setHistoryItems([], {
                totalCompleted: 0,
                thisMonth: 0,
                totalVolunteers: 0,
            });
            console.log("[INFO] No missions in history collection");
            return;
        }

        console.log(
            `[INFO] Found ${historySnapshot.docs.length} missions in history collection`
        );

        let validResults = historySnapshot.docs.map((docSnap) =>
            processHistoryMissionLocal(docSnap, user.uid)
        );
        validResults = await enrichHistoryCreatedAt(validResults);

        validResults.sort(
            (a, b) => (b.completedOnMs || 0) - (a.completedOnMs || 0)
        );

        const validMissionsCount = validResults.length;
        let thisMonthCount = 0;
        let totalVolunteersHelped = 0;
        for (const result of validResults) {
            if (result.status === "rejected") continue;
            totalVolunteersHelped += result.actualVolunteers;
            if (isInCurrentMonth(result.completedOn)) thisMonthCount += 1;
        }

        const stats = {
            totalCompleted: validMissionsCount,
            thisMonth: thisMonthCount,
            totalVolunteers: totalVolunteersHelped,
        };

        setHistoryItems(validResults, stats);

        void refineHistoryVolunteerCounts(validResults)
            .then(({ items, totalVolunteers }) => {
                validResults = items;
                const nextStats = {
                    totalCompleted: validMissionsCount,
                    thisMonth: thisMonthCount,
                    totalVolunteers,
                };
                historyItems = validResults;
                historyStats = nextStats;
                updateStats(
                    nextStats.totalCompleted,
                    nextStats.thisMonth,
                    nextStats.totalVolunteers
                );
                paintFilteredHistoryTable({ keepPage: true });
            })
            .catch((err) => {
                console.warn("[WARN] history volunteer count refine:", err);
            });

        void cleanupOrphanHistoryEntries(
            user.uid,
            validResults
                .filter((item) => item.status !== "rejected")
                .map((item) => item.missionId)
        ).then((removed) => {
            if (removed > 0) {
                console.log(
                    `[INFO] Cleaned up ${removed} deleted missions from history`
                );
            }
        });

        console.log(`[SUCCESS] History loaded: ${validMissionsCount} missions`);
    } catch (error) {
        console.error("[ERROR] Error fetching history missions:", error);
        if (!hasUsableCache) {
            historyTableBody.innerHTML = `
            <tr>
                <td colspan="7">
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
}

// Prefer aggregation counts; fall back to reading applications only when needed.
async function getActualVolunteerCount(missionId, orgId = null) {
    if (orgId) {
        try {
            const rosterCount = await getCountFromServer(
                collection(
                    db,
                    "organizations",
                    orgId,
                    "missions",
                    missionId,
                    "volunteers"
                )
            );
            const size = rosterCount.data().count || 0;
            if (size > 0) return size;
        } catch (err) {
            console.warn("[WARN] volunteers subcollection count:", err);
        }

        // Completed missions often keep roster under history/.
        try {
            const historyRosterCount = await getCountFromServer(
                collection(
                    db,
                    "organizations",
                    orgId,
                    "history",
                    missionId,
                    "volunteers"
                )
            );
            const size = historyRosterCount.data().count || 0;
            if (size > 0) return size;
        } catch (err) {
            console.warn("[WARN] history volunteers count:", err);
        }
    }

    try {
        const applicationsSnapshot = await getDocs(
            collection(db, "missions", missionId, "applications")
        );
        let approved = 0;
        applicationsSnapshot.forEach((docSnap) => {
            const st = String(docSnap.data()?.status || "").toLowerCase();
            if (st === "approved" || st === "accepted") approved += 1;
        });
        return approved;
    } catch (error) {
        console.error(
            `[ERROR] Error getting volunteer count for mission ${missionId}:`,
            error
        );
        return 0;
    }
}


// Function to update stats cards
function updateStats(totalCompleted, thisMonth, totalVolunteers) {
    historyStats = {
        totalCompleted: Number(totalCompleted) || 0,
        thisMonth: Number(thisMonth) || 0,
        totalVolunteers: Number(totalVolunteers) || 0,
    };
    const completedEl = document.getElementById("totalCompletedMissions");
    const monthEl = document.getElementById("thisMonthMissions");
    const helpedEl = document.getElementById("totalVolunteersHelped");
    if (completedEl) completedEl.textContent = String(historyStats.totalCompleted);
    if (monthEl) monthEl.textContent = String(historyStats.thisMonth);
    if (helpedEl) helpedEl.textContent = String(historyStats.totalVolunteers);
}
