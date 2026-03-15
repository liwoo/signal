// ── Go Playground API Client ──
// In browser: routes through /api/compile proxy (avoids CORS).
// In Node/tests: calls go.dev directly (no CORS in Node).

export interface CompileResult {
  success: boolean;
  errors: string;
  output: string;
  vetErrors: string;
}

const DIRECT_URL = "https://go.dev/_/compile";
const PROXY_URL = "/api/compile";
const FMT_DIRECT_URL = "https://go.dev/_/fmt";
const FMT_PROXY_URL = "/api/fmt";
const TIMEOUT_MS = 10000;

const isBrowser = typeof window !== "undefined";

export async function compileGo(source: string): Promise<CompileResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    if (isBrowser) {
      // Browser: use server-side proxy to avoid CORS
      res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
        signal: controller.signal,
      });
    } else {
      // Node.js (tests): call Go Playground directly
      res = await fetch(DIRECT_URL, {
        method: "POST",
        body: new URLSearchParams({ version: "2", body: source, withVet: "true" }),
        signal: controller.signal,
      });
    }
    clearTimeout(timer);

    if (!res.ok) {
      return { success: false, errors: `playground returned ${res.status}`, output: "", vetErrors: "" };
    }

    const data = await res.json();
    const errors: string = data.Errors || "";
    const vetErrors: string = data.VetErrors || "";
    const output = (data.Events || [])
      .filter((e: { Kind: string }) => e.Kind === "stdout")
      .map((e: { Message: string }) => e.Message)
      .join("");

    return {
      success: errors === "",
      errors,
      output,
      vetErrors,
    };
  } catch {
    return { success: false, errors: "__OFFLINE__", output: "", vetErrors: "" };
  }
}

export interface FormatResult {
  success: boolean;
  body: string;
  error: string;
}

export async function formatGo(source: string): Promise<FormatResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    if (isBrowser) {
      res = await fetch(FMT_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
        signal: controller.signal,
      });
    } else {
      res = await fetch(FMT_DIRECT_URL, {
        method: "POST",
        body: new URLSearchParams({ body: source }),
        signal: controller.signal,
      });
    }
    clearTimeout(timer);

    if (!res.ok) {
      return { success: false, body: source, error: `playground returned ${res.status}` };
    }

    const data = await res.json();
    if (data.Error) {
      return { success: false, body: source, error: data.Error };
    }

    return { success: true, body: data.Body || source, error: "" };
  } catch {
    return { success: false, body: source, error: "offline" };
  }
}
