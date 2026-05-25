import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { buildInitialHotlinesSeed } from "./hotlines-seed.js";

const HOTLINES_DOC = ["platform_config", "hotlines"];

let hotlineItems = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();

    document.getElementById("adminLogoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "/admin/login";
        });
    });

    document.getElementById("hotlinesSaveBtn")?.addEventListener("click", () =>
        saveHotlinesToFirestore()
    );
    document.getElementById("hotlineAddBtn")?.addEventListener("click", () =>
        showAddHotlineForm()
    );
    document.getElementById("hotlineAddConfirmBtn")?.addEventListener("click", () =>
        addHotlineFromForm()
    );
    document.getElementById("hotlineAddCancelBtn")?.addEventListener("click", () =>
        hideAddHotlineForm()
    );
});

function checkAdminAuth() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/admin/login";
            return;
        }
        if (
            !user.email.includes("@admin.kalinga.com") &&
            !user.email.includes("admin@")
        ) {
            alert("Access denied. Admin credentials required.");
            window.location.href = "/admin/login";
            return;
        }
        const email = user.email;
        document.getElementById("adminEmail") &&
            (document.getElementById("adminEmail").textContent = email);
        const side = document.getElementById("adminEmailSidebar");
        if (side) side.textContent = email;
        loadHotlinesFromFirestore();
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function slugId(name) {
    const base = String(name)
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .toLowerCase();
    return base || `hotline-${Date.now()}`;
}

function uniqueId(base) {
    let id = base;
    let n = 1;
    const ids = new Set(hotlineItems.map((h) => h.id));
    while (ids.has(id)) {
        id = `${base}-${n++}`;
    }
    return id;
}

function categoryClass(category) {
    const c = (category || "").toLowerCase();
    if (c === "emergency") return "bp-red";
    if (c === "medical") return "bp-blue";
    if (c === "disaster") return "bp-amber";
    return "bp-gray";
}

function createHotlineRowElement(item) {
    const key = item.id;
    const isActive = item.active !== false;
    const row = document.createElement("div");
    row.className = "hotline-row";
    row.id = "hl-" + key;
    row.dataset.hotlineId = key;
    row.innerHTML = `
    <div class="hotline-main">
      <div class="hotline-name">${escapeHtml(item.name)}</div>
      <div class="hotline-meta">
        <a href="tel:${escapeHtml(String(item.number).replace(/\s/g, ""))}" class="hotline-number">${escapeHtml(item.number)}</a>
        ${item.description ? `<span class="hotline-desc">${escapeHtml(item.description)}</span>` : ""}
      </div>
    </div>
    <div class="cfg-right">
      <span class="badge-pill ${categoryClass(item.category)}">${escapeHtml(item.category || "General")}</span>
      <span class="badge-pill ${isActive ? "bp-green" : "bp-gray"} status-pill">${isActive ? "Active" : "Hidden"}</span>
      <div class="toggle ${isActive ? "on" : ""}" role="switch" aria-checked="${isActive}" tabindex="0"></div>
      <button type="button" class="btn btn-edit btn-sm" data-edit-hotline="${escapeHtml(key)}" aria-label="Edit hotline"><i class="ti ti-pencil" style="font-size:12px"></i></button>
      <button type="button" class="btn btn-r btn-sm" data-remove-hotline="${escapeHtml(key)}"><i class="ti ti-trash" style="font-size:12px"></i></button>
    </div>`;
    return row;
}

function renderHotlinesList(items) {
    hotlineItems = [...items].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    const list = document.getElementById("hotline-list");
    const form = document.getElementById("add-hotline-form");
    const empty = document.getElementById("hotline-empty");
    if (!list) return;

    list.querySelectorAll(".hotline-row").forEach((row) => row.remove());

    if (hotlineItems.length === 0) {
        if (empty) empty.hidden = false;
    } else {
        if (empty) empty.hidden = true;
        hotlineItems.forEach((item) => {
            const row = createHotlineRowElement(item);
            list.insertBefore(row, form);
        });
    }

    const countEl = document.getElementById("hotlineCount");
    if (countEl) {
        const n = hotlineItems.length;
        countEl.textContent = n === 1 ? "1 hotline" : `${n} hotlines`;
    }

    bindAllHotlineRows();
}

