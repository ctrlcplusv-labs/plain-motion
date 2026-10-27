import { BEAT } from "./timing";

export type Pose = {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateY?: number;
  skewX?: number;
  opacity?: number;
  blur?: number;
};

export type Origin = "none" | "center" | "left" | "top";

type SpringOptions = {
  from?: number;
  frequency?: number;
  damping?: number;
  squash?: number;
};

export type PopState = {
  scale: number;
  scaleX: number;
  scaleY: number;
  value: number;
};

const ORIGIN_SHIFT: Record<Origin, string> = {
  none: "",
  center: "translate(-50%, -50%)",
  left: "translate(0, -50%)",
  top: "translate(-50%, 0)",
};

const MIN_OPACITY = 0.002;
const MIN_BLUR = 0.05;
const PERSPECTIVE_PX = 1800;
const SPEED_SAMPLE_SECONDS = 1 / 960;
const DEFAULT_FREQUENCY = 2.2;
const DEFAULT_DAMPING = 0.5;
const DEFAULT_SQUASH = 0.035;
const MAX_SQUASH = 0.32;
const MAX_DAMPING = 0.999;
const BACK_OVERSHOOT = 1.70158;
const EXPO_POWER = 10;
const EIGHTHS_PER_BEAT = 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function progress(beat: number, start: number, length: number): number {
  return clamp01((beat - start) / length);
}

export function secondsSince(beat: number, start: number): number {
  return (beat - start) * BEAT;
}

export function isBetween(beat: number, start: number, end: number): boolean {
  return beat >= start && beat < end;
}

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
export const easeInCubic = (t: number): number => t ** 3;
export const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;
export const easeOutSine = (t: number): number => Math.sin((t * Math.PI) / 2);
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - 2 ** (-EXPO_POWER * t));
export const easeInExpo = (t: number): number => (t <= 0 ? 0 : 2 ** (EXPO_POWER * t - EXPO_POWER));

export function easeInBack(t: number, overshoot = BACK_OVERSHOOT): number {
  return (overshoot + 1) * t ** 3 - overshoot * t ** 2;
}

export function easeOutBack(t: number, overshoot = BACK_OVERSHOOT): number {
  const shifted = t - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

export function spring(elapsed: number, frequency = DEFAULT_FREQUENCY, damping = DEFAULT_DAMPING): number {
  if (elapsed <= 0) return 0;
  const omega = 2 * Math.PI * frequency;
  const zeta = Math.min(damping, MAX_DAMPING);
  const omegaDamped = omega * Math.sqrt(1 - zeta * zeta);
  const envelope = Math.exp(-zeta * omega * elapsed);
  const oscillation = Math.cos(omegaDamped * elapsed) + ((zeta * omega) / omegaDamped) * Math.sin(omegaDamped * elapsed);
  return 1 - envelope * oscillation;
}

export function springSpeed(elapsed: number, frequency = DEFAULT_FREQUENCY, damping = DEFAULT_DAMPING): number {
  const ahead = spring(elapsed + SPEED_SAMPLE_SECONDS, frequency, damping);
  const behind = spring(elapsed - SPEED_SAMPLE_SECONDS, frequency, damping);
  return (ahead - behind) / (2 * SPEED_SAMPLE_SECONDS);
}

export function springAt(beat: number, start: number, frequency = DEFAULT_FREQUENCY, damping = DEFAULT_DAMPING): number {
  return spring(secondsSince(beat, start), frequency, damping);
}

export function pop(beat: number, start: number, options: SpringOptions = {}): PopState {
  const { from = 0, frequency = DEFAULT_FREQUENCY, damping = DEFAULT_DAMPING, squash = DEFAULT_SQUASH } = options;
  const elapsed = secondsSince(beat, start);
  const value = spring(elapsed, frequency, damping);
  const stretch = clamp(springSpeed(elapsed, frequency, damping) * squash, -MAX_SQUASH, MAX_SQUASH);
  return {
    scale: lerp(from, 1, value),
    scaleX: 1 / (1 + stretch),
    scaleY: 1 + stretch,
    value,
  };
}

export function rise(
  beat: number,
  start: number,
  distance: number,
  frequency = DEFAULT_FREQUENCY,
  damping = DEFAULT_DAMPING,
): number {
  return (1 - springAt(beat, start, frequency, damping)) * distance;
}

export function decay(beat: number, hit: number, rate: number): number {
  if (beat < hit) return 0;
  return Math.exp(-secondsSince(beat, hit) * rate);
}

export function lastGridHit(beat: number, start: number, end: number, step: number): number | null {
  if (beat < start) return null;
  const lastIndex = Math.ceil((end - start) / step) - 1;
  const index = Math.min(Math.floor((beat - start) / step), lastIndex);
  return start + index * step;
}

export function gridPulse(beat: number, start: number, end: number, step: number, rate: number): number {
  const hit = lastGridHit(beat, start, end, step);
  return hit === null ? 0 : decay(beat, hit, rate);
}

export function isBlinkOn(beat: number): boolean {
  return Math.floor(beat * EIGHTHS_PER_BEAT) % 2 === 0;
}

export function pose(node: HTMLElement | SVGElement, values: Pose, origin: Origin = "none"): void {
  const {
    x = 0,
    y = 0,
    scale = 1,
    scaleX = 1,
    scaleY = 1,
    rotate = 0,
    rotateY = 0,
    skewX = 0,
    opacity = 1,
    blur = 0,
  } = values;
  const perspective = rotateY === 0 ? "" : `perspective(${PERSPECTIVE_PX}px) rotateY(${rotateY}deg)`;
  node.style.transform = [
    `translate3d(${x}px, ${y}px, 0)`,
    ORIGIN_SHIFT[origin],
    perspective,
    `rotate(${rotate}deg)`,
    `skewX(${skewX}deg)`,
    `scale(${scale * scaleX}, ${scale * scaleY})`,
  ].join(" ");
  node.style.opacity = String(clamp01(opacity));
  node.style.filter = blur > MIN_BLUR ? `blur(${blur}px)` : "";
  node.style.visibility = opacity <= MIN_OPACITY ? "hidden" : "visible";
}

export function show(node: HTMLElement | SVGElement, isVisible: boolean): void {
  node.style.visibility = isVisible ? "visible" : "hidden";
}
