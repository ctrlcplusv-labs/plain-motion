import type { Soundtrack } from "./audio/soundtrack";
import { el } from "./dom";
import type { Film } from "./film";
import { DURATION, FPS, STAGE_HEIGHT, STAGE_WIDTH } from "./timing";

const CONTROLS_HEIGHT_PX = 72;
const VIEWPORT_MARGIN_PX = 32;
const TIME_DECIMALS = 2;

function fitStage(frame: HTMLElement): void {
  const scale = Math.min(
    (window.innerWidth - VIEWPORT_MARGIN_PX) / STAGE_WIDTH,
    (window.innerHeight - CONTROLS_HEIGHT_PX - VIEWPORT_MARGIN_PX) / STAGE_HEIGHT,
  );
  const stage = frame.firstElementChild;
  if (stage instanceof HTMLElement) stage.style.transform = `scale(${scale})`;
  frame.style.width = `${STAGE_WIDTH * scale}px`;
  frame.style.height = `${STAGE_HEIGHT * scale}px`;
}

export function startPreview(film: Film, frame: HTMLElement, loadSoundtrack: () => Promise<Soundtrack>): void {
  const playButton = el("button", "control-button", ["Play"]);
  const scrubber = el("input", "control-scrubber");
  scrubber.type = "range";
  scrubber.min = "0";
  scrubber.max = String(DURATION);
  scrubber.step = String(1 / FPS);
  scrubber.value = "0";
  const readout = el("span", "control-readout", ["0.00s"]);
  document.body.append(el("div", "controls", [playButton, scrubber, readout]));

  let context: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let startedAt = 0;
  let offset = 0;
  let isPlaying = false;

  const show = (seconds: number) => {
    film.render(seconds);
    scrubber.value = String(seconds);
    readout.textContent = `${seconds.toFixed(TIME_DECIMALS)}s`;
  };

  const stop = () => {
    source?.stop();
    source = null;
    isPlaying = false;
    playButton.textContent = "Play";
  };

  const tick = () => {
    if (!isPlaying || !context) return;
    const seconds = context.currentTime - startedAt;
    if (seconds >= DURATION) {
      stop();
      offset = 0;
      show(DURATION);
      return;
    }
    show(seconds);
    requestAnimationFrame(tick);
  };

  const play = async () => {
    context ??= new AudioContext();
    if (!buffer) {
      playButton.textContent = "Loading…";
      const track = await loadSoundtrack();
      buffer = context.createBuffer(track.channels.length, track.channels[0]?.length ?? 0, track.sampleRate);
      track.channels.forEach((channel, index) => buffer?.copyToChannel(new Float32Array(channel), index));
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0, offset);
    startedAt = context.currentTime - offset;
    isPlaying = true;
    playButton.textContent = "Pause";
    requestAnimationFrame(tick);
  };

  playButton.addEventListener("click", () => {
    if (isPlaying && context) {
      offset = context.currentTime - startedAt;
      stop();
      return;
    }
    if (offset >= DURATION) offset = 0;
    play().catch((error: unknown) => {
      playButton.textContent = "Play";
      throw error;
    });
  });

  scrubber.addEventListener("input", () => {
    if (isPlaying) stop();
    offset = Number(scrubber.value);
    show(offset);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;
    event.preventDefault();
    playButton.click();
  });

  window.addEventListener("resize", () => fitStage(frame));
  fitStage(frame);
  show(Number(new URLSearchParams(location.search).get("t") ?? 0));
}
