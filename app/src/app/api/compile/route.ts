import { NextResponse } from "next/server";

const PLAYGROUND_URL = "https://go.dev/_/compile";
const TIMEOUT_MS = 10000;

export async function POST(request: Request) {
  const { source } = await request.json();

  if (!source || typeof source !== "string") {
    return NextResponse.json(
      { Errors: "missing source", Events: null },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(PLAYGROUND_URL, {
      method: "POST",
      body: new URLSearchParams({ version: "2", body: source, withVet: "true" }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { Errors: `playground returned ${res.status}`, Events: null },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "compile proxy error";
    return NextResponse.json(
      { Errors: msg, Events: null },
      { status: 502 }
    );
  }
}
