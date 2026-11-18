import { collection, collectionGroup, getDocs, query, limit } from "firebase/firestore";
import { db } from "./firebase.js";
import {
    campaignStatusLabel,
    donationModeLabel,
    resolveDonationMode,
} from "./donation-shared.js";
import { getOrgVerificationLabel } from "./org-verification.js";
import { resolveMissionIdFromApplication } from "./application-storage.js";

function toJsDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatReportDate(value) {
    const d = toJsDate(value);
    if (!d) return "";
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Export-safe money label — avoid ₱ (often shows as ± in Excel/PDF fonts). */
function formatReportMoney(centavos) {
    const amount = (Number(centavos) || 0) / 100;
    const formatted = amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `PHP ${formatted}`;
}

function getSelectedReportType() {
    return document.getElementById("reportType")?.value || "users";
}

function getReportDateRange() {
    const fromRaw = document.getElementById("dateFrom")?.value || "";
    const toRaw = document.getElementById("dateTo")?.value || "";
    const from = fromRaw ? new Date(`${fromRaw}T00:00:00`) : null;
    const to = toRaw ? new Date(`${toRaw}T23:59:59.999`) : null;
    return {
        from: from && !Number.isNaN(from.getTime()) ? from : null,
        to: to && !Number.isNaN(to.getTime()) ? to : null,
    };
}

function inDateRange(value, range) {
    if (!range?.from && !range?.to) return true;
    const d = toJsDate(value);
    if (!d) return false;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
}

function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function rowsToCsv(headers, rows) {
    const lines = [headers.map(csvEscape).join(",")];
    for (const row of rows) {
        lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
    }
    return `\uFEFF${lines.join("\r\n")}`;
}

function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reportTitle(type) {
    switch (type) {
        case "users":
            return "Users Report";
        case "missions":
            return "Missions Report";
        case "volunteers":
            return "Volunteers Report";
        case "donations":
            return "Donations Report";
        case "attendance":
            return "Attendance Report";
        default:
            return "Admin Report";
    }
}

function stampFilename(type, ext) {
    const now = new Date();
    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        "-",
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    return `kalinga-${type}-report-${stamp}.${ext}`;
}

async function fetchUsersReport(range) {
    const headers = [
        "Role",
        "Name",
        "Email",
        "Phone",
        "Status",
        "Created At",
    ];
    const rows = [];

    try {
        const orgSnap = await getDocs(collection(db, "organizations"));
        orgSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAt =
                data.createdAt || data.registeredAt || data.updatedAt || null;
            if (!inDateRange(createdAt, range)) return;
            rows.push({
                Role: "Organization",
                Name: data.name || data.orgName || docSnap.id,
                Email: data.email || "",
                Phone: data.phone || data.mobile || "",
                Status: getOrgVerificationLabel(data),
                "Created At": formatReportDate(createdAt),
                __sort: toJsDate(createdAt)?.getTime() || 0,
            });
        });
    } catch (err) {
        console.warn("[WARN] users report organizations:", err);
    }

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const role = String(data.role || "volunteer").toLowerCase();
            if (role === "admin" || role === "organization" || role === "org") {
                return;
            }
            const createdAt =
                data.createdAt || data.registeredAt || data.updatedAt || null;
            if (!inDateRange(createdAt, range)) return;
            rows.push({
                Role: "Volunteer",
                Name:
                    data.name ||
                    data.displayName ||
                    data.fullName ||
                    docSnap.id,
                Email: data.email || "",
                Phone:
                    data.phone ||
                    data.mobile ||
                    data.mobileNumber ||
                    "",
                Status: data.disabled ? "Disabled" : data.status || "Active",
                "Created At": formatReportDate(createdAt),
                __sort: toJsDate(createdAt)?.getTime() || 0,
            });
        });
    } catch (err) {
        console.warn("[WARN] users report users:", err);
    }

    rows.sort((a, b) => b.__sort - a.__sort);
    return { headers, rows };
}

async function fetchMissionsReport(range) {
    const headers = [
        "Title",
        "Organization",
        "Type",
        "Status",
        "Location",
        "Date",
        "Submitted At",
    ];
    const rows = [];

    try {
        let snap;
        try {
            snap = await getDocs(
                query(collection(db, "mission_submissions"), limit(500))
            );
        } catch {
            snap = await getDocs(collection(db, "mission_submissions"));
        }
        snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const submittedAt =
                data.submittedAt || data.createdAt || data.updatedAt || null;
            if (!inDateRange(submittedAt, range)) return;
            rows.push({
                Title:
                    data.missionName ||
                    data.name ||
                    data.title ||
                    "Untitled",
                Organization: data.orgName || data.orgId || "",
                Type: data.type || data.missionType || "General",
                Status: data.status || "pending",
                Location: data.location || "",
                Date: data.date || data.startDate || "",
                "Submitted At": formatReportDate(submittedAt),
                __sort: toJsDate(submittedAt)?.getTime() || 0,
            });
        });
    } catch (err) {
        console.warn("[WARN] missions report:", err);
    }

    rows.sort((a, b) => b.__sort - a.__sort);
    return { headers, rows };
}

