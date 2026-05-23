import { db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";

const CONFIG_PATH = ["platform_config", "settings"];

let cachedConfig = null;
let pointsByTypeName = {};

function emptyConfig() {
    return {
        missionTypes: [],
        durationMultipliers: [],
        levels: [],
        badges: [],
    };
}

function normalizeConfig(data = {}) {
    return {
        ...data,
        missionTypes: Array.isArray(data.missionTypes) ? data.missionTypes : [],
        durationMultipliers: Array.isArray(data.durationMultipliers)
            ? data.durationMultipliers
            : [],
        levels: Array.isArray(data.levels) ? data.levels : [],
        badges: Array.isArray(data.badges) ? data.badges : [],
    };
}

function rebuildPointsMap() {
    pointsByTypeName = {};
    const types = cachedConfig?.missionTypes || [];
    types.forEach((t) => {
        const name = (t.name || t.id || "").trim();
        if (!name) return;
        pointsByTypeName[name] = Number(t.basePoints) || 0;
    });
}

/** Parse "1 – 3 hours" or "7+ hours" when minHours/maxHours are not stored. */
export function parseDurationBoundsFromSub(sub) {
    const text = String(sub || "").trim();
    if (!text) return { minHours: 0, maxHours: null };

    const plus = text.match(/(\d+)\s*\+/);
    if (plus) {
        return { minHours: parseInt(plus[1], 10), maxHours: null };
    }

    const range = text.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (range) {
        return {
            minHours: parseInt(range[1], 10),
            maxHours: parseInt(range[2], 10),
        };
    }

    return { minHours: 0, maxHours: null };
}

function resolveTierBounds(tier) {
    let minHours = tier.minHours;
    let maxHours = tier.maxHours;

    if (
        (minHours == null || minHours === "") &&
        (maxHours == null || maxHours === "")
    ) {
        const parsed = parseDurationBoundsFromSub(tier.sub);
        minHours = parsed.minHours;
        maxHours = parsed.maxHours;
    }

    return {
        ...tier,
        minHours: Number(minHours) || 0,
        maxHours:
            maxHours == null || maxHours === "" ? Infinity : Number(maxHours),
        multiplier: Number(tier.multiplier) || 1,
    };
}

export function getDurationMultipliers() {
    return cachedConfig?.durationMultipliers || [];
}

export async function loadPlatformConfig(force = false) {
    if (cachedConfig && !force) {
        return cachedConfig;
    }

    try {
        const snap = await getDoc(doc(db, ...CONFIG_PATH));
        if (snap.exists()) {
            cachedConfig = normalizeConfig(snap.data());
        } else {
            cachedConfig = emptyConfig();
        }
    } catch (err) {
        console.warn("[WARN] Could not load platform config:", err);
        cachedConfig = emptyConfig();
    }

    rebuildPointsMap();
    return cachedConfig;
}

export function getMissionTypes(includeInactive = false) {
    const types = cachedConfig?.missionTypes || [];
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
    return 0;
}

function parse12HourTime(date, time12hr) {
    const [time, period] = time12hr.split(" ");
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours, 10);
    if (period === "AM") {
        if (hour24 === 12) hour24 = 0;
    } else if (period === "PM") {
        if (hour24 !== 12) hour24 += 12;
    }
    return new Date(`${date}T${hour24.toString().padStart(2, "0")}:${minutes}`);
}

/** @param {object} mission — date/endDate, startTime/endTime (or snake_case variants) */
export function parseMissionDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    try {
        if (timeStr.includes("AM") || timeStr.includes("PM")) {
            return parse12HourTime(dateStr, timeStr);
        }
        return new Date(`${dateStr}T${timeStr}`);
    } catch {
        return null;
    }
}

/** Duration in hours from mission schedule fields. */
export function computeMissionDurationHours(mission) {
    const startDate = mission?.date || "";
    const endDate = mission?.endDate || mission?.date || "";
    const startTime = mission?.startTime || mission?.start_time || "";
    const endTime = mission?.endTime || mission?.end_time || "";

    const start = parseMissionDateTime(startDate, startTime);
    let end = parseMissionDateTime(endDate, endTime);
    if (!start || !end) return 0;

    if (end < start) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const ms = end.getTime() - start.getTime();
    return Math.max(0, ms / (1000 * 60 * 60));
}

/** Pick tier multiplier from Firestore durationMultipliers (uses minHours/maxHours or sub). */
export function getDurationMultiplier(hours, tiers = null) {
    const raw = tiers || getDurationMultipliers();
    const list = raw.map(resolveTierBounds).sort((a, b) => a.minHours - b.minHours);
    const h = Math.max(0, Number(hours) || 0);

    if (list.length === 0) return 1;

    for (const tier of list) {
        if (h >= tier.minHours && h <= tier.maxHours) {
            return tier.multiplier;
        }
    }

    if (h < list[0].minHours) return list[0].multiplier;
    return list[list.length - 1].multiplier;
}

/**
 * Compute fields to store on a mission document.
 * missionPoints = platform missionTypes[].basePoints × durationMultipliers.multiplier
 * (type base points are read from platform_config only, not stored on the mission as basePoints)
 */
