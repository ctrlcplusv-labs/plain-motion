import { existsSync } from "node:fs";
import { join, normalize, sep } from "node:path";

const ROOT = normalize(join(import.meta.dir, ".."));
const FONT_DIRS = [join(ROOT, "fonts")];
const PREVIEW_PORT = 4173;
const BUNDLE_PATH = "/dist/main.js";
const FONT_PREFIX = "/fonts/";
const NOT_FOUND = 404;

export async function buildBundle(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(ROOT, "src/main.ts")],
    outdir: join(ROOT, "dist"),
    target: "browser",
  });
  if (!result.success) throw new AggregateError(result.logs, "Bundling the film failed");
}

function resolveInside(base: string, relative: string): string | null {
  const resolved = normalize(join(base, relative));
  return resolved.startsWith(base + sep) && existsSync(resolved) ? resolved : null;
}

function resolvePath(pathname: string): string | null {
  if (pathname === "/") return join(ROOT, "index.html");
  if (pathname.startsWith(FONT_PREFIX)) {
    const name = pathname.slice(FONT_PREFIX.length);
    return FONT_DIRS.map((dir) => resolveInside(dir, name)).find(Boolean) ?? null;
  }
  return resolveInside(ROOT, pathname);
}

export function startServer(port: number, shouldRebuild: boolean): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      if (shouldRebuild && pathname === BUNDLE_PATH) await buildBundle();
      const path = resolvePath(pathname);
      return path ? new Response(Bun.file(path)) : new Response("Not found", { status: NOT_FOUND });
    },
  });
}

if (import.meta.main) {
  await buildBundle();
  const server = startServer(PREVIEW_PORT, true);
  process.stdout.write(`Preview: http://localhost:${server.port}/  (add ?t=12.5 to jump)\n`);
}
