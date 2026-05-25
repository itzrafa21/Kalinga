/** Default hotlines seeded when platform_config/hotlines is empty. */

export const SEED_HOTLINES = [
    {
        id: "emergency-911",
        name: "Emergency (Unified)",
        number: "911",
        category: "Emergency",
        description: "National emergency hotline",
        active: true,
        sortOrder: 0,
    },
    {
        id: "pnp-117",
        name: "Philippine National Police",
        number: "117",
        category: "Emergency",
        description: "Police assistance",
        active: true,
        sortOrder: 1,
    },
    {
        id: "bfp-160",
        name: "Bureau of Fire Protection",
        number: "160",
        category: "Emergency",
        description: "Fire and rescue",
        active: true,
        sortOrder: 2,
    },
    {
        id: "red-cross-143",
        name: "Philippine Red Cross",
        number: "143",
        category: "Medical",
        description: "Medical and disaster response",
        active: true,
        sortOrder: 3,
    },
    {
        id: "ndrrmc",
        name: "NDRRMC Operations Center",
        number: "(02) 8911-5061",
        category: "Disaster",
        description: "National disaster coordination",
        active: true,
        sortOrder: 4,
    },
    {
        id: "doh",
        name: "DOH Hotline",
        number: "1555",
        category: "Medical",
        description: "Department of Health inquiries",
        active: true,
        sortOrder: 5,
    },
];

export function buildInitialHotlinesSeed() {
    return [...SEED_HOTLINES];
}
