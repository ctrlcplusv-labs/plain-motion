import { renderSoundtrack } from "./audio/soundtrack";
import { buildFilm } from "./film";
import { startPreview } from "./preview";
import { encodeWav, toBase64 } from "./wav";

declare global {
  interface Window {
    filmReady: Promise<void>;
    renderFilmFrame: (seconds: number) => Promise<void>;
    renderFilmSoundtrack: () => Promise<string>;
  }
}

const FONT_PROBES = ["600 100px Jakarta", "700 100px Jakarta", "500 40px JetBrains"];

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function requireElement(selector: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

async function boot(): Promise<void> {
  const isRender = new URLSearchParams(location.search).has("render");
  document.body.classList.toggle("is-render", isRender);
  await Promise.all(FONT_PROBES.map((font) => document.fonts.load(font)));
  await document.fonts.ready;
  const film = buildFilm(requireElement(".stage"));
  film.render(0);

  window.renderFilmFrame = async (seconds) => {
    film.render(seconds);
    await nextPaint();
  };
  window.renderFilmSoundtrack = async () => {
    const track = await renderSoundtrack();
    return toBase64(encodeWav(track.channels, track.sampleRate));
  };

  if (!isRender) {
    startPreview(film, requireElement(".frame"), renderSoundtrack);
  }
  await nextPaint();
}

window.filmReady = boot();
