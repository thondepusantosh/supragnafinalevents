import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type RefObject,
} from "react";

import { useNavigate } from "react-router-dom";

import Nav from "../../components/Nav";
import Preloader from "../Preloader";

import Curtains, { CURTAIN_CLOSE_MS } from "./Curtains";
import { SCHOOLS } from "./schools";
import styles from "./TicketsPage.module.scss";

import ticketsBg from "../../assets/Events/tickets/tickets-bg.webp";
import ticketsSign from "../../assets/Events/tickets/tickets-sign.webp";
import ticketEngineering from "../../assets/Events/tickets/ticket-engineering.webp";
import ticketScience from "../../assets/Events/tickets/ticket-science.webp";
import ticketManagement from "../../assets/Events/tickets/ticket-management.webp";
import ticketArtsCommerce from "../../assets/Events/tickets/ticket-arts-commerce.webp";
import ticketLaw from "../../assets/Events/tickets/ticket-law.webp";

// everything a school's page shows, loaded here so the curtains
// open straight onto the tents
import carnivalBg from "../../assets/Events/events-carnival-bg.webp";
import tentViolet from "../../assets/Events/tents/tent-violet.webp";
import tentMaroon from "../../assets/Events/tents/tent-maroon.webp";
import tentIndigo from "../../assets/Events/tents/tent-indigo.webp";
import tentPlum from "../../assets/Events/tents/tent-plum.webp";
import tentAmethyst from "../../assets/Events/tents/tent-amethyst.webp";
import tentWine from "../../assets/Events/tents/tent-wine.webp";
import tentRoyal from "../../assets/Events/tents/tent-royal.webp";

/* =========================================================
   TICKETS

   One ticket per school (slugs match schools.ts). Each was cut
   out of the TICKETS ENTRY artwork; x / y / w say where it sat
   in that picture (in %), so on wide screens it lines up with
   the painted scene exactly. On tall screens the tickets stack
   in a column under the sign instead.
========================================================= */

const TICKETS: Record<string, { art: string; x: number; y: number; w: number }> = {
    engineering: { art: ticketEngineering, x: 8.005, y: 42.277, w: 27.959 },
    science: { art: ticketScience, x: 36.471, y: 42.277, w: 27.396 },
    management: { art: ticketManagement, x: 64.374, y: 42.277, w: 27.396 },
    "arts-commerce": { art: ticketArtsCommerce, x: 19.955, y: 65.276, w: 29.087 },
    law: { art: ticketLaw, x: 50.564, y: 65.276, w: 29.087 },
};

const TICKETS_ASSETS = [
    ticketsBg,
    ticketsSign,
    ...Object.values(TICKETS).map((ticket) => ticket.art),
    carnivalBg,
    tentViolet,
    tentMaroon,
    tentIndigo,
    tentPlum,
    tentAmethyst,
    tentWine,
    tentRoyal,
];

// the intro preloader plays once per visit; coming back from a
// school's tents goes straight to the tickets
let ticketsLoaded = false;

/* =========================================================
   CLICK SEQUENCE

   pop    - the ticket jumps toward you, the others sink back
   stamp  - "ADMIT ONE" slams onto it        (STAMP_AT)
   tear   - the stub rips off along the perforation, with a
            burst of carnival confetti        (TEAR_AT)
   close  - red circus curtains sweep shut   (CURTAIN_AT)
   go     - the school's tents load behind the curtains, which
            then open there (EventsPage)
========================================================= */

const STAMP_AT = 260;
const TEAR_AT = 760;
const CURTAIN_AT = 1350;
const GO_AT = CURTAIN_AT + CURTAIN_CLOSE_MS + 120;

// the perforation sits just left of the arrow button (as a
// fraction of the ticket's width); the stub is everything right
// of it, cut along a zig-zag tear
const TEAR_X = 0.79;

function tearPath(side: "main" | "stub") {
    const teeth = 14;
    const edge: string[] = [];

    for (let i = 0; i <= teeth; i++) {
        const y = (i / teeth) * 100;
        const x = (TEAR_X + (i % 2 ? -0.012 : 0.012)) * 100;
        edge.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }

    return side === "main"
        ? `polygon(0 0, ${edge.join(", ")}, 0 100%)`
        : `polygon(100% 0, ${edge.join(", ")}, 100% 100%)`;
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* =========================================================
   CONFETTI

   Paper confetti and little gold stars in carnival colours,
   thrown up from the tear and fluttering down.
========================================================= */

const CONFETTI_COLORS = [
    "#d7263d", // red
    "#f4c542", // gold
    "#2e86de", // blue
    "#fff4d6", // cream
    "#2ecc71", // green
    "#9b59b6", // purple
    "#ff8fc7", // pink
];

interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    w: number;
    h: number;
    color: string;
    star: boolean;
    phase: number;
}

