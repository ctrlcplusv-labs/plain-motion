import { normalizePeak } from "../wav";
import { bass, clap, crash, hat, kick, pad, pluck, reverseSwell, riser, subBoom, tick, whoosh } from "./instruments";
import type { Chord } from "./instruments";
import { CHANNEL_COUNT, createRig, SAMPLE_RATE } from "./rig";
import type { Rig } from "./rig";

export type Soundtrack = {
  channels: Float32Array[];
  sampleRate: number;
};

const TARGET_PEAK = 0.9;
const FADE_OUT_SECONDS = 0.12;
const SEMITONES = 12;
const BEATS_PER_BAR = 4;
const SIXTEENTHS_PER_BEAT = 4;

const F_MAJOR_SEVEN: Chord = { root: 41, notes: [53, 57, 60, 64] };
const G_ADD_NINE: Chord = { root: 43, notes: [55, 59, 62, 69] };
const E_MINOR_SEVEN: Chord = { root: 40, notes: [52, 55, 59, 62] };
const A_MINOR_SEVEN: Chord = { root: 45, notes: [57, 60, 64, 67] };
const G_DOMINANT: Chord = { root: 43, notes: [55, 59, 62, 65] };
const G_SUSPENDED: Chord = { root: 43, notes: [55, 60, 62, 67] };
const C_ADD_NINE: Chord = { root: 36, notes: [48, 55, 60, 64, 67, 74] };
const PROGRESSION = [F_MAJOR_SEVEN, G_ADD_NINE, E_MINOR_SEVEN, A_MINOR_SEVEN, F_MAJOR_SEVEN, G_DOMINANT, G_SUSPENDED];
const ARP_PATTERN = [0, 2, 1, 3, 2, 0, 3, 1];

const CUE = {
  arpStart: 2,
  grooveStart: 4,
  ghostStart: 8,
  riserStart: 24,
  rollStart: 25,
  breakStart: 27,
  impact: 28,
  end: 32,
};

const WHOOSHES = [3.7, 7.7, 10.7, 14.7, 17.8, 20.6, 23.7];
const COLLAPSE_WHOOSH = 26.4;
const CURSOR_TICKS = [27, 27.5];

function chordAt(beat: number): Chord {
  return PROGRESSION[Math.min(Math.floor(beat / BEATS_PER_BAR), PROGRESSION.length - 1)] ?? F_MAJOR_SEVEN;
}

function scheduleGroove(rig: Rig): void {
  kick(rig, 0, 1.1);
  crash(rig, 0, 0.3, 2.2);
  subBoom(rig, 0, 0.55, 1.1);

  for (let beat = CUE.grooveStart; beat < CUE.breakStart; beat += 1) {
    kick(rig, beat, 1);
    if (beat % 2 === 1 && beat < CUE.rollStart) clap(rig, beat, 0.55);
  }

  for (let beat = 0.5; beat < CUE.breakStart; beat += 1) {
    const isOpen = Math.floor(beat) % BEATS_PER_BAR === 3 && beat >= CUE.grooveStart;
    hat(rig, beat, beat < CUE.grooveStart ? 0.15 : 0.24, isOpen ? 0.16 : 0.045);
  }

  for (let beat = CUE.ghostStart; beat < CUE.rollStart + 1; beat += 0.5) {
    hat(rig, beat + 0.25, 0.07, 0.025);
  }
}

function scheduleRoll(rig: Rig): void {
  const roll = [
    { from: CUE.rollStart, to: CUE.rollStart + 1, step: 0.5 },
    { from: CUE.rollStart + 1, to: CUE.rollStart + 1.5, step: 0.25 },
    { from: CUE.rollStart + 1.5, to: CUE.breakStart, step: 0.125 },
  ];
  roll.forEach(({ from, to, step }) => {
    for (let beat = from; beat < to; beat += step) {
      const lift = (beat - CUE.rollStart) / (CUE.breakStart - CUE.rollStart);
      clap(rig, beat, 0.25 + lift * 0.5, 1100 + lift * 1300);
    }
  });
}

