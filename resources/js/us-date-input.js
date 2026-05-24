/** Date inputs: native calendar (type="date"), store/read ISO YYYY-MM-DD. */

export function isoToUsDate(iso) {
    const raw = String(iso ?? "").trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
    }
    return raw;
}

export function usDateToIso(us) {
    const raw = String(us ?? "").trim();
    const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!usMatch) return "";

    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) {
        return "";
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${year}-${mm}-${dd}`;
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
        return "";
    }
    return iso;
}

function normalizeToIsoDate(value) {
    const raw = String(value ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return usDateToIso(raw);
}

export function initUsDateInput(el) {
    if (!el || el.dataset.usDateInit === "1") return;
    el.dataset.usDateInit = "1";
    el.type = "date";
    el.removeAttribute("placeholder");
    el.removeAttribute("inputmode");
    el.removeAttribute("maxlength");
    el.removeAttribute("pattern");

    const iso = normalizeToIsoDate(el.value);
    if (iso) el.value = iso;
}

export function initUsDateInputs(ids) {
    ids.forEach((id) => initUsDateInput(document.getElementById(id)));
}

export function readUsDateInputValue(el) {
    if (!el) return "";
    return normalizeToIsoDate(el.value);
}

export function setUsDateInputValue(el, value) {
    if (!el) return;
    const iso = normalizeToIsoDate(value);
    el.value = iso || "";
}

export function validateUsDateInput(el, label) {
    const iso = readUsDateInputValue(el);
    if (!iso) {
        return { ok: false, message: `${label} is required.` };
    }
    return { ok: true, iso };
}
