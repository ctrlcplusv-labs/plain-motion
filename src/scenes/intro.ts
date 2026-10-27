import { brandMark, navPill } from "../components";
import type { Nav } from "../components";
import { anchor } from "../dom";
import {
  easeInBack,
  easeInOutCubic,
  isBlinkOn,
  lerp,
  pop,
  pose,
  progress,
  springAt,
} from "../motion";
import { createBurst, createRing, hatPulse } from "./scene";
import type { Scene } from "./scene";

type LinkMetric = {
  x: number;
  width: number;
};

type NavMetrics = {
  markOffsetX: number;
  revealInset: number;
  links: LinkMetric[];
};

const HERO_MARK_PX = 200;
const NAV_MARK_PX = 22;
const NAV_INTRO_SCALE = 2.1;
const NAV_TOP_SCALE = 1.35;
const NAV_TOP_Y = -468;
const NAV_EXIT_Y = -760;
const TRAVEL_ARC_PX = 70;
const MARK_PADDING_PX = 15;

const CUE = {
  pop: 0,
  travel: 1.5,
  travelBeats: 0.5,
  swap: 2,
  nameStart: 2.1,
  nameStep: 0.035,
  links: [2.5, 2.75, 3, 3.25, 3.5],
  search: 3.5,
  rise: 3.75,
  exit: 26.4,
  exitBeats: 0.5,
  hide: 27,
};

const ACTIVE_LINK_CUES = [
  { beat: 4, index: 0 },
  { beat: 8, index: 1 },
  { beat: 18, index: 2 },
  { beat: 19.5, index: 3 },
  { beat: 21, index: 4 },
];

function measureNav(nav: Nav): NavMetrics {
  const width = nav.root.offsetWidth;
  const markCenter = nav.mark.offsetLeft + nav.mark.offsetWidth / 2;
  return {
    markOffsetX: markCenter - width / 2,
    revealInset: width - (nav.mark.offsetLeft + nav.mark.offsetWidth + MARK_PADDING_PX),
    links: nav.links.map((link) => ({ x: link.offsetLeft, width: link.offsetWidth })),
  };
}

function navPlacement(beat: number): { y: number; scale: number } {
  const lift = springAt(beat, CUE.rise, 1.5, 0.72);
  const exit = easeInBack(progress(beat, CUE.exit, CUE.exitBeats));
  return {
    y: lerp(0, NAV_TOP_Y, lift) + (NAV_EXIT_Y - NAV_TOP_Y) * exit,
    scale: lerp(NAV_INTRO_SCALE, NAV_TOP_SCALE, lift),
  };
}

function updateThumb(nav: Nav, metrics: NavMetrics, beat: number): void {
  const currentIndex = ACTIVE_LINK_CUES.findLastIndex((cue) => beat >= cue.beat);
  const current = ACTIVE_LINK_CUES[currentIndex];
  if (!current) {
    pose(nav.thumb, { opacity: 0 });
    return;
  }
  const previous = ACTIVE_LINK_CUES[Math.max(0, currentIndex - 1)] ?? current;
  const from = metrics.links[previous.index];
  const to = metrics.links[current.index];
  if (!from || !to) return;
  const travel = springAt(beat, current.beat, 2.6, 0.62);
  const appear = currentIndex === 0 ? pop(beat, current.beat, { frequency: 3, damping: 0.45 }) : null;
  nav.thumb.style.width = `${lerp(from.width, to.width, travel)}px`;
  pose(nav.thumb, { x: lerp(from.x, to.x, travel), scale: appear?.scale ?? 1, scaleY: appear?.scaleY ?? 1 });
  nav.links.forEach((link, index) => link.classList.toggle("is-active", index === current.index && travel > 0.5));
}

export function createIntro(parent: HTMLElement): Scene {
  const nav = navPill();
  const hero = brandMark(["mark-hero"]);
  const heroAnchor = anchor("hero-mark", [hero.root]);
  parent.append(nav.root, heroAnchor);
  const ring = createRing(parent, CUE.pop, 0.4, 3.6);
  const burst = createBurst(parent, CUE.pop, 14, 380);
  let metrics: NavMetrics | null = null;

  return {
    update(beat) {
      metrics ??= measureNav(nav);
      ring.update(beat);
      burst.update(beat);

      const placement = navPlacement(beat);
      const markTargetX = metrics.markOffsetX * placement.scale;
      const travel = easeInOutCubic(progress(beat, CUE.travel, CUE.travelBeats));
      const heroPop = pop(beat, CUE.pop, { frequency: 2.4, damping: 0.4, squash: 0.06 });
      const wobble = hatPulse(beat, CUE.pop, CUE.swap) * (Math.floor(beat) % 2 === 0 ? 5 : -5);
      const shrink = (NAV_MARK_PX * placement.scale) / HERO_MARK_PX;
      pose(
        heroAnchor,
        {
          x: lerp(0, markTargetX, travel),
          y: -Math.sin(travel * Math.PI) * TRAVEL_ARC_PX,
          scale: lerp(heroPop.scale, shrink, travel),
          scaleX: heroPop.scaleX,
          scaleY: heroPop.scaleY,
          rotate: wobble + travel * (1 - travel) * -40,
          opacity: beat >= CUE.pop && beat < CUE.swap ? 1 : 0,
        },
        "center",
      );
      hero.cursor.style.opacity = isBlinkOn(beat) ? "1" : "0";

      pose(nav.root, { y: placement.y, scale: placement.scale, opacity: beat >= CUE.swap && beat < CUE.hide ? 1 : 0 }, "center");
      const markPop = pop(beat, CUE.swap, { from: 1.4, frequency: 3, damping: 0.4, squash: 0.03 });
      pose(nav.mark, { scale: markPop.scale, scaleX: markPop.scaleX, scaleY: markPop.scaleY });
      nav.markCursor.style.opacity = isBlinkOn(beat) ? "1" : "0";

      const reveal = springAt(beat, CUE.swap, 1.8, 0.78);
      nav.background.style.clipPath = `inset(0 ${Math.max(0, (1 - reveal) * metrics.revealInset)}px 0 0 round 999px)`;

      nav.nameChars.forEach((char, index) => {
        const start = CUE.nameStart + index * CUE.nameStep;
        pose(char, { y: (1 - springAt(beat, start, 3, 0.6)) * 18, opacity: progress(beat, start, 0.15) });
      });
      nav.links.forEach((link, index) => {
        const linkPop = pop(beat, CUE.links[index] ?? CUE.search, { frequency: 3, damping: 0.45 });
        pose(link, { scale: linkPop.scale, scaleX: linkPop.scaleX, scaleY: linkPop.scaleY, opacity: linkPop.value > 0 ? 1 : 0 });
      });
      const searchPop = pop(beat, CUE.search, { frequency: 3, damping: 0.45 });
      pose(nav.search, { scale: searchPop.scale, scaleX: searchPop.scaleX, scaleY: searchPop.scaleY });
      updateThumb(nav, metrics, beat);
    },
  };
}
