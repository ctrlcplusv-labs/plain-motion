import { chip } from "../components";
import { MAP_LABELS, REACH_LINE, ROMANIA_TITLE } from "../content";
import { anchor, el, masked, maskedWords, svg } from "../dom";
import { easeInBack, easeInOutCubic, easeOutExpo, isBetween, lerp, pop, pose, progress, rise } from "../motion";
import { hatPulse } from "./scene";
import type { Point, Scene } from "./scene";

type Node = {
  point: Point;
  dot: SVGCircleElement;
  label: HTMLSpanElement;
  hit: number;
};

type Arc = {
  path: SVGPathElement;
  head: SVGCircleElement;
  start: number;
  beats: number;
};

const HOME: Point = { x: 470, y: 230 };
const EUROPE: Point = { x: 20, y: 150 };
const US: Point = { x: -660, y: 250 };
const VIEWBOX = "-960 -540 1920 1080";
const TITLE_Y = -300;
const LINE_Y = -165;
const LABEL_OFFSET_Y = 62;
const RING_COUNT = 3;
const ENTER_DISTANCE = 1900;

const CUE = {
  enter: 23.85,
  enterBeats: 0.45,
  title: 24,
  place: 24.25,
  lineStart: 24.5,
  lineStep: 0.11,
  europeArc: 24.5,
  europeArcBeats: 0.5,
  europe: 25,
  usArc: 25.25,
  usArcBeats: 0.75,
  us: 26,
  collapse: 26.5,
  collapseBeats: 0.5,
  visibleFrom: 23.8,
  visibleTo: 27,
};

function arcPath(from: Point, to: Point, lift: number): string {
  const controlX = (from.x + to.x) / 2;
  const controlY = Math.min(from.y, to.y) - lift;
  return `M${from.x} ${from.y} Q${controlX} ${controlY} ${to.x} ${to.y}`;
}

export function createRomania(parent: HTMLElement): Scene {
  const lead = masked([ROMANIA_TITLE.lead]);
  const place = masked([ROMANIA_TITLE.place], [], "accent-gradient");
  const title = anchor(["romania-title", "display-md-lg"], [lead.mask, place.mask]);
  const words = maskedWords(REACH_LINE);
  const highlightWords = words.filter((word) => ["Europe", "US."].includes(word.inner.textContent ?? ""));
  const line = anchor(["reach-line", "display-sm"], words.map((word) => word.mask));

  const map = svg("svg", { viewBox: VIEWBOX, class: "map" });
  const arcs: Arc[] = [
    { path: svg("path", { d: arcPath(HOME, EUROPE, 70), class: "arc" }), head: svg("circle", { r: 7, class: "arc-head" }), start: CUE.europeArc, beats: CUE.europeArcBeats },
    { path: svg("path", { d: arcPath(HOME, US, 360), class: "arc" }), head: svg("circle", { r: 7, class: "arc-head" }), start: CUE.usArc, beats: CUE.usArcBeats },
  ];
  const rings = Array.from({ length: RING_COUNT }, () => svg("circle", { cx: HOME.x, cy: HOME.y, r: 18, class: "pin-ring" }));
  const makeNode = (point: Point, text: string, hit: number, isHome: boolean): Node => ({
    point,
    dot: svg("circle", { cx: point.x, cy: point.y, r: isHome ? 15 : 11, class: isHome ? "pin" : "map-node" }),
    label: chip(text, ["chip-lg", "map-label", isHome ? "chip-accent" : ""].filter(Boolean)),
    hit,
  });
  const nodes = [
    makeNode(HOME, MAP_LABELS.home, CUE.title, true),
    makeNode(EUROPE, MAP_LABELS.europe, CUE.europe, false),
    makeNode(US, MAP_LABELS.us, CUE.us, false),
  ];
  map.append(...arcs.map((arc) => arc.path), ...rings, ...arcs.map((arc) => arc.head), ...nodes.map((node) => node.dot));
  const labels = nodes.map((node) => anchor("map-label-anchor", [node.label]));
  const root = el("div", ["scene-layer", "romania"], [map, ...labels, title, line]);
  parent.append(root);
  const lengths = arcs.map((arc) => arc.path.getTotalLength());

  return {
    update(beat) {
      const isVisible = isBetween(beat, CUE.visibleFrom, CUE.visibleTo);
      const enter = 1 - easeOutExpo(progress(beat, CUE.enter, CUE.enterBeats));
      const collapse = easeInBack(progress(beat, CUE.collapse, CUE.collapseBeats), 2.2);
      pose(root, {
        x: enter * ENTER_DISTANCE - HOME.x * collapse,
        y: -HOME.y * collapse,
        scale: Math.max(0.001, 1 - collapse),
        opacity: isVisible ? 1 : 0,
      });

      const titlePop = pop(beat, CUE.title, { from: 0.85, frequency: 2.4, damping: 0.5 });
      pose(title, { y: TITLE_Y, scale: titlePop.scale }, "center");
      pose(lead.inner, { y: rise(beat, CUE.title, 150, 2.6, 0.6) });
      pose(place.inner, { y: rise(beat, CUE.place, 150, 2.6, 0.55), rotate: rise(beat, CUE.place, 8, 2.6, 0.55) });

      pose(line, { y: LINE_Y }, "center");
      words.forEach((word, index) => {
        pose(word.inner, { y: rise(beat, CUE.lineStart + index * CUE.lineStep, 80, 2.8, 0.62) });
      });
      highlightWords[0]?.inner.classList.toggle("is-lit", beat >= CUE.europe);
      highlightWords[1]?.inner.classList.toggle("is-lit", beat >= CUE.us);

      arcs.forEach((arc, index) => {
        const length = lengths[index] ?? 0;
        const drawn = easeInOutCubic(progress(beat, arc.start, arc.beats));
        arc.path.style.strokeDasharray = `${length}`;
        arc.path.style.strokeDashoffset = `${length * (1 - drawn)}`;
        const head = arc.path.getPointAtLength(length * drawn);
        arc.head.setAttribute("cx", String(head.x));
        arc.head.setAttribute("cy", String(head.y));
        pose(arc.head, { opacity: drawn > 0 && drawn < 1 ? 1 : 0 });
      });

      const ringPhase = hatPulse(beat, CUE.title, CUE.visibleTo, 4);
      rings.forEach((ring, index) => {
        const phase = (1 - ringPhase + index / RING_COUNT) % 1;
        ring.setAttribute("r", String(lerp(16, 90, phase)));
        pose(ring, { opacity: beat >= CUE.title ? (1 - phase) * 0.55 : 0 });
      });

      nodes.forEach((node, index) => {
        const nodePop = pop(beat, node.hit, { frequency: 3, damping: 0.38, squash: 0.06 });
        node.dot.style.transformOrigin = `${node.point.x}px ${node.point.y}px`;
        node.dot.style.transformBox = "view-box";
        node.dot.style.transform = `scale(${nodePop.scale})`;
        const labelAnchor = labels[index];
        if (!labelAnchor) return;
        const labelPop = pop(beat, node.hit + 0.25, { frequency: 3, damping: 0.45 });
        pose(
          labelAnchor,
          { x: node.point.x, y: node.point.y + LABEL_OFFSET_Y, scale: labelPop.scale, scaleX: labelPop.scaleX, scaleY: labelPop.scaleY, opacity: labelPop.value > 0 ? 1 : 0 },
          "center",
        );
      });
    },
  };
}
