import { amp, at, filter, midiToHz, noiseSource, oscillator, SILENT, strike } from "./rig";
import type { Rig } from "./rig";

export type Chord = {
  root: number;
  notes: number[];
};

const DUCK_FLOOR = 0.28;
const DUCK_RECOVERY_SECONDS = 0.09;
const CLAP_FLAMS = [0, 0.011, 0.022];

export function kick(rig: Rig, beat: number, level: number): void {
  const start = at(beat);
  const body = oscillator(rig, "sine", 170, start, start + 0.55);
  body.frequency.exponentialRampToValueAtTime(52, start + 0.09);
  body.frequency.exponentialRampToValueAtTime(40, start + 0.45);
  const bodyAmp = amp(rig, 0);
  strike(bodyAmp.gain, start, level, 0.003, 0.45);
  body.connect(bodyAmp).connect(rig.drums);

  const clickAmp = amp(rig, 0);
  strike(clickAmp.gain, start, level * 0.35, 0.001, 0.014);
  noiseSource(rig, start, 0.02).connect(filter(rig, "highpass", 2500)).connect(clickAmp).connect(rig.drums);

  rig.duck.gain.setValueAtTime(DUCK_FLOOR, start);
  rig.duck.gain.setTargetAtTime(1, start + 0.02, DUCK_RECOVERY_SECONDS);
}

export function hat(rig: Rig, beat: number, level: number, release: number): void {
  const start = at(beat);
  const hatAmp = amp(rig, 0);
  strike(hatAmp.gain, start, level, 0.001, release);
  const pan = rig.ctx.createStereoPanner();
  pan.pan.value = 0.22;
  noiseSource(rig, start, release + 0.05)
    .connect(filter(rig, "highpass", 7200))
    .connect(filter(rig, "peaking", 10500, 1.2))
    .connect(hatAmp)
    .connect(pan)
    .connect(rig.drums);
}

export function clap(rig: Rig, beat: number, level: number, pitch = 1200): void {
  const start = at(beat);
  const clapAmp = amp(rig, 0);
  CLAP_FLAMS.forEach((offset) => {
    clapAmp.gain.setValueAtTime(level, start + offset);
    clapAmp.gain.exponentialRampToValueAtTime(level * 0.2, start + offset + 0.009);
  });
  clapAmp.gain.setValueAtTime(level, start + 0.033);
  clapAmp.gain.exponentialRampToValueAtTime(SILENT, start + 0.25);
  noiseSource(rig, start, 0.35).connect(filter(rig, "bandpass", pitch, 1.1)).connect(clapAmp);
  clapAmp.connect(rig.drums);
  clapAmp.connect(amp(rig, 0.4)).connect(rig.reverb);
}

export function bass(rig: Rig, beat: number, note: number, lengthBeats: number, level = 0.3): void {
  const start = at(beat);
  const stop = start + at(lengthBeats);
  const tone = filter(rig, "lowpass", 900, 4);
  tone.frequency.setValueAtTime(900, start);
  tone.frequency.exponentialRampToValueAtTime(220, start + 0.18);
  const bassAmp = amp(rig, 0);
  strike(bassAmp.gain, start, level, 0.005, stop - start);
  oscillator(rig, "sawtooth", midiToHz(note), start, stop + 0.05).connect(tone);
  oscillator(rig, "sine", midiToHz(note), start, stop + 0.05).connect(bassAmp);
  tone.connect(bassAmp).connect(rig.music);
}

export function pad(
  rig: Rig,
  startBeat: number,
  endBeat: number,
  chord: Chord,
  cutoff: [number, number],
  level: number,
  release = 0.35,
): void {
  const start = at(startBeat);
  const end = at(endBeat);
  const tone = filter(rig, "lowpass", cutoff[0], 0.8);
  tone.frequency.setValueAtTime(cutoff[0], start);
  tone.frequency.linearRampToValueAtTime(cutoff[1], end);
  const padAmp = amp(rig, 0);
  padAmp.gain.setValueAtTime(0, start);
  padAmp.gain.linearRampToValueAtTime(level, start + 0.22);
  padAmp.gain.setValueAtTime(level, end);
  padAmp.gain.linearRampToValueAtTime(0, end + release);
  chord.notes.forEach((note) =>
    [-9, 9].forEach((detune) =>
      oscillator(rig, "sawtooth", midiToHz(note), start, end + release + 0.05, detune).connect(tone),
    ),
  );
  tone.connect(padAmp).connect(rig.music);
  padAmp.connect(amp(rig, 0.5)).connect(rig.reverb);
}

