import type { CodeCard } from "../components";
import { STACK_LINES } from "../content";
import { anchor, el, masked } from "../dom";
import { easeInExpo, easeInOutCubic, isBetween, isBlinkOn, lerp, pose, progress, rise, springAt } from "../motion";
import { STAGE_WIDTH } from "../timing";
import type { Scene } from "./scene";

const LINE_X = -860;
const LINE_BASE_Y = 60;
const LINE_GAP = 150;
const LINE_PX = 132;
const CARD_X = 470;
const CARD_Y = 30;
const CARD_SCALE = 0.92;
const CARD_ENTER_X = 1500;
const CARD_TILT = -14;
const BAR_TRAVEL = 1250;
const BAR_HALF_WIDTH = 110;
const EXIT_DISTANCE = 1500;

const CUE = {
  wipe: 14.7,
  wipeBeats: 0.55,
  lines: [15, 16, 17],
  card: 15,
  typeStart: 15.25,
  typeBeats: 2.55,
  exit: 17.75,
  exitBeats: 0.3,
  handoff: 18,
  visibleFrom: 14.7,
  visibleTo: 18.2,
};

export function createStack(parent: HTMLElement, code: CodeCard): Scene {
  const lines = STACK_LINES.map((text) => masked([text], [], "stack-word"));
  const lineAnchors = lines.map((line) => anchor(["stack-line", "display-stack"], [line.mask]));
  const bar = anchor("wipe-bar");
  const layer = el("div", "scene-layer", lineAnchors);
  parent.append(layer, bar);

  return {
    update(beat) {
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const wipe = easeInOutCubic(progress(beat, CUE.wipe, CUE.wipeBeats));
      const barX = lerp(-BAR_TRAVEL, BAR_TRAVEL, wipe);
      const revealed = ((barX + STAGE_WIDTH / 2 - BAR_HALF_WIDTH) / STAGE_WIDTH) * 100;
      layer.style.clipPath = wipe >= 1 ? "none" : `inset(0 ${Math.max(0, 100 - revealed)}% 0 0)`;
      pose(layer, { opacity: isVisible ? 1 : 0 });
      pose(bar, { x: barX, skewX: -14, scaleX: 1 + Math.sin(wipe * Math.PI) * 0.6, opacity: wipe > 0 && wipe < 1 ? 1 : 0 }, "center");

      const stackShift = CUE.lines.slice(1).reduce((sum, cue) => sum + springAt(beat, cue, 2, 0.7), 0);
      const activeIndex = CUE.lines.findLastIndex((cue) => beat >= cue);
      const exit = easeInExpo(progress(beat, CUE.exit, CUE.exitBeats));
      lineAnchors.forEach((lineAnchor, index) => {
        const lineExit = easeInExpo(progress(beat, CUE.exit + index * 0.04, CUE.exitBeats));
        lineAnchor.classList.toggle("is-muted", index < activeIndex);
        pose(lineAnchor, { x: LINE_X - lineExit * EXIT_DISTANCE, y: LINE_BASE_Y + (index - stackShift) * LINE_GAP }, "left");
        const start = CUE.lines[index] ?? CUE.card;
        pose(lines[index]?.inner ?? lineAnchor, { y: rise(beat, start, LINE_PX * 1.25, 2.6, 0.6), rotate: rise(beat, start, 6, 2.6, 0.6) });
      });

      if (beat < CUE.handoff) {
        const enter = springAt(beat, CUE.card, 1.5, 0.68);
        pose(
          code.root,
          {
            x: lerp(CARD_ENTER_X, CARD_X, enter) - exit * 60,
            y: CARD_Y,
            scale: CARD_SCALE,
            rotateY: lerp(-48, CARD_TILT, enter),
            rotate: lerp(8, 0, enter),
            opacity: beat >= CUE.card ? 1 : 0,
          },
          "center",
        );
      }

      const typed = Math.floor(code.chars.length * progress(beat, CUE.typeStart, CUE.typeBeats));
      code.chars.forEach((char, index) => char.classList.toggle("is-typed", index < typed));
      const anchorChar = code.chars[Math.max(0, typed - 1)];
      if (typed === 0) code.chars[0]?.before(code.caret);
      else anchorChar?.after(code.caret);
      const isTyping = typed > 0 && typed < code.chars.length;
      code.caret.style.opacity = isTyping || isBlinkOn(beat) ? "1" : "0";
    },
  };
}
