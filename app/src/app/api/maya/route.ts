import { NextResponse } from "next/server";

// Ollama: free, local, no API key needed
// Anthropic: cloud fallback if ANTHROPIC_API_KEY is set
// Set LLM_BACKEND=anthropic in .env.local to force Anthropic

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

async function callOllama(
  system: string,
  messages: Array<{ role: string; content: string }>
) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      stream: false,
      options: { num_predict: 180, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} — is Ollama running?`);
  }

  const data = await res.json();
  return data.message?.content ?? "...";
}

async function callAnthropic(
  system: string,
  messages: Array<{ role: string; content: string }>
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 180,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic error: ${error}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "...";
}

export async function POST(request: Request) {
  const { system, messages } = await request.json();
  const backend = process.env.LLM_BACKEND ?? "ollama";

  try {
    let reply: string;

    if (backend === "anthropic") {
      reply = await callAnthropic(system, messages);
    } else {
      // Default: try Ollama, fall back to Anthropic if available
      try {
        reply = await callOllama(system, messages);
      } catch (ollamaErr) {
        if (process.env.ANTHROPIC_API_KEY) {
          reply = await callAnthropic(system, messages);
        } else {
          throw ollamaErr;
        }
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
