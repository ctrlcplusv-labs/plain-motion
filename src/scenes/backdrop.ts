import { el } from "../dom";
import { decay, easeOutCubic, lerp, pose, progress } from "../motion";
import { BEAT } from "../timing";
import { hatPulse, kickPulse } from "./scene";
import type { Scene } from "./scene";

const CUE = {
  intro: 0,
  groove: 4,
  mapIn: 23.9,
  mapOut: 26.5,
  pause: 26.8,
  impact: 28,
  end: 32,
};

const DOT_SPACING = 24;
const DOT_DRIFT_PX_PER_SECOND = 9;
const BEAM_SWAY_PX = 140;
const BEAM_SWAY_SECONDS = 4.2;

export function createBackdrop(parent: HTMLElement): Scene {
  const beam = el("div", "beam");
  const beamSecondary = el("div", ["beam", "beam-secondary"]);
  const dots = el("div", "dots");
  const mapDots = el("div", "map-dots");
  const flash = el("div", "flash");
  parent.append(el("div", "backdrop", [beam, beamSecondary, dots, mapDots, flash]));

  return {
    update(beat) {
      const seconds = beat * BEAT;
      const kick = kickPulse(beat, CUE.groove, CUE.pause, 7) + decay(beat, CUE.intro, 4);
      const hat = hatPulse(beat, CUE.intro, CUE.pause) + hatPulse(beat, CUE.impact, CUE.end) * 0.6;
      const isPaused = beat >= CUE.pause && beat < CUE.impact;
      const pauseDim = isPaused ? easeOutCubic(progress(beat, CUE.pause, 0.4)) : 0;
      const impact = decay(beat, CUE.impact, 3.2);
      const sway = Math.sin((seconds / BEAM_SWAY_SECONDS) * Math.PI * 2);

      pose(beam, {
        x: sway * BEAM_SWAY_PX,
        y: Math.cos(seconds * 0.9) * 30,
        scale: 1 + kick * 0.05 + impact * 0.25,
        opacity: lerp(0.85 + kick * 0.15, 0.18, pauseDim) + impact * 0.3,
      });
      pose(beamSecondary, {
        x: -sway * BEAM_SWAY_PX * 1.4,
        y: Math.sin(seconds * 0.7) * 40,
        scale: 1 + impact * 0.4,
        opacity: lerp(0.6, 0.1, pauseDim) + impact * 0.4,
      });

      const drift = (seconds * DOT_DRIFT_PX_PER_SECOND) % DOT_SPACING;
      pose(dots, { y: -drift, opacity: lerp(0.75 + hat * 0.25, 0.35, pauseDim) + impact * 0.4 });

      const mapIn = progress(beat, CUE.mapIn, 0.6);
      const mapOut = progress(beat, CUE.mapOut, 0.4);
      pose(mapDots, { opacity: easeOutCubic(mapIn) * (1 - mapOut), scale: 1.08 - mapIn * 0.08 });
      pose(flash, { opacity: impact * 0.55 + decay(beat, CUE.intro, 6) * 0.35 });
    },
  };
}
