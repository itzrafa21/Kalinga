import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { buildInitialHotlinesSeed } from "./hotlines-seed.js";
import { migrateFlatItemsToCategories } from "./hotlines-data.js";

const HOTLINES_DOC = ["platform_config", "hotlines"];

/** @type {import('./hotlines-data.js').HotlineCategory[]} */
let hotlineCategories = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();

    document.getElementById("adminLogoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "/admin/login";
        });
    });

    document.getElementById("categoryAddBtn")?.addEventListener("click", () =>
        showAddCategoryForm()
    );
    document.getElementById("categoryAddConfirmBtn")?.addEventListener("click", () =>
        addCategoryFromForm()
    );
    document.getElementById("categoryAddCancelBtn")?.addEventListener("click", () =>
        hideAddCategoryForm()
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
        const top = document.getElementById("adminEmail");
        const side = document.getElementById("adminEmailSidebar");
        if (top) top.textContent = email;
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
    return base || `id-${Date.now()}`;
}

function uniqueCategoryId(base) {
    let id = base;
    let n = 1;
    const ids = new Set(hotlineCategories.map((c) => c.id));
    while (ids.has(id)) id = `${base}-${n++}`;
    return id;
}

function uniqueNumberId(category, base) {
    let id = base;
    let n = 1;
    const ids = new Set((category.numbers || []).map((num) => num.id));
    while (ids.has(id)) id = `${base}-${n++}`;
    return id;
}

function telHref(number) {
    return `tel:${String(number).replace(/[^\d+]/g, "")}`;
}

function sortCategories(categories) {
    return [...categories]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({
            ...c,
            numbers: [...(c.numbers || [])].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            ),
        }));
}

function createNumberRowHtml(categoryId, num) {
    const isActive = num.active !== false;
    return `
      <div class="number-row" data-category-id="${escapeHtml(categoryId)}" data-number-id="${escapeHtml(num.id)}">
        <div class="number-main">
          <span class="number-label">${escapeHtml(num.label)}</span>
          <a href="${telHref(num.number)}" class="number-value">${escapeHtml(num.number)}</a>
        </div>
        <div class="cfg-right">
          <span class="badge-pill ${isActive ? "bp-green" : "bp-gray"} num-status-pill">${isActive ? "Shown" : "Hidden"}</span>
          <div class="toggle num-toggle ${isActive ? "on" : ""}" role="switch" aria-checked="${isActive}" tabindex="0"></div>
          <button type="button" class="btn btn-edit btn-sm" data-edit-number aria-label="Edit number"><i class="ti ti-pencil" style="font-size:12px"></i></button>
          <button type="button" class="btn btn-r btn-sm" data-remove-number aria-label="Remove number"><i class="ti ti-trash" style="font-size:12px"></i></button>
        </div>
      </div>`;
}

function createCategoryCardElement(cat) {
    const isActive = cat.active !== false;
    const numbers = cat.numbers || [];
    const card = document.createElement("article");
    card.className = "hotline-category";
    card.id = "cat-" + cat.id;
    card.dataset.categoryId = cat.id;

    const numbersHtml =
        numbers.length > 0
            ? numbers.map((n) => createNumberRowHtml(cat.id, n)).join("")
            : `<p class="numbers-empty">No numbers yet. Add a line for this organization.</p>`;

    card.innerHTML = `
    <header class="category-head">
      <div class="category-head-text">
        <h3 class="category-name">${escapeHtml(cat.name)}</h3>
        ${cat.location ? `<p class="category-location">${escapeHtml(cat.location)}</p>` : ""}
      </div>
      <div class="cfg-right">
        <span class="badge-pill ${isActive ? "bp-green" : "bp-gray"} cat-status-pill">${isActive ? "Active" : "Hidden"}</span>
        <div class="toggle cat-toggle ${isActive ? "on" : ""}" role="switch" aria-checked="${isActive}" tabindex="0"></div>
        <button type="button" class="btn btn-edit btn-sm" data-edit-category aria-label="Edit organization"><i class="ti ti-pencil" style="font-size:12px"></i></button>
        <button type="button" class="btn btn-r btn-sm" data-remove-category aria-label="Remove organization"><i class="ti ti-trash" style="font-size:12px"></i></button>
      </div>
    </header>
    <div class="numbers-block">
      <div class="numbers-head">
        <span class="numbers-title">Numbers to call</span>
        <button type="button" class="btn btn-g btn-sm" data-add-number>
          <i class="ti ti-plus" style="font-size:12px"></i> Add number
        </button>
      </div>
      <div class="numbers-list">${numbersHtml}</div>
      <div class="add-number-form" data-add-number-form hidden>
        <div class="add-row">
          <input type="text" class="an-label" placeholder="Label (e.g. Operations Center)" aria-label="Number label" />
          <input type="text" class="an-number" placeholder="Phone number" aria-label="Phone number" />
          <button type="button" class="btn btn-g btn-sm" data-confirm-add-number>Add</button>
          <button type="button" class="btn btn-sm" data-cancel-add-number>Cancel</button>
        </div>
      </div>
    </div>`;

    return card;
}

