import { chip, segmented } from "../components";
import { CONSULTING_TOPICS, OPEN_TO_LABEL, WORK_MODES } from "../content";
import { anchor, el, masked } from "../dom";
import {
  clamp,
  easeInCubic,
  easeInExpo,
  easeOutCubic,
  isBetween,
  lerp,
  pop,
  pose,
  progress,
  rise,
  secondsSince,
  springAt,
  springSpeed,
} from "../motion";
import type { Scene } from "./scene";

type Metrics = {
  items: { x: number; width: number }[];
  wordHeight: number;
};

const IRIS_MAX_RADIUS = 1250;
const LABEL_Y = -270;
const WORD_Y = -95;
const SEGMENT_Y = 150;
const SEGMENT_SCALE = 1.55;
const TOPICS_Y = 300;
const EXIT_DISTANCE = 2100;
const THUMB_STRETCH = 0.02;

const CUE = {
  iris: 20.75,
  irisBeats: 0.4,
  label: 20.95,
  modes: [21, 22, 23],
  topics: [23.25, 23.5],
  exit: 23.75,
  exitBeats: 0.32,
  visibleFrom: 20.7,
  visibleTo: 24.15,
};

export function createOpenTo(parent: HTMLElement): Scene {
  const label = masked([OPEN_TO_LABEL]);
  const labelRow = anchor(["open-label", "display-sm"], [label.mask]);
  const words = WORK_MODES.map((mode) => el("span", "roll-word", [mode.headline]));
  const wordSlot = anchor(["mask", "roll-slot", "display-lg"], words);
  const control = segmented(WORK_MODES.map((mode) => mode.label));
  const topics = CONSULTING_TOPICS.map((topic) => chip(topic, ["chip-lg", "chip-accent"]));
  const topicRow = anchor("topic-row", topics);
  const ring = anchor(["ring", "iris-ring"]);
  const layer = el("div", "scene-layer", [labelRow, wordSlot, control.root, topicRow]);
  parent.append(layer, ring);
  let metrics: Metrics | null = null;

  const measure = (): Metrics => ({
    items: control.items.map((item) => ({ x: item.offsetLeft, width: item.offsetWidth })),
    wordHeight: wordSlot.offsetHeight,
  });

  return {
    update(beat) {
      metrics ??= measure();
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const iris = easeOutCubic(progress(beat, CUE.iris, CUE.irisBeats));
      layer.style.clipPath = iris >= 1 ? "none" : `circle(${iris * IRIS_MAX_RADIUS}px at 50% 50%)`;
      pose(layer, { opacity: isVisible ? 1 : 0 });
      pose(ring, { scale: lerp(0.02, 1, iris), opacity: iris > 0 && iris < 1 ? 1 - iris * 0.7 : 0 }, "center");

      const exitAt = (delay: number) => easeInExpo(progress(beat, CUE.exit + delay, CUE.exitBeats)) * EXIT_DISTANCE;
      pose(labelRow, { x: -exitAt(0), y: LABEL_Y }, "center");
      pose(label.inner, { y: rise(beat, CUE.label, 110, 2.6, 0.6) });

      pose(wordSlot, { x: -exitAt(0.04), y: WORD_Y }, "center");
      const height = metrics.wordHeight;
      words.forEach((word, index) => {
        const enterAt = CUE.modes[index] ?? CUE.exit;
        const isLast = index === words.length - 1;
        const leave = isLast ? 0 : easeInCubic(progress(beat, enterAt + 1, 0.3)) * height;
        const speed = springSpeed(secondsSince(beat, enterAt), 2.3, 0.58);
        pose(word, { y: rise(beat, enterAt, height, 2.3, 0.58) - leave, skewX: -speed * 0.8, opacity: beat >= enterAt ? 1 : 0 }, "top");
      });

      const controlPop = pop(beat, CUE.modes[0] ?? CUE.exit, { from: 0.6, frequency: 2.6, damping: 0.45 });
      pose(
        control.root,
        { x: -exitAt(0.08), y: SEGMENT_Y, scale: controlPop.scale * SEGMENT_SCALE, scaleX: controlPop.scaleX, scaleY: controlPop.scaleY, opacity: controlPop.value > 0 ? 1 : 0 },
        "center",
      );
      const activeIndex = clamp(CUE.modes.findLastIndex((cue) => beat >= cue), 0, WORK_MODES.length - 1);
      const activeCue = CUE.modes[activeIndex] ?? 0;
      const from = metrics.items[Math.max(0, activeIndex - 1)];
      const to = metrics.items[activeIndex];
      if (from && to) {
        const travel = activeIndex === 0 ? 1 : springAt(beat, activeCue, 2.6, 0.55);
        const speed = activeIndex === 0 ? 0 : Math.abs(springSpeed(secondsSince(beat, activeCue), 2.6, 0.55));
        control.thumb.style.width = `${lerp(from.width, to.width, travel)}px`;
        pose(control.thumb, { x: lerp(from.x, to.x, travel), scaleY: 1 / (1 + speed * THUMB_STRETCH) });
        control.items.forEach((item, index) => item.classList.toggle("is-active", index === activeIndex && travel > 0.45));
      }

      pose(topicRow, { x: -exitAt(0.12), y: TOPICS_Y }, "center");
      topics.forEach((topic, index) => {
        const topicPop = pop(beat, CUE.topics[index] ?? CUE.exit, { frequency: 3, damping: 0.42, squash: 0.05 });
        pose(topic, { scale: topicPop.scale, scaleX: topicPop.scaleX, scaleY: topicPop.scaleY, opacity: topicPop.value > 0 ? 1 : 0 });
      });
    },
  };
}
