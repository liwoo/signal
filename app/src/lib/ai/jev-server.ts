// ── Jev over HTTP (server only) ──
// Calls TypeSafe's `systemone` endpoint — directly, or through Vercel AI
// Gateway's TypeSafe-compatible API. The key never reaches the browser; the
// game talks to /api/jev, which builds every question itself.
//
// Env:
//   JEV_API_KEY        key for JEV_BASE_URL (defaults to the AI Gateway)
//   TYPESAFE_API_KEY   a TypeSafe key → https://api.typesafe.ai
//   AI_GATEWAY_API_KEY a Vercel AI Gateway key → https://ai-gateway.vercel.sh/typesafe
//   JEV_BASE_URL       override the base URL (`/v1/systemone` is appended)
//   JEV_MODEL          override the model id (defaults: jev-latest direct,
//                      typesafe-ai/jev via the gateway)

import type { JevAnswers, JevQuestion } from "./jev";

const GATEWAY_BASE = "https://ai-gateway.vercel.sh/typesafe";
const TYPESAFE_BASE = "https://api.typesafe.ai";
const GATEWAY_MODEL = "typesafe-ai/jev";
// TypeSafe requires a model; GET /v1/models lists jev-latest and jev-preview.
const TYPESAFE_MODEL = "jev-latest";

export interface JevConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

type Env = Record<string, string | undefined>;

export function jevConfig(env: Env = process.env): JevConfig | null {
  const trimmed = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  const jevKey = trimmed(env.JEV_API_KEY);
  const typesafeKey = trimmed(env.TYPESAFE_API_KEY);
  const gatewayKey = trimmed(env.AI_GATEWAY_API_KEY);
  const apiKey = jevKey ?? typesafeKey ?? gatewayKey;
  if (!apiKey) return null;

  const direct = !jevKey && !!typesafeKey;
  const baseUrl = (trimmed(env.JEV_BASE_URL) ?? (direct ? TYPESAFE_BASE : GATEWAY_BASE)).replace(/\/+$/, "");
  const model = trimmed(env.JEV_MODEL) ?? (baseUrl.includes("ai-gateway.vercel.sh") ? GATEWAY_MODEL : TYPESAFE_MODEL);
  return { apiKey, baseUrl, model };
}

export class JevError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "JevError";
  }
}

export async function callJev(
  config: JevConfig,
  state: unknown,
  questions: Record<string, JevQuestion>,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<JevAnswers> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`${config.baseUrl}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, state, questions }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 3500),
  });
  if (!res.ok) {
    let message = `jev ${res.status}`;
    try {
      const body = await res.json();
      // gateway: { message }; TypeSafe direct: { detail: { message } } or { detail: [{ msg }] }
      const detail = body?.detail;
      const text =
        body?.message ?? detail?.message ?? (Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg).join("; ") : undefined);
      if (typeof text === "string" && text) message = `jev ${res.status}: ${text}`;
    } catch {
      // non-JSON error body
    }
    throw new JevError(message, res.status);
  }
  const data = await res.json();
  if (!data || typeof data.answers !== "object" || data.answers === null) {
    throw new JevError("jev: response has no answers");
  }
  return data.answers as JevAnswers;
}
