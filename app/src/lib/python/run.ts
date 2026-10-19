// ── Run Python (Pyodide) ──
// Browser: one long-lived module worker (public/pyodide-worker.mjs) loads
// Pyodide from the CDN once (~10 MB, cached by the browser) and runs each
// program; a runaway program gets the worker killed and a fresh one spun up.
// Tests: a Node backend registered with `setPythonBackend`.

import { PY_DRIVER, PYODIDE_INDEX_URL } from "./driver";

export interface PyFile {
  path: string;
  content: string;
}

export interface PyRunInput {
  main: string;
  harness?: string;
  files?: PyFile[];
}

export interface PyRunOutput {
  stdout: string;
  stderr: string;
  /** "" when clean, otherwise "file:line:col: Name: message". */
  error: string;
  /** True when Pyodide couldn't be loaded (no network on first run). */
  offline?: boolean;
}

export type PythonBackend = (input: PyRunInput) => Promise<PyRunOutput>;

export const PY_TIMEOUT_ERROR = "main.py:0:0: TimeoutError: your program ran for too long — is there a loop that never ends?";

const RUN_TIMEOUT_MS = 5000;
const LOAD_TIMEOUT_MS = 90_000;

let backend: PythonBackend | null = null;

/** Swap the execution backend (tests register a Node/Pyodide backend). */
export function setPythonBackend(next: PythonBackend | null): void {
  backend = next;
}

// ── Browser worker ──

interface Pending {
  resolve: (out: PyRunOutput) => void;
  timer: ReturnType<typeof setTimeout> | null;
  input: PyRunInput;
}

let worker: Worker | null = null;
let ready: Promise<boolean> | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function startWorker(): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise<boolean>((resolve) => {
    const w = new Worker("/pyodide-worker.mjs", { type: "module" });
    worker = w;
    const loadTimer = setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; id?: number; ok?: boolean; stdout?: string; stderr?: string; error?: string };
      if (msg.type === "ready") {
        clearTimeout(loadTimer);
        resolve(Boolean(msg.ok));
        return;
      }
      if (msg.type === "result" && msg.id !== undefined) {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (p.timer) clearTimeout(p.timer);
        p.resolve({ stdout: msg.stdout ?? "", stderr: msg.stderr ?? "", error: msg.error ?? "" });
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      clearTimeout(loadTimer);
      resolve(false);
    };
    w.postMessage({ type: "init", indexURL: PYODIDE_INDEX_URL, driver: PY_DRIVER });
  });
  // A failed load (offline) shouldn't stick forever — retry on the next run.
  ready.then((ok) => {
    if (!ok) resetWorker();
  });
  return ready;
}

function resetWorker() {
  worker?.terminate();
  worker = null;
  ready = null;
}

/** Start loading Pyodide early (e.g. while the intro plays) so the first run is fast. */
export function warmPython(): void {
  if (backend || typeof window === "undefined" || typeof Worker === "undefined") return;
  void startWorker();
}

async function runInWorker(input: PyRunInput): Promise<PyRunOutput> {
  const ok = await startWorker();
  if (!ok || !worker) return { stdout: "", stderr: "", error: "", offline: true };
  const w = worker;
  const id = nextId++;
  return new Promise<PyRunOutput>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      // Kill the stuck interpreter; the next run boots a fresh one.
      resetWorker();
      resolve({ stdout: "", stderr: "", error: PY_TIMEOUT_ERROR });
    }, RUN_TIMEOUT_MS);
    pending.set(id, { resolve, timer, input });
    w.postMessage({ type: "run", id, main: input.main, harness: input.harness ?? "", files: input.files ?? [] });
  });
}

export function runPython(input: PyRunInput): Promise<PyRunOutput> {
  if (backend) return backend(input);
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve({ stdout: "", stderr: "", error: "", offline: true });
  }
  return runInWorker(input);
}