async function fetchVolunteersReport(range) {
    const headers = [
        "Name",
        "Email",
        "Phone",
        "Points",
        "Level",
        "Status",
        "Created At",
    ];
    const rows = [];

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const role = String(data.role || "volunteer").toLowerCase();
            if (role === "admin" || role === "organization" || role === "org") {
                return;
            }
            const createdAt =
                data.createdAt || data.registeredAt || data.updatedAt || null;
            if (!inDateRange(createdAt, range)) return;
            rows.push({
                Name:
                    data.name ||
                    data.displayName ||
                    data.fullName ||
                    docSnap.id,
                Email: data.email || "",
                Phone:
                    data.phone ||
                    data.mobile ||
                    data.mobileNumber ||
                    "",
                Points: Number(data.totalPoints) || 0,
                Level: data.volunteerLevel || "",
                Status: data.disabled ? "Disabled" : data.status || "Active",
                "Created At": formatReportDate(createdAt),
                __sort: toJsDate(createdAt)?.getTime() || 0,
            });
        });
    } catch (err) {
        console.warn("[WARN] volunteers report:", err);
    }

    rows.sort((a, b) => b.__sort - a.__sort);
    return { headers, rows };
}

async function fetchDonationsReport(range) {
    const headers = [
        "Campaign",
        "Organization",
        "Status",
        "Mode",
        "Target",
        "Raised",
        "Donors",
        "Submitted At",
    ];
    const rows = [];

    try {
        const snap = await getDocs(collection(db, "donation_campaigns"));
        snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const submittedAt =
                data.submittedAt ||
                data.publishedAt ||
                data.createdAt ||
                data.updatedAt ||
                null;
            if (!inDateRange(submittedAt, range)) return;
            const raised =
                Number(data.raisedAmountCentavos) ||
                Number(data.raisedCentavos) ||
                0;
            const target = Number(data.targetAmountCentavos) || 0;
            rows.push({
                Campaign: data.title || docSnap.id,
                Organization: data.orgName || data.orgId || "",
                Status: campaignStatusLabel(data.status || ""),
                Mode: donationModeLabel(resolveDonationMode(data)),
                Target: target ? formatReportMoney(target) : "-",
                Raised: formatReportMoney(raised),
                Donors: Number(data.donorCount) || 0,
                "Submitted At": formatReportDate(submittedAt),
                __sort: toJsDate(submittedAt)?.getTime() || 0,
            });
        });
    } catch (err) {
        console.warn("[WARN] donations report:", err);
    }

    rows.sort((a, b) => b.__sort - a.__sort);
    return { headers, rows };
}

function looksLikeId(value) {
    const s = String(value || "").trim();
    if (!s) return true;
    // Firebase auto-ids / Auth UIDs are long alphanumeric strings without spaces.
    return /^[A-Za-z0-9_-]{16,}$/.test(s) && !/\s/.test(s);
}

async function buildUserProfileMap() {
    const map = new Map();
    try {
        const snap = await getDocs(collection(db, "users"));
        snap.docs.forEach((docSnap) => {
            const data = docSnap.data() || {};
            map.set(docSnap.id, {
                name:
                    data.name ||
                    data.displayName ||
                    data.fullName ||
                    "",
                email: data.email || "",
            });
        });
    } catch (err) {
        console.warn("[WARN] attendance user lookup:", err);
    }
    return map;
}

async function buildMissionNameMap() {
    const map = new Map();

    const remember = (id, data = {}) => {
        if (!id || map.has(id)) return;
        const name =
            data.missionName ||
            data.name ||
            data.title ||
            data.mission_name ||
            "";
        if (name) map.set(id, name);
    };

    try {
        const snap = await getDocs(collection(db, "mission_submissions"));
        snap.docs.forEach((docSnap) => remember(docSnap.id, docSnap.data()));
    } catch (err) {
        console.warn("[WARN] attendance mission_submissions lookup:", err);
    }

    try {
        const orgSnap = await getDocs(collection(db, "organizations"));
        for (const orgDoc of orgSnap.docs) {
            for (const sub of ["missions", "history"]) {
                try {
                    const snap = await getDocs(
                        collection(db, "organizations", orgDoc.id, sub)
                    );
                    snap.docs.forEach((docSnap) =>
                        remember(docSnap.id, docSnap.data())
                    );
                } catch {
                    /* skip */
                }
            }
        }
    } catch (err) {
        console.warn("[WARN] attendance org missions lookup:", err);
    }

    return map;
}

