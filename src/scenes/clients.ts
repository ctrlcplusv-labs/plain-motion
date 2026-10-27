import { chip } from "../components";
import { CLIENT_CHIPS, CLIENTS, CONTRACTS_LABEL, SENIOR_WORDS } from "../content";
import { anchor, el } from "../dom";
import { easeInCubic, easeInOutCubic, isBetween, lerp, pop, pose, progress, rise, springAt, springSpeed, secondsSince } from "../motion";
import { hatPulse } from "./scene";
import type { Point, Scene } from "./scene";

type Metrics = {
  yearWidth: number;
  labelWidth: number;
  nameHeight: number;
  subHeight: number;
  ghostHeight: number;
  nameScales: number[];
};

const EYEBROW: Point = { x: 0, y: -320 };
const EYEBROW_SCALE = 0.36;
const NAME_Y = -40;
const SUB_Y = 120;
const CHIP_ROW_Y = 290;
const GHOST: Point = { x: 610, y: -10 };
const GHOST_DRIFT_PX_PER_BEAT = 26;
const NAME_MAX_WIDTH = 1640;
const NAME_SKEW = 0.9;

const CUE = {
  handoff: 10.75,
  roll: 11,
  rollBeats: 0.35,
  firstName: 11,
  nameStep: 1,
  subDelay: 0.25,
  chipDelay: 0.5,
  exitBeats: 0.3,
  visibleFrom: 10.7,
  visibleTo: 15.25,
};

const toLabel = (index: number) => String(index + 1).padStart(2, "0");

export function createClients(parent: HTMLElement, chipStart: () => Point): Scene {
  const yearText = el("span", "float-text", [SENIOR_WORDS.year]);
  const labelText = el("span", ["float-text", "float-label"], [CONTRACTS_LABEL]);
  const floatChip = anchor(["chip", "chip-display", "float-chip"], [yearText, labelText]);

  const ghosts = CLIENTS.map((_, index) => el("span", "ghost-number", [toLabel(index)]));
  const ghostSlot = anchor(["mask", "ghost-slot"], ghosts);
  const names = CLIENTS.map((client) => el("span", "client-name", [client.name]));
  const nameSlot = anchor(["mask", "name-slot", "display-xl"], names);
  const subs = CLIENTS.map((client) => el("span", "client-sub", [client.detail]));
  const subSlot = anchor(["mask", "sub-slot"], subs);
  const chips = CLIENT_CHIPS.map((label) => chip(label, ["chip-lg"]));
  const chipRow = anchor("chip-row-anchor", chips);
  parent.append(ghostSlot, nameSlot, subSlot, chipRow, floatChip);
  let metrics: Metrics | null = null;

  const measure = (): Metrics => ({
    yearWidth: yearText.offsetWidth,
    labelWidth: labelText.offsetWidth,
    nameHeight: nameSlot.offsetHeight,
    subHeight: subSlot.offsetHeight,
    ghostHeight: ghostSlot.offsetHeight,
    nameScales: names.map((name) => Math.min(1, NAME_MAX_WIDTH / name.offsetWidth)),
  });

  return {
    update(beat) {
      metrics ??= measure();
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const start = chipStart();
      const travel = springAt(beat, CUE.handoff, 1.7, 0.72);
      const width = lerp(metrics.yearWidth, metrics.labelWidth, easeInOutCubic(progress(beat, CUE.roll - 0.1, CUE.rollBeats)));
      floatChip.style.width = `${width}px`;
      pose(
        floatChip,
        {
          x: lerp(start.x, EYEBROW.x, travel),
          y: lerp(start.y, EYEBROW.y, travel),
          scale: lerp(1, EYEBROW_SCALE, travel),
          rotate: Math.sin(travel * Math.PI) * -6,
          opacity: isVisible ? 1 : 0,
        },
        "center",
      );
      pose(yearText, { y: -easeInCubic(progress(beat, CUE.roll, 0.3)) * 140 }, "center");
      pose(labelText, { y: rise(beat, CUE.roll + 0.05, 140, 2.4, 0.6) }, "center");

      const nameIndex = Math.floor((beat - CUE.firstName) / CUE.nameStep);
      pose(nameSlot, { y: NAME_Y, opacity: isVisible ? 1 : 0 }, "center");
      names.forEach((name, index) => {
        const enterAt = CUE.firstName + index * CUE.nameStep;
        const exitAt = enterAt + CUE.nameStep;
        const isLast = index === names.length - 1;
        const elapsed = secondsSince(beat, enterAt);
        const enterY = rise(beat, enterAt, (metrics?.nameHeight ?? 0) * 1.05, 2.3, 0.58);
        const exitY = isLast ? 0 : easeInCubic(progress(beat, exitAt, CUE.exitBeats)) * (metrics?.nameHeight ?? 0);
        const skew = springSpeed(elapsed, 2.3, 0.58) * NAME_SKEW;
        const fit = metrics?.nameScales[index] ?? 1;
        const isShown = beat >= enterAt && (isLast || beat < exitAt + CUE.exitBeats);
        pose(name, { y: enterY - exitY, skewX: -skew, scale: fit, opacity: isShown ? 1 : 0 }, "top");
      });

      pose(subSlot, { y: SUB_Y, opacity: isVisible ? 1 : 0 }, "center");
      subs.forEach((sub, index) => {
        const enterAt = CUE.firstName + index * CUE.nameStep + CUE.subDelay;
        const exitAt = enterAt + CUE.nameStep - CUE.subDelay;
        const exitY = easeInCubic(progress(beat, exitAt, CUE.exitBeats)) * (metrics?.subHeight ?? 0);
        pose(sub, { y: rise(beat, enterAt, metrics?.subHeight ?? 0, 2.6, 0.6) - exitY, opacity: index === nameIndex ? 1 : 0 }, "top");
      });

      pose(chipRow, { y: CHIP_ROW_Y, opacity: isVisible ? 1 : 0 }, "center");
      chips.forEach((item, index) => {
        const chipPop = pop(beat, CUE.firstName + index * CUE.nameStep + CUE.chipDelay, { frequency: 3, damping: 0.42, squash: 0.05 });
        const isCurrent = index === nameIndex;
        item.classList.toggle("is-current", isCurrent);
        pose(item, {
          scale: chipPop.scale,
          scaleX: chipPop.scaleX,
          scaleY: chipPop.scaleY,
          y: isCurrent ? -hatPulse(beat, CUE.firstName, CUE.visibleTo) * 6 : 0,
          opacity: chipPop.value > 0 ? 1 : 0,
        });
      });

      pose(ghostSlot, { x: GHOST.x - (beat - CUE.firstName) * GHOST_DRIFT_PX_PER_BEAT, y: GHOST.y, opacity: isVisible ? 1 : 0 }, "center");
      ghosts.forEach((ghost, index) => {
        const enterAt = CUE.firstName + index * CUE.nameStep;
        const isLast = index === ghosts.length - 1;
        const height = metrics?.ghostHeight ?? 0;
        const exitY = isLast ? 0 : easeInCubic(progress(beat, enterAt + CUE.nameStep, 0.4)) * height;
        pose(ghost, { y: rise(beat, enterAt, height, 1.8, 0.7) - exitY, opacity: beat >= enterAt ? 1 : 0 }, "top");
      });
    },
  };
}
