// ── Python backend for tests (Node + the pyodide npm package) ──
// Never imported by the app — tests call `usePyodideInNode()` so golden tests
// run real CPython (WASM) instead of a mock.

import { PY_DRIVER } from "./driver";
import { setPythonBackend, type PyRunInput, type PyRunOutput } from "./run";

type Runner = (main: string, harness: string, files: string) => string;

let runnerPromise: Promise<Runner> | null = null;

async function loadRunner(): Promise<Runner> {
  const { loadPyodide } = await import("pyodide");
  const pyodide = await loadPyodide();
  pyodide.runPython(PY_DRIVER);
  return pyodide.globals.get("__signal_run") as Runner;
}

export function usePyodideInNode(): void {
  setPythonBackend(async (input: PyRunInput): Promise<PyRunOutput> => {
    runnerPromise ??= loadRunner();
    const run = await runnerPromise;
    const out = JSON.parse(run(input.main, input.harness ?? "", JSON.stringify(input.files ?? [])));
    return { stdout: out.stdout, stderr: out.stderr, error: out.error };
  });
}