async function fetchAttendanceReport(range) {
    const headers = [
        "Volunteer",
        "Email",
        "Mission",
        "Status",
        "Time In",
        "Time Out",
    ];
    const pending = [];
    const seen = new Set();

    const queuePending = (data, path = "", extras = {}) => {
        const timeIn = data.timeInAt || null;
        const timeOut = data.timeOutAt || null;
        if (!timeIn && !timeOut) return;
        if (!inDateRange(timeIn || timeOut, range)) return;

        const pathParts = String(path || "").split("/");
        const userId =
            data.userId ||
            extras.userId ||
            (pathParts[0] === "users" && pathParts[2] === "applications"
                ? pathParts[1]
                : "") ||
            (pathParts[0] === "organizations" &&
            pathParts[2] === "missions" &&
            pathParts[4] === "volunteers"
                ? pathParts[5]
                : "") ||
            "";
        const missionId =
            resolveMissionIdFromApplication(data, path) ||
            data.missionId ||
            extras.missionId ||
            (pathParts[0] === "organizations" && pathParts[2] === "missions"
                ? pathParts[3]
                : "") ||
            "";

        const key = `${userId}:${missionId}:${formatReportDate(timeIn)}:${formatReportDate(timeOut)}`;
        if (seen.has(key)) return;
        seen.add(key);

        pending.push({
            userId,
            missionId,
            rawName:
                data.displayName ||
                data.name ||
                data.volunteerName ||
                extras.rawName ||
                "",
            rawEmail: data.email || data.volunteerEmail || extras.rawEmail || "",
            rawMission:
                data.missionTitle ||
                data.missionName ||
                extras.rawMission ||
                "",
            status: data.status || "",
            timeIn,
            timeOut,
        });
    };

    try {
        const cgSnap = await getDocs(collectionGroup(db, "applications"));
        cgSnap.docs.forEach((docSnap) =>
            queuePending(docSnap.data(), docSnap.ref?.path || "")
        );
    } catch (err) {
        console.warn("[WARN] attendance collectionGroup:", err);
    }

    try {
        const orgSnap = await getDocs(collection(db, "organizations"));
        for (const orgDoc of orgSnap.docs) {
            const missionsSnap = await getDocs(
                collection(db, "organizations", orgDoc.id, "missions")
            );
            for (const missionDoc of missionsSnap.docs) {
                const missionData = missionDoc.data() || {};
                const missionLabel =
                    missionData.missionName ||
                    missionData.name ||
                    missionData.title ||
                    "";
                try {
                    const rosterSnap = await getDocs(
                        collection(
                            db,
                            "organizations",
                            orgDoc.id,
                            "missions",
                            missionDoc.id,
                            "volunteers"
                        )
                    );
                    rosterSnap.docs.forEach((volDoc) => {
                        const data = volDoc.data() || {};
                        queuePending(
                            {
                                ...data,
                                userId: data.userId || volDoc.id,
                                missionId: missionDoc.id,
                            },
                            `organizations/${orgDoc.id}/missions/${missionDoc.id}/volunteers/${volDoc.id}`,
                            {
                                missionId: missionDoc.id,
                                userId: data.userId || volDoc.id,
                                rawMission: missionLabel,
                            }
                        );
                    });
                } catch {
                    /* skip roster */
                }
            }
        }
    } catch (err) {
        console.warn("[WARN] attendance roster scan:", err);
    }

    const [userMap, missionMap] = await Promise.all([
        buildUserProfileMap(),
        buildMissionNameMap(),
    ]);

    const rows = pending.map((item) => {
        const profile = userMap.get(item.userId) || {};
        let volunteerName = item.rawName;
        if (!volunteerName || looksLikeId(volunteerName)) {
            volunteerName = profile.name || "";
        }
        if (!volunteerName) volunteerName = "Unknown volunteer";

        let email = item.rawEmail || profile.email || "";

        let missionName = item.rawMission;
        if (!missionName || looksLikeId(missionName)) {
            missionName = missionMap.get(item.missionId) || "";
        }
        if (!missionName) missionName = "Unknown mission";

        return {
            Volunteer: volunteerName,
            Email: email,
            Mission: missionName,
            Status: item.status || "",
            "Time In": formatReportDate(item.timeIn),
            "Time Out": formatReportDate(item.timeOut),
            __sort: toJsDate(item.timeIn || item.timeOut)?.getTime() || 0,
        };
    });

    rows.sort((a, b) => b.__sort - a.__sort);
    return { headers, rows };
}