export function pluck(rig: Rig, beat: number, note: number, level: number, release: number): void {
  const start = at(beat);
  const stop = start + release + 0.05;
  const tone = filter(rig, "lowpass", 4200, 2);
  tone.frequency.setValueAtTime(4200, start);
  tone.frequency.exponentialRampToValueAtTime(700, start + release);
  const pluckAmp = amp(rig, 0);
  strike(pluckAmp.gain, start, level, 0.002, release);
  oscillator(rig, "triangle", midiToHz(note), start, stop).connect(tone);
  oscillator(rig, "square", midiToHz(note), start, stop, 6).connect(tone);
  tone.connect(pluckAmp).connect(rig.music);
  pluckAmp.connect(amp(rig, 0.45)).connect(rig.delay);
}

export function crash(rig: Rig, beat: number, level: number, release: number): void {
  const start = at(beat);
  const crashAmp = amp(rig, 0);
  strike(crashAmp.gain, start, level, 0.002, release);
  noiseSource(rig, start, release + 0.1).connect(filter(rig, "highpass", 5000)).connect(crashAmp);
  crashAmp.connect(rig.drums);
  crashAmp.connect(amp(rig, 0.5)).connect(rig.reverb);
}

export function subBoom(rig: Rig, beat: number, level: number, release: number): void {
  const start = at(beat);
  const boom = oscillator(rig, "sine", 64, start, start + release + 0.1);
  boom.frequency.exponentialRampToValueAtTime(33, start + release);
  const boomAmp = amp(rig, 0);
  strike(boomAmp.gain, start, level, 0.004, release);
  boom.connect(boomAmp).connect(rig.drums);
}

export function whoosh(rig: Rig, beat: number, level: number, lengthBeats: number, isRising: boolean): void {
  const start = at(beat);
  const length = at(lengthBeats);
  const [low, high] = isRising ? [500, 6000] : [6000, 400];
  const band = filter(rig, "bandpass", low, 1.6);
  band.frequency.setValueAtTime(low, start);
  band.frequency.exponentialRampToValueAtTime(high, start + length);
  const pan = rig.ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.8, start);
  pan.pan.linearRampToValueAtTime(0.8, start + length);
  const whooshAmp = amp(rig, 0);
  whooshAmp.gain.setValueAtTime(0, start);
  whooshAmp.gain.linearRampToValueAtTime(level, start + length * 0.7);
  whooshAmp.gain.linearRampToValueAtTime(0, start + length);
  noiseSource(rig, start, length).connect(band).connect(pan).connect(whooshAmp).connect(rig.drums);
}

export function riser(rig: Rig, startBeat: number, endBeat: number): void {
  const start = at(startBeat);
  const end = at(endBeat);
  const band = filter(rig, "bandpass", 300, 3);
  band.frequency.setValueAtTime(300, start);
  band.frequency.exponentialRampToValueAtTime(7000, end);
  const noiseAmp = amp(rig, 0);
  noiseAmp.gain.setValueAtTime(0, start);
  noiseAmp.gain.linearRampToValueAtTime(0.3, end);
  noiseAmp.gain.setValueAtTime(0, end);
  noiseSource(rig, start, end - start).connect(band).connect(noiseAmp).connect(rig.drums);

  const sweep = oscillator(rig, "sawtooth", 180, start, end);
  sweep.frequency.exponentialRampToValueAtTime(1400, end);
  const sweepAmp = amp(rig, 0);
  sweepAmp.gain.setValueAtTime(0, start);
  sweepAmp.gain.linearRampToValueAtTime(0.035, end);
  sweepAmp.gain.setValueAtTime(0, end);
  sweep.connect(filter(rig, "lowpass", 2400)).connect(sweepAmp).connect(rig.drums);
  sweepAmp.connect(amp(rig, 0.6)).connect(rig.reverb);
}

export function reverseSwell(rig: Rig, startBeat: number, endBeat: number): void {
  const start = at(startBeat);
  const end = at(endBeat);
  const swellAmp = amp(rig, 0);
  swellAmp.gain.setValueAtTime(SILENT, start);
  swellAmp.gain.exponentialRampToValueAtTime(0.34, end - 0.005);
  swellAmp.gain.setValueAtTime(0, end);
  noiseSource(rig, start, end - start).connect(filter(rig, "highpass", 1800)).connect(swellAmp);
  swellAmp.connect(rig.drums);
  swellAmp.connect(amp(rig, 0.3)).connect(rig.reverb);
}

export function tick(rig: Rig, beat: number): void {
  const start = at(beat);
  const tickAmp = amp(rig, 0);
  strike(tickAmp.gain, start, 0.14, 0.001, 0.04);
  oscillator(rig, "sine", 2400, start, start + 0.08).connect(tickAmp);
  tickAmp.connect(rig.drums);
  tickAmp.connect(amp(rig, 0.6)).connect(rig.reverb);
}
