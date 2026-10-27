import { anchor, el } from "../dom";
import { clamp01, easeOutCubic, easeOutExpo, gridPulse, pose, progress } from "../motion";

export type Scene = {
  update: (beat: number) => void;
};

export type Point = {
  x: number;
  y: number;
};

export type Burst = {
  nodes: HTMLSpanElement[];
  update: (beat: number) => void;
};

export type Ring = {
  root: HTMLDivElement;
  update: (beat: number) => void;
};

const HAT_STEP = 1;
const HAT_OFFSET = 0.5;
const KICK_STEP = 1;
const RING_BEATS = 1.1;
const BURST_BEATS = 1.4;
const FULL_TURN = Math.PI * 2;

export function hatPulse(beat: number, start: number, end: number, rate = 14): number {
  return gridPulse(beat, start + HAT_OFFSET, end, HAT_STEP, rate);
}

export function kickPulse(beat: number, start: number, end: number, rate = 10): number {
  return gridPulse(beat, start, end, KICK_STEP, rate);
}

export function createRing(parent: HTMLElement, hit: number, fromScale: number, toScale: number, classes: string[] = []): Ring {
  const root = anchor(["ring", ...classes]);
  parent.append(root);
  return {
    root,
    update(beat) {
      const amount = progress(beat, hit, RING_BEATS);
      const isActive = beat >= hit && amount < 1;
      pose(
        root,
        {
          scale: fromScale + (toScale - fromScale) * easeOutExpo(amount),
          opacity: isActive ? (1 - amount) ** 1.5 : 0,
        },
        "center",
      );
    },
  };
}

export function createBurst(parent: HTMLElement, hit: number, count: number, radius: number, center: Point = { x: 0, y: 0 }): Burst {
  const nodes = Array.from({ length: count }, (_, index) => el("span", ["anchor", "spark", index % 3 === 0 ? "spark-ink" : "spark-accent"]));
  parent.append(...nodes);
  return {
    nodes,
    update(beat) {
      const amount = progress(beat, hit, BURST_BEATS);
      const isActive = beat >= hit && amount < 1;
      nodes.forEach((node, index) => {
        const angle = (index / count) * FULL_TURN + (index % 2) * 0.18;
        const reach = radius * (0.7 + ((index * 37) % 10) / 22);
        const travel = easeOutExpo(amount) * reach;
        pose(
          node,
          {
            x: center.x + Math.cos(angle) * travel,
            y: center.y + Math.sin(angle) * travel,
            scale: (1 - easeOutCubic(amount)) * 1.2,
            rotate: (angle * 180) / Math.PI,
            scaleX: 1 + (1 - clamp01(amount * 2.5)) * 2.4,
            opacity: isActive ? 1 : 0,
          },
          "center",
        );
      });
    },
  };
}