function scheduleFinale(rig: Rig): void {
  CURSOR_TICKS.forEach((beat) => tick(rig, beat));
  reverseSwell(rig, CUE.breakStart + 0.1, CUE.impact);

  kick(rig, CUE.impact, 1.25);
  subBoom(rig, CUE.impact, 0.95, 3.2);
  crash(rig, CUE.impact, 0.5, 3.4);
  clap(rig, CUE.impact, 0.45, 1500);
  for (let beat = CUE.impact + 0.5; beat < CUE.end; beat += 1) {
    hat(rig, beat, 0.08, 0.04);
  }

  pad(rig, CUE.impact, CUE.end, C_ADD_NINE, [6000, 1400], 0.05, 0);
  bass(rig, CUE.impact, C_ADD_NINE.root, 6, 0.32);
  C_ADD_NINE.notes.forEach((note) => pluck(rig, CUE.impact, note + SEMITONES, 0.06, 1.4));
  [...C_ADD_NINE.notes].reverse().forEach((note, index) => {
    const level = 0.05 * (1 - index / C_ADD_NINE.notes.length);
    pluck(rig, CUE.impact + 1 + index * 0.5, note + SEMITONES, level, 0.5);
  });
}

function scheduleHarmony(rig: Rig): void {
  PROGRESSION.forEach((chord, bar) => {
    const start = bar * BEATS_PER_BAR;
    const isIntro = bar === 0;
    const isBuild = bar === PROGRESSION.length - 1;
    const end = isBuild ? CUE.breakStart : start + BEATS_PER_BAR;
    const cutoff: [number, number] = isIntro ? [350, 1600] : isBuild ? [2000, 5200] : [1700, 2100];
    pad(rig, start, end, chord, cutoff, 0.045, isBuild ? 0.06 : 0.35);
  });

  for (let beat = CUE.grooveStart; beat < CUE.breakStart; beat += 1) {
    const chord = chordAt(beat);
    bass(rig, beat + 0.5, chord.root, 0.42);
    if (beat % 2 === 1) bass(rig, beat + 0.75, chord.root + SEMITONES, 0.2, 0.2);
  }

  for (let step = CUE.arpStart * SIXTEENTHS_PER_BEAT; step < CUE.breakStart * SIXTEENTHS_PER_BEAT; step += 1) {
    const beat = step / SIXTEENTHS_PER_BEAT;
    const chord = chordAt(beat);
    const index = ARP_PATTERN[step % ARP_PATTERN.length] ?? 0;
    const note = (chord.notes[index % chord.notes.length] ?? chord.root) + SEMITONES;
    const level = beat < CUE.grooveStart ? 0.07 * (beat / CUE.grooveStart) : 0.075;
    const accent = step % SIXTEENTHS_PER_BEAT === 0 ? 1.3 : 1;
    pluck(rig, beat, note, level * accent, 0.14);
  }
}

function scheduleEffects(rig: Rig): void {
  WHOOSHES.forEach((beat) => whoosh(rig, beat, 0.16, 0.45, true));
  whoosh(rig, COLLAPSE_WHOOSH, 0.2, 0.6, false);
  riser(rig, CUE.riserStart, CUE.breakStart);
}

function fadeTail(channels: Float32Array[]): void {
  const fadeSamples = Math.floor(FADE_OUT_SECONDS * SAMPLE_RATE);
  channels.forEach((channel) => {
    for (let index = 0; index < fadeSamples; index += 1) {
      const position = channel.length - fadeSamples + index;
      channel[position] = (channel[position] ?? 0) * (1 - index / fadeSamples);
    }
  });
}

export async function renderSoundtrack(): Promise<Soundtrack> {
  const rig = createRig();
  scheduleGroove(rig);
  scheduleRoll(rig);
  scheduleHarmony(rig);
  scheduleEffects(rig);
  scheduleFinale(rig);
  const buffer = await rig.ctx.startRendering();
  const channels = Array.from({ length: CHANNEL_COUNT }, (_, channel) => buffer.getChannelData(channel));
  normalizePeak(channels, TARGET_PEAK);
  fadeTail(channels);
  return { channels, sampleRate: SAMPLE_RATE };
}
