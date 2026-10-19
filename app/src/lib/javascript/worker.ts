// ── JavaScript sandbox worker ──
// Runs one program per worker (see ./run.ts). The worker has no DOM, and we
// strip the network APIs before the player's code runs.

import { executeJs, type JsRunInput } from "./runtime";

const scope = self as unknown as Record<string, unknown> & {
  onmessage: ((e: MessageEvent<JsRunInput>) => void) | null;
  postMessage: (msg: unknown) => void;
};

for (const api of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"]) {
  try {
    Object.defineProperty(scope, api, { value: undefined, configurable: false, writable: false });
  } catch {
    // Some engines won't let us redefine a few of these — they're unreachable from the game anyway.
  }
}

scope.onmessage = (e) => {
  scope.postMessage(executeJs(e.data));
};
