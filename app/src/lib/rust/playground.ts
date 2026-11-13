// ── Rust Playground client ──
// Rust compiles remotely on the official Rust Playground (play.rust-lang.org),
// like Go compiles on go.dev. In the browser every call goes through the
// /api/rust proxy; Node (tests) can call it directly — or, faster and offline,
// swap in a local `rustc` with `setRustBackend` (see node-backend.ts).

import type { FormatResult } from "@/lib/lang/types";

export interface RustExecution {
  success: boolean;
  stdout: string;
  stderr: string;
  /** e.g. "Exited with status 101", "Exited with signal 9". */
  exitDetail: string;
}

export type RustBackend = (source: string) => Promise<RustExecution>;

export const PLAYGROUND_EXECUTE_URL = "https://play.rust-lang.org/execute";
export const PLAYGROUND_FORMAT_URL = "https://play.rust-lang.org/format";
const PROXY_URL = "/api/rust";
const TIMEOUT_MS = 15000;

const isBrowser = typeof window !== "undefined";

/** The request body the Playground's /execute endpoint expects. */
export function executeBody(code: string) {
  return {
    channel: "stable",
    mode: "debug",
    edition: "2021",
    crateType: "bin",
    tests: false,
    backtrace: false,
    code,
  };
}

async function post(action: "execute" | "format", payload: object): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = isBrowser
      ? await fetch(PROXY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
          signal: controller.signal,
        })
      : await fetch(action === "execute" ? PLAYGROUND_EXECUTE_URL : PLAYGROUND_FORMAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
    if (!res.ok) {
      // The Playground answers a runaway program (timeout, too much output)
      // with a 500 and {"error": "..."} — that's the program's fault, not a
      // network problem, so report it as a failed run rather than "offline".
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (typeof data?.error === "string") return { success: false, stdout: "", stderr: data.error, exitDetail: "playground error" };
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const playgroundBackend: RustBackend = async (source) => {
  const data = await post("execute", executeBody(source));
  if (!data) throw new Error("offline");
  return {
    success: Boolean(data.success),
    stdout: String(data.stdout ?? ""),
    stderr: String(data.stderr ?? ""),
    exitDetail: String(data.exitDetail ?? ""),
  };
};

let backend: RustBackend = playgroundBackend;

/** Swap the compiler (tests use a local rustc). */
export function setRustBackend(next: RustBackend | null): void {
  backend = next ?? playgroundBackend;
}

/** Compile and run. Resolves null when the compiler can't be reached (offline). */
export async function executeRust(source: string): Promise<RustExecution | null> {
  try {
    return await backend(source);
  } catch {
    return null;
  }
}

/** rustfmt via the Playground — Cmd/Ctrl+S in the editor. */
export async function formatRust(source: string): Promise<FormatResult> {
  const data = await post("format", { edition: "2021", code: source });
  if (!data) return { success: false, body: source, error: "formatter unreachable" };
  if (!data.success) return { success: false, body: source, error: String(data.stderr ?? "rustfmt failed") };
  return { success: true, body: String(data.code ?? source), error: "" };
}
