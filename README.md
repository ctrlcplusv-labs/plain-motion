# plain-motion

Beat-synced motion graphics in plain TypeScript. No After Effects, no Remotion, no animation libraries, no stock music.

![15-second launch film rendered with plain-motion](docs/demo.gif)

The demo above is a 15-second launch film for [alexcloudstar.com](https://alexcloudstar.com). [Download the full 1080p60 MP4 with sound](https://github.com/ctrlcplusv-labs/plain-motion/releases/download/v0.1.0/alexcloudstar-launch.mp4).

## How it works

- **One clock.** The whole film runs on a beat grid (128 BPM, 8 bars, exactly 15 seconds). Visuals and music both read from it, so they can't drift.
- **Deterministic frames.** There are no CSS animations. `film.render(seconds)` converts time to a beat and every scene sets its transforms from pure functions of that beat: analytic springs, volume-preserving squash and stretch, masked text reveals, parallax layers. Any frame can be rendered in any order.
- **Music in code.** The soundtrack is synthesized with the Web Audio API in an `OfflineAudioContext`: kick, claps, hats, bass, pads, arpeggios, risers and whooshes, with sidechain ducking, reverb and delay.
- **Real motion blur.** `scripts/render.ts` drives headless Chrome over the DevTools protocol. It screenshots 4 sub-frames per frame across a 180° shutter. ffmpeg averages them into one frame, encodes H.264 and muxes in the synthesized WAV.

## Requirements

- [Bun](https://bun.sh) 1.3+
- [ffmpeg](https://ffmpeg.org) with `libx264` and `aac`
- Google Chrome or Chromium. The default path for macOS, Linux or Windows is used, or you can set `CHROME_PATH`.

## Usage

```sh
bun install
bun run preview        # live preview at http://localhost:4173 (Space to play, ?t=12.5 to jump)
bun run stills         # PNG stills to out/stills, about 3 seconds
bun run render:draft   # no motion blur, about 90 seconds
bun run render         # final 1080p60 MP4 with motion blur, about 5 minutes
```

The output goes to `out/`: the MP4, `soundtrack.wav` and `poster.png`.

## Make your own

| Keep (the engine) | Rewrite (your film) |
|---|---|
| `src/timing.ts` (change BPM and duration only) | `src/content.ts` (all copy and data) |
| `src/motion.ts`, `src/dom.ts`, `src/wav.ts` | `src/components.ts` (your brand UI, rebuilt as elements) |
| `src/audio/rig.ts`, `src/audio/instruments.ts` | `src/scenes/*.ts` (one file per storyboard scene) |
| `src/preview.ts`, `src/main.ts` | `src/film.ts` (scene wiring and camera) |
| `scripts/*` | `src/audio/soundtrack.ts` (chords and arrangement) |
| `styles/base.css` (update the tokens and fonts) | `styles/site.css`, `styles/cards.css`, `styles/scenes*.css` |

Tips:

- Pick a BPM where `bars × 4 × 60 / BPM` equals your target length.
- Put cuts and big pops on downbeats and small accents on the offbeat hi-hats.
- Measure layout lazily on the first update, after fonts have loaded.
- Check `out/stills` before every long render.

## License

The code is under the [MIT](LICENSE) license. The bundled fonts, [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), are under the SIL Open Font License 1.1 (see `fonts/`). The alexcloudstar.com brand, copy and demo film are included as an example; please replace them with your own.
