---
name: maya-prompt
description: How to write and tune AI system prompts for Maya's 3-tier LLM backend
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Writing AI Prompts for SIGNAL

## How the AI Works

Maya's responses come from one of three backends, detected at runtime by `src/lib/ai/detect.ts`:

1. **Gemini Nano** — Chrome's built-in AI. Fastest, smallest context. Limited persona fidelity.
2. **WebLLM** (Phi-3.5-mini) — Runs on WebGPU. Medium context. Good format-following.
3. **Anthropic API** (Claude) — Full capability. Best persona adherence. Requires network.

**The same prompt logic must work across all three.** Write for the weakest model first (Nano), then add richness for stronger backends.

## The `||COMPLETE||` Token

This is the single most important thing in the prompt system. When Maya's response contains `||COMPLETE||`, the game engine treats the submission as correct and awards XP. If this token is missing, the submission is treated as wrong.

```
CORRECT response: "oh thank god. the output matches. we're through. ||COMPLETE||"
WRONG response:   "that looks right! well done!" (no token = game thinks it failed)
```

**Every code evaluation instruction must include the `||COMPLETE||` rule.** If you're editing prompts and you accidentally remove it, the game breaks.

## Step-Keyed Engine (`src/lib/ai/engine.ts`)

Before a message reaches any LLM, it goes through the **local engine** — a deterministic response system keyed by step ID. Each step has its own bank of intro messages, FAQ patterns (keyword-matched), and code evaluation patterns.

```typescript
// Engine banks are keyed by step ID
const banks: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01ScaffoldBank,
  "chapter-01:transmit": ch01TransmitBank,
  // ...
};
```

The engine handles ~80% of interactions without LLM calls. It falls through to the LLM only when no pattern matches.

**When adding a new challenge step**, you must also add a corresponding `StepBank` in `engine.ts` with:
- `intro` — first message when the step loads
- `faq` — keyword-matched responses for common questions (ordered by specificity — more specific patterns first)
- `code` — code evaluation patterns that check for expected constructs and return appropriate responses

## Prompt Structure

System prompts are built dynamically per-challenge and per-step. The builder lives in `src/lib/ai/prompts.ts`.

### Required Sections (in order)

1. **Identity** — Who Maya is. One sentence.
2. **Context** — Location, challenge title, concepts, current step title and brief. Dynamic per challenge and step.
3. **Voice rules** — Lowercase, short, scared, no formatting. This section is critical for smaller models that tend to revert to helpful-assistant mode.
4. **State modifiers** — Conditional blocks for rush mode, power cut, low energy. Only include the active ones.
5. **Code evaluation rules** — How to judge `[CODE]` blocks. Must include the `||COMPLETE||` token rule.
6. **Chat rules** — How to respond to non-code messages. 1-2 sentences, stay in character.

### Token Budgets

Keep prompts lean. Every token adds latency, especially on-device.

| Backend | Max system prompt | Max response |
|---|---|---|
| Gemini Nano | ~500 tokens | ~100 tokens |
| WebLLM | ~800 tokens | ~150 tokens |
| Anthropic API | ~1200 tokens | ~180 tokens |

## State Modifiers

The prompt changes based on game state. These are conditional — only include the active ones:

- **Rush mode**: Switch urgency to max. "Max 1 sentence. Use 'hurry', 'go', 'now'."
- **Power cut**: "PITCH BLACK. Whispering. Max 1 sentence."
- **Low energy** (critical/dead state): "You're exhausted. Responses are shorter, more strained."
- **Boss encounter**: "High stakes. Reference the antagonist by name."
- **First try**: Don't mention this — no special handling.

## Common Mistakes

- **Being too helpful.** Maya is a scared captive, not a Go tutorial. She shouldn't say "try using a for loop" — she should say "the loop... it's not iterating. check the range."
- **Breaking character for technical accuracy.** If the trade-off is between a technically precise explanation and staying in character, stay in character. The hints system handles structured help.
- **Prompt too long for Nano.** Test your prompt at 500 tokens. If it doesn't fit, cut the least important state modifier — not the code evaluation rules.
- **Forgetting to handle [CODE] prefix.** Player code submissions are prefixed with `[CODE]\n`. The prompt must tell Maya to evaluate these differently from chat messages.

## Testing Prompts

1. **Manually test with all 3 backends** if possible. Nano will be the weakest link.
2. **Test with wrong code** — Maya should give a hint without solving it.
3. **Test with correct code** — response must contain `||COMPLETE||`.
4. **Test chat messages** — Maya should respond in character, not evaluate non-code text as code.
5. **Test in rush mode** — responses must be shorter and more urgent.

## Maya's Memory Jolts (Go Zen)

After each successful submission, the zen system (`src/lib/game/zen.ts`) analyzes the code and delivers a "memory jolt" — Maya recovering her CS knowledge. This is a separate system from the LLM prompts; it fires deterministically based on code heuristics.

**Narrative voice for jolts:**
- Start with a physical sensation: `"...wait. something just... clicked."` or `"the fog is lifting."`
- Then the Go insight — confident, lucid, referencing her thesis/professor/research
- Tie it back to a Zen of Go or Effective Go principle
- End with a connection to the escape story

**When writing jolt text:**
- Maya goes from confused → suddenly articulate about this specific Go concept
- She references her "thesis," "professor," "advisor," "encryption library," "lab notes"
- The deeper the Go insight, the more XP bonus
- Keep jolts to 3-5 sentences max — they interrupt gameplay flow

**When writing suggestion text (code didn't follow the rule):**
- Frame as memory trying but failing to return: `"something's trying to come back..."`
- Give the improvement hint in Maya's voice, not as a tutorial
- No more than 2 sentences

## Key Functions

- `buildMayaSystemPrompt({ challenge, step, inRush, powerCut, energyState })` — builds the system prompt. Takes both `Challenge` and `ChallengeStep` so it can reference step-specific brief and title.
- `callMaya(history, challenge, step, userMessage, isCode, inRush, powerCut, energyState)` — main entry point. Routes to Gemini Nano or server API.
- `callMayaEngine(stepId, userMessage, isCode, turnIndex, inRush)` — local engine. Returns a response or `null` (fall through to LLM).

## Reference

The prototype's prompt builder is in `inspo/inspo.jsx` lines 188-211 (`sysPrompt` function). It's simple but effective — don't over-engineer beyond what it does unless there's a clear need.
