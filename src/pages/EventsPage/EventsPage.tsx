import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
} from "react";

import {
    Navigate,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import Nav from "../../components/Nav";
import Preloader from "../Preloader";

import Curtains from "./Curtains";
import { schoolBySlug, type School } from "./schools";
import styles from "./EventsPage.module.scss";

import tentViolet from "../../assets/Events/tents/tent-violet.webp";
import tentMaroon from "../../assets/Events/tents/tent-maroon.webp";
import tentIndigo from "../../assets/Events/tents/tent-indigo.webp";
import tentPlum from "../../assets/Events/tents/tent-plum.webp";
import tentAmethyst from "../../assets/Events/tents/tent-amethyst.webp";
import tentWine from "../../assets/Events/tents/tent-wine.webp";
import tentRoyal from "../../assets/Events/tents/tent-royal.webp";


interface EventData {
    id: string;
    name: string;
    category: string;
    club_name: string | null;
    venue: string | null;
    description: string | null;
    image_url: string | null;
    rulebook: string | null;
}

/* =========================================================
   DEPARTMENTS

   Each school's tents (names, spots, colours) are set in
   schools.ts. A department is just
   its tent's name; "\n" in a name splits it over two lines.
========================================================= */

type Department = string;

function slugOf(department: Department) {
    return department.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function spotStyle(school: School, index: number): CSSProperties {
    const style: Record<string, number> = {};

    for (const layout of ["wide", "tall", "short"] as const) {
        const spots = school.spots[layout];
        const [x, bottom, size] = spots[index % spots.length];

        style[`--x-${layout}`] = x;
        style[`--b-${layout}`] = bottom;
        style[`--s-${layout}`] = size;
    }

    return style as CSSProperties;
}

/* =========================================================
   TENT SHADES

   Palette variants of tent-clean.png (stripes recoloured to
   the page's jewel tones). Tent i uses shade i (cycling) unless
   its school picks colours (shades in schools.ts). `smoke` is
   the colour of the smoke that rises once the wand has spun
   over that tent.
========================================================= */

const TENT_SHADES = [
    { src: tentViolet, smoke: "#4d2b63" },
    { src: tentMaroon, smoke: "#50041d" },
    { src: tentIndigo, smoke: "#03176b" },
    { src: tentPlum, smoke: "#3b0c3c" },
    { src: tentAmethyst, smoke: "#342875" },
    { src: tentWine, smoke: "#5a0a2e" },
    { src: tentRoyal, smoke: "#1a2a6b" },
];

function shadeOf(school: School, department: Department) {
    const index = school.departments.indexOf(department);

    return TENT_SHADES[
        (school.shades?.[index] ?? index) % TENT_SHADES.length
    ];
}

/* =========================================================
   PRELOADER ASSETS

   Every image imported above — the tent shades — so the
   preloader waits for all of them before
   revealing the page, the same way About.tsx does with
   ABOUT_ASSETS.
========================================================= */

const EVENTS_ASSETS = [
    ...TENT_SHADES.map((shade) => shade.src),
];

/* =========================================================
   EVENT DATA

   Events per department, shown in the modal when its tent is
   clicked. A department with no entry opens the "No Events
   Found" card.
========================================================= */

const eventsData: Partial<Record<Department, EventData[]>> = {};
// e.g. eventsData["CSE"] = [{ id: "hackathon", name: "Hackathon", ... }]

/* =========================================================
   TENT LEDS

   Hovering (or focusing / tapping) a tent drops a fresh,
   random handful of LED bulbs onto it, which then twinkle at
   their own random speeds. LED_SPOTS are points inside the
   tent's silhouette (as % of the image), sampled from
   tent-clean.png away from its edges, ropes and the label
   on the banner, so a bulb never floats in mid-air or covers
   the department name.
========================================================= */

const LED_SPOTS: [number, number][] = [
    [51, 22], [53, 22], [45, 26], [49, 27], [54, 28], [46, 31], [50, 32], [52, 33],
    [58, 33], [53, 36], [61, 36], [39, 37], [42, 38], [46, 38], [49, 38], [58, 38],
    [35, 41], [53, 42], [38, 43], [41, 43], [47, 44], [50, 44], [56, 44], [61, 44],
    [65, 44], [34, 47], [39, 47], [50, 47], [62, 47], [64, 47], [31, 48], [41, 48],
    [47, 48], [58, 48], [53, 49], [68, 49], [46, 52], [58, 52], [42, 53], [49, 53],
    [61, 53], [65, 53], [27, 54], [29, 54], [34, 54], [39, 54], [55, 54], [68, 54],
    [73, 55], [42, 57], [33, 58], [66, 58], [81, 58], [30, 59], [38, 59], [49, 59],
    [53, 59], [58, 59], [76, 59], [20, 60], [23, 60], [26, 60], [45, 60], [60, 60],
    [68, 60], [72, 60], [83, 60], [7, 63], [92, 63], [12, 66], [12, 68], [9, 69],
    [8, 73], [12, 74], [89, 76], [11, 79], [27, 82], [77, 82], [12, 84], [27, 84],
    [34, 84], [37, 84], [46, 84], [16, 85], [50, 85], [68, 85], [88, 85], [18, 86],
    [22, 86], [31, 86], [54, 86], [58, 86], [60, 86], [73, 86], [80, 86], [84, 86],
    [41, 87], [65, 87], [75, 87], [43, 89], [14, 90], [24, 90], [75, 90], [80, 90],
    [84, 90], [12, 91], [35, 91], [46, 91], [53, 91], [57, 91], [62, 91], [65, 91],
    [68, 91], [72, 91], [87, 91], [18, 92], [26, 92], [30, 92], [39, 92], [51, 92],
    [33, 95], [49, 95], [83, 95], [41, 96],
];

const LED_COLORS = [
    "#fff4d6", // warm white
    "#ffd37a", // gold
    "#ffb347", // amber
    "#ff9fd0", // rose
    "#cdb4ff", // lilac
];

const LIGHTS_PER_TENT = 22;

interface TentLight {
    id: string;
    x: number;
    y: number;
    color: string;
    size: number; // cqi, so bulbs scale with the tent
    fall: number; // s before it drops in
    twinkle: number; // s per twinkle
}

let lightBatch = 0;

function scatterLights(): TentLight[] {
    lightBatch += 1;

    const pool = [...LED_SPOTS];
    const lights: TentLight[] = [];

    while (
        lights.length < LIGHTS_PER_TENT &&
        pool.length > 0
    ) {
        const [[x, y]] = pool.splice(
            Math.floor(Math.random() * pool.length),
            1
        );

        lights.push({
            id: `${lightBatch}-${lights.length}`,
            x,
            y,
            color: LED_COLORS[
                Math.floor(
                    Math.random() * LED_COLORS.length
                )
            ],
            size: 2.2 + Math.random() * 1.6,
            fall: Math.random() * 0.45,
            twinkle: 0.6 + Math.random() * 1.6,
        });
    }

    return lights;
}

/* =========================================================
   MAGIC WAND -> SMOKE -> INTO THE TENT

   Clicking a tent summons a wand over it. The wand spins
   around its handle for SPELL_SPIN_MS while its star tip
   sheds sparkles, then flicks out a burst of sparkles and
   fades. The original smoke (SmokeCanvas) then rises from
   the spot the wand spun over for SMOKE_RISE_MS. As the
   smoke clears, the camera dives into the tent's doorway
   (DIVE_MS): the whole scene zooms toward the door until it
   fills the screen, and the inside of the tent fades in.
   The modal opens inside the tent.

   With prefers-reduced-motion the wand and the dive are
   skipped: smoke, then the inside fades in.
========================================================= */

const SPELL_SPIN_MS = 1300;

// how long the smoke rises before it starts to clear
const SMOKE_RISE_MS = 1800;

// How long the smoke's fade-out transition takes. Must match
// the `transition: opacity ...` duration set on .smokeCanvas
// (and its fade-out variant) in EventsPage.module.scss.
const SMOKE_FADE_OUT_MS = 1000;

// the dive starts once the smoke has thinned a little
const DIVE_DELAY_MS = 400;

// how long the camera takes to dive into the doorway
// (passed to the CSS as --dive-ms)
const DIVE_MS = 1300;

const DIVE_MAX_SCALE = 36;

// the modal opens this long after the dive ends
const INSIDE_SETTLE_MS = 200;

// must match the opacity transition on .tentInteriorLeaving
const INSIDE_FADE_OUT_MS = 600;

// the doorway in the tent images, as fractions of the image:
// its centre and its width
const TENT_DOOR = { x: 0.5, y: 0.85, width: 0.14 };

/* =========================================================
   INSIDE THE TENT

   Artwork for the inside of each tent, shown when the camera
   has dived in. Until it is added, a placeholder canopy in
   the tent's colour is drawn in CSS (.tentInterior). To add
   it, import the image above and map it here, e.g.
   { AI: aiInside, LAW: lawInside }; a department without
   an entry keeps the placeholder.
========================================================= */

const TENT_INTERIORS: Partial<Record<Department, string>> = {};

const DEFAULT_SMOKE_COLOR = "#5b5189";

function prefersReducedMotion() {
    return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
}

const easeInOut = (t: number) =>
    t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOut = (t: number) =>
    1 - Math.pow(1 - t, 3);

interface RgbColor {
    r: number;
    g: number;
    b: number;
}

function hexToRgb(hex: string): RgbColor {
    const sanitized = hex.replace("#", "");

    const bigint = parseInt(sanitized, 16);

    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

function clampChannel(value: number) {
    return Math.max(0, Math.min(255, value));
}

function adjustColor(
    color: RgbColor,
    amount: number
): RgbColor {
    return {
        r: clampChannel(color.r + amount),
        g: clampChannel(color.g + amount),
        b: clampChannel(color.b + amount),
    };
}

function rgbString(color: RgbColor) {
    return `${color.r}, ${color.g}, ${color.b}`;
}

// a soft round glow, pre-rendered once per colour so the draw
// loop only calls drawImage (no shadowBlur per particle)
function makeGlowSprite(rgb: string) {
    const size = 64;
    const sprite = document.createElement("canvas");

    sprite.width = size;
    sprite.height = size;

    const g = sprite.getContext("2d");

    if (g) {
        const gradient = g.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2
        );

        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.18, `rgba(${rgb}, 0.95)`);
        gradient.addColorStop(0.45, `rgba(${rgb}, 0.35)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);

        g.fillStyle = gradient;
        g.fillRect(0, 0, size, size);
    }

    return sprite;
}

interface Sparkle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    born: number;
    life: number;
    size: number;
    sprite: number;
}

interface WandSpellProps {
    originX: number;
    originY: number;
    radius: number;
    color: string;
    fadingOut: boolean;
}

function WandSpell({
    originX,
    originY,
    radius,
    color,
    fadingOut,
}: WandSpellProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const base = hexToRgb(color);
        const tint = rgbString(adjustColor(base, 150));

        const sprites = [
            makeGlowSprite("255, 214, 120"), // gold
            makeGlowSprite("255, 246, 225"), // white
            makeGlowSprite(tint), // tent tint
        ];

        let width = 0;
        let height = 0;

        const resize = () => {
            const dpr = Math.min(
                window.devicePixelRatio || 1,
                1.5
            );

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();

        window.addEventListener("resize", resize);

        const sparkles: Sparkle[] = [];

        const spawnSparkle = (
            x: number,
            y: number,
            now: number,
            speed: number,
            angle = Math.random() * Math.PI * 2
        ) => {
            sparkles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                born: now,
                life: 600 + Math.random() * 600,
                size: 6 + Math.random() * 10,
                sprite: Math.floor(Math.random() * 3),
            });
        };

        const wandLength = radius * 1.25;
        const turns = 2;
        const startAngle = -Math.PI * 0.75;

        let burstDone = false;
        let lastTip: { x: number; y: number } | null = null;
        let frame = 0;

        const start = performance.now();

        const drawStar = (
            r: number,
            spin: number
        ) => {
            ctx.save();
            ctx.rotate(spin);
            ctx.beginPath();

            for (let i = 0; i < 10; i++) {
                const a = (i * Math.PI) / 5 - Math.PI / 2;
                const rr = i % 2 === 0 ? r : r * 0.45;

                ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }

            ctx.closePath();

            const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, r);

            fill.addColorStop(0, "#fffbe8");
            fill.addColorStop(0.5, "#ffd56b");
            fill.addColorStop(1, "#c98a1c");

            ctx.fillStyle = fill;
            ctx.fill();
            ctx.restore();
        };

        const drawWand = (
            angle: number,
            alpha: number,
            scale: number,
            now: number
        ) => {
            const L = wandLength * scale;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(originX, originY);
            ctx.rotate(angle);

            // halo behind the star
            ctx.globalCompositeOperation = "lighter";
            ctx.drawImage(
                sprites[0],
                L - L * 0.35,
                -L * 0.35,
                L * 0.7,
                L * 0.7
            );
            ctx.globalCompositeOperation = "source-over";

            // rod: plum lacquer with a gold edge and a soft glow,
            // tapering to the tip, so it reads on the dark scene
            const rod = ctx.createLinearGradient(0, -L * 0.04, 0, L * 0.04);

            rod.addColorStop(0, "#c49ad4");
            rod.addColorStop(0.45, "#6e3f80");
            rod.addColorStop(1, "#2a1433");

            ctx.fillStyle = rod;
            ctx.strokeStyle = "rgba(224, 174, 50, 0.9)";
            ctx.lineWidth = Math.max(1, L * 0.008);
            ctx.shadowColor = "rgba(255, 214, 120, 0.7)";
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(-L * 0.2, -L * 0.035);
            ctx.lineTo(L * 0.9, -L * 0.014);
            ctx.lineTo(L * 0.9, L * 0.014);
            ctx.lineTo(-L * 0.2, L * 0.035);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // gold bands on the handle
            ctx.fillStyle = "#e0ae32";

            for (const at of [-0.16, -0.04, 0.06]) {
                ctx.fillRect(
                    L * at,
                    -L * 0.04,
                    L * 0.025,
                    L * 0.08
                );
            }

            ctx.translate(L * 0.95, 0);
            drawStar(L * 0.12, now / 300);
            ctx.restore();
        };

        const draw = (now: number) => {
            const t = now - start;

            ctx.clearRect(0, 0, width, height);

            /* ---------- wand ---------- */

            if (t < SPELL_SPIN_MS + 300) {
                const spinT = Math.min(1, t / SPELL_SPIN_MS);

                const angle =
                    startAngle +
                    turns * Math.PI * 2 * easeInOut(spinT);

                const alpha =
                    t < 150
                        ? t / 150
                        : t > SPELL_SPIN_MS
                          ? Math.max(0, 1 - (t - SPELL_SPIN_MS) / 300)
                          : 1;

                const scale = 0.6 + 0.4 * easeOut(Math.min(1, t / 250));

                const tipX =
                    originX + Math.cos(angle) * wandLength * 0.95 * scale;
                const tipY =
                    originY + Math.sin(angle) * wandLength * 0.95 * scale;

                // sparkle trail, filled in along the tip's path so
                // it stays continuous even on slow frames
                if (t < SPELL_SPIN_MS) {
                    const from = lastTip ?? { x: tipX, y: tipY };
                    const steps = Math.max(
                        1,
                        Math.ceil(
                            Math.hypot(tipX - from.x, tipY - from.y) / 6
                        )
                    );

                    for (let i = 1; i <= steps; i++) {
                        const k = i / steps;

                        spawnSparkle(
                            from.x + (tipX - from.x) * k,
                            from.y + (tipY - from.y) * k,
                            now,
                            0.02 + Math.random() * 0.05
                        );
                    }
                }

                lastTip = { x: tipX, y: tipY };

                drawWand(angle, alpha, scale, now);
            }

            /* ---------- burst ---------- */

            if (!burstDone && t >= SPELL_SPIN_MS) {
                burstDone = true;

                const n = width < 700 ? 60 : 110;

                for (let i = 0; i < n; i++) {
                    spawnSparkle(
                        lastTip?.x ?? originX,
                        lastTip?.y ?? originY,
                        now,
                        0.15 + Math.random() * 0.45
                    );
                }
            }

            /* ---------- sparkles ---------- */

            ctx.globalCompositeOperation = "lighter";

            for (let i = sparkles.length - 1; i >= 0; i--) {
                const s = sparkles[i];
                const age = now - s.born;

                if (age > s.life) {
                    sparkles.splice(i, 1);
                    continue;
                }

                const k = age / s.life;
                const size = s.size * (1 - k * 0.6);

                ctx.globalAlpha = 1 - k;

                ctx.drawImage(
                    sprites[s.sprite],
                    s.x + s.vx * age - size / 2,
                    s.y + s.vy * age + 0.00004 * age * age - size / 2,
                    size,
                    size
                );
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";

            // the wand is gone and the last sparkle has faded:
            // stop drawing, the smoke takes over from here
            if (t > SPELL_SPIN_MS + 300 && sparkles.length === 0) {
                return;
            }

            frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
        };
    }, [originX, originY, radius, color]);

    return (
        <canvas
            ref={canvasRef}
            className={`${styles.spellCanvas} ${
                fadingOut ? styles.spellCanvasFadeOut : ""
            }`}
            aria-hidden="true"
        />
    );
}

/* =========================================================
   SMOKE TRANSITION
========================================================= */

interface SmokeCanvasProps {
    originX: number;
    originY: number;
    color: string;
    fadingOut: boolean;
}

function SmokeCanvas({
    originX,
    originY,
    color,
    fadingOut,
}: SmokeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        /* =====================================================
           COLOR SETUP
           Base smoke color comes from the active category. Speck
           highlights/shadows are derived from it so the grain
           texture always matches the category tint instead of a
           fixed purple.
        ===================================================== */

        const baseColor = hexToRgb(color);

        const baseColorStr = rgbString(baseColor);

        const lightSpeckColor = rgbString(
            adjustColor(baseColor, 70)
        );

        const darkSpeckColor = rgbString(
            adjustColor(baseColor, -45)
        );

        let animationFrame = 0;

        const startTime = performance.now();

        let lastDrawTime = 0;

        const frameInterval = 1000 / 40; // cap the heavy work at ~40fps

        /* =====================================================
           CANVAS RESIZE
        ===================================================== */

        const resize = () => {
            const dpr = Math.min(
                window.devicePixelRatio || 1,
                1.5
            );

            canvas.width =
                window.innerWidth * dpr;

            canvas.height =
                window.innerHeight * dpr;

            canvas.style.width =
                `${window.innerWidth}px`;

            canvas.style.height =
                `${window.innerHeight}px`;

            ctx.setTransform(
                dpr,
                0,
                0,
                dpr,
                0,
                0
            );
        };

        resize();

        window.addEventListener(
            "resize",
            resize
        );

        /* =====================================================
           BASIC SETTINGS
        ===================================================== */

        const isMobile =
            window.innerWidth <= 700;

        const centerX =
            window.innerWidth * 0.5;

        const centerY =
            window.innerHeight * 0.5 - 20;

        // Cloud footprint scaled up ~1.4x in both directions on
        // mobile and desktop, compared to the original size.
        const cloudWidth =
            isMobile ? 980 : 1400;

        const cloudHeight =
            isMobile ? 1190 : 700;

        /* =====================================================
           PRE-RENDERED TEXTURES
           Built once, off the main draw loop. Each has its own
           softness baked in via a one-time canvas blur, so the
           draw loop never needs ctx.filter or a fresh gradient.
        ===================================================== */
const makeSoftSprite = (
    blurPx: number
) => {
    const spriteSize = 256;

    const sprite =
        document.createElement(
            "canvas"
        );

    sprite.width = spriteSize;
    sprite.height = spriteSize;

    const sctx =
        sprite.getContext("2d");

    if (!sctx) return sprite;

    const r = spriteSize / 2;

    sctx.filter =
        `blur(${blurPx}px)`;

    const gradient =
        sctx.createRadialGradient(
            r,
            r,
            0,
            r,
            r,
            r * 0.78
        );

    gradient.addColorStop(
        0,
        `rgba(${baseColorStr}, 1)`
    );

    gradient.addColorStop(
        0.5,
        `rgba(${baseColorStr}, 0.62)`
    );

    gradient.addColorStop(
        0.8,
        `rgba(${baseColorStr}, 0.22)`
    );

    gradient.addColorStop(
        1,
        `rgba(${baseColorStr}, 0)`
    );

    sctx.fillStyle = gradient;

    sctx.beginPath();

    sctx.arc(
        r,
        r,
        r * 0.78,
        0,
        Math.PI * 2
    );

    sctx.fill();

    /* =====================================================
       TEXTURE PASS
       Scatter uneven light/dark specks over the base gradient
       with a lighter blur than the base, so the sprite reads
       as grainy smoke instead of a flat soft disc. Speck colors
       are derived from the category's base color.
    ===================================================== */

    sctx.filter =
        `blur(${blurPx * 0.4}px)`;

    const textureSpecks = 40;

    for (
        let i = 0;
        i < textureSpecks;
        i++
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const dist =
            Math.random() *
            r *
            0.75;

        const speckX =
            r +
            Math.cos(angle) *
                dist;

        const speckY =
            r +
            Math.sin(angle) *
                dist;

        const speckRadius =
            6 +
            Math.random() * 22;

        const isLight =
            Math.random() > 0.45;

        sctx.globalAlpha =
            0.08 +
            Math.random() * 0.16;

        sctx.fillStyle = isLight
            ? `rgba(${lightSpeckColor}, 1)`
            : `rgba(${darkSpeckColor}, 1)`;

        sctx.beginPath();

        sctx.arc(
            speckX,
            speckY,
            speckRadius,
            0,
            Math.PI * 2
        );

        sctx.fill();
    }

    sctx.globalAlpha = 1;

    /* =====================================================
       CLIP TEXTURE TO SOFT CIRCLE
       Cuts the specks back down to the original falloff shape
       so grain doesn't spill a hard edge outside the cloud.
    ===================================================== */

    sctx.globalCompositeOperation =
        "destination-in";

    sctx.filter =
        `blur(${blurPx}px)`;

    const clipGradient =
        sctx.createRadialGradient(
            r,
            r,
            0,
            r,
            r,
            r * 0.78
        );

    clipGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 1)"
    );

    clipGradient.addColorStop(
        0.8,
        "rgba(255, 255, 255, 1)"
    );

    clipGradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
    );

    sctx.fillStyle = clipGradient;

    sctx.beginPath();

    sctx.arc(
        r,
        r,
        r * 0.78,
        0,
        Math.PI * 2
    );

    sctx.fill();

    sctx.globalCompositeOperation =
        "source-over";

    return sprite;
};

        // sharper texture for individual wisps, softer one for the big cloud body/puffs
        const particleSprite =
            makeSoftSprite(
                isMobile ? 3 : 4
            );

        const puffSprite =
            makeSoftSprite(
                isMobile ? 10 : 16
            );

        /* =====================================================
           PARTICLE WISPS
           Big particles are biased close to the center and stay
           put once they arrive. Small particles are biased out
           toward the rim and keep idly floating once settled.
           Counts are scaled up (~2x) alongside the larger cloud
           footprint so the wisp density per unit area stays the
           same as before.
        ===================================================== */

        const coreCount =
            isMobile ? 150 : 200;

        const edgeCount =
            isMobile ? 170 : 440;

        const makeParticle = (
    isCore: boolean
) => {
    const side =
        Math.random() > 0.5
            ? 1
            : -1;

    /*
     * MOBILE:
     * Keep the smoke concentrated around the center
     * instead of allowing particles to randomly spread
     * far above it.
     */
    const reach = isCore
    ? 0.08 + Math.random() * 0.28
    : isMobile
        ? 0.25 + Math.random() * 0.3
        : 0.355 + Math.random() * 0.45;

    /*
     * Full circular distribution so particles spread
     * evenly in every direction (left/right/up/down)
     * around the center, instead of being biased
     * toward one side.
     */
    const angle =
        Math.random() *
        Math.PI *
        2;

    const rawTargetX =
        Math.cos(angle) *
        cloudWidth *
        0.6 *
        reach;

    const rawTargetY =
        Math.sin(angle) *
        cloudHeight *
        0.5 *
        reach;

    const ellipseA =
        cloudWidth * 0.5;

    const ellipseB =
        cloudHeight * 0.5;

    const ellipseDist =
        Math.sqrt(
            (rawTargetX /
                ellipseA) ** 2 +
                (rawTargetY /
                    ellipseB) ** 2
        );

    const clampScale =
        ellipseDist > 1
            ? 1 / ellipseDist
            : 1;

    return {
        startX:
            originX +
            (Math.random() - 0.5) *
                35,

        startY:
            originY +
            Math.random() *
                18,

        targetX:
            centerX +
            rawTargetX *
                clampScale,

        targetY:
            centerY +
            rawTargetY *
                clampScale,

        size: isCore
            ? 48 +
              Math.random() * 45
            : 20 +
              Math.random() * 25,

        drift:
            side *
            (isCore
                ? 6 +
                  Math.random() * 10
                : 18 +
                  Math.random() * 35),

        phase:
            Math.random() *
            Math.PI *
            2,

        speed:
            0.1 +
            Math.random() *
                0.45,

        delay:
            Math.random() * 0.8,

        opacity:
            0.55 +
            Math.random() * 0.45,

        isCore,

        idleDrift: isCore
            ? 0
            : 5 +
              Math.random() * 10,

        idlePhase:
            Math.random() *
            Math.PI *
            2,

        idleSpeed:
            0.2 +
            Math.random() * 0.25,
    };
};
        

        const particles = [
            ...Array.from(
                { length: coreCount },
                () => makeParticle(true)
            ),
            ...Array.from(
                { length: edgeCount },
                () => makeParticle(false)
            ),
        ];

        /* =====================================================
           CENTRAL CLOUD PUFFS
           Mirrored above/below and left/right of center so the
           cloud reads as evenly filled on every side, rather
           than concentrated toward one corner. 12 puffs spread
           over the larger footprint keeps density on par with
           the original 5-puff version.
        ===================================================== */

        const cloudPuffs = [
            { x: -0.42, y: 0.30, s: 0.72 },
            { x: 0.42, y: 0.30, s: 0.72 },
            { x: -0.42, y: -0.30, s: 0.68 },
            { x: 0.42, y: -0.30, s: 0.68 },
            { x: -0.24, y: 0.38, s: 0.88 },
            { x: 0.24, y: 0.38, s: 0.88 },
            { x: -0.24, y: -0.38, s: 0.80 },
            { x: 0.24, y: -0.38, s: 0.80 },
            { x: -0.06, y: 0.36, s: 1.00 },
            { x: 0.06, y: -0.36, s: 0.92 },
            { x: 0, y: 0.12, s: 0.75 },
            { x: 0, y: -0.12, s: 0.75 },
        ];

        /* =====================================================
           SOFT EASING
        ===================================================== */

        const easeOut = (t: number) =>
            1 - Math.pow(1 - t, 2.25);

        /* =====================================================
           DRAW
        ===================================================== */

        const draw = (now: number) => {
            if (
                now - lastDrawTime <
                frameInterval
            ) {
                animationFrame =
                    requestAnimationFrame(
                        draw
                    );

                return;
            }

            lastDrawTime = now;

            const elapsed =
                (now - startTime) / 1000;

            ctx.clearRect(
                0,
                0,
                window.innerWidth,
                window.innerHeight
            );

            /* =================================================
               RISING PARTICLES
            ================================================= */

            particles.forEach((particle) => {
                const rawProgress =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            (elapsed -
                                particle.delay) /
                                2.35
                        )
                    );

                const progress =
                    easeOut(rawProgress);

                const riseAmount =
                    Math.min(
                        window.innerHeight *
                            0.4,
                        390
                    );

                const rise =
                    Math.sin(
                        progress *
                            Math.PI *
                            0.9
                    ) * riseAmount;

                const spread =
                    Math.pow(
                        progress,
                        1.3
                    );

                const wave =
                    Math.sin(
                        elapsed *
                            particle.speed *
                            2.2 +
                            particle.phase
                    );

                const insideCloudStart = 0.75;

                const insideCloudFactor =
                    Math.min(
                        1,
                        Math.max(
                            0,
                            (spread -
                                insideCloudStart) /
                                (1 -
                                    insideCloudStart)
                        )
                    );

                // once a particle has fully arrived, small ones keep
                // idly floating in place; core ones stay still
                const settled =
                    rawProgress >= 1;

                const idleX = settled
                    ? Math.cos(
                          elapsed *
                              particle.idleSpeed +
                              particle.idlePhase
                      ) * particle.idleDrift
                    : 0;

                const idleY = settled
                    ? Math.sin(
                          elapsed *
                              particle.idleSpeed *
                              0.8 +
                              particle.idlePhase
                      ) *
                      particle.idleDrift *
                      0.6
                    : 0;

                const x =
                    particle.startX +
                    (particle.targetX -
                        particle.startX) *
                        spread +
                    wave *
                        particle.drift * 0.25 *
                        insideCloudFactor +
                    idleX;

                const risingY =
                    particle.startY -
                    rise;

                const y =
                    risingY +
                    (particle.targetY -
                        risingY) *
                        Math.pow(
                            progress,
                            1.8
                        ) +
                    idleY;

                const size =
                    particle.size *
                    (2 +
                        progress * 1.5);

                const alpha =
                    particle.opacity *
                    (0.10 +
                        progress * 0.46);

                const aspect =
                    0.62 +
                    Math.sin(
                        particle.phase
                    ) * 0.18;

                ctx.save();

                ctx.globalAlpha = alpha;

                ctx.translate(x, y);

                ctx.rotate(particle.phase);

                ctx.scale(1, aspect);

                ctx.drawImage(
                    particleSprite,
                    -size,
                    -size,
                    size * 2,
                    size * 2
                );

                ctx.restore();
            });

            /* =================================================
               CENTRAL SOFT CLOUD
               (pre-rendered sprite — no per-frame gradients,
               no runtime blur)
            ================================================= */

            if (elapsed > 0.42) {
                const cloudProgress =
                    Math.min(
                        1,
                        Math.max(
                            0,
                            (elapsed - 0.42) /
                                0.95
                        )
                    );

                const eased =
                    easeOut(cloudProgress);

                const baseRadius =
                    isMobile
                        ? 280
                        : 560;

                ctx.save();

                ctx.globalAlpha =
                    0.24 * eased;

                ctx.translate(
                    centerX,
                    centerY
                );

                ctx.scale(
                    1,
                    isMobile ? 0.7 : 0.8 / 1.1
                );

                ctx.drawImage(
                    puffSprite,
                    -baseRadius * 1.1,
                    -baseRadius * 1.1,
                    baseRadius * 1.1 * 2,
                    baseRadius * 1.1 * 2
                );

                ctx.restore();

                cloudPuffs.forEach(
                    (puff, index) => {
                        const puffDelay =
                            index * 0.015;

                        const puffProgress =
                            Math.min(
                                1,
                                Math.max(
                                    0,
                                    (cloudProgress -
                                        puffDelay) /
                                        0.75
                                )
                            );

                        const puffEase =
                            easeOut(
                                puffProgress
                            );

                        const x =
                            centerX +
                            puff.x *
                                cloudWidth *
                                puffEase *
                                0.62;

                        const y =
                            centerY +
                            puff.y *
                                cloudHeight *
                                puffEase *
                                0.58;

                        const radius =
                            (isMobile
                                ? 161
                                : 252) *
                            puff.s *
                            (0.25 +
                                puffEase *
                                    0.60);

                        const alpha =
                            0.105 *
                            puffEase;

                        ctx.save();

                        ctx.globalAlpha =
                            alpha;

                        ctx.translate(
                            x,
                            y
                        );

                        ctx.scale(
                            1,
                            0.82
                        );

                        ctx.drawImage(
                            puffSprite,
                            -radius,
                            -radius,
                            radius * 2,
                            radius * 2
                        );

                        ctx.restore();
                    }
                );
            }

            /* =================================================
               DENSE CORE
            ================================================= */

            if (elapsed > 0.65) {
                const coreProgress =
                    Math.min(
                        1,
                        (elapsed - 0.65) /
                            0.7
                    );

                const coreGradient =
                    ctx.createRadialGradient(
                        centerX,
                        centerY,
                        0,
                        centerX,
                        centerY,
                        isMobile
                            ? 322
                            : 490
                    );

                coreGradient.addColorStop(
                    0,
                    `rgba(${baseColorStr}, ${
                        0.14 *
                        coreProgress
                    })`
                );

                coreGradient.addColorStop(
                    0.38,
                    `rgba(${baseColorStr}, ${
                        0.10 *
                        coreProgress
                    })`
                );

                coreGradient.addColorStop(
                    0.72,
                    `rgba(${baseColorStr}, ${
                        0.04 *
                        coreProgress
                    })`
                );

                coreGradient.addColorStop(
                    1,
                    `rgba(${baseColorStr}, 0)`
                );

                ctx.fillStyle =
                    coreGradient;

                ctx.fillRect(
                    centerX -
                        (isMobile
                            ? 322
                            : 490),
                    centerY -
                        (isMobile
                            ? 238
                            : 350),
                    isMobile
                        ? 644
                        : 980,
                    isMobile
                        ? 560
                        : 840
                );
            }

            /* =================================================
               READABILITY VIGNETTE
               (kept neutral/dark regardless of category so text
               stays legible over any smoke color)
            ================================================= */

            if (elapsed > 0.5) {
                const vignetteAlpha =
                    Math.min(
                        1,
                        (elapsed - 0.5) /
                            0.6
                    ) * 0.35;

                const vignette =
                    ctx.createRadialGradient(
                        centerX,
                        centerY,
                        0,
                        centerX,
                        centerY,
                        isMobile
                            ? 364
                            : 672
                    );

                vignette.addColorStop(
                    0,
                    `rgba(30, 26, 20, ${vignetteAlpha})`
                );

                vignette.addColorStop(
                    0.6,
                    `rgba(30, 26, 20, ${
                        vignetteAlpha *
                        0.55
                    })`
                );

                vignette.addColorStop(
                    1,
                    "rgba(30, 26, 20, 0)"
                );

                ctx.fillStyle =
                    vignette;

                ctx.fillRect(
                    centerX -
                        (isMobile
                            ? 364
                            : 672),
                    centerY -
                        (isMobile
                            ? 322
                            : 588),
                    isMobile
                        ? 728
                        : 1344,
                    isMobile
                        ? 644
                        : 1176
                );
            }

            /* =================================================
               SMOKE BASE AT VASE
            ================================================= */

            const baseProgress =
                Math.min(
                    1,
                    elapsed / 0.75
                );

            if (baseProgress > 0) {
                const baseGradient =
                    ctx.createRadialGradient(
                        originX,
                        originY,
                        0,
                        originX,
                        originY,
                        48
                    );

                baseGradient.addColorStop(
                    0,
                    `rgba(${baseColorStr}, ${
                        0.30 *
                        baseProgress
                    })`
                );

                baseGradient.addColorStop(
                    0.38,
                    `rgba(${baseColorStr}, ${
                        0.18 *
                        baseProgress
                    })`
                );

                baseGradient.addColorStop(
                    0.7,
                    `rgba(${baseColorStr}, ${
                        0.06 *
                        baseProgress
                    })`
                );

                baseGradient.addColorStop(
                    1,
                    `rgba(${baseColorStr}, 0)`
                );

                ctx.fillStyle =
                    baseGradient;

                ctx.beginPath();

                ctx.ellipse(
                    originX,
                    originY,
                    24,
                    40,
                    0,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }

            /* =================================================
               CONTINUE ANIMATION
            ================================================= */

            animationFrame =
                requestAnimationFrame(
                    draw
                );
        };

        animationFrame =
            requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                resize
            );
        };
    }, [originX, originY, color]);

    return (
        <canvas
            ref={canvasRef}
            className={`${styles.smokeCanvas} ${
                fadingOut
                    ? styles.smokeCanvasFadeOut
                    : ""
            }`}
            aria-hidden="true"
        />
    );
}

/* =========================================================
   EVENTS PAGE
========================================================= */

/* =========================================================
   EVENTS PAGE (/events/:school)

   Picks the school from the URL (see schools.ts) and shows its
   tents; an unknown school goes back to the Tickets page.
========================================================= */

export default function EventsPage() {
    const { school: slug } = useParams();
    const school = schoolBySlug(slug);

    if (!school) {
        return <Navigate to="/events" replace />;
    }

    return <SchoolTents key={school.slug} school={school} />;
}

function SchoolTents({ school }: { school: School }) {
    const navigate = useNavigate();
    const location = useLocation();

    // arriving through a ticket: the Tickets page already loaded
    // every image and closed the curtains, so skip the preloader
    // and open the curtains on this school's tents
    const fromTicket = Boolean(
        (location.state as { fromTicket?: boolean } | null)?.fromTicket
    );

    const [curtainsOpen, setCurtainsOpen] = useState(!fromTicket);

    // the scene that the "camera" dives into (background, sign
    // and tents; the nav stays put)
    const sceneRef =
        useRef<HTMLDivElement>(null);

    // every pending step of the click sequence, so a new click,
    // a close or unmounting can cancel them all at once
    const sequenceTimersRef =
        useRef<number[]>([]);

    const later = (
        step: () => void,
        ms: number
    ) => {
        sequenceTimersRef.current.push(
            window.setTimeout(step, ms)
        );
    };

    const clearSequence = () => {
        sequenceTimersRef.current.forEach(
            (id) => window.clearTimeout(id)
        );

        sequenceTimersRef.current = [];
    };

    const [
        selectedCategory,
        setSelectedCategory,
    ] =
        useState<Department | null>(null);

    const [
        spellOrigin,
        setSpellOrigin,
    ] =
        useState<{
            x: number;
            y: number;
            radius: number;
            wand: boolean;
        } | null>(null);

    const [
        spellDepartment,
        setSpellDepartment,
    ] =
        useState<Department | null>(null);

    // the smoke is mounted while rising, then fades away
    // (.smokeCanvasFadeOut) as the camera dives in
    const [
        smokeRising,
        setSmokeRising,
    ] = useState(false);

    const [
        smokeFading,
        setSmokeFading,
    ] = useState(false);

    // where the camera dives: the clicked tent's doorway, the
    // shift that brings it to the middle of the screen, and the
    // zoom that makes the doorway fill the screen
    const [
        dive,
        setDive,
    ] =
        useState<{
            originX: number;
            originY: number;
            x: number;
            y: number;
            scale: number;
        } | null>(null);

    const [
        diving,
        setDiving,
    ] = useState(false);

    // the inside of the tent, shown at the end of the dive
    const [
        inside,
        setInside,
    ] = useState(false);

    const [
        leavingTent,
        setLeavingTent,
    ] = useState(false);

    const [
        currentIndex,
        setCurrentIndex,
    ] = useState(0);

    // the LEDs currently scattered on each tent; a tent gets a
    // new random set every time the cursor (or focus) reaches it
    const [
        tentLights,
        setTentLights,
    ] = useState<Partial<Record<Department, TentLight[]>>>({});

    const lightUpTent = (department: Department) => {
        setTentLights((prev) => ({
            ...prev,
            [department]: scatterLights(),
        }));
    };

    // Mirrors About.tsx's aboutPreloaderDone: the Preloader
    // stays mounted (blocking the page) until every asset in
    // EVENTS_ASSETS has loaded, then this flips to true and
    // it unmounts.
    const [
        eventsPreloaderDone,
        setEventsPreloaderDone,
    ] = useState(fromTicket);

    const handleEventsPreloaderEnter =
        useCallback(() => {
            setEventsPreloaderDone(true);
        }, []);

    /* =====================================================
       CLEANUP PENDING TIMERS ON UNMOUNT
    ===================================================== */

    useEffect(() => {
        const timers = sequenceTimersRef;

        return () => {
            timers.current.forEach(
                (id) => window.clearTimeout(id)
            );
        };
    }, []);

    /* =====================================================
       RESET THE CLICK SEQUENCE
    ===================================================== */

    const resetSequence = () => {
        setSpellOrigin(null);
        setSpellDepartment(null);
        setSmokeRising(false);
        setSmokeFading(false);
        setDive(null);
        setDiving(false);
        setInside(false);
        setLeavingTent(false);
    };

    /* =====================================================
       OPEN CATEGORY

       wand spins (SPELL_SPIN_MS) -> smoke rises
       (SMOKE_RISE_MS) -> smoke clears and the camera dives
       into the tent's doorway (DIVE_DELAY_MS, DIVE_MS) ->
       the inside of the tent fades in -> modal opens.
    ===================================================== */

    const openCategory = (
        category: Department,
        e: ReactMouseEvent<HTMLElement>
    ) => {
        clearSequence();
        resetSequence();
        setSelectedCategory(null);

        const rect =
            e.currentTarget.getBoundingClientRect();

        const scene =
            sceneRef.current?.getBoundingClientRect() ?? {
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            };

        const wand =
            !prefersReducedMotion();

        // the wand spins over the roof, 40% down the tent
        setSpellOrigin({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height * 0.4,
            radius: Math.min(
                150,
                Math.max(70, rect.width * 0.42)
            ),
            wand,
        });

        // the doorway sits at the bottom centre of the tent
        const doorX =
            rect.left +
            rect.width * TENT_DOOR.x -
            scene.left;

        const doorY =
            rect.top +
            rect.height * TENT_DOOR.y -
            scene.top;

        setDive({
            originX: doorX,
            originY: doorY,
            x: scene.width / 2 - doorX,
            y: scene.height / 2 - doorY,
            scale: Math.min(
                DIVE_MAX_SCALE,
                (Math.max(scene.width, scene.height) *
                    1.3) /
                    (rect.width * TENT_DOOR.width)
            ),
        });

        setSpellDepartment(category);

        const smokeAt = wand ? SPELL_SPIN_MS : 0;
        const clearAt = smokeAt + SMOKE_RISE_MS;
        const diveAt = clearAt + (wand ? DIVE_DELAY_MS : 0);
        const diveMs = wand ? DIVE_MS : 0;

        later(() => setSmokeRising(true), smokeAt);

        later(() => setSmokeFading(true), clearAt);

        later(() => {
            setSmokeRising(false);
            setSmokeFading(false);
        }, clearAt + SMOKE_FADE_OUT_MS);

        later(() => setDiving(wand), diveAt);

        // the inside fades in over the last part of the dive
        later(
            () => setInside(true),
            diveAt + diveMs * 0.55
        );

        later(() => {
            setSelectedCategory(category);
            setCurrentIndex(0);
        }, diveAt + diveMs + INSIDE_SETTLE_MS);
    };

    /* =====================================================
       CLOSE MODAL

       The modal closes immediately. Behind the inside of the
       tent the camera jumps back out, then the inside fades
       away (INSIDE_FADE_OUT_MS, matching .tentInteriorLeaving)
       to reveal the tents again.
    ===================================================== */

    const closeModal = () => {
        clearSequence();

        setSelectedCategory(null);
        setCurrentIndex(0);

        if (inside) {
            setDiving(false);
            setLeavingTent(true);

            later(resetSequence, INSIDE_FADE_OUT_MS);
        } else {
            resetSequence();
        }
    };

    /* =====================================================
       CURRENT EVENTS
    ===================================================== */

    const currentEvents: EventData[] =
        selectedCategory
            ? eventsData[
                  selectedCategory
              ] ?? []
            : [];

    /* =====================================================
       NEXT EVENT
    ===================================================== */

    const handleNext = () => {
        if (currentEvents.length <= 1) {
            return;
        }

        setCurrentIndex((prev) => {
            if (
                prev >=
                currentEvents.length - 1
            ) {
                return 0;
            }

            return prev + 1;
        });
    };

    /* =====================================================
       PREVIOUS EVENT
    ===================================================== */

    const handlePrev = () => {
        if (currentEvents.length <= 1) {
            return;
        }

        setCurrentIndex((prev) => {
            if (prev <= 0) {
                return (
                    currentEvents.length - 1
                );
            }

            return prev - 1;
        });
    };

    /* =====================================================
       KEYBOARD
    ===================================================== */

    useEffect(() => {
        if (!selectedCategory) {
            return;
        }

        const handleKeyDown = (
            e: KeyboardEvent
        ) => {
            if (e.key === "Escape") {
                closeModal();
            }

            if (e.key === "ArrowRight") {
                handleNext();
            }

            if (e.key === "ArrowLeft") {
                handlePrev();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [
        selectedCategory,
        currentEvents.length,
    ]);

    /* =====================================================
       CURRENT EVENT
    ===================================================== */

    const currentEvent =
        currentEvents[currentIndex];

    const smokeColor =
        spellDepartment
            ? shadeOf(school, spellDepartment).smoke
            : DEFAULT_SMOKE_COLOR;

    return (
        <div
            className={
                styles.fullPageContainer
            }
        >
            {/* =================================================
                NAV
            ================================================= */}

            <section>
                <Nav />
            </section>

            {/* =================================================
                BACK TO THE TICKETS
            ================================================= */}

            <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/events")}
            >
                <span aria-hidden="true">◂</span> All Schools
            </button>

            {/* =================================================
                SCENE

                Everything the camera dives into: background,
                sign and tents (the nav above stays put).
            ================================================= */}

            <div
                ref={sceneRef}
                className={styles.scene}
                data-dive={diving ? "in" : undefined}
                style={
                    dive
                        ? ({
                              "--dive-origin-x": `${dive.originX}px`,
                              "--dive-origin-y": `${dive.originY}px`,
                              "--dive-x": `${dive.x}px`,
                              "--dive-y": `${dive.y}px`,
                              "--dive-scale": dive.scale,
                              "--dive-ms": `${DIVE_MS}ms`,
                          } as CSSProperties)
                        : undefined
                }
            >

                {/* =================================================
                    TITLE

                    The EVENTS sign is painted into the background
                    art, so the heading is only for screen readers.
                ================================================= */}

                <h1 className={styles.visuallyHidden}>
                    {school.name} Events
                </h1>

                {/* =================================================
                    DEPARTMENT TENTS

                    Scattered around the carnival ground (spots in
                    schools.ts). Each tent is a button, so it is
                    focusable and Enter/Space open it like a click.
                ================================================= */}

                <section
                    className={styles.tentStage}
                    aria-label="Departments"
                >
                    {school.departments.map((department, index) => (
                        <button
                            key={slugOf(department)}
                            type="button"
                            className={styles.tent}
                            style={spotStyle(school, index)}
                            data-department={slugOf(
                                department
                            )}
                            data-active={
                                spellDepartment ===
                                    department || undefined
                            }
                            onClick={(e) =>
                                openCategory(
                                    department,
                                    e
                                )
                            }
                            onPointerEnter={() =>
                                lightUpTent(department)
                            }
                            onFocus={() =>
                                lightUpTent(department)
                            }
                        >
                            <span
                                className={styles.tentBody}
                                style={
                                    {
                                        "--label-length": Math.max(
                                            ...department
                                                .split("\n")
                                                .map((line) => line.length)
                                        ),
                                        "--label-lines":
                                            department.split("\n").length,
                                    } as CSSProperties
                                }
                            >
                                <img
                                    src={
                                        shadeOf(school, department)
                                            .src
                                    }
                                    alt=""
                                />

                                <span
                                    className={
                                        styles.tentLights
                                    }
                                    aria-hidden="true"
                                >
                                    {tentLights[
                                        department
                                    ]?.map((light) => (
                                        <span
                                            key={light.id}
                                            className={
                                                styles.led
                                            }
                                            style={
                                                {
                                                    left: `${light.x}%`,
                                                    top: `${light.y}%`,
                                                    "--led-color":
                                                        light.color,
                                                    "--led-size": `${light.size}cqi`,
                                                    "--led-fall": `${light.fall}s`,
                                                    "--led-twinkle": `${light.twinkle}s`,
                                                } as CSSProperties
                                            }
                                        />
                                    ))}
                                </span>

                                <span
                                    className={
                                        styles.tentLabel
                                    }
                                >
                                    {department}
                                </span>
                            </span>
                        </button>
                    ))}
                </section>

            </div>

            {/* =================================================
                INSIDE THE TENT
            ================================================= */}

            {inside && spellDepartment && (
                <div
                    className={`${styles.tentInterior} ${
                        leavingTent
                            ? styles.tentInteriorLeaving
                            : ""
                    }`}
                    data-image={
                        TENT_INTERIORS[spellDepartment]
                            ? true
                            : undefined
                    }
                    style={
                        {
                            "--interior-color":
                                shadeOf(school, spellDepartment)
                                    .smoke,
                            ...(TENT_INTERIORS[
                                spellDepartment
                            ]
                                ? {
                                      backgroundImage: `url(${TENT_INTERIORS[spellDepartment]})`,
                                  }
                                : {}),
                        } as CSSProperties
                    }
                    aria-hidden="true"
                />
            )}

            {/* =================================================
                SMOKE (rises once the wand has spun)
            ================================================= */}

            {spellOrigin && smokeRising && (
                <SmokeCanvas
                    originX={
                        spellOrigin.x
                    }
                    originY={
                        spellOrigin.y
                    }
                    color={
                        smokeColor
                    }
                    fadingOut={smokeFading}
                />
            )}

            {/* =================================================
                MAGIC WAND
            ================================================= */}

            {spellOrigin?.wand && (
                <WandSpell
                    originX={
                        spellOrigin.x
                    }
                    originY={
                        spellOrigin.y
                    }
                    radius={
                        spellOrigin.radius
                    }
                    color={
                        smokeColor
                    }
                    fadingOut={leavingTent}
                />
            )}

            {/* =================================================
                MODAL
            ================================================= */}

            {selectedCategory !== null && (
                <div
                    className={
                        styles.modalOverlay
                    }
                    onClick={closeModal}
                >
                    <div
                        className={
                            currentEvents.length ===
                            0
                                ? styles.noEventsModal
                                : styles.modal
                        }
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >
                        {/* =====================================
                            CLOSE
                        ===================================== */}

                        <button
                            className={
                                styles.closeButton
                            }
                            onClick={
                                closeModal
                            }
                            aria-label="Close"
                        >
                            ×
                        </button>

                        {/* =====================================
                            NO EVENTS
                        ===================================== */}

                        {currentEvents.length ===
                        0 ? (
                            <div
                                className={
                                    styles.noEventsContent
                                }
                            >
                                <h2>
                                    No Events Found
                                </h2>

                                <p>
                                    Alas! There are no{" "}
                                    {selectedCategory.replace(/\n/g, " ")}{" "}
                                    events to discover
                                    at the moment.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* =================================
                                   EVENT
                                ================================= */}

                                <div
                                    className={
                                        styles.modalContent
                                    }
                                >
                                    {/* =========================
                                        LEFT
                                    ========================= */}

                                    <div
                                        className={
                                            styles.eventInfo
                                        }
                                    >
                                        <h2>
                                            {
                                                currentEvent.name
                                            }
                                        </h2>

                                        {currentEvent.description && (
                                            <p
                                                className={
                                                    styles.description
                                                }
                                            >
                                                {
                                                    currentEvent.description
                                                }
                                            </p>
                                        )}

                                        {/* DETAILS */}

                                        <div
                                            className={
                                                styles.eventDetails
                                            }
                                        >
                                            {/* CLUB */}

                                            {currentEvent.club_name && (
                                                <div
                                                    className={
                                                        styles.detail
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.icon
                                                        }
                                                    >
                                                        ◆
                                                    </span>

                                                    <span>
                                                        {
                                                            currentEvent.club_name
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {/* VENUE */}

                                            {currentEvent.venue && (
                                                <div
                                                    className={
                                                        styles.detail
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.icon
                                                        }
                                                    >
                                                        ⌖
                                                    </span>

                                                    <span>
                                                        {
                                                            currentEvent.venue
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* RULEBOOK */}

                                        {currentEvent.rulebook && (
                                            <a
                                                href={
                                                    "https://docs.google.com/document/d/19yAh7FlGDDVqDHc4ZiUbPv1kwSmhOCYdFTghMzR0UAE/edit?tab=t.0"
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={
                                                    styles.rulebookButton
                                                }
                                            >
                                                Rulebook
                                            </a>
                                        )}
                                    </div>

                                    {/* =========================
                                        RIGHT IMAGE
                                    ========================= */}

                                    <div
                                        className={
                                            styles.eventImage
                                        }
                                    >
                                        {currentEvent.image_url ? (
                                            <img
                                                src={
                                                    currentEvent.image_url
                                                }
                                                alt={
                                                    currentEvent.name
                                                }
                                            />
                                        ) : (
                                            <div
                                                className={
                                                    styles.imagePlaceholder
                                                }
                                            >
                                                <span>
                                                    {
                                                        currentEvent.name
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* =================================
                                    EVENT NAVIGATION
                                ================================= */}

                                {currentEvents.length >
                                    1 && (
                                    <div
                                        className={
                                            styles.navigation
                                        }
                                    >
                                        <button
                                            className={
                                                styles.navButton
                                            }
                                            onClick={
                                                handlePrev
                                            }
                                            aria-label="Previous event"
                                        >
                                            ‹
                                        </button>

                                        <span
                                            className={
                                                styles.counter
                                            }
                                        >
                                            {
                                                currentIndex +
                                                1
                                            }
                                            {" / "}
                                            {
                                                currentEvents.length
                                            }
                                        </span>

                                        <button
                                            className={
                                                styles.navButton
                                            }
                                            onClick={
                                                handleNext
                                            }
                                            aria-label="Next event"
                                        >
                                            ›
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* =================================================
                PRELOADER
            ================================================= */}

            {/* =================================================
                CURTAINS (opening, when arriving through a ticket)
            ================================================= */}

            {!curtainsOpen && (
                <Curtains
                    state="opening"
                    onOpened={() => setCurtainsOpen(true)}
                />
            )}

            {!eventsPreloaderDone && (
                <Preloader
                    assets={EVENTS_ASSETS}
                       fonts={["Cinzel", "EBGaramond"]}
                    onEnter={handleEventsPreloaderEnter}
                />
            )}
        </div>
    );
}