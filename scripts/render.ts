import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { DURATION, FPS, STAGE_HEIGHT, STAGE_WIDTH } from "../src/timing";
import { openPage } from "./cdp";
import type { Page } from "./cdp";
import { buildBundle, startServer } from "./server";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "out");
const FINAL_SUBFRAMES = 4;
const SHUTTER = 0.5;
const FINAL_CRF = "14";
const DRAFT_CRF = "22";
const POSTER_SECONDS = 14.6;
const PROGRESS_EVERY = 30;
const STILL_NAME_WIDTH = 5;

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    draft: { type: "boolean", default: false },
    stills: { type: "string" },
    out: { type: "string", default: "alexcloudstar-launch.mp4" },
  },
});

async function screenshot(page: Page, seconds: number): Promise<Buffer> {
  await page.evaluate(`window.renderFilmFrame(${seconds})`);
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    optimizeForSpeed: true,
    clip: { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, scale: 1 },
  });
  return Buffer.from(String(data), "base64");
}

async function renderStills(page: Page, times: number[]): Promise<void> {
  const dir = join(OUT_DIR, "stills");
  mkdirSync(dir, { recursive: true });
  for (const seconds of times) {
    writeFileSync(join(dir, `${seconds.toFixed(2).padStart(STILL_NAME_WIDTH, "0")}.png`), await screenshot(page, seconds));
  }
  process.stdout.write(`Wrote ${times.length} stills to ${dir}\n`);
}

function encoderArgs(subframes: number, wavPath: string, outPath: string, crf: string): string[] {
  const blend = subframes > 1 ? `tmix=frames=${subframes},select='eq(mod(n,${subframes}),${subframes - 1})',setpts=N/(${FPS}*TB),` : "";
  return [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(FPS * subframes),
    "-i",
    "-",
    "-i",
    wavPath,
    "-filter_complex",
    `[0:v]${blend}format=yuv420p[v]`,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    crf,
    "-profile:v",
    "high",
    "-c:a",
    "aac",
    "-b:a",
    "320k",
    "-movflags",
    "+faststart",
    "-shortest",
    outPath,
  ];
}

async function renderFilm(page: Page, isDraft: boolean, fileName: string): Promise<void> {
  const wavPath = join(OUT_DIR, "soundtrack.wav");
  const wav = await page.evaluate("window.renderFilmSoundtrack()");
  writeFileSync(wavPath, Buffer.from(String(wav), "base64"));

  const subframes = isDraft ? 1 : FINAL_SUBFRAMES;
  const outPath = join(OUT_DIR, fileName);
  const encoder = spawn("ffmpeg", encoderArgs(subframes, wavPath, outPath, isDraft ? DRAFT_CRF : FINAL_CRF), {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const finished = once(encoder, "close");
  const totalFrames = Math.round(DURATION * FPS);
  const startedAt = performance.now();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    for (let sub = 0; sub < subframes; sub += 1) {
      const seconds = (frame + (sub / subframes) * SHUTTER) / FPS;
      if (!encoder.stdin.write(await screenshot(page, seconds))) await once(encoder.stdin, "drain");
    }
    if (frame % PROGRESS_EVERY === 0) {
      const elapsed = (performance.now() - startedAt) / 1000;
      process.stdout.write(`\rframe ${frame}/${totalFrames}  ${elapsed.toFixed(0)}s`);
    }
  }
  encoder.stdin.end();
  const [code] = await finished;
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  writeFileSync(join(OUT_DIR, "poster.png"), await screenshot(page, POSTER_SECONDS));
  process.stdout.write(`\nWrote ${outPath}\n`);
}

mkdirSync(OUT_DIR, { recursive: true });
await buildBundle();
const server = startServer(0, false);
const page = await openPage(STAGE_WIDTH, STAGE_HEIGHT);

try {
  await page.send("Page.navigate", { url: `http://localhost:${server.port}/?render` });
  await page.evaluate(
    "new Promise((resolve) => { const check = () => (window.filmReady ? window.filmReady.then(resolve) : setTimeout(check, 50)); check(); })",
  );
  if (values.stills) await renderStills(page, values.stills.split(",").map(Number));
  else await renderFilm(page, values.draft ?? false, values.out ?? "alexcloudstar-launch.mp4");
} finally {
  page.close();
  server.stop(true);
}
