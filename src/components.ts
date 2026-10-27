import { CODE_FILE, CODE_LINES, DOMAIN, FEATURED_POST, MARK_CURSOR, MARK_LABEL, NAV_LINKS, PALETTE_ROWS, SITE_NAME } from "./content";
import type { IconName, Post, Project } from "./content";
import { el, icon } from "./dom";

export type Mark = {
  root: HTMLSpanElement;
  cursor: HTMLSpanElement;
};

export type Nav = {
  root: HTMLElement;
  background: HTMLSpanElement;
  mark: HTMLSpanElement;
  markCursor: HTMLSpanElement;
  nameChars: HTMLSpanElement[];
  links: HTMLSpanElement[];
  thumb: HTMLSpanElement;
  search: HTMLSpanElement;
};

export type CodeCard = {
  root: HTMLDivElement;
  chars: HTMLSpanElement[];
  caret: HTMLSpanElement;
};

export type Segmented = {
  root: HTMLDivElement;
  thumb: HTMLSpanElement;
  items: HTMLSpanElement[];
};

const ARROW_RIGHT = ["M5 12h14", "m12 5 7 7-7 7"];
const ARROW_UP_RIGHT = ["M7 7h10v10", "M7 17 17 7"];

const ICON_PATHS: Record<IconName, string[]> = {
  projects: ["M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"],
  blog: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
  about: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"],
  stack: ["m12 2 10 5-10 5L2 7Z", "m2 17 10 5 10-5", "m2 12 10 5 10-5"],
};

export function brandMark(classes: string[]): Mark {
  const cursor = el("span", "mark-cursor", [MARK_CURSOR]);
  const root = el("span", ["mark", ...classes], [el("span", "mark-letters", [MARK_LABEL]), cursor]);
  return { root, cursor };
}

export function wordmark(classes: string[] = []): HTMLSpanElement {
  return el("span", ["wordmark", ...classes], [el("span", "wordmark-alex", ["alex"]), el("span", "wordmark-cloud", ["cloudstar"])]);
}

export function chip(text: string, classes: string[] = []): HTMLSpanElement {
  return el("span", ["chip", ...classes], [text]);
}

export function navPill(): Nav {
  const markCursor = el("span", "mark-cursor", [MARK_CURSOR]);
  const mark = el("span", "nav-mark", [MARK_LABEL, markCursor]);
  const nameChars = [...SITE_NAME].map((char) => el("span", "nav-char", [char]));
  const links = NAV_LINKS.map((label) => el("span", "nav-link", [label]));
  const thumb = el("span", "nav-thumb");
  const search = el("span", "nav-search", [
    "Search",
    el("span", "kbd-group", [el("span", "kbd", ["⌘"]), el("span", "kbd", ["K"])]),
  ]);
  const background = el("span", "nav-bg");
  const root = el("nav", ["anchor", "nav"], [
    background,
    el("span", "nav-brand", [mark, el("span", "nav-name", nameChars)]),
    el("span", "nav-spacer"),
    el("span", "nav-links", [thumb, ...links]),
    search,
  ]);
  return { root, background, mark, markCursor, nameChars, links, thumb, search };
}

function statusBadge(project: Project): HTMLSpanElement {
  return el("span", "status", [el("span", ["status-dot", `tone-${project.tone}`]), project.status]);
}

function thumbnail(title: string, tags: string[]): HTMLDivElement {
  return el("div", "thumb", [
    wordmark(["thumb-wordmark"]),
    el("span", "thumb-title", [title]),
    el("span", "thumb-rule"),
    el("span", "thumb-tags", [tags.map((tag) => `#${tag}`).join("  ")]),
  ]);
}

export function projectCard(project: Project, classes: string[] = []): HTMLElement {
  return el("article", ["card", "project-card", ...classes], [
    thumbnail(project.name, project.tags),
    el("div", "card-body", [
      el("div", "card-head", [el("span", "card-title", [project.name]), statusBadge(project)]),
      el("p", "card-text", [project.description]),
      el("div", "chip-row", project.tags.map((tag) => chip(tag, ["chip-sm"]))),
      el("span", "card-link", [project.link, icon(ARROW_UP_RIGHT, "link-icon")]),
    ]),
  ]);
}

export function postCard(post: Post): HTMLElement {
  return el("article", ["card", "post-card"], [
    el("span", "post-meta", [post.meta]),
    el("span", "post-title", [post.title]),
    el("span", "card-link", ["Read post", icon(ARROW_RIGHT, "link-icon")]),
  ]);
}

export function featuredPostCard(): HTMLElement {
  return el("article", ["card", "featured-card"], [
    el("div", "featured-thumb", [
      brandMark(["mark-tiny"]).root,
      el("span", "featured-title", [FEATURED_POST.title]),
      el("span", "thumb-rule"),
      el("span", "thumb-tags", [FEATURED_POST.tags.join("  ")]),
    ]),
  ]);
}

export function palettePanel(): HTMLElement {
  return el("div", ["card", "palette"], [
    el("div", "palette-search", [el("span", "palette-placeholder", ["Search posts, projects and pages…"]), el("span", "kbd", ["esc"])]),
    el("span", "palette-group", ["Pages"]),
    ...PALETTE_ROWS.map((row) =>
      el("div", row.isActive ? ["palette-row", "is-active"] : ["palette-row"], [
        el("span", "palette-icon", [icon(ICON_PATHS[row.icon])]),
        el("span", "palette-label", [row.label]),
        el("span", "palette-path", [row.path]),
      ]),
    ),
    el("div", "palette-foot", [el("span", [], [DOMAIN]), el("span", "palette-open", ["Open", el("span", "kbd", ["↵"])])]),
  ]);
}

export function codeCard(): CodeCard {
  const chars: HTMLSpanElement[] = [];
  const caret = el("span", "caret");
  const lines = CODE_LINES.map((tokens) => {
    const line = el("span", "code-line");
    tokens.forEach((token) =>
      [...token.text].forEach((char) => {
        const span = el("span", ["code-char", `token-${token.kind}`], [char]);
        chars.push(span);
        line.append(span);
      }),
    );
    return line;
  });
  const root = el("div", ["anchor", "code-card"], [
    el("div", "code-head", [
      el("span", "code-dots", [el("span", "code-dot"), el("span", "code-dot"), el("span", "code-dot")]),
      el("span", "code-file", [CODE_FILE]),
      chip("TypeScript", ["chip-sm"]),
    ]),
    el("div", "code-body", lines),
  ]);
  return { root, chars, caret };
}

export function segmented(labels: string[]): Segmented {
  const items = labels.map((label) => el("span", "segment-item", [label]));
  const thumb = el("span", "segment-thumb");
  const root = el("div", ["anchor", "segment"], [thumb, ...items]);
  return { root, thumb, items };
}

export function arrowIcon(): SVGSVGElement {
  return icon(ARROW_RIGHT, "link-icon");
}
