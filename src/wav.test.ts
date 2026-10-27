import { describe, expect, test } from "bun:test";

import { encodeWav, normalizePeak } from "./wav";

const SAMPLE_RATE = 48000;

describe("encodeWav", () => {
  test("writes a 16-bit stereo PCM header and interleaved samples", () => {
    const left = new Float32Array([0, 1, -1]);
    const right = new Float32Array([0.5, -0.5, 0]);
    const view = new DataView(encodeWav([left, right], SAMPLE_RATE));
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));

    expect(text(0)).toBe("RIFF");
    expect(text(8)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(3 * 2 * 2);
    expect(view.byteLength).toBe(44 + 12);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(16384);
    expect(view.getInt16(48, true)).toBe(32767);
    expect(view.getInt16(52, true)).toBe(-32768);
  });
});

describe("normalizePeak", () => {
  test("scales every channel so the loudest sample hits the target", () => {
    const left = new Float32Array([0.1, -0.4]);
    const right = new Float32Array([0.2, 0.3]);
    normalizePeak([left, right], 0.8);
    expect(left[1]).toBeCloseTo(-0.8, 6);
    expect(right[0]).toBeCloseTo(0.4, 6);
  });
});