function useConfetti(canvasRef: RefObject<HTMLCanvasElement | null>) {
    const pieces = useRef<Piece[]>([]);
    const frame = useRef(0);

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    return useCallback(
        (x: number, y: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = window.innerWidth < 700 ? 110 : 190;

            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
                const speed = 5 + Math.random() * 11;

                pieces.current.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    rot: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.35,
                    w: 6 + Math.random() * 7,
                    h: 3 + Math.random() * 5,
                    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                    star: Math.random() < 0.14,
                    phase: Math.random() * Math.PI * 2,
                });
            }

            const step = () => {
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

                pieces.current = pieces.current.filter(
                    (p) => p.y < window.innerHeight + 40
                );

                for (const p of pieces.current) {
                    p.vy += 0.28; // gravity
                    p.vx *= 0.985; // air drag
                    p.vy *= 0.985;
                    p.x += p.vx + Math.sin(p.phase) * 0.8; // flutter
                    p.y += p.vy;
                    p.rot += p.vr;
                    p.phase += 0.12;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;

                    if (p.star) {
                        ctx.beginPath();
                        for (let k = 0; k < 10; k++) {
                            const r = k % 2 ? 2.4 : 6;
                            const a = (k * Math.PI) / 5;
                            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                        }
                        ctx.closePath();
                        ctx.fillStyle = "#ffd56b";
                        ctx.fill();
                    } else {
                        // the paper turns over as it falls
                        ctx.scale(1, Math.cos(p.phase));
                        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    }

                    ctx.restore();
                }

                if (pieces.current.length) {
                    frame.current = requestAnimationFrame(step);
                }
            };

            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(step);
        },
        [canvasRef]
    );
}

/* =========================================================
   TICKETS PAGE (/events)
========================================================= */

type Phase = "pop" | "stamp" | "tear" | "close";

export default function TicketsPage() {
    const navigate = useNavigate();
    const confettiRef = useRef<HTMLCanvasElement>(null);
    const throwConfetti = useConfetti(confettiRef);
    const timers = useRef<number[]>([]);

    const [loaded, setLoaded] = useState(ticketsLoaded);
    const [chosen, setChosen] = useState<string | null>(null);
    const [phase, setPhase] = useState<Phase | null>(null);

    useEffect(() => {
        const pending = timers.current;

        // fetch the tents page's code while the tickets are shown
        void import("./EventsPage");

        return () => pending.forEach((id) => window.clearTimeout(id));
    }, []);

    const handleEnter = useCallback(() => {
        ticketsLoaded = true;
        setLoaded(true);
    }, []);

    const choose = (slug: string, button: HTMLButtonElement) => {
        if (chosen) return;

        setChosen(slug);
        setPhase("pop");

        const reduced = prefersReducedMotion();
        const at = (ms: number, fn: () => void) =>
            timers.current.push(window.setTimeout(fn, reduced ? ms / 3 : ms));

        at(STAMP_AT, () => setPhase("stamp"));

        at(TEAR_AT, () => {
            setPhase("tear");

            if (!reduced) {
                const r = button.getBoundingClientRect();
                throwConfetti(r.left + r.width * TEAR_X, r.top + r.height * 0.5);
            }
        });

        at(CURTAIN_AT, () => setPhase("close"));

        at(GO_AT, () =>
            navigate(`/events/${slug}`, { state: { fromTicket: true } })
        );
    };

    return (
        <div className={styles.page}>
            <section>
                <Nav />
            </section>

            <h1 className={styles.visuallyHidden}>Events - pick your school</h1>

            {/* the carnival, with the tickets taken out of it */}
            <div className={styles.stage} aria-hidden="true" />

            {/* the hanging TICKETS sign (painted into the stage on
                wide screens; its own swinging piece on tall ones) */}
            <img className={styles.sign} src={ticketsSign} alt="" aria-hidden="true" />

            <nav className={styles.deck} aria-label="Schools">
                {SCHOOLS.map((school, index) => {
                    const ticket = TICKETS[school.slug];
                    const isChosen = chosen === school.slug;
                    const torn = isChosen && (phase === "tear" || phase === "close");

                    return (
                        <button
                            key={school.slug}
                            type="button"
                            className={styles.ticket}
                            data-state={
                                chosen ? (isChosen ? phase ?? "pop" : "dimmed") : undefined
                            }
                            aria-label={school.name}
                            disabled={Boolean(chosen) && !isChosen}
                            onClick={(e) => choose(school.slug, e.currentTarget)}
                            style={
                                {
                                    "--x": ticket.x,
                                    "--y": ticket.y,
                                    "--w": ticket.w,
                                    "--bob-delay": `${index * -0.7}s`,
                                    "--art": `url(${ticket.art})`,
                                } as CSSProperties
                            }
                        >
                            <span className={styles.ticketBody}>
                                {torn ? (
                                    <>
                                        <img
                                            className={styles.part}
                                            src={ticket.art}
                                            alt=""
                                            style={{ clipPath: tearPath("main") }}
                                        />
                                        <img
                                            className={`${styles.part} ${styles.stub}`}
                                            src={ticket.art}
                                            alt=""
                                            style={{ clipPath: tearPath("stub") }}
                                        />
                                    </>
                                ) : (
                                    <img className={styles.part} src={ticket.art} alt="" />
                                )}

                                <span className={styles.shine} />

                                {isChosen && phase !== "pop" && (
                                    <span className={styles.stamp}>Admit One</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <canvas ref={confettiRef} className={styles.confetti} aria-hidden="true" />

            {phase === "close" && <Curtains state="closing" />}

            {!loaded && (
                <Preloader
                    assets={TICKETS_ASSETS}
                    fonts={["Cinzel", "EBGaramond"]}
                    onEnter={handleEnter}
                />
            )}
        </div>
    );
}
