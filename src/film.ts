import { codeCard } from "./components";
import { el } from "./dom";
import { decay, easeOutSine, pose, progress } from "./motion";
import { createBackdrop } from "./scenes/backdrop";
import { createClients } from "./scenes/clients";
import { createFinale } from "./scenes/finale";
import { createIntro } from "./scenes/intro";
import { createOpenTo } from "./scenes/openTo";
import { createRomania } from "./scenes/romania";
import { kickPulse } from "./scenes/scene";
import type { Scene } from "./scenes/scene";
import { createSenior } from "./scenes/senior";
import { createStack } from "./scenes/stack";
import { createWall } from "./scenes/wall";
import { createYears } from "./scenes/years";
import { BEAT, toBeats } from "./timing";

export type Film = {
  render: (seconds: number) => void;
};

const CAMERA = {
  grooveStart: 4,
  grooveEnd: 27,
  kickZoom: 0.012,
  introZoom: 0.03,
  impact: 28,
  shakeX: 18,
  shakeY: 13,
  shakeRate: 7,
  pushStart: 28.5,
  pushBeats: 3.5,
  pushZoom: 0.045,
  sway: 0.22,
};

function createCamera(world: HTMLElement): Scene {
  return {
    update(beat) {
      const seconds = beat * BEAT;
      const kick = kickPulse(beat, CAMERA.grooveStart, CAMERA.grooveEnd, 9);
      const shake = decay(beat, CAMERA.impact, CAMERA.shakeRate);
      const push = easeOutSine(progress(beat, CAMERA.pushStart, CAMERA.pushBeats));
      pose(world, {
        x: Math.sin(seconds * 83) * CAMERA.shakeX * shake,
        y: Math.cos(seconds * 71) * CAMERA.shakeY * shake,
        scale: 1 + kick * CAMERA.kickZoom + decay(beat, 0, 5) * CAMERA.introZoom + push * CAMERA.pushZoom,
        rotate: Math.sin(seconds * 0.8) * CAMERA.sway + Math.sin(seconds * 61) * shake * 0.6,
      });
    },
  };
}

export function buildFilm(stage: HTMLElement): Film {
  const backdrop = createBackdrop(stage);
  const world = el("div", "world");
  stage.append(world);

  const code = codeCard();
  const years = createYears(world);
  const senior = createSenior(world);
  const clients = createClients(world, senior.chipAnchor);
  const stack = createStack(world, code);
  const wall = createWall(world, code);
  const openTo = createOpenTo(world);
  const romania = createRomania(world);
  const finale = createFinale(world);
  const intro = createIntro(world);
  const scenes = [backdrop, createCamera(world), years, senior, clients, stack, wall, openTo, romania, finale, intro];

  return {
    render(seconds) {
      const beat = toBeats(seconds);
      scenes.forEach((scene) => scene.update(beat));
    },
  };
}
