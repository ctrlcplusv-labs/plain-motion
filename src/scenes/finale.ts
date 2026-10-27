import { brandMark } from "../components";
import { DOMAIN, TAGLINE } from "../content";
import { anchor, el, maskedChars } from "../dom";
import { easeInCubic, easeOutCubic, isBlinkOn, lerp, pop, pose, progress, rise, springAt } from "../motion";
import { createBurst, createRing } from "./scene";
import type { Scene } from "./scene";

type Metrics = {
  markX: number;
};

const ALEX_LENGTH = 4;
const CLOUDSTAR_END = 13;
const SLAM_FROM_SCALE = 2.6;
const SQUASH_DEPTH = 0.32;
const TAGLINE_Y = 165;
const CURSOR_Y = 34;
const TRACKING_FROM_EM = 0.9;
const TRACKING_TO_EM = 0.32;

const CUE = {
  cursor: 27,
  slam: 27.82,
  impact: 28,
  slide: 28.75,
  letters: 28.8,
  letterStep: 0.0625,
  tagline: 30,
  taglineBeats: 1.2,
};

function letterClass(index: number): string {
  if (index < ALEX_LENGTH) return "lockup-alex";
  if (index < CLOUDSTAR_END) return "lockup-cloud";
  return "lockup-tld";
}

export function createFinale(parent: HTMLElement): Scene {
  const cursor = anchor("pause-cursor");
  const mark = brandMark(["mark-finale"]);
  const markAnchor = anchor("finale-mark", [mark.root]);
  const spacer = el("span", "lockup-spacer");
  const letters = maskedChars(DOMAIN);
  letters.forEach((letter, index) => letter.inner.classList.add(letterClass(index)));
  const lockup = anchor(["lockup", "display-lockup"], [spacer, ...letters.map((letter) => letter.mask)]);
  const tagline = anchor("tagline", [TAGLINE]);
  parent.append(cursor, lockup, tagline);
  const ring = createRing(parent, CUE.impact, 0.2, 4.2, ["ring-strong"]);
  const ringEcho = createRing(parent, CUE.impact + 0.15, 0.2, 3, []);
  const burst = createBurst(parent, CUE.impact, 18, 520);
  parent.append(markAnchor);
  let metrics: Metrics | null = null;

  const measure = (): Metrics => ({
    markX: spacer.offsetLeft + spacer.offsetWidth / 2 - lockup.offsetWidth / 2,
  });

  return {
    update(beat) {
      metrics ??= measure();
      ring.update(beat);
      ringEcho.update(beat);
      burst.update(beat);

      const cursorPop = pop(beat, CUE.cursor, { from: 0.2, frequency: 3, damping: 0.4 });
      const isPause = beat >= CUE.cursor && beat < CUE.slam;
      pose(cursor, { y: CURSOR_Y, scale: cursorPop.scale, opacity: isPause && isBlinkOn(beat) ? 1 : 0 }, "center");

      const slam = easeInCubic(progress(beat, CUE.slam, CUE.impact - CUE.slam));
      const squash = beat >= CUE.impact ? (1 - springAt(beat, CUE.impact, 2.6, 0.32)) * SQUASH_DEPTH : 0;
      const slide = springAt(beat, CUE.slide, 1.7, 0.7);
      pose(
        markAnchor,
        {
          x: lerp(0, metrics.markX, slide),
          scale: beat < CUE.impact ? lerp(SLAM_FROM_SCALE, 1, slam) : 1,
          scaleX: 1 + squash,
          scaleY: 1 - squash,
          rotate: beat < CUE.impact ? lerp(-14, 0, slam) : Math.sin(slide * Math.PI) * -5,
          opacity: beat >= CUE.slam ? Math.min(1, slam * 3) : 0,
        },
        "center",
      );
      mark.cursor.style.opacity = beat < CUE.slide || isBlinkOn(beat) ? "1" : "0";

      pose(lockup, { opacity: beat >= CUE.letters ? 1 : 0 }, "center");
      letters.forEach((letter, index) => {
        const start = CUE.letters + index * CUE.letterStep;
        pose(letter.inner, {
          y: rise(beat, start, 170, 2.6, 0.56),
          rotate: rise(beat, start, 14, 2.6, 0.56),
        });
      });

      const taglineIn = easeOutCubic(progress(beat, CUE.tagline, CUE.taglineBeats));
      tagline.style.letterSpacing = `${lerp(TRACKING_FROM_EM, TRACKING_TO_EM, taglineIn)}em`;
      pose(tagline, { y: TAGLINE_Y + (1 - taglineIn) * 20, opacity: taglineIn }, "center");
      pose(spacer, { opacity: 0 });
    },
  };
}
