import { chip } from "../components";
import { SENIOR_WORDS } from "../content";
import { anchor, el, masked } from "../dom";
import { easeInCubic, easeInOutCubic, easeOutExpo, isBetween, lerp, pop, pose, progress, rise } from "../motion";
import type { Point, Scene } from "./scene";

export type SeniorScene = Scene & {
  chipAnchor: () => Point;
};

type Metrics = {
  firstWidth: number;
  secondWidth: number;
  wordHeight: number;
  chip: Point;
};

const ENTER_DISTANCE = 900;
const EXIT_LIFT = 140;

const CUE = {
  enter: 7.95,
  enterBeats: 0.4,
  pop: 8,
  since: 8.5,
  chip: 9,
  swap: 10,
  swapBeats: 0.4,
  handoff: 10.75,
  exitBeats: 0.3,
  visibleFrom: 7.9,
  visibleTo: 11.2,
};

export function createSenior(parent: HTMLElement): SeniorScene {
  const first = el("span", "slot-word", [SENIOR_WORDS.first]);
  const second = el("span", "slot-word", [SENIOR_WORDS.second]);
  const slot = el("span", ["mask", "slot"], [first, second]);
  const since = masked([SENIOR_WORDS.tail]);
  const yearChip = chip(SENIOR_WORDS.year, ["chip-display"]);
  const row = anchor(["senior-row", "display-lg"], [slot, since.mask, yearChip]);
  parent.append(row);
  let metrics: Metrics | null = null;

  function measure(): Metrics {
    const firstWidth = first.offsetWidth;
    const secondWidth = second.offsetWidth;
    slot.style.width = `${secondWidth}px`;
    const chipCenter = {
      x: yearChip.offsetLeft + yearChip.offsetWidth / 2 - row.offsetWidth / 2,
      y: yearChip.offsetTop + yearChip.offsetHeight / 2 - row.offsetHeight / 2,
    };
    return { firstWidth, secondWidth, wordHeight: slot.offsetHeight, chip: chipCenter };
  }

  return {
    chipAnchor() {
      metrics ??= measure();
      return metrics.chip;
    },
    update(beat) {
      metrics ??= measure();
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const enter = 1 - easeOutExpo(progress(beat, CUE.enter, CUE.enterBeats));
      const exit = easeInCubic(progress(beat, CUE.handoff, CUE.exitBeats));
      const rowPop = pop(beat, CUE.pop, { from: 0.9, frequency: 2.4, damping: 0.5 });
      pose(
        row,
        {
          y: enter * ENTER_DISTANCE - exit * EXIT_LIFT,
          scale: rowPop.scale,
          scaleY: 1 + enter * 0.25,
          scaleX: 1 / (1 + enter * 0.25),
          opacity: isVisible ? 1 - exit : 0,
        },
        "center",
      );

      const swap = easeInOutCubic(progress(beat, CUE.swap, CUE.swapBeats));
      slot.style.width = `${lerp(metrics.firstWidth, metrics.secondWidth, swap)}px`;
      pose(first, { y: -easeInCubic(progress(beat, CUE.swap, 0.3)) * metrics.wordHeight });
      pose(second, { y: rise(beat, CUE.swap + 0.05, metrics.wordHeight, 2.4, 0.6) });

      pose(since.inner, { y: rise(beat, CUE.since, metrics.wordHeight, 2.6, 0.6) });
      const chipPop = pop(beat, CUE.chip, { frequency: 2.8, damping: 0.38, squash: 0.05 });
      pose(yearChip, {
        scale: chipPop.scale,
        scaleX: chipPop.scaleX,
        scaleY: chipPop.scaleY,
        rotate: (1 - chipPop.value) * -12,
        opacity: chipPop.value > 0 && beat < CUE.handoff ? 1 : 0,
      });
    },
  };
}
