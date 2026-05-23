/**
 * One-time seed payloads written to Firestore by the admin config page
 * when a section is missing. Not used as runtime fallbacks elsewhere.
 */

export const SEED_MISSION_TYPES = [
    { id: "General", name: "General", description: "General volunteer missions", basePoints: 5, active: true },
    { id: "HealthMedical", name: "Health/Medical", description: "Health and medical missions", basePoints: 10, active: true },
    { id: "Environment", name: "Environment", description: "Environmental programs", basePoints: 5, active: true },
    { id: "Education", name: "Education", description: "Educational outreach", basePoints: 5, active: true },
    { id: "DisasterRelief", name: "Disaster Relief", description: "Emergency response", basePoints: 10, active: true },
];

export const SEED_DURATION_MULTIPLIERS = [
    { id: "short", label: "Short shift", sub: "1 – 3 hours", minHours: 0, maxHours: 3, multiplier: 1 },
    { id: "half", label: "Half day", sub: "4 – 6 hours", minHours: 4, maxHours: 6, multiplier: 2 },
    { id: "full", label: "Full day", sub: "7+ hours", minHours: 7, maxHours: null, multiplier: 3 },
];

export const SEED_BADGES = [
    { id: "FirstMission", name: "First mission", description: "Complete your first mission", type: "Milestone", active: true },
    { id: "Helper", name: "Helper badge", description: "Reach Helper level", type: "Level up", active: true },
    { id: "Champion", name: "Champion badge", description: "Reach Champion level", type: "Level up", active: true },
    { id: "10Missions", name: "Dedicated", description: "Complete 10 missions", type: "Achievement", requiredMissions: 10, active: true },
    { id: "Guardian", name: "Guardian badge", description: "Reach Guardian level", type: "Level up", active: true },
];

export const SEED_LEVELS = [
    { id: "Newcomer", name: "Newcomer", description: "Starting level", min: 0, max: 50, color: "#9ca3af" },
    { id: "Helper", name: "Helper", description: "Early volunteer", min: 51, max: 150, color: "#60a5fa" },
    { id: "Volunteer", name: "Volunteer", description: "Regular contributor", min: 151, max: 500, color: "#34d399" },
    { id: "Champion", name: "Champion", description: "Dedicated volunteer", min: 501, max: 1200, color: "#a78bfa" },
    { id: "Guardian", name: "Guardian", description: "Elite volunteer", min: 1201, max: null, color: "#fbbf24" },
];

export function buildInitialPlatformConfigSeed() {
    return {
        missionTypes: [...SEED_MISSION_TYPES],
        durationMultipliers: [...SEED_DURATION_MULTIPLIERS],
        badges: [...SEED_BADGES],
        levels: [...SEED_LEVELS],
    };
}
