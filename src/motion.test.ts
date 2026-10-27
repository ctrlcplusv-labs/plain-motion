import { describe, expect, test } from "bun:test";

import {
  decay,
  easeInBack,
  easeOutBack,
  gridPulse,
  isBlinkOn,
  lastGridHit,
  pop,
  progress,
  rise,
  spring,
} from "./motion";
import { BEAT, DURATION, TOTAL_BEATS } from "./timing";

describe("beat grid", () => {
  test("15 seconds at 128 BPM is exactly eight bars", () => {
    expect(TOTAL_BEATS).toBe(32);
    expect(BEAT * TOTAL_BEATS).toBeCloseTo(DURATION, 10);
  });

  test("lastGridHit finds the latest hit inside the range", () => {
    expect(lastGridHit(5.3, 4, 27, 1)).toBe(5);
    expect(lastGridHit(5.7, 0.5, 27, 1)).toBe(5.5);
    expect(lastGridHit(3, 4, 27, 1)).toBeNull();
    expect(lastGridHit(30, 4, 27, 1)).toBe(26);
  });

  test("gridPulse is 1 on the hit and decays after it", () => {
    expect(gridPulse(6, 4, 27, 1, 8)).toBeCloseTo(1, 5);
    expect(gridPulse(6.5, 4, 27, 1, 8)).toBeLessThan(0.2);
    expect(gridPulse(2, 4, 27, 1, 8)).toBe(0);
  });

  test("cursor blink toggles on every eighth note", () => {
    expect(isBlinkOn(27)).toBe(true);
    expect(isBlinkOn(27.5)).toBe(false);
    expect(isBlinkOn(28.1)).toBe(true);
  });
});

describe("easing", () => {
  test("progress clamps to 0..1", () => {
    expect(progress(1, 2, 1)).toBe(0);
    expect(progress(2.5, 2, 1)).toBe(0.5);
    expect(progress(9, 2, 1)).toBe(1);
  });

  test("back easings hit their endpoints and overshoot in between", () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 10);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
    expect(Math.max(...[0.6, 0.7, 0.8].map((t) => easeOutBack(t)))).toBeGreaterThan(1);
    expect(easeInBack(0.2)).toBeLessThan(0);
  });

  test("decay is zero before the hit and one on it", () => {
    expect(decay(1, 2, 5)).toBe(0);
    expect(decay(2, 2, 5)).toBe(1);
  });
});

describe("spring", () => {
  test("starts at 0, overshoots when underdamped and settles at 1", () => {
    expect(spring(0)).toBe(0);
    const samples = Array.from({ length: 200 }, (_, index) => spring(index / 100, 2, 0.3));
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(spring(4, 2, 0.3)).toBeCloseTo(1, 3);
  });

  test("pop preserves volume while squashing", () => {
    const state = pop(4.1, 4, { squash: 0.05 });
    expect(state.scaleX * state.scaleY).toBeCloseTo(1, 10);
    expect(state.scaleY).not.toBeCloseTo(1, 2);
  });

  test("rise travels from the full distance to zero", () => {
    expect(rise(3, 4, 100)).toBe(100);
    expect(rise(20, 4, 100)).toBeCloseTo(0, 3);
  });
});
