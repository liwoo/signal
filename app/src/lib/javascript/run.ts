// ── Run JavaScript ──
// Browser: a fresh Web Worker per run, terminated after a hard timeout so an
// infinite loop can't freeze the game. Node (tests): run in-process.

import { executeJs, type JsRunInput, type JsRunOutput } from "./runtime";

const TIMEOUT_MS = 4000;

export const TIMEOUT_ERROR = "main.js:0:0: RangeError: your program ran for too long — is there a loop that never ends?";

export function runJavaScript(input: JsRunInput): Promise<JsRunOutput> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve(executeJs(input));
  }
  return new Promise((resolve) => {
    let settled = false;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const finish = (out: JsRunOutput) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(out);
    };
    const timer = setTimeout(() => finish({ stdout: "", stderr: "", error: TIMEOUT_ERROR }), TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<JsRunOutput>) => finish(e.data);
    worker.onerror = (e) => {
      e.preventDefault();
      // If the worker itself can't start, run in-process rather than strand the player.
      if (!settled) finish(executeJs(input));
    };
    worker.postMessage(input);
  });
}
