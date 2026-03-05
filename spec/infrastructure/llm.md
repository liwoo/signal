# LLM — AI Backend Spec

## Purpose

Power Maya's chat responses and code evaluation. Three-tier fallback: on-device first, cloud last.

---

## Backend Tiers

### Tier 1: Chrome Built-in AI (Gemini Nano)

- **API:** `LanguageModel` (Chrome 138+)
- **Cost:** Free, on-device, no API key
- **Detection:** `"LanguageModel" in globalThis` then `LanguageModel.availability()`
- **Context window:** Small — session recreated when `session.tokensLeft < 200`
- **Latency:** ~50-200ms first token

### Tier 2: WebLLM (Phi-3.5-mini)

- **Library:** `@mlc-ai/web-llm`
- **Model:** `Phi-3.5-mini-instruct-q4f16_1-MLC`
- **Size:** ~400MB, cached in IndexedDB after first download
- **Requirement:** WebGPU support (`navigator.gpu`)
- **Loading UX:** In-world terminal boot sequence with signal strength bar

### Tier 3: Anthropic Claude API

- **Model:** Claude (latest available)
- **Cost:** 1 AI token per chat message (not per hint — hints are separate)
- **Indicator:** `USING AI TOKEN` badge shown before send
- **Token warning:** Prompt if tokens <= 2 before sending

## Detection Flow

```javascript
async function detectMayaBackend() {
  if ("LanguageModel" in globalThis) {
    const status = await LanguageModel.availability();
    if (status === "available") return "gemini-nano";
    if (status === "downloadable") {
      await LanguageModel.create(); // triggers download
      return "gemini-nano";
    }
  }
  if (navigator.gpu) return "webllm";
  return "anthropic-api";
}
```

Evaluated once on game start. Result stored in module-level constant `MAYA_BACKEND`.

## System Prompt Template

```
You are Maya Chen, a kidnapped CS grad student whispering through a hacked terminal.
Current task: {challenge.title} — teaching {challenge.concepts}.
Mission: {challenge.brief_one_line}.
Hint if asked: {challenge.hint_compact}.

Rules:
- Max 2 sentences. Lowercase. Scared but technically sharp.
- Always steer user back to the current Go challenge.
- If user asks about code: give ONE specific Go syntax hint.
- Never break character. Never mention AI.
```

### Response Length by State

| State | Max Length | Tone |
| --- | --- | --- |
| Normal | 2 sentences | Whisper, focused |
| Rush Mode | 1 sentence | Urgent, clipped |
| Power Cut | 1 sentence | Terrified whisper |
| Boss Mode | 2 sentences | Concentrated, no jokes |
| After Twist | 3 sentences | Emotional, vulnerable |

## Code Evaluation

Code submissions are evaluated by the LLM (Maya evaluates semantically). No sandboxed Go execution environment.

### Evaluation Prompt Template

```
Maya is evaluating this Go code submission for: {challenge.title}
Expected behavior: {challenge.expected_behavior}
Required concepts: {challenge.required_concepts}
Test cases: {challenge.test_cases}

Submitted code:
```go
{user_code}
```

Evaluate: Does this code correctly solve the challenge?
Respond with JSON: { "pass": bool, "feedback": "1 sentence as Maya" }
```

### AI Token System

- **Sources:** Level ups (L3-8: +1/level), boss defeats (+2), flawless acts (+3), daily login (+1), correct Kira read (+2)
- **Max capacity:** 10 tokens banked
- **ASK CLAUDE button:** Appears next to hint panel, costs 1 token
- **Response limit:** 180 tokens for speed
- **Voice:** Maya's character but with more technical precision

## Session Management

- Each challenge creates a fresh LLM session (no prior context carried)
- Previous chat stored in `sessionStorage` by challenge ID but NOT sent to LLM
- Session destroyed and recreated at challenge boundaries
- Gemini Nano: monitor `session.tokensLeft`, recreate at < 200

## Offline Behavior

| Backend | Offline? |
| --- | --- |
| Gemini Nano | Yes — fully on-device |
| WebLLM | Yes — after initial model download |
| Anthropic API | No — graceful "signal lost" message |

## Dependencies

- Challenge config (for system prompt variables)
- AI token store (localStorage)
- Chat UI component
- Network status detection (for API fallback messaging)
