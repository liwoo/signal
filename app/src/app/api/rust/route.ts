import { NextResponse } from "next/server";

// Proxy to the Rust Playground (play.rust-lang.org) — keeps the browser on our
// own origin, like /api/compile does for the Go Playground.
const EXECUTE_URL = "https://play.rust-lang.org/execute";
const FORMAT_URL = "https://play.rust-lang.org/format";
const TIMEOUT_MS = 15000;
const MAX_SOURCE = 64 * 1024;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = body?.action === "format" ? "format" : "execute";
  const code = body?.code;

  if (!code || typeof code !== "string" || code.length > MAX_SOURCE) {
    return NextResponse.json({ success: false, stdout: "", stderr: "missing or oversized source" }, { status: 400 });
  }

  const payload =
    action === "format"
      ? { edition: "2021", code }
      : { channel: "stable", mode: "debug", edition: "2021", crateType: "bin", tests: false, backtrace: false, code };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(action === "format" ? FORMAT_URL : EXECUTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      // A runaway program (timeout, too much output) comes back as 500 + {"error"}:
      // pass it on as a failed run. Anything else is the Playground being down.
      const data = await res.json().catch(() => null);
      if (typeof data?.error === "string") {
        return NextResponse.json({ success: false, stdout: "", stderr: data.error, exitDetail: "playground error" });
      }
      return NextResponse.json({ success: false, stdout: "", stderr: `playground returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "rust proxy error";
    return NextResponse.json({ success: false, stdout: "", stderr: msg }, { status: 502 });
  }
}
