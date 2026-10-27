export const BPM = 128;
export const BEAT = 60 / BPM;
export const BEATS_PER_BAR = 4;
export const DURATION = 15;
export const FPS = 60;
export const TOTAL_BEATS = DURATION / BEAT;

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export function toBeats(seconds: number): number {
  return seconds / BEAT;
}

export function toSeconds(beat: number): number {
  return beat * BEAT;
}
