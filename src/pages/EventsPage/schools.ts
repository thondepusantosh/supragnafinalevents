/* =========================================================
   SCHOOLS

   One entry per ticket on the Tickets page. Clicking a ticket
   opens /events/<slug>, a carnival field with one tent per
   department.

   departments: the tent names, in order. Use "\n" to split a
   long name over two lines on the tent's banner.

   spots: where each tent stands, per screen shape
     wide  - laptops, desktops, landscape tablets
     tall  - phones and portrait tablets
     short - phones held sideways
   Each spot is [x, bottom, size]: x is the tent's centre and
   bottom its base, both in % of the screen; size 1 is the
   normal tent width. Farther tents (higher bottom) are smaller
   and drawn behind nearer ones. Spots are placed so no two
   tents overlap at any screen size; give every department a
   spot in all three lists.

   shades (optional): which tent colour each department uses,
   as indexes into TENT_SHADES in EventsPage.tsx (0 violet,
   1 maroon, 2 indigo, 3 plum, 4 amethyst, 5 wine, 6 royal
   blue). Without it, tent i uses colour i.
========================================================= */

export type Layout = "wide" | "tall" | "short";

export type TentSpot = [x: number, bottom: number, size: number];

export interface School {
    slug: string;
    name: string;
    departments: string[];
    spots: Record<Layout, TentSpot[]>;
    shades?: number[];
}

// one big tent in the middle of the field
const ONE_TENT: School["spots"] = {
    wide: [[50, 17, 1.9]],
    tall: [[50, 18, 2.2]],
    short: [[50, 22, 1.5]],
};

export const SCHOOLS: School[] = [
    {
        slug: "engineering",
        name: "School of Engineering",
        departments: ["AI", "CE", "CSE", "ECE", "EEE", "EIE", "ME"],
        spots: {
            wide: [
                [14, 35, 0.95], // AI
                [41, 46, 0.72], // CE
                [60, 40, 0.8], // CSE
                [85, 47, 0.7], // ECE
                [33, 6, 1.15], // EEE
                [57, 13, 1.05], // EIE
                [84, 12, 1.1], // ME
            ],
            tall: [
                [25, 42, 0.78],
                [72, 46, 0.7],
                [70, 30, 0.88],
                [28, 25, 0.94],
                [73, 14, 1.02],
                [24, 5.5, 1.1],
                [66, 0, 1.12],
            ],
            // a loose front line, with the farther tents kept to the
            // right of the hanging sign
            short: [
                [12, 1, 0.9],
                [64, 25, 0.7],
                [37, 1, 0.9],
                [79, 25, 0.7],
                [62, 1, 0.9],
                [93, 25, 0.7],
                [87, 1, 0.9],
            ],
        },
    },
    {
        slug: "science",
        name: "School of Science",
        departments: ["MCA", "BSC"],
        spots: {
            wide: [
                [29, 14, 1.45],
                [71, 14, 1.45],
            ],
            tall: [
                [50, 47, 1.45],
                [50, 8, 1.7],
            ],
            short: [
                [30, 20, 1],
                [70, 20, 1],
            ],
        },
        shades: [1, 6],
    },
    {
        slug: "management",
        name: "School of Management",
        departments: ["BUSINESS\nADMINISTRATION"],
        spots: ONE_TENT,
        shades: [1],
    },
    {
        slug: "arts-commerce",
        name: "School of Arts & Commerce",
        departments: ["ARTS AND\nCOMMERCE"],
        spots: ONE_TENT,
        shades: [5],
    },
    {
        slug: "law",
        name: "School of Law",
        departments: ["LAW"],
        spots: ONE_TENT,
        shades: [1],
    },
];

export function schoolBySlug(slug: string | undefined) {
    return SCHOOLS.find((school) => school.slug === slug);
}
