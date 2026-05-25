/** Default grouped hotlines seeded when platform_config/hotlines is empty. */

export const SEED_HOTLINE_CATEGORIES = [
    {
        id: "ndrrmc",
        name: "NDRRMC",
        location: "National Capital Region (Metro Manila)",
        active: true,
        sortOrder: 0,
        numbers: [
            {
                id: "ops-center",
                label: "Operations Center",
                number: "(02) 8911-5061",
                active: true,
                sortOrder: 0,
            },
            {
                id: "ops-trunk",
                label: "Operations Center (trunk)",
                number: "(02) 8911-5068",
                active: true,
                sortOrder: 1,
            },
        ],
    },
    {
        id: "philippine-red-cross",
        name: "Philippine Red Cross",
        location: "Nationwide",
        active: true,
        sortOrder: 1,
        numbers: [
            {
                id: "hotline-143",
                label: "Emergency hotline",
                number: "143",
                active: true,
                sortOrder: 0,
            },
            {
                id: "hq-manila",
                label: "National HQ (Manila)",
                number: "(02) 8790-2300",
                active: true,
                sortOrder: 1,
            },
        ],
    },
    {
        id: "national-emergency",
        name: "National Emergency Hotlines",
        location: "Philippines",
        active: true,
        sortOrder: 2,
        numbers: [
            {
                id: "911",
                label: "Emergency (unified)",
                number: "911",
                active: true,
                sortOrder: 0,
            },
            {
                id: "pnp-117",
                label: "Philippine National Police",
                number: "117",
                active: true,
                sortOrder: 1,
            },
            {
                id: "bfp-160",
                label: "Bureau of Fire Protection",
                number: "160",
                active: true,
                sortOrder: 2,
            },
        ],
    },
    {
        id: "doh",
        name: "Department of Health",
        location: "Nationwide",
        active: true,
        sortOrder: 3,
        numbers: [
            {
                id: "doh-1555",
                label: "DOH Hotline",
                number: "1555",
                active: true,
                sortOrder: 0,
            },
        ],
    },
];

export function buildInitialHotlinesSeed() {
    return {
        categories: SEED_HOTLINE_CATEGORIES.map((c) => ({
            ...c,
            numbers: c.numbers.map((n) => ({ ...n })),
        })),
    };
}
