// ── Go Playground API Client ──
// Compiles and runs Go code via the public Go Playground API.
// Falls back gracefully when offline.

export interface CompileResult {
  success: boolean;
  errors: string;
  output: string;
  vetErrors: string;
}

const PLAYGROUND_URL = "https://go.dev/_/compile";
const TIMEOUT_MS = 8000;

export async function compileGo(source: string): Promise<CompileResult> {
  const body = new URLSearchParams({ version: "2", body: source, withVet: "true" });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(PLAYGROUND_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });
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
