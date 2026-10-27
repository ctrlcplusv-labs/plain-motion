import { featuredPostCard, palettePanel, postCard, projectCard } from "../components";
import type { CodeCard } from "../components";
import { AI_LINES, POSTS, PROJECTS } from "../content";
import { anchor, el, masked } from "../dom";
import { easeInExpo, easeOutCubic, isBetween, lerp, pop, pose, progress, rise, springAt } from "../motion";
import { BEAT } from "../timing";
import type { Scene } from "./scene";

type Slot = {
  node: HTMLElement;
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

type Layer = {
  root: HTMLDivElement;
  speed: number;
  slots: Slot[];
};

const CODE_SLOT = { x: 610, y: 300, scale: 0.6, rotate: -3 };
const CODE_FROM = { x: 470, y: 30, scale: 0.92, rotateY: -14 };
const PUSH_SCALE = 2.6;

const CUE = {
  enter: 18,
  enterStep: 0.125,
  titleLines: [18, 19],
  plate: 17.9,
  pushIn: 20.25,
  pushBeats: 0.75,
  visibleFrom: 14.7,
  visibleTo: 21.1,
};

function slot(card: HTMLElement, x: number, y: number, rotate: number, scale = 1): Slot {
  return { node: anchor("wall-item", [card]), x, y, rotate, scale };
}

function project(name: string): HTMLElement {
  const match = PROJECTS.find((item) => item.name === name) ?? PROJECTS[0];
  return match ? projectCard(match, name === "statusline-pro" ? ["project-card-wide"] : []) : el("div");
}

function buildLayers(): Layer[] {
  const posts = POSTS.map((post) => postCard(post));
  const far: Slot[] = [
    slot(posts[0] ?? el("div"), -780, -250, -2),
    slot(posts[1] ?? el("div"), 860, -300, 2),
    slot(posts[2] ?? el("div"), -900, 330, 1),
    slot(posts[3] ?? el("div"), 620, 360, -2),
    slot(posts[4] ?? el("div"), 1500, 40, 2),
  ];
  const mid: Slot[] = [
    slot(project("justship.now"), -560, -150, -3),
    slot(project("makers.page"), 520, -170, 3),
    slot(project("beseen.so"), -1040, 120, 2),
    slot(project("Atioko"), 1080, 140, -2),
    slot(project("Product Hunt Wrapped 2025"), -260, 330, 2),
    slot(project(".dotfiles"), 1500, -220, -3),
  ];
  const near: Slot[] = [
    slot(project("statusline-pro"), -720, 260, -2, 0.72),
    slot(palettePanel(), 840, -250, 3, 0.8),
    slot(featuredPostCard(), -880, -310, -4, 0.7),
  ];
  return [
    { root: anchor(["wall-layer", "wall-far"]), speed: 60, slots: far },
    { root: anchor(["wall-layer", "wall-mid"]), speed: 130, slots: mid },
    { root: anchor(["wall-layer", "wall-near"]), speed: 240, slots: near },
  ];
}

export function createWall(parent: HTMLElement, code: CodeCard): Scene {
  const layers = buildLayers();
  layers.forEach((layer) => layer.root.append(...layer.slots.map((item) => item.node)));
  const near = layers.at(-1);
  near?.root.append(code.root);

  const plate = anchor("plate");
  const titles = AI_LINES.map((text, index) => masked([text], [], index === 1 ? "accent-gradient" : ""));
  const titleRows = titles.map((title) => anchor(["wall-title", "display-lg"], [title.mask]));
  const root = el("div", ["scene-layer", "wall"], [...layers.map((layer) => layer.root), plate, ...titleRows]);
  parent.append(root);
  const ordered = layers.flatMap((layer) => layer.slots).sort((a, b) => Math.abs(a.x) - Math.abs(b.x));

  return {
    update(beat) {
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const push = easeInExpo(progress(beat, CUE.pushIn, CUE.pushBeats));
      pose(root, { scale: 1 + push * (PUSH_SCALE - 1), opacity: isVisible ? 1 : 0 });

      const pan = Math.max(0, beat - CUE.enter) * BEAT;
      layers.forEach((layer, depth) => {
        pose(layer.root, { x: -pan * layer.speed, y: -pan * (depth + 1) * 8 }, "none");
      });

      layers.forEach((layer) =>
        layer.slots.forEach((item) => {
          const order = ordered.indexOf(item);
          const start = CUE.enter + order * CUE.enterStep;
          const itemPop = pop(beat, start, { from: 0.5, frequency: 2.2, damping: 0.55, squash: 0.03 });
          pose(
            item.node,
            {
              x: item.x,
              y: item.y + (1 - itemPop.value) * 140,
              scale: itemPop.scale * item.scale,
              scaleX: itemPop.scaleX,
              scaleY: itemPop.scaleY,
              rotate: item.rotate + (1 - itemPop.value) * (order % 2 === 0 ? 12 : -12),
              opacity: beat >= start ? easeOutCubic(progress(beat, start, 0.2)) : 0,
            },
            "center",
          );
        }),
      );

      if (beat >= CUE.enter) {
        const settle = springAt(beat, CUE.enter, 1.6, 0.7);
        const nearPan = pan * (near?.speed ?? 0);
        pose(
          code.root,
          {
            x: lerp(CODE_FROM.x + nearPan, CODE_SLOT.x, settle),
            y: lerp(CODE_FROM.y, CODE_SLOT.y, settle),
            scale: lerp(CODE_FROM.scale, CODE_SLOT.scale, settle),
            rotateY: lerp(CODE_FROM.rotateY, 0, settle),
            rotate: lerp(0, CODE_SLOT.rotate, settle),
          },
          "center",
        );
      }

      pose(plate, { scale: lerp(0.6, 1, easeOutCubic(progress(beat, CUE.plate, 0.6))), opacity: progress(beat, CUE.plate, 0.3) }, "center");
      titleRows.forEach((row, index) => {
        const start = CUE.titleLines[index] ?? CUE.enter;
        const rowPop = pop(beat, start, { from: 0.85, frequency: 2.4, damping: 0.5 });
        pose(row, { y: index === 0 ? -80 : 90, scale: rowPop.scale, opacity: beat >= start ? 1 : 0 }, "center");
        const title = titles[index];
        if (title) pose(title.inner, { y: rise(beat, start, 220, 2.6, 0.6), rotate: rise(beat, start, 7, 2.6, 0.6) });
      });
    },
  };
}
