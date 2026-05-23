import { db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";

const CONFIG_PATH = ["platform_config", "settings"];

/** Canonical defaults — `name` is stored on missions as `type`. */
export const DEFAULT_MISSION_TYPES = [
    {
        id: "General",
        name: "General",
        description: "General volunteer missions",
        basePoints: 5,
        active: true,
    },
    {
        id: "HealthMedical",
        name: "Health/Medical",
        description: "Health and medical missions",
        basePoints: 10,
        active: true,
    },
    {
        id: "Environment",
        name: "Environment",
        description: "Environmental programs",
        basePoints: 5,
        active: true,
    },
    {
        id: "Education",
        name: "Education",
        description: "Educational outreach",
        basePoints: 5,
        active: true,
    },
    {
        id: "DisasterRelief",
        name: "Disaster Relief",
        description: "Emergency response",
        basePoints: 10,
        active: true,
    },
];

let cachedConfig = null;
let pointsByTypeName = {};

function rebuildPointsMap() {
    pointsByTypeName = {};
    const types = cachedConfig?.missionTypes || DEFAULT_MISSION_TYPES;
    types.forEach((t) => {
        const name = (t.name || t.id || "").trim();
        if (!name) return;
        pointsByTypeName[name] = Number(t.basePoints) || 0;
    });
}

export async function loadPlatformConfig(force = false) {
    if (cachedConfig && !force) {
        return cachedConfig;
    }

    try {
        const snap = await getDoc(doc(db, ...CONFIG_PATH));
        if (snap.exists()) {
            const data = snap.data();
            cachedConfig = {
                ...data,
                missionTypes:
                    data.missionTypes?.length > 0
                        ? data.missionTypes
                        : [...DEFAULT_MISSION_TYPES],
            };
        } else {
            cachedConfig = { missionTypes: [...DEFAULT_MISSION_TYPES] };
        }
    } catch (err) {
        console.warn("[WARN] Could not load platform config:", err);
        cachedConfig = { missionTypes: [...DEFAULT_MISSION_TYPES] };
    }

    rebuildPointsMap();
    return cachedConfig;
}

export function getMissionTypes(includeInactive = false) {
    const types = cachedConfig?.missionTypes || DEFAULT_MISSION_TYPES;
    if (includeInactive) return types;
    return types.filter((t) => t.active !== false);
}

/** @deprecated use getMissionTypes */
export function getActiveMissionTypes() {
    return getMissionTypes(false);
}

export function getBasePointsForType(typeName) {
    if (!typeName) return 0;
    if (pointsByTypeName[typeName] !== undefined) {
        return pointsByTypeName[typeName];
    }
    const fallback = DEFAULT_MISSION_TYPES.find((t) => t.name === typeName);
    return fallback ? fallback.basePoints : 5;
}

export function populateMissionTypeSelect(selectEl, options = {}) {
    if (!selectEl) return;

    const types = getMissionTypes(false);
    const selected = options.selectedValue ?? selectEl.value ?? "";

    selectEl.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.textContent = options.placeholder || "Select mission type";
    if (!selected) placeholder.selected = true;
    selectEl.appendChild(placeholder);

    types.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        if (t.name === selected) {
            opt.selected = true;
            placeholder.selected = false;
        }
        selectEl.appendChild(opt);
    });

    if (types.length === 0) {
        placeholder.textContent = "No mission types available";
    }
}

export function updateBasePointsDisplay(selectEl, displayEl) {
    if (!selectEl || !displayEl) return;
    const type = selectEl.value;
    const pts = getBasePointsForType(type);
    displayEl.textContent = type
        ? `Base points for this mission: ${pts}`
        : "Select a type to see base points";
}

export function getConfigDocPath() {
    return CONFIG_PATH;
}

export function clearPlatformConfigCache() {
    cachedConfig = null;
    pointsByTypeName = {};
}
