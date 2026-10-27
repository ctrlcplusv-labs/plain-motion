export type StatusTone = "live" | "accent" | "muted";

export type Project = {
  name: string;
  description: string;
  status: string;
  tone: StatusTone;
  tags: string[];
  link: string;
};

export type Post = {
  title: string;
  meta: string;
};

export type PaletteRow = {
  label: string;
  path: string;
  icon: IconName;
  isActive: boolean;
};

export type IconName = "projects" | "blog" | "about" | "stack";

export type CodeToken = {
  text: string;
  kind: "plain" | "keyword" | "type" | "string" | "number" | "punctuation";
};

export const SITE_NAME = "Alex Cloudstar";
export const DOMAIN = "alexcloudstar.com";
export const MARK_LABEL = "ac";
export const MARK_CURSOR = "_";
export const NAV_LINKS = ["About", "Experience", "Projects", "Blog", "Contact"];

export const YEARS_LINE = "Building for the web.";
export const SENIOR_WORDS = { first: "Senior", second: "Freelance", tail: "since", year: "2020" };
export const CONTRACTS_LABEL = "Contracts for";

export const CLIENTS = [
  { name: "E.ON", detail: "" },
  { name: "ING", detail: "via HCL Technologies" },
  { name: "Omnisource", detail: "" },
  { name: "Makeen / Warner Bros.", detail: "" },
];
export const CLIENT_CHIPS = ["E.ON", "ING · HCL Technologies", "Omnisource", "Makeen / Warner Bros."];

export const STACK_LINES = ["JavaScript.", "TypeScript.", "Next.js."];
export const AI_LINES = ["AI features.", "Integrated."];

export const OPEN_TO_LABEL = "Open to";
export const WORK_MODES = [
  { headline: "contract work.", label: "Contract" },
  { headline: "senior full-time roles.", label: "Full-time" },
  { headline: "consulting.", label: "Consulting" },
];
export const CONSULTING_TOPICS = ["Architecture reviews", "AI integration advice"];

export const ROMANIA_TITLE = { lead: "Based in", place: "Romania." };
export const REACH_LINE = "Working with clients across Europe and the US.";
export const MAP_LABELS = { home: "Romania", europe: "Europe", us: "US" };

export const TAGLINE = "Senior full-stack engineer";

export const PROJECTS: Project[] = [
  {
    name: "statusline-pro",
    description: "Claude Code plugin: model, context, limits, git and cost under the prompt.",
    status: "Open source",
    tone: "accent",
    tags: ["TypeScript", "Bun", "Claude Code"],
    link: "Source",
  },
  {
    name: "justship.now",
    description: "Directory of tools for developers and indie hackers, with a build-in-public blog.",
    status: "Live",
    tone: "live",
    tags: ["Next.js", "React", "TypeScript", "Drizzle"],
    link: "Live",
  },
  {
    name: "makers.page",
    description: "Launch platform for indie products with daily rankings. Paused, archive browsable.",
    status: "Paused",
    tone: "muted",
    tags: ["Next.js", "React", "MCP"],
    link: "Live",
  },
  {
    name: "beseen.so",
    description: "AI visibility tracker for prompts where assistants name a competitor.",
    status: "Rebuilding",
    tone: "muted",
    tags: ["Next.js", "TypeScript", "Bun"],
    link: "Live",
  },
  {
    name: "Atioko",
    description: "Reddit topic research for SEO teams, with draft help. Waitlist open.",
    status: "Waitlist",
    tone: "accent",
    tags: ["Next.js", "Neon", "GSAP"],
    link: "Live",
  },
  {
    name: ".dotfiles",
    description: "macOS dev setup as code: Neovim, Tmux, Zsh and an Ansible bootstrap.",
    status: "Open source",
    tone: "accent",
    tags: ["NVim", "Tmux", "Ansible"],
    link: "Source",
  },
  {
    name: "Product Hunt Wrapped 2025",
    description: "Year-in-review for Product Hunt makers: ranks, votes and a Maker Persona.",
    status: "Live",
    tone: "live",
    tags: ["Next.js", "Neon", "Vercel"],
    link: "Live",
  },
];

export const POSTS: Post[] = [
  { title: "Claude Agent SDK: What It Is and How to Build Your First Agent", meta: "Oct 23 · 17 min" },
  { title: "Claude Code Hooks: Every Event, the Config Format and Five Working Examples", meta: "Oct 23 · 13 min" },
  { title: "Claude Code Subagents: How They Work and How to Build Your Own", meta: "Oct 23 · 13 min" },
  { title: "Git Worktree Guide: Parallel Branches and Claude Code", meta: "Oct 22 · 10 min" },
  { title: "Model Context Protocol (MCP) Explained", meta: "Blog · ai" },
];

export const FEATURED_POST = {
  title: "Claude Code Alternatives in 2026: 8 Tools Worth Switching To, and When Not To",
  tags: ["#ai", "#claude-code", "#claude", "#developer-tools"],
};

export const PALETTE_ROWS: PaletteRow[] = [
  { label: "Projects", path: "/projects", icon: "projects", isActive: true },
  { label: "Blog", path: "/blog", icon: "blog", isActive: false },
  { label: "About", path: "/about", icon: "about", isActive: false },
  { label: "Tech stack", path: "/tech-stack", icon: "stack", isActive: false },
];

export const CODE_FILE = "engineer.ts";
export const CODE_LINES: CodeToken[][] = [
  [
    { text: "type ", kind: "keyword" },
    { text: "Engineer", kind: "type" },
    { text: " = {", kind: "punctuation" },
  ],
  [
    { text: "  experience", kind: "plain" },
    { text: ": ", kind: "punctuation" },
    { text: '"8+ years"', kind: "string" },
    { text: ";", kind: "punctuation" },
  ],
  [
    { text: "  seniorSince", kind: "plain" },
    { text: ": ", kind: "punctuation" },
    { text: "2020", kind: "number" },
    { text: ";", kind: "punctuation" },
  ],
  [
    { text: "  stack", kind: "plain" },
    { text: ": [", kind: "punctuation" },
    { text: '"JavaScript"', kind: "string" },
    { text: ", ", kind: "punctuation" },
    { text: '"TypeScript"', kind: "string" },
    { text: ", ", kind: "punctuation" },
    { text: '"Next.js"', kind: "string" },
    { text: "];", kind: "punctuation" },
  ],
  [
    { text: "  focus", kind: "plain" },
    { text: ": ", kind: "punctuation" },
    { text: '"AI feature integration"', kind: "string" },
    { text: ";", kind: "punctuation" },
  ],
  [{ text: "};", kind: "punctuation" }],
];
