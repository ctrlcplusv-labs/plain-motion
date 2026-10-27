import { YEARS_LINE } from "../content";
import { anchor, el, masked, maskedWords } from "../dom";
import { easeInExpo, easeOutQuart, isBetween, pop, pose, progress, rise, springAt } from "../motion";
import type { Scene } from "./scene";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DIGIT_PX = 270;
const LINE_PX = 104;
const ROW_Y = -70;
const LINE_Y = 165;
const EXIT_DISTANCE = 1150;

const CUE = {
  enter: 4,
  spinBeats: 1,
  land: 5,
  plus: 5.5,
  years: 6,
  wordStart: 6.5,
  wordStep: 0.25,
  underline: 7.5,
  exit: 7.75,
  exitBeats: 0.3,
  visibleFrom: 3.95,
  visibleTo: 8.2,
};

export function createYears(parent: HTMLElement): Scene {
  const reel = el("span", "reel", DIGITS.map((digit) => el("span", "reel-digit", [digit])));
  const reelMask = el("span", ["mask", "reel-mask"], [reel]);
  const plus = masked(["+"], [], "accent-text");
  const years = masked(["years."]);
  const row = anchor(["years-row", "display-xl"], [reelMask, plus.mask, years.mask]);

  const words = maskedWords(YEARS_LINE);
  const underline = el("span", "underline");
  words.at(-1)?.inner.append(underline);
  const line = anchor(["years-line", "display-md"], words.map((word) => word.mask));
  parent.append(row, line);

  return {
    update(beat) {
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const exit = easeInExpo(progress(beat, CUE.exit, CUE.exitBeats));
      const rowPop = pop(beat, CUE.enter, { from: 0.82, frequency: 2.2, damping: 0.5 });
      pose(
        row,
        { y: ROW_Y - exit * EXIT_DISTANCE, scale: rowPop.scale, opacity: isVisible ? 1 : 0 },
        "center",
      );

      const spin = easeOutQuart(progress(beat, CUE.enter, CUE.spinBeats));
      const land = pop(beat, CUE.land, { from: 0.88, frequency: 3, damping: 0.35, squash: 0.05 });
      pose(reel, { y: -spin * (DIGITS.length - 1) * DIGIT_PX });
      pose(reelMask, { scaleX: beat >= CUE.land ? land.scaleX : 1, scaleY: beat >= CUE.land ? land.scaleY : 1 });
      pose(plus.inner, { y: rise(beat, CUE.plus, DIGIT_PX, 2.6, 0.55), rotate: rise(beat, CUE.plus, 25, 2.6, 0.55) });
      pose(years.inner, { y: rise(beat, CUE.years, DIGIT_PX, 2.2, 0.62) });

      pose(
        line,
        { y: LINE_Y - easeInExpo(progress(beat, CUE.exit + 0.06, CUE.exitBeats)) * EXIT_DISTANCE, opacity: isVisible ? 1 : 0 },
        "center",
      );
      words.forEach((word, index) => {
        const start = CUE.wordStart + index * CUE.wordStep;
        pose(word.inner, { y: rise(beat, start, LINE_PX * 1.2, 2.6, 0.6), rotate: rise(beat, start, 8, 2.6, 0.6) });
      });
      pose(underline, { scaleX: springAt(beat, CUE.underline, 2.4, 0.7) });
    },
  };
}
