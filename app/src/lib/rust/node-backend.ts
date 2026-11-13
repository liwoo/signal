// ── Rust backend for tests (Node + a local rustc) ──
// Never imported by the app. Tests call `installLocalRustc()` so golden tests
// compile real Rust offline instead of hitting the Playground. Returns false
// when no toolchain is installed — callers skip.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setRustBackend, type RustExecution } from "./playground";

export function hasLocalRustc(): boolean {
  try {
    execFileSync("rustc", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Compile + run one main.rs the way the Playground does (edition 2021, debug). */
export function runWithLocalRustc(source: string): RustExecution {
  const dir = mkdtempSync(join(tmpdir(), "signal-rs-"));
  try {
    const main = join(dir, "main.rs");
    const bin = join(dir, "main");
    writeFileSync(main, source);
    const build = spawnSync("rustc", ["--edition", "2021", "-o", "main", "main.rs"], { encoding: "utf8", cwd: dir });
    // Report paths like the Playground does so line parsing is identical.
    const stderr = (build.stderr ?? "").replace(/(-->\s*|panicked at )main\.rs/g, "$1src/main.rs");
    if (build.status !== 0) return { success: false, stdout: "", stderr, exitDetail: `Exited with status ${build.status}` };
    const run = spawnSync(bin, [], { encoding: "utf8", timeout: 4000, cwd: dir });
    const runErr = (run.stderr ?? "").replace(/panicked at main\.rs/g, "panicked at src/main.rs");
    if (run.error || run.signal) return { success: false, stdout: run.stdout ?? "", stderr: `${stderr}${runErr}`, exitDetail: "Exited with signal 9" };
    return {
      success: run.status === 0,
      stdout: run.stdout ?? "",
      stderr: `${stderr}${runErr}`,
      exitDetail: `Exited with status ${run.status}`,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function installLocalRustc(): boolean {
  if (!hasLocalRustc()) return false;
  setRustBackend(async (source) => runWithLocalRustc(source));
  return true;
}
