import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const CONFIG_DOC = ["platform_config", "settings"];

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();

    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = "/admin/login";
            });
        });
    }

    const saveBtn = document.getElementById("configSaveAllBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", () => saveConfigToFirestore());
    }
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
        loadConfigFromFirestore();
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

window.switchTab = function (id, el) {
    document.querySelectorAll(".main-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    el.classList.add("active");
    document.getElementById("tab-" + id).classList.add("active");
};

window.flashSaved = function () {
    const el = document.getElementById("pts-saved");
    if (!el) return;
    el.style.display = "inline-flex";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.display = "none";
    }, 1800);
};

window.calcPoints = function () {
    const base = parseFloat(document.getElementById("calc-type").value) || 5;
    const mult = parseFloat(document.getElementById("calc-mult").value) || 1;
    document.getElementById("calc-result").textContent = Math.round(base * mult);
};

window.showAddType = function () {
    document.getElementById("add-type-form").style.display = "block";
    document.getElementById("nt-name").focus();
};

window.addType = function () {
    const name = document.getElementById("nt-name").value.trim();
    const desc = document.getElementById("nt-desc").value.trim();
    const pts = parseInt(document.getElementById("nt-pts").value, 10) || 5;
    if (!name) return;
    const key = name.replace(/\s+/g, "");
    const row = document.createElement("div");
    row.className = "cfg-row";
    row.id = "mt-" + key;
    row.dataset.basePts = String(pts);
    row.innerHTML = `
    <div><div class="cfg-label">${escapeHtml(name)}</div><div class="cfg-sub">${escapeHtml(desc || "Custom type")}</div></div>
    <div class="cfg-right">
      <span class="type-pts-display">${pts}</span>
      <input type="number" class="pts-in type-pts-in" value="${pts}" min="0" disabled aria-label="Base points for ${escapeHtml(name)}" />
      <span class="pts-unit">pts</span>
      <span class="badge-pill bp-green status-pill">Active</span>
      <div class="toggle on" role="switch" aria-checked="true" tabindex="0"></div>
      <button type="button" class="btn btn-edit btn-sm" data-edit-type="${escapeHtml(key)}" aria-label="Edit mission type"><i class="ti ti-pencil" style="font-size:12px"></i></button>
      <button type="button" class="btn btn-r btn-sm" data-remove-type="${escapeHtml(key)}"><i class="ti ti-trash" style="font-size:12px"></i></button>
    </div>`;
    bindTypeRow(row, key);
    document.getElementById("type-list").insertBefore(row, document.getElementById("add-type-form"));
    rebuildCalcTypeOptions();

    document.getElementById("nt-name").value = "";
    document.getElementById("nt-desc").value = "";
    document.getElementById("nt-pts").value = "";
    document.getElementById("add-type-form").style.display = "none";
};

function getTypeRowBasePts(row) {
    const input = row.querySelector(".type-pts-in");
    if (input) return parseInt(input.value, 10) || 0;
    return parseInt(row.dataset.basePts || row.getAttribute("data-base-pts") || "5", 10);
}

function getTypeRowDescription(row) {
    const input = row.querySelector(".type-desc-in");
    if (input) return input.value.trim();
    return row.querySelector(".cfg-sub")?.textContent?.trim() || "";
}

function setTypePtsDisplay(row, pts) {
    const display = row.querySelector(".type-pts-display");
    if (display) display.textContent = String(pts);
}

function startTypeEdit(key) {
    const row = document.getElementById("mt-" + key);
    if (!row || row.classList.contains("is-editing")) return;

    const sub = row.querySelector(".cfg-sub");
    const desc = sub?.textContent?.trim() || "";
    const pts = getTypeRowBasePts(row);

    row.dataset.editDesc = desc;
    row.dataset.editPts = String(pts);

    if (sub) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "type-desc-in";
        input.value = desc;
        input.setAttribute("aria-label", "Mission type description");
        sub.replaceWith(input);
    }

    const ptsInput = row.querySelector(".type-pts-in");
    if (ptsInput) {
        ptsInput.disabled = false;
        ptsInput.value = String(pts);
    }

    row.classList.add("is-editing");

    const btn = row.querySelector("[data-edit-type]");
    if (btn) {
        btn.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i>';
        btn.setAttribute("aria-label", "Save mission type");
    }

    (row.querySelector(".type-desc-in") || ptsInput)?.focus();
}

