/** US date inputs: display MM/DD/YYYY, store/read ISO YYYY-MM-DD. */

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

function formatDateDigits(value) {
    const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function initUsDateInput(el) {
    if (!el || el.dataset.usDateInit === "1") return;
    el.dataset.usDateInit = "1";
    el.type = "text";
    el.placeholder = "MM/DD/YYYY";
    el.setAttribute("inputmode", "numeric");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("maxlength", "10");
    el.setAttribute("pattern", "\\d{2}/\\d{2}/\\d{4}");

    if (el.value && /^\d{4}-\d{2}-\d{2}/.test(el.value.trim())) {
        el.value = isoToUsDate(el.value);
    }

    el.addEventListener("input", () => {
        el.value = formatDateDigits(el.value);
    });
}

export function initUsDateInputs(ids) {
    ids.forEach((id) => initUsDateInput(document.getElementById(id)));
}

export function readUsDateInputValue(el) {
    if (!el) return "";
    const iso = usDateToIso(el.value);
    if (iso) return iso;
    const raw = String(el.value ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return "";
}

export function setUsDateInputValue(el, value) {
    if (!el) return;
    el.value = isoToUsDate(value);
}

export function validateUsDateInput(el, label) {
    const text = String(el?.value ?? "").trim();
    if (!text) {
        return { ok: false, message: `${label} is required.` };
    }
    const iso = readUsDateInputValue(el);
    if (!iso) {
        return { ok: false, message: `${label} must be a valid date (MM/DD/YYYY).` };
    }
    return { ok: true, iso };
}