function renderHotlineCategories(categories) {
    hotlineCategories = sortCategories(categories);
    const root = document.getElementById("hotline-categories");
    const empty = document.getElementById("hotline-empty");
    if (!root) return;

    root.innerHTML = "";

    if (hotlineCategories.length === 0) {
        if (empty) empty.hidden = false;
    } else {
        if (empty) empty.hidden = true;
        hotlineCategories.forEach((cat) => {
            root.appendChild(createCategoryCardElement(cat));
        });
    }

    bindAllCategoryCards();
}

function getCategoryById(id) {
    return hotlineCategories.find((c) => c.id === id);
}

function bindCategoryCard(card) {
    const categoryId = card.dataset.categoryId;

    card.querySelector(".cat-toggle")?.addEventListener("click", (e) => {
        const toggle = e.currentTarget;
        toggle.classList.toggle("on");
        const on = toggle.classList.contains("on");
        toggle.setAttribute("aria-checked", on ? "true" : "false");
        const pill = card.querySelector(".cat-status-pill");
        if (pill) {
            pill.textContent = on ? "Active" : "Hidden";
            pill.classList.toggle("bp-green", on);
            pill.classList.toggle("bp-gray", !on);
        }
        const cat = getCategoryById(categoryId);
        if (cat) cat.active = on;
        persistHotlines();
    });

    card.querySelector("[data-edit-category]")?.addEventListener("click", () =>
        toggleCategoryEdit(categoryId)
    );
    card.querySelector("[data-remove-category]")?.addEventListener("click", () =>
        removeCategory(categoryId)
    );
    card.querySelector("[data-add-number]")?.addEventListener("click", () =>
        showAddNumberForm(card)
    );

    card.querySelectorAll(".number-row").forEach((row) => bindNumberRow(card, row));

    const confirmAdd = card.querySelector("[data-confirm-add-number]");
    const cancelAdd = card.querySelector("[data-cancel-add-number]");
    confirmAdd?.addEventListener("click", () => confirmAddNumber(card, categoryId));
    cancelAdd?.addEventListener("click", () => hideAddNumberForm(card));
}

function bindNumberRow(card, row) {
    const categoryId = row.dataset.categoryId;
    const numberId = row.dataset.numberId;

    row.querySelector(".num-toggle")?.addEventListener("click", (e) => {
        const toggle = e.currentTarget;
        toggle.classList.toggle("on");
        const on = toggle.classList.contains("on");
        toggle.setAttribute("aria-checked", on ? "true" : "false");
        const pill = row.querySelector(".num-status-pill");
        if (pill) {
            pill.textContent = on ? "Shown" : "Hidden";
            pill.classList.toggle("bp-green", on);
            pill.classList.toggle("bp-gray", !on);
        }
        const cat = getCategoryById(categoryId);
        const num = cat?.numbers?.find((n) => n.id === numberId);
        if (num) num.active = on;
        persistHotlines();
    });

    row.querySelector("[data-edit-number]")?.addEventListener("click", () =>
        toggleNumberEdit(categoryId, numberId)
    );
    row.querySelector("[data-remove-number]")?.addEventListener("click", () =>
        removeNumber(categoryId, numberId)
    );
}