function saveTypeEdit(key) {
    const row = document.getElementById("mt-" + key);
    if (!row) return;

    const descInput = row.querySelector(".type-desc-in");
    const desc = descInput?.value.trim() || row.dataset.editDesc || "";
    const pts = getTypeRowBasePts(row);

    if (descInput) {
        const sub = document.createElement("div");
        sub.className = "cfg-sub";
        sub.textContent = desc;
        descInput.replaceWith(sub);
    }

    const ptsInput = row.querySelector(".type-pts-in");
    if (ptsInput) ptsInput.disabled = true;

    syncTypeBasePts(key, pts);
    setTypePtsDisplay(row, pts);
    row.classList.remove("is-editing");

    const btn = row.querySelector("[data-edit-type]");
    if (btn) {
        btn.innerHTML = '<i class="ti ti-pencil" style="font-size:12px"></i>';
        btn.setAttribute("aria-label", "Edit mission type");
    }

    flashSaved();
}

function cancelTypeEdit(key) {
    const row = document.getElementById("mt-" + key);
    if (!row || !row.classList.contains("is-editing")) return;

    const desc = row.dataset.editDesc || "";
    const pts = row.dataset.editPts || "5";
    const descInput = row.querySelector(".type-desc-in");

    if (descInput) {
        const sub = document.createElement("div");
        sub.className = "cfg-sub";
        sub.textContent = desc;
        descInput.replaceWith(sub);
    }

    const ptsInput = row.querySelector(".type-pts-in");
    if (ptsInput) {
        ptsInput.value = pts;
        ptsInput.disabled = true;
    }

    setTypePtsDisplay(row, pts);
    row.classList.remove("is-editing");

    const btn = row.querySelector("[data-edit-type]");
    if (btn) {
        btn.innerHTML = '<i class="ti ti-pencil" style="font-size:12px"></i>';
        btn.setAttribute("aria-label", "Edit mission type");
    }
}

window.toggleTypeEdit = function (key) {
    const row = document.getElementById("mt-" + key);
    if (!row) return;
    if (row.classList.contains("is-editing")) saveTypeEdit(key);
    else startTypeEdit(key);
};

function rebuildCalcTypeOptions() {
    const sel = document.getElementById("calc-type");
    if (!sel) return;
    sel.innerHTML = "";
    document.querySelectorAll("#type-list .cfg-row[id^='mt-']").forEach((row) => {
        const key = row.id.replace(/^mt-/, "");
        const label = row.querySelector(".cfg-label")?.textContent?.trim() || key;
        const pts = getTypeRowBasePts(row);
        const opt = document.createElement("option");
        opt.value = String(pts);
        opt.dataset.typeKey = key;
        opt.textContent = `${label} (${pts} pts)`;
        sel.appendChild(opt);
    });
    calcPoints();
}

function bindTypeRow(row, key) {
    const toggle = row.querySelector(".toggle");
    const pill = row.querySelector(".status-pill");
    toggle.addEventListener("click", () => {
        toggle.classList.toggle("on");
        const on = toggle.classList.contains("on");
        toggle.setAttribute("aria-checked", on ? "true" : "false");
        if (pill) {
            pill.textContent = on ? "Active" : "Inactive";
            pill.classList.toggle("bp-green", on);
            pill.classList.toggle("bp-gray", !on);
        }
    });
    row.querySelector("[data-edit-type]")?.addEventListener("click", () => toggleTypeEdit(key));
    row.querySelector("[data-remove-type]")?.addEventListener("click", () => removeType(key));
}

function syncTypeBasePts(key, pts) {
    const row = document.getElementById("mt-" + key);
    if (!row) return;
    const value = String(parseInt(pts, 10) || 0);
    row.dataset.basePts = value;
    const input = row.querySelector(".type-pts-in");
    if (input) input.value = value;
    setTypePtsDisplay(row, value);
    const opt = document.querySelector(`#calc-type option[data-type-key="${key}"]`);
    if (opt) {
        opt.value = value;
        const label = row.querySelector(".cfg-label")?.textContent || key;
        opt.textContent = `${label} (${value} pts)`;
    }
    calcPoints();
}

