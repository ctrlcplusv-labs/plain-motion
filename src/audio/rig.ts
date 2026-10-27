import { BEAT, DURATION } from "../timing";

export type Rig = {
  ctx: OfflineAudioContext;
  drums: GainNode;
  music: GainNode;
  duck: GainNode;
  reverb: GainNode;
  delay: GainNode;
  noise: AudioBuffer;
  random: () => number;
};

export const SAMPLE_RATE = 48000;
export const CHANNEL_COUNT = 2;
export const SILENT = 0.0001;
export const NOISE_SECONDS = 4;

const REVERB_SECONDS = 2.6;
const REVERB_DECAY_POWER = 3.2;
const RANDOM_SEED = 20200128;
const A4_HZ = 440;
const A4_MIDI = 69;
const SEMITONES = 12;
const MASTER_LEVEL = 0.8;
const REVERB_RETURN = 0.32;
const DELAY_RETURN = 0.28;
const DELAY_FEEDBACK = 0.34;
const DELAY_BEATS = 0.75;
const DELAY_TONE_HZ = 3200;
const MAX_DELAY_SECONDS = 1;
const NOISE_TAIL_SECONDS = 0.05;
const UINT32_RANGE = 4294967296;

export function at(beat: number): number {
  return beat * BEAT;
}

export function midiToHz(note: number): number {
  return A4_HZ * 2 ** ((note - A4_MIDI) / SEMITONES);
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function strike(param: AudioParam, start: number, peak: number, attack: number, release: number): void {
  param.setValueAtTime(0, start);
  param.linearRampToValueAtTime(peak, start + attack);
  param.exponentialRampToValueAtTime(SILENT, start + attack + release);
}

export function amp(rig: Rig, level = 1): GainNode {
  const node = rig.ctx.createGain();
  node.gain.value = level;
  return node;
}

export function filter(rig: Rig, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const node = rig.ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

export function noiseSource(rig: Rig, start: number, duration: number): AudioBufferSourceNode {
  const source = rig.ctx.createBufferSource();
  source.buffer = rig.noise;
  const offset = rig.random() * Math.max(0, NOISE_SECONDS - duration - NOISE_TAIL_SECONDS);
  source.start(start, offset, duration);
  return source;
}

export function oscillator(
  rig: Rig,
  type: OscillatorType,
  frequency: number,
  start: number,
  stop: number,
  detune = 0,
): OscillatorNode {
  const node = rig.ctx.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, start);
  node.detune.value = detune;
  node.start(start);
  node.stop(stop);
  return node;
}

function createNoise(ctx: OfflineAudioContext, random: () => number): AudioBuffer {
  const buffer = ctx.createBuffer(1, SAMPLE_RATE * NOISE_SECONDS, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  data.forEach((_, index) => (data[index] = random() * 2 - 1));
  return buffer;
}

function createImpulse(ctx: OfflineAudioContext, random: () => number): AudioBuffer {
  const length = Math.floor(SAMPLE_RATE * REVERB_SECONDS);
  const buffer = ctx.createBuffer(CHANNEL_COUNT, length, SAMPLE_RATE);
  for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
    const data = buffer.getChannelData(channel);
    data.forEach((_, index) => (data[index] = (random() * 2 - 1) * (1 - index / length) ** REVERB_DECAY_POWER));
  }
  return buffer;
}

function createMaster(ctx: OfflineAudioContext): GainNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 8;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;

  const master = ctx.createGain();
  master.gain.value = MASTER_LEVEL;
  master.connect(compressor).connect(ctx.destination);
  return master;
}

function createReverb(ctx: OfflineAudioContext, master: GainNode, random: () => number): GainNode {
  const input = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulse(ctx, random);
  const output = ctx.createGain();
  output.gain.value = REVERB_RETURN;
  input.connect(convolver).connect(output).connect(master);
  return input;
}

function createDelay(ctx: OfflineAudioContext, destination: GainNode): GainNode {
  const input = ctx.createGain();
  const line = ctx.createDelay(MAX_DELAY_SECONDS);
  line.delayTime.value = DELAY_BEATS * BEAT;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = DELAY_TONE_HZ;
  const feedback = ctx.createGain();
  feedback.gain.value = DELAY_FEEDBACK;
  const output = ctx.createGain();
  output.gain.value = DELAY_RETURN;
  input.connect(line).connect(tone).connect(feedback).connect(line);
  tone.connect(output).connect(destination);
  return input;
}

export function createRig(): Rig {
  const ctx = new OfflineAudioContext(CHANNEL_COUNT, Math.ceil(SAMPLE_RATE * DURATION), SAMPLE_RATE);
  const random = seededRandom(RANDOM_SEED);
  const master = createMaster(ctx);

  const drums = ctx.createGain();
  drums.connect(master);
  const duck = ctx.createGain();
  duck.connect(master);
  const music = ctx.createGain();
  music.connect(duck);

  return {
    ctx,
    drums,
    music,
    duck,
    reverb: createReverb(ctx, master, random),
    delay: createDelay(ctx, duck),
    noise: createNoise(ctx, random),
    random,
  };
}
