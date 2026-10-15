import type { AnimationEvent } from "react";

import styles from "./Curtains.module.scss";

/* =========================================================
   CIRCUS CURTAINS

   Red velvet stage curtains with a gold-trimmed valance.
   "closing" sweeps both panels in until they meet in the
   middle; "opening" starts closed and draws them apart to the
   sides, then calls onOpened so the page can remove them.
   Used between the Tickets page and a school's tents.
========================================================= */

export const CURTAIN_CLOSE_MS = 750;
export const CURTAIN_OPEN_MS = 1100;

interface CurtainsProps {
    state: "closing" | "opening";
    onOpened?: () => void;
}

export default function Curtains({ state, onOpened }: CurtainsProps) {
    const handleEnd = (e: AnimationEvent<HTMLDivElement>) => {
        if (state === "opening" && e.target === e.currentTarget) {
            onOpened?.();
        }
    };

    return (
        <div
            className={`${styles.curtains} ${styles[state]}`}
            aria-hidden="true"
        >
            <div className={`${styles.panel} ${styles.left}`} />
            <div
                className={`${styles.panel} ${styles.right}`}
                onAnimationEnd={handleEnd}
            />
            <div className={styles.valance} />
        </div>
    );
}