window.removeType = function (k) {
    const e = document.getElementById("mt-" + k);
    if (e) e.remove();
    rebuildCalcTypeOptions();
};

window.showAddLevel = function () {
    document.getElementById("add-level-form").style.display = "block";
    document.getElementById("nl-name").focus();
};

window.addLevel = function () {
    const name = document.getElementById("nl-name").value.trim();
    const desc = document.getElementById("nl-desc").value.trim();
    const mn = document.getElementById("nl-min").value || "0";
    const mx = document.getElementById("nl-max").value || "";
    if (!name) return;
    const key = name.replace(/\s+/g, "");
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f87171"];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const row = document.createElement("div");
    row.className = "level-row";
    row.id = "lv-" + key;
    row.innerHTML = `
      <div class="level-info">
        <div class="level-dot" style="background:${col};"></div>
        <div><div class="level-name">${escapeHtml(name)}</div><div class="level-sub">${escapeHtml(desc || "Custom level")}</div></div>
      </div>
      <div class="range-row">
        <input class="range-in" type="number" value="${escapeHtml(mn)}" min="0" />
        <span class="range-sep">–</span>
        <input class="range-in" type="number" value="${escapeHtml(mx)}" min="0" placeholder="Max" />
        <span class="pts-unit" style="margin-left:2px;">pts</span>
        <button type="button" class="btn btn-r btn-sm" style="margin-left:6px;" data-remove-level="${escapeHtml(key)}"><i class="ti ti-trash" style="font-size:11px"></i></button>
      </div>`;
    row.querySelector("[data-remove-level]")?.addEventListener("click", () => removeLevel(key));
    document.getElementById("level-list").insertBefore(row, document.getElementById("add-level-form"));
    document.getElementById("nl-name").value = "";
    document.getElementById("nl-desc").value = "";
    document.getElementById("nl-min").value = "";
    document.getElementById("nl-max").value = "";
    document.getElementById("add-level-form").style.display = "none";
};

window.removeLevel = function (k) {
    const e = document.getElementById("lv-" + k);
    if (e) e.remove();
};

window.showAddBadge = function () {
    document.getElementById("add-badge-form").style.display = "block";
    document.getElementById("nb-name").focus();
};

const badgeTypeStyles = {
    Milestone: "background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;",
    "Level up": "background:#f0fdf4;color:#15803d;border-color:#bbf7d0;",
    Achievement: "background:#fff7ed;color:#c2410c;border-color:#fed7aa;",
};

window.addBadge = function () {
    const name = document.getElementById("nb-name").value.trim();
    const desc = document.getElementById("nb-desc").value.trim();
    const type = document.getElementById("nb-type").value;
    if (!name) return;
    const key = name.replace(/\s+/g, "");
    const row = document.createElement("div");
    row.className = "badge-row";
    row.id = "bdg-" + key;
    row.innerHTML = `
      <div class="badge-icon" style="background:#f3f4f6;"><i class="ti ti-award" style="color:#6b7280;font-size:16px;" aria-hidden="true"></i></div>
      <div class="badge-info">
        <div class="badge-name">${escapeHtml(name)}</div>
        <div class="badge-desc">${escapeHtml(desc || "Custom badge")}</div>
      </div>
      <div class="cfg-right">
        <span class="preview-chip" style="${badgeTypeStyles[type] || badgeTypeStyles.Milestone}">${escapeHtml(type)}</span>
        <div class="toggle on" role="switch" aria-checked="true"></div>
        <button type="button" class="btn btn-r btn-sm" data-remove-badge="${escapeHtml(key)}"><i class="ti ti-trash" style="font-size:12px"></i></button>
      </div>`;
    row.querySelector("[data-remove-badge]")?.addEventListener("click", () => removeBadge(key));
    document.getElementById("badge-list").insertBefore(row, document.getElementById("add-badge-form"));
    document.getElementById("nb-name").value = "";
    document.getElementById("nb-desc").value = "";
    document.getElementById("add-badge-form").style.display = "none";
};

window.removeBadge = function (k) {
    const e = document.getElementById("bdg-" + k);
    if (e) e.remove();
};

