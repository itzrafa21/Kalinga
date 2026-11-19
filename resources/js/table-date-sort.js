/** Shared date-column sorting for org tables (earliest ↔ oldest). */

export function parseSortableDateMs(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value?.toDate === "function") {
        const d = value.toDate();
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    }
    if (value?.seconds != null) {
        return Number(value.seconds) * 1000;
    }
    if (value?._seconds != null) {
        return Number(value._seconds) * 1000;
    }
    const raw = String(value).trim();
    if (!raw || raw === "—" || raw === "N/A") return 0;
    // Full ISO timestamps (createdAt) before date-only mission schedule strings.
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) {
        const d = new Date(`${iso[1]}T12:00:00`);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function compareDateMs(aMs, bMs, dir = "asc") {
    const a = Number.isFinite(aMs) ? aMs : 0;
    const b = Number.isFinite(bMs) ? bMs : 0;
    return dir === "asc" ? a - b : b - a;
}

/** First click → earliest first; next click → oldest first. */
export function toggleDateSortDir(current) {
    return current === "asc" ? "desc" : "asc";
}

export function updateDateSortHeader(th, dir) {
    if (!th) return;
    th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    th.dataset.sortDir = dir;
    const icon = th.querySelector(".th-sort-icon");
    if (icon) {
        icon.classList.remove("bi-sort-up", "bi-sort-down");
        icon.classList.add("bi", "bi-arrow-down-up");
    }
}

/**
 * Wire a sortable date <th>.
 * @param {HTMLElement|null} th
 * @param {{ getDir: () => 'asc'|'desc', setDir: (d: string) => void, onSort: () => void }} opts
 */
export function wireDateSortHeader(th, { getDir, setDir, onSort }) {
    if (!th || th.dataset.sortWired === "1") return;
    th.dataset.sortWired = "1";
    th.classList.add("th-sortable");

    let btn = th.querySelector(".th-sort-btn");
    if (!btn) {
        const label = (th.textContent || "Date").trim();
        th.innerHTML = "";
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "th-sort-btn";
        btn.innerHTML = `${label} <i class="bi bi-arrow-down-up th-sort-icon" aria-hidden="true"></i>`;
        th.appendChild(btn);
    }

    const initial = getDir() || "asc";
    setDir(initial);
    updateDateSortHeader(th, initial);

    btn.addEventListener("click", () => {
        const next = toggleDateSortDir(getDir() || "asc");
        setDir(next);
        updateDateSortHeader(th, next);
        onSort();
    });
}
