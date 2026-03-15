import { NextResponse } from "next/server";

const PLAYGROUND_URL = "https://go.dev/_/fmt";
const TIMEOUT_MS = 5000;

export async function POST(request: Request) {
  const { source } = await request.json();

  if (!source || typeof source !== "string") {
    return NextResponse.json({ Error: "missing source", Body: "" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(PLAYGROUND_URL, {
      method: "POST",
      body: new URLSearchParams({ body: source }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { Error: `playground returned ${res.status}`, Body: "" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fmt proxy error";
    return NextResponse.json({ Error: msg, Body: "" }, { status: 502 });
  }
}