function collectConfigFromDom() {
    const missionTypes = [];
    document.querySelectorAll("#type-list .cfg-row[id^='mt-']").forEach((row) => {
        const id = row.id.replace(/^mt-/, "");
        missionTypes.push({
            id,
            name: row.querySelector(".cfg-label")?.textContent?.trim() || id,
            description: getTypeRowDescription(row),
            basePoints: getTypeRowBasePts(row),
            active: row.querySelector(".toggle")?.classList.contains("on") ?? true,
        });
    });

    const durationMultipliers = [];
    document.querySelectorAll("#tab-mission .mult-row").forEach((row, i) => {
        durationMultipliers.push({
            id: ["short", "half", "full"][i] || `tier-${i}`,
            label: row.querySelector(".mult-label")?.textContent?.trim() || "",
            sub: row.querySelector(".mult-sub")?.textContent?.trim() || "",
            multiplier: parseFloat(row.querySelector(".mult-in")?.value) || 1,
        });
    });

    const levels = [];
    document.querySelectorAll("#level-list .level-row[id^='lv-']").forEach((row) => {
        const inputs = row.querySelectorAll(".range-in");
        levels.push({
            id: row.id.replace(/^lv-/, ""),
            name: row.querySelector(".level-name")?.textContent?.trim() || "",
            description: row.querySelector(".level-sub")?.textContent?.trim() || "",
            min: parseFloat(inputs[0]?.value) || 0,
            max: inputs[1]?.value === "" ? null : parseFloat(inputs[1]?.value),
            color: row.querySelector(".level-dot")?.style.background || "#9ca3af",
        });
    });

    const badges = [];
    document.querySelectorAll("#badge-list .badge-row[id^='bdg-']").forEach((row) => {
        badges.push({
            id: row.id.replace(/^bdg-/, ""),
            name: row.querySelector(".badge-name")?.textContent?.trim() || "",
            description: row.querySelector(".badge-desc")?.textContent?.trim() || "",
            type: row.querySelector(".preview-chip")?.textContent?.trim() || "Milestone",
            active: row.querySelector(".toggle")?.classList.contains("on") ?? true,
        });
    });

    return { missionTypes, durationMultipliers, levels, badges };
}

async function saveConfigToFirestore() {
    const payload = {
        ...collectConfigFromDom(),
        updatedAt: serverTimestamp(),
    };
    try {
        await setDoc(doc(db, ...CONFIG_DOC), payload, { merge: true });
        flashSaved();
        const toast = document.getElementById("configSaveToast");
        if (toast) {
            toast.hidden = false;
            setTimeout(() => {
                toast.hidden = true;
            }, 2500);
        }
    } catch (err) {
        console.error("[ERROR] save config:", err);
        alert("Could not save config. Check Firestore rules for platform_config/settings.");
    }
}

async function loadConfigFromFirestore() {
    try {
        const snap = await getDoc(doc(db, ...CONFIG_DOC));
        if (!snap.exists()) {
            bindExistingTypeRows();
            return;
        }
        const data = snap.data();
        if (data.missionTypes?.length) {
            // Future: re-render from JSON; for now keep defaults + bind toggles
        }
        bindExistingTypeRows();
    } catch (err) {
        console.warn("[WARN] load config:", err);
        bindExistingTypeRows();
    }
}

function bindExistingTypeRows() {
    document.querySelectorAll("#type-list .cfg-row[id^='mt-']").forEach((row) => {
        const key = row.id.replace(/^mt-/, "");
        bindTypeRow(row, key);
    });
    rebuildCalcTypeOptions();
    document.querySelectorAll("#badge-list .badge-row .toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => toggle.classList.toggle("on"));
    });
    document.querySelectorAll("[data-remove-type]").forEach((btn) => {
        btn.addEventListener("click", () => removeType(btn.dataset.removeType));
    });
    document.querySelectorAll("[data-remove-level]").forEach((btn) => {
        btn.addEventListener("click", () => removeLevel(btn.dataset.removeLevel));
    });
    document.querySelectorAll("[data-remove-badge]").forEach((btn) => {
        btn.addEventListener("click", () => removeBadge(btn.dataset.removeBadge));
    });
}