function bindHotlineRow(row, key) {
    const toggle = row.querySelector(".toggle");
    const pill = row.querySelector(".status-pill");
    toggle?.addEventListener("click", () => {
        toggle.classList.toggle("on");
        const on = toggle.classList.contains("on");
        toggle.setAttribute("aria-checked", on ? "true" : "false");
        if (pill) {
            pill.textContent = on ? "Active" : "Hidden";
            pill.classList.toggle("bp-green", on);
            pill.classList.toggle("bp-gray", !on);
        }
        syncHotlineItemFromRow(key);
        persistHotlines();
    });
    row.querySelector("[data-edit-hotline]")?.addEventListener("click", () =>
        toggleHotlineEdit(key)
    );
    row.querySelector("[data-remove-hotline]")?.addEventListener("click", () =>
        removeHotline(key)
    );
}

function bindAllHotlineRows() {
    document.querySelectorAll("#hotline-list .hotline-row").forEach((row) => {
        const key = row.dataset.hotlineId;
        bindHotlineRow(row, key);
    });
}

function getHotlineFromRow(row) {
    const id = row.dataset.hotlineId;
    const name = row.querySelector(".hotline-name")?.textContent?.trim() || "";
    const number =
        row.querySelector(".hotline-number")?.textContent?.trim() ||
        row.querySelector(".hotline-number-in")?.value?.trim() ||
        "";
    const descEl = row.querySelector(".hotline-desc");
    const desc =
        descEl?.tagName === "INPUT"
            ? descEl.value.trim()
            : descEl?.textContent?.trim() || "";
    const category =
        row.querySelector(".hotline-cat-in")?.value?.trim() ||
        row.querySelector(".badge-pill:not(.status-pill)")?.textContent?.trim() ||
        "General";
    const active = row.querySelector(".toggle")?.classList.contains("on") ?? true;
    const existing = hotlineItems.find((h) => h.id === id);
    return {
        id,
        name,
        number,
        category,
        description: desc,
        active,
        sortOrder: existing?.sortOrder ?? hotlineItems.length,
    };
}

function syncHotlineItemFromRow(key) {
    const row = document.getElementById("hl-" + key);
    if (!row) return;
    const updated = getHotlineFromRow(row);
    const idx = hotlineItems.findIndex((h) => h.id === key);
    if (idx >= 0) hotlineItems[idx] = updated;
}

function collectHotlinesFromDom() {
    const items = [];
    document.querySelectorAll("#hotline-list .hotline-row").forEach((row, i) => {
        items.push({
            ...getHotlineFromRow(row),
            sortOrder: i,
        });
    });
    return items;
}

function showAddHotlineForm() {
    const form = document.getElementById("add-hotline-form");
    if (form) {
        form.style.display = "block";
        document.getElementById("nh-name")?.focus();
    }
}