async function buildReport(type) {
    const range = getReportDateRange();
    switch (type) {
        case "users":
            return fetchUsersReport(range);
        case "missions":
            return fetchMissionsReport(range);
        case "volunteers":
            return fetchVolunteersReport(range);
        case "donations":
            return fetchDonationsReport(range);
        case "attendance":
            return fetchAttendanceReport(range);
        default:
            throw new Error(`Unknown report type: ${type}`);
    }
}

function exportCsv(type, headers, rows) {
    const cleanRows = rows.map(({ __sort, ...rest }) => rest);
    const csv = rowsToCsv(headers, cleanRows);
    downloadTextFile(stampFilename(type, "csv"), csv, "text/csv;charset=utf-8");
}

function exportPdfWithJsPdf(type, headers, rows) {
    const jspdfNS = window.jspdf;
    const JsPDF = jspdfNS?.jsPDF || window.jsPDF;
    if (!JsPDF) return false;

    const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = reportTitle(type);
    const range = getReportDateRange();
    const rangeLabel =
        range.from || range.to
            ? `Period: ${range.from ? range.from.toLocaleDateString() : "…"} – ${
                  range.to ? range.toLocaleDateString() : "…"
              }`
            : "Period: All dates";

    doc.setFontSize(14);
    doc.text(`Kalinga Admin — ${title}`, 40, 36);
    doc.setFontSize(10);
    doc.text(rangeLabel, 40, 54);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
    doc.text(`Rows: ${rows.length}`, 40, 82);

    const body = rows.map((row) => headers.map((h) => String(row[h] ?? "")));

    if (typeof doc.autoTable === "function") {
        doc.autoTable({
            head: [headers],
            body,
            startY: 96,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [22, 163, 74] },
        });
    } else {
        let y = 100;
        doc.setFontSize(8);
        doc.text(headers.join(" | "), 40, y);
        y += 14;
        for (const line of body) {
            if (y > 560) {
                doc.addPage();
                y = 40;
            }
            doc.text(line.join(" | ").slice(0, 180), 40, y);
            y += 12;
        }
    }

    doc.save(stampFilename(type, "pdf"));
    return true;
}

function exportPdfViaPrint(type, headers, rows) {
    const title = reportTitle(type);
    const range = getReportDateRange();
    const rangeLabel =
        range.from || range.to
            ? `Period: ${range.from ? range.from.toLocaleDateString() : "…"} – ${
                  range.to ? range.toLocaleDateString() : "…"
              }`
            : "Period: All dates";

    const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const tbody = rows
        .map((row) => {
            const cells = headers
                .map((h) => `<td>${escapeHtml(row[h] ?? "")}</td>`)
                .join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p { margin: 0 0 4px; color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f0fdf4; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>Kalinga Admin — ${escapeHtml(title)}</h1>
  <p>${escapeHtml(rangeLabel)}</p>
  <p>Generated: ${escapeHtml(new Date().toLocaleString())} · Rows: ${rows.length}</p>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody || `<tr><td colspan="${headers.length}">No rows</td></tr>`}</tbody></table>
  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) {
        alert("Please allow pop-ups to export PDF.");
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function setExportButtonsBusy(busy) {
    document.querySelectorAll("[data-export-format]").forEach((btn) => {
        btn.disabled = busy;
    });
}

export async function exportReport(format = "csv") {
    const type = getSelectedReportType();
    const fmt = String(format || "csv").toLowerCase();

    try {
        setExportButtonsBusy(true);
        const { headers, rows } = await buildReport(type);
        if (!rows.length) {
            alert("No records found for this report and date range.");
            return;
        }

        if (fmt === "pdf") {
            const ok = exportPdfWithJsPdf(type, headers, rows);
            if (!ok) exportPdfViaPrint(type, headers, rows);
        } else {
            exportCsv(type, headers, rows);
        }
    } catch (err) {
        console.error("[ERROR] exportReport:", err);
        alert("Could not export report. Please try again.");
    } finally {
        setExportButtonsBusy(false);
    }
}

export function bindAdminReportExports() {
    window.exportReport = exportReport;
    document.querySelectorAll("[data-export-format]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const format = btn.getAttribute("data-export-format") || "csv";
            void exportReport(format);
        });
    });
}