function bindAllCategoryCards() {
    document.querySelectorAll("#hotline-categories .hotline-category").forEach(bindCategoryCard);
}

function showAddCategoryForm() {
    const form = document.getElementById("add-category-form");
    if (form) {
        form.hidden = false;
        document.getElementById("nc-name")?.focus();
    }
}

function hideAddCategoryForm() {
    const form = document.getElementById("add-category-form");
    if (form) form.hidden = true;
    ["nc-name", "nc-location"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function addCategoryFromForm() {
    const name = document.getElementById("nc-name")?.value.trim();
    const location = document.getElementById("nc-location")?.value.trim() || "";
    if (!name) {
        alert("Organization name is required (e.g. NDRRMC, Philippine Red Cross).");
        return;
    }
    const id = uniqueCategoryId(slugId(name));
    hotlineCategories.push({
        id,
        name,
        location,
        active: true,
        sortOrder: hotlineCategories.length,
        numbers: [],
    });
    renderHotlineCategories(hotlineCategories);
    hideAddCategoryForm();
    persistHotlines();
    flashSaved();
}

function removeCategory(categoryId) {
    const cat = getCategoryById(categoryId);
    if (
        !confirm(
            `Remove "${cat?.name || "this organization"}" and all of its phone numbers?`
        )
    ) {
        return;
    }
    hotlineCategories = hotlineCategories.filter((c) => c.id !== categoryId);
    renderHotlineCategories(hotlineCategories);
    persistHotlines();
}

function startCategoryEdit(categoryId) {
    const card = document.getElementById("cat-" + categoryId);
    const cat = getCategoryById(categoryId);
    if (!card || !cat || card.classList.contains("is-editing-cat")) return;

    const headText = card.querySelector(".category-head-text");
    if (!headText) return;

    headText.innerHTML = `
      <input type="text" class="cat-name-in" value="${escapeHtml(cat.name)}" aria-label="Organization name" />
      <input type="text" class="cat-location-in" value="${escapeHtml(cat.location || cat.description || "")}" placeholder="Location (e.g. Metro Manila)" aria-label="Location" />`;

    card.classList.add("is-editing-cat");
    const cfgRight = card.querySelector(".category-head .cfg-right");
    if (cfgRight) cfgRight.hidden = true;
    const btn = card.querySelector("[data-edit-category]");
    if (btn) {
        btn.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i>';
    }
    card.querySelector(".cat-name-in")?.focus();
}

function saveCategoryEdit(categoryId) {
    const card = document.getElementById("cat-" + categoryId);
    const cat = getCategoryById(categoryId);
    if (!card || !cat) return;

    const name = card.querySelector(".cat-name-in")?.value.trim();
    const location = card.querySelector(".cat-location-in")?.value.trim() || "";
    if (!name) {
        alert("Organization name is required.");
        return;
    }

    cat.name = name;
    cat.location = location;
    delete cat.description;
    renderHotlineCategories(hotlineCategories);
    persistHotlines();
    flashSaved();
}

function toggleCategoryEdit(categoryId) {
    const card = document.getElementById("cat-" + categoryId);
    if (!card) return;
    if (card.classList.contains("is-editing-cat")) saveCategoryEdit(categoryId);
    else startCategoryEdit(categoryId);
}

function showAddNumberForm(card) {
    const form = card.querySelector("[data-add-number-form]");
    if (form) {
        form.hidden = false;
        form.querySelector(".an-label")?.focus();
    }
}

function hideAddNumberForm(card) {
    const form = card.querySelector("[data-add-number-form]");
    if (!form) return;
    form.hidden = true;
    form.querySelector(".an-label").value = "";
    form.querySelector(".an-number").value = "";
}

function confirmAddNumber(card, categoryId) {
    const form = card.querySelector("[data-add-number-form]");
    const label = form?.querySelector(".an-label")?.value.trim();
    const number = form?.querySelector(".an-number")?.value.trim();
    if (!label || !number) {
        alert("Label and phone number are required.");
        return;
    }
    const cat = getCategoryById(categoryId);
    if (!cat) return;
    if (!cat.numbers) cat.numbers = [];
    cat.numbers.push({
        id: uniqueNumberId(cat, slugId(label)),
        label,
        number,
        active: true,
        sortOrder: cat.numbers.length,
    });
    renderHotlineCategories(hotlineCategories);
    hideAddNumberForm(card);
    persistHotlines();
    flashSaved();
}

function removeNumber(categoryId, numberId) {
    if (!confirm("Remove this phone number?")) return;
    const cat = getCategoryById(categoryId);
    if (!cat?.numbers) return;
    cat.numbers = cat.numbers.filter((n) => n.id !== numberId);
    renderHotlineCategories(hotlineCategories);
    persistHotlines();
}

function startNumberEdit(categoryId, numberId) {
    const row = document.querySelector(
        `.number-row[data-category-id="${categoryId}"][data-number-id="${numberId}"]`
    );
    const cat = getCategoryById(categoryId);
    const num = cat?.numbers?.find((n) => n.id === numberId);
    if (!row || !num || row.classList.contains("is-editing-num")) return;

    row.querySelector(".number-main").innerHTML = `
      <input type="text" class="num-label-in" value="${escapeHtml(num.label)}" aria-label="Label" />
      <input type="text" class="num-value-in" value="${escapeHtml(num.number)}" aria-label="Phone number" />`;
    row.classList.add("is-editing-num");
    const btn = row.querySelector("[data-edit-number]");
    if (btn) btn.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i>';
    row.querySelector(".num-label-in")?.focus();
}

function saveNumberEdit(categoryId, numberId) {
    const row = document.querySelector(
        `.number-row[data-category-id="${categoryId}"][data-number-id="${numberId}"]`
    );
    const cat = getCategoryById(categoryId);
    const num = cat?.numbers?.find((n) => n.id === numberId);
    if (!row || !num) return;

    const label = row.querySelector(".num-label-in")?.value.trim();
    const number = row.querySelector(".num-value-in")?.value.trim();
    if (!label || !number) {
        alert("Label and phone number are required.");
        return;
    }
    num.label = label;
    num.number = number;
    renderHotlineCategories(hotlineCategories);
    persistHotlines();
    flashSaved();
}

function toggleNumberEdit(categoryId, numberId) {
    const row = document.querySelector(
        `.number-row[data-category-id="${categoryId}"][data-number-id="${numberId}"]`
    );
    if (!row) return;
    if (row.classList.contains("is-editing-num")) saveNumberEdit(categoryId, numberId);
    else startNumberEdit(categoryId, numberId);
}

function normalizeCategory(cat, i) {
    const { description, ...rest } = cat;
    return {
        ...rest,
        location: String(cat.location || description || "").trim(),
        sortOrder: i,
        numbers: (cat.numbers || []).map((num, j) => ({
            ...num,
            sortOrder: j,
        })),
    };
}

function collectCategoriesFromState() {
    return sortCategories(hotlineCategories).map(normalizeCategory);
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
    const categories = collectCategoriesFromState();
    hotlineCategories = categories;
    try {
        await setDoc(
            doc(db, ...HOTLINES_DOC),
            { categories, items: [], updatedAt: serverTimestamp() },
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

async function normalizeLoadedData(data) {
    if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories.map((cat, i) => normalizeCategory(cat, i));
    }
    if (Array.isArray(data.items) && data.items.length > 0) {
        const migrated = migrateFlatItemsToCategories(data.items);
        await setDoc(
            doc(db, ...HOTLINES_DOC),
            {
                categories: migrated,
                items: [],
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
        return migrated;
    }
    const seed = buildInitialHotlinesSeed();
    await setDoc(
        doc(db, ...HOTLINES_DOC),
        {
            categories: seed.categories,
            items: [],
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
    return seed.categories;
}

async function loadHotlinesFromFirestore() {
    try {
        const ref = doc(db, ...HOTLINES_DOC);
        const snap = await getDoc(ref);
        const categories = snap.exists()
            ? await normalizeLoadedData(snap.data())
            : (await normalizeLoadedData({}));
        renderHotlineCategories(categories);
    } catch (err) {
        console.warn("[WARN] load hotlines:", err);
        renderHotlineCategories(buildInitialHotlinesSeed().categories);
    }
}