function hideAddHotlineForm() {
    const form = document.getElementById("add-hotline-form");
    if (form) form.style.display = "none";
    ["nh-name", "nh-number", "nh-desc"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const cat = document.getElementById("nh-category");
    if (cat) cat.value = "Emergency";
}

function addHotlineFromForm() {
    const name = document.getElementById("nh-name")?.value.trim();
    const number = document.getElementById("nh-number")?.value.trim();
    const category = document.getElementById("nh-category")?.value.trim() || "General";
    const description = document.getElementById("nh-desc")?.value.trim() || "";
    if (!name || !number) {
        alert("Name and phone number are required.");
        return;
    }
    const id = uniqueId(slugId(name));
    const item = {
        id,
        name,
        number,
        category,
        description,
        active: true,
        sortOrder: hotlineItems.length,
    };
    hotlineItems.push(item);
    renderHotlinesList(hotlineItems);
    hideAddHotlineForm();
    persistHotlines();
    flashSaved();
}

function removeHotline(key) {
    if (!confirm("Remove this hotline from the list?")) return;
    hotlineItems = hotlineItems.filter((h) => h.id !== key);
    renderHotlinesList(hotlineItems);
    persistHotlines();
}

function startHotlineEdit(key) {
    const row = document.getElementById("hl-" + key);
    if (!row || row.classList.contains("is-editing")) return;
    const item = hotlineItems.find((h) => h.id === key);
    if (!item) return;

    row.dataset.editName = item.name;
    row.dataset.editNumber = item.number;
    row.dataset.editDesc = item.description || "";
    row.dataset.editCategory = item.category || "General";

    const nameEl = row.querySelector(".hotline-name");
    const meta = row.querySelector(".hotline-meta");
    if (nameEl && meta) {
        nameEl.outerHTML = `<input type="text" class="hotline-name-in" value="${escapeHtml(item.name)}" aria-label="Hotline name" />`;
        meta.innerHTML = `
          <input type="text" class="hotline-number-in" value="${escapeHtml(item.number)}" aria-label="Phone number" />
          <input type="text" class="hotline-desc-in" value="${escapeHtml(item.description || "")}" placeholder="Description (optional)" aria-label="Description" />
          <select class="hotline-cat-in" aria-label="Category">
            ${["Emergency", "Medical", "Disaster", "Support", "General"]
                .map(
                    (c) =>
                        `<option value="${c}"${c === (item.category || "General") ? " selected" : ""}>${c}</option>`
                )
                .join("")}
          </select>`;
    }

    row.classList.add("is-editing");
    const catPill = row.querySelector(".badge-pill:not(.status-pill)");
    if (catPill) catPill.style.display = "none";

    const btn = row.querySelector("[data-edit-hotline]");
    if (btn) {
        btn.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i>';
        btn.setAttribute("aria-label", "Save hotline");
    }
    row.querySelector(".hotline-name-in")?.focus();
}

function saveHotlineEdit(key) {
    const row = document.getElementById("hl-" + key);
    if (!row) return;

    const name = row.querySelector(".hotline-name-in")?.value.trim() || row.dataset.editName;
    const number = row.querySelector(".hotline-number-in")?.value.trim() || row.dataset.editNumber;
    const description = row.querySelector(".hotline-desc-in")?.value.trim() || "";
    const category = row.querySelector(".hotline-cat-in")?.value.trim() || "General";

    if (!name || !number) {
        alert("Name and phone number are required.");
        return;
    }

    const idx = hotlineItems.findIndex((h) => h.id === key);
    if (idx >= 0) {
        hotlineItems[idx] = {
            ...hotlineItems[idx],
            name,
            number,
            description,
            category,
        };
    }

    renderHotlinesList(hotlineItems);
    persistHotlines();
    flashSaved();
}

function cancelHotlineEdit(key) {
    const row = document.getElementById("hl-" + key);
    if (!row?.classList.contains("is-editing")) return;
    renderHotlinesList(hotlineItems);
}

function toggleHotlineEdit(key) {
    const row = document.getElementById("hl-" + key);
    if (!row) return;
    if (row.classList.contains("is-editing")) saveHotlineEdit(key);
    else startHotlineEdit(key);
}

function flashSaved() {
    const toast = document.getElementById("hotlinesSaveToast");
    if (!toast) return;
    toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
        toast.hidden = true;
    }, 2500);
}

async function saveHotlinesToFirestore(options = {}) {
    const { silent = false } = options;
    const items = collectHotlinesFromDom();
    hotlineItems = items;
    try {
        await setDoc(
            doc(db, ...HOTLINES_DOC),
            { items, updatedAt: serverTimestamp() },
            { merge: true }
        );
        if (!silent) flashSaved();
    } catch (err) {
        console.error("[ERROR] save hotlines:", err);
        if (!silent) {
            alert(
                "Could not save hotlines. Check Firestore rules for platform_config/hotlines."
            );
        }
    }
}

function persistHotlines() {
    saveHotlinesToFirestore({ silent: true });
}

async function loadHotlinesFromFirestore() {
    const list = document.getElementById("hotline-list");
    if (list) {
        list.querySelectorAll(".hotline-row").forEach((r) => r.remove());
    }
    try {
        const ref = doc(db, ...HOTLINES_DOC);
        const snap = await getDoc(ref);
        let items =
            snap.exists() && Array.isArray(snap.data().items)
                ? snap.data().items
                : null;

        if (!items || items.length === 0) {
            items = buildInitialHotlinesSeed();
            await setDoc(
                ref,
                { items, updatedAt: serverTimestamp() },
                { merge: true }
            );
        }

        renderHotlinesList(items);
    } catch (err) {
        console.warn("[WARN] load hotlines:", err);
        renderHotlinesList(buildInitialHotlinesSeed());
    }
}
