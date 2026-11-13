import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/jev", { method: "POST", body: JSON.stringify(body) }));
}

describe("/api/jev", () => {
  const env = { ...process.env };
  let upstream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    process.env.JEV_API_KEY = "test-key";
    upstream = vi.fn(async (_url: string, init: RequestInit) => {
      const { questions } = JSON.parse(String(init.body));
      const answers: Record<string, unknown> = {};
      for (const [key, q] of Object.entries(questions as Record<string, { type: string; criteria?: Record<string, string> }>)) {
        if (q.type === "noul") answers[key] = { type: "noul", noul: 0.9 };
        if (q.type === "choice") {
          const first = key === "intent" ? "concept" : Object.keys(q.criteria!)[0];
          answers[key] = { type: "choice", choice: first, confidence: 0.85 };
        }
        if (q.type === "score") answers[key] = { type: "score", score: 1 };
      }
      return new Response(JSON.stringify({ answers }), { status: 200 });
    });
    vi.stubGlobal("fetch", upstream);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  test("GET reports whether a key is configured", async () => {
    expect(await (await GET()).json()).toEqual({ enabled: true });
    delete process.env.JEV_API_KEY;
    expect(await (await GET()).json()).toEqual({ enabled: false });
  });

  test("POST without a key is 503", async () => {
    delete process.env.JEV_API_KEY;
    expect((await post({ task: "zen", stepId: "chapter-02:classify", language: "go", code: "x" })).status).toBe(503);
  });

  test("zen: judges only the step's semantic rules", async () => {
    const res = await post({ task: "zen", stepId: "chapter-02:classify", language: "go", code: "package main" });
    expect(res.status).toBe(200);
    const { verdicts } = await res.json();
    expect(Object.keys(verdicts).sort()).toEqual(["no_unnecessary_break", "switch_over_ifelse", "use_constants_labels"]);
    expect(verdicts.switch_over_ifelse).toEqual({ follows: 0.9, relevant: 0.9 });
    const [url] = upstream.mock.calls[0];
    expect(url).toBe("https://ai-gateway.vercel.sh/typesafe/v1/systemone");
  });

  test("help: returns a decision with the authored answer resolved", async () => {
    const res = await post({
      task: "help",
      stepId: "chapter-01:scaffold",
      language: "python",
      code: "",
      message: "how do i print stuff",
      attempts: 1,
    });
    const { decision } = await res.json();
    expect(decision.intent).toBe("concept");
    expect(typeof decision.topicAnswer).toBe("string");
  });

  test("rejects steps outside Act I and oversized input", async () => {
    expect((await post({ task: "zen", stepId: "chapter-04:guardmap", language: "go", code: "x" })).status).toBe(400);
    expect((await post({ task: "zen", stepId: "chapter-02:loop", language: "cobol", code: "x" })).status).toBe(400);
    expect((await post({ task: "zen", stepId: "chapter-02:loop", language: "go", code: "x".repeat(7000) })).status).toBe(413);
    expect(
      (await post({ task: "help", stepId: "chapter-02:loop", language: "go", code: "", message: "y".repeat(600) })).status
    ).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("upstream failure is a 502, not a crash", async () => {
    upstream.mockImplementationOnce(async () => new Response("nope", { status: 500 }));
    expect((await post({ task: "zen", stepId: "chapter-02:classify", language: "go", code: "x" })).status).toBe(502);
  });
});
