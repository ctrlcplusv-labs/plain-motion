import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Pending = {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
};

type Message = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message: string };
};

export type Page = {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  evaluate: (expression: string) => Promise<unknown>;
  close: () => void;
};

const DEFAULT_CHROME_PATHS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};
const DEVTOOLS_PATTERN = /DevTools listening on (ws:\/\/\S+)/;
const CHROME_FLAGS = [
  "--headless=new",
  "--remote-debugging-port=0",
  "--hide-scrollbars",
  "--mute-audio",
  "--force-device-scale-factor=1",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--autoplay-policy=no-user-gesture-required",
  "--window-size=1920,1080",
];

function resolveChromePath(): string {
  const path = process.env.CHROME_PATH ?? DEFAULT_CHROME_PATHS[process.platform];
  if (!path || !existsSync(path)) {
    throw new Error("Chrome not found. Set CHROME_PATH to your Chrome or Chromium executable.");
  }
  return path;
}

async function readDevtoolsUrl(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let output = "";
  for await (const chunk of stream) {
    output += decoder.decode(chunk);
    const match = DEVTOOLS_PATTERN.exec(output);
    if (match?.[1]) return match[1];
  }
  throw new Error(`Chrome exited before exposing DevTools:\n${output}`);
}

export async function openPage(width: number, height: number): Promise<Page> {
  const profile = mkdtempSync(join(tmpdir(), "launch-film-"));
  const chrome = Bun.spawn([resolveChromePath(), ...CHROME_FLAGS, `--user-data-dir=${profile}`, "about:blank"], { stderr: "pipe" });
  const socket = new WebSocket(await readDevtoolsUrl(chrome.stderr));
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const pending = new Map<number, Pending>();
  let nextId = 1;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as Message;
    if (message.id === undefined) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter?.reject(new Error(message.error.message));
    else waiter?.resolve(message.result ?? {});
  });

  const call = (method: string, params: Record<string, unknown> = {}, sessionId?: string) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const { targetId } = await call("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await call("Target.attachToTarget", { targetId, flatten: true });
  const send = (method: string, params: Record<string, unknown> = {}) => call(method, params, String(sessionId));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  return {
    send,
    async evaluate(expression) {
      const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      const details = response.exceptionDetails as { exception?: { description?: string }; text?: string } | undefined;
      if (details) throw new Error(details.exception?.description ?? details.text ?? "Evaluation failed");
      return (response.result as { value?: unknown } | undefined)?.value;
    },
    close() {
      socket.close();
      chrome.kill();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
