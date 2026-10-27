type ClassList = string | string[];
type Child = Node | string;

export type Masked = {
  mask: HTMLSpanElement;
  inner: HTMLSpanElement;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const ICON_VIEWBOX = "0 0 24 24";

function toClassNames(classes: ClassList): string[] {
  return (Array.isArray(classes) ? classes : [classes]).filter(Boolean);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes: ClassList = [],
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.classList.add(...toClassNames(classes));
  node.append(...children);
  return node;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  children: SVGElement[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  node.append(...children);
  return node;
}

export function icon(paths: string[], classes: ClassList = "icon"): SVGSVGElement {
  const node = svg(
    "svg",
    {
      viewBox: ICON_VIEWBOX,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    paths.map((d) => svg("path", { d })),
  );
  node.classList.add(...toClassNames(classes));
  return node;
}

export function masked(content: Child[], maskClasses: ClassList = [], innerClasses: ClassList = []): Masked {
  const inner = el("span", ["mask-inner", ...toClassNames(innerClasses)], content);
  const mask = el("span", ["mask", ...toClassNames(maskClasses)], [inner]);
  return { mask, inner };
}

export function maskedWords(text: string, innerClasses: ClassList = []): Masked[] {
  return text.split(" ").map((word) => masked([word], [], innerClasses));
}

export function maskedChars(text: string, innerClasses: ClassList = []): Masked[] {
  return [...text].map((char) => masked([char], "mask-char", innerClasses));
}

export function anchor(classes: ClassList, children: Child[] = []): HTMLDivElement {
  return el("div", ["anchor", ...toClassNames(classes)], children);
}