export async function computeMissionPointsPayload(fields) {
    await loadPlatformConfig();
    const type = (fields?.type || "").trim();
    const typeBasePoints = getBasePointsForType(type);
    const durationHours = computeMissionDurationHours(fields);
    const tiers = getDurationMultipliers();
    const pointsMultiplier = getDurationMultiplier(durationHours, tiers);
    const missionPoints = Math.round(typeBasePoints * pointsMultiplier);

    return {
        missionPoints,
        pointsMultiplier,
        durationHours: Math.round(durationHours * 100) / 100,
    };
}

/** Points to award / display — always uses mission.missionPoints when present. */
export function resolveMissionPoints(mission) {
    if (mission == null) return 0;

    if (mission.missionPoints != null && mission.missionPoints !== "") {
        const saved = Number(mission.missionPoints);
        if (Number.isFinite(saved)) return saved;
    }

    if (
        cachedConfig &&
        mission.type &&
        mission.date &&
        (mission.startTime || mission.start_time)
    ) {
        const typeBasePoints = getBasePointsForType(mission.type);
        const hours = computeMissionDurationHours(mission);
        const mult = getDurationMultiplier(hours);
        return Math.round(typeBasePoints * mult);
    }

    return 0;
}

export function getLevelForPoints(totalPoints, levels = null) {
    const list = (levels || cachedConfig?.levels || [])
        .slice()
        .sort((a, b) => (Number(a.min) || 0) - (Number(b.min) || 0));
    const pts = Number(totalPoints) || 0;

    for (const lv of list) {
        const min = Number(lv.min) || 0;
        const max =
            lv.max == null || lv.max === "" ? Infinity : Number(lv.max);
        if (pts >= min && pts <= max) {
            return { id: lv.id, name: lv.name || lv.id, color: lv.color };
        }
    }

    if (list.length > 0) {
        const first = list[0];
        return {
            id: first.id,
            name: first.name || first.id,
            color: first.color,
        };
    }

    return { id: "", name: "", color: "#9ca3af" };
}

export function evaluateBadgeUnlocks(userStats, badges = null) {
    const list = badges || cachedConfig?.badges || [];
    const existing = new Set(
        (Array.isArray(userStats?.badges) ? userStats.badges : []).map((b) =>
            typeof b === "string" ? b : b.id || b.name
        )
    );
    const missionsCompleted = Number(userStats?.missionsCompleted) || 0;
    const levelName = (userStats?.volunteerLevel || "").toLowerCase();

    const unlocked = [...existing];

    const add = (id) => {
        if (!id || unlocked.includes(id)) return;
        unlocked.push(id);
    };

    list.forEach((badge) => {
        if (badge.active === false) return;
        const id = badge.id || badge.name;
        const type = (badge.type || "").toLowerCase();
        const name = (badge.name || "").toLowerCase();
        const requiredMissions = Number(badge.requiredMissions);
        const requiredPoints = Number(badge.requiredPoints);

        if (
            Number.isFinite(requiredMissions) &&
            missionsCompleted >= requiredMissions
        ) {
            add(id);
        }
        if (
            Number.isFinite(requiredPoints) &&
            (Number(userStats?.totalPoints) || 0) >= requiredPoints
        ) {
            add(id);
        }
        if (type === "milestone" && missionsCompleted >= 1 && /first/i.test(name)) {
            add(id);
        }
        if (type === "achievement" && missionsCompleted >= 10 && !Number.isFinite(requiredMissions)) {
            add(id);
        }
        if (type === "level up" && levelName && name.includes(levelName)) {
            add(id);
        }
    });

    return unlocked;
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
        placeholder.textContent =
            options.emptyMessage || "No mission types in platform config";
    }
}

export function updateBasePointsDisplay(selectEl, displayEl) {
    updateMissionPointsDisplay(selectEl, displayEl);
}

export async function updateMissionPointsDisplay(selectEl, displayEl, schedule = {}) {
    if (!displayEl) return;
    const type = selectEl?.value || schedule.type || "";
    if (!type) {
        displayEl.textContent = "Select a type and schedule to see earned points";
        return;
    }

    await loadPlatformConfig();
    const types = getMissionTypes(false);
    if (types.length === 0) {
        displayEl.textContent =
            "Platform config has no mission types. Ask an admin to configure them.";
        return;
    }

    const tiers = getDurationMultipliers();
    if (tiers.length === 0) {
        displayEl.textContent =
            "Platform config has no duration multipliers. Ask an admin to configure them.";
        return;
    }

    const payload = await computeMissionPointsPayload({
        type,
        date: schedule.date || "",
        endDate: schedule.endDate || schedule.date || "",
        startTime: schedule.startTime || "",
        endTime: schedule.endTime || "",
    });
    const typeBase = getBasePointsForType(type);
    displayEl.textContent = `Earned points for this mission: ${payload.missionPoints} (${typeBase} × ${payload.pointsMultiplier})`;
}

export function getConfigDocPath() {
    return CONFIG_PATH;
}

export function clearPlatformConfigCache() {
    cachedConfig = null;
    pointsByTypeName = {};
}

export function isPlatformConfigReady() {
    return (
        (cachedConfig?.missionTypes?.length || 0) > 0 &&
        (cachedConfig?.durationMultipliers?.length || 0) > 0
    );
}
