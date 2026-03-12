---
name: zen-rules
description: How to write zen rules for new SIGNAL levels — idiomatic Go detection, jolts, suggestions, testing
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Writing Zen Rules for New Levels

Zen rules live in `src/lib/game/zen.ts`. They detect idiomatic Go patterns in player code, award bonus XP, and trigger Maya's "memory jolt" narrative. Every new challenge step needs corresponding zen rules.

## The ZenRule Interface

```typescript
interface ZenRule {
  id: string;              // snake_case, unique across all rules
  principle: string;       // short label, e.g. "grouped imports"
  check: (code: string) => boolean;  // heuristic — regex or string ops
  isRelevant?: (code: string) => boolean;  // skip rule if irrelevant to player's code
  bonusXP: number;         // 5-15 per rule
  jolt: string;            // Maya's memory returning (player followed the rule)
  suggestion: string;      // Maya's hint (player didn't follow the rule)
  getSuggestion?: (code: string) => string;  // context-aware suggestion (overrides static suggestion)
}
```

## Step-by-Step Process

1. **Read the step spec** — identify which Go concepts the step teaches.
2. **Pick 2-4 idioms** from Zen of Go or Effective Go that apply to those concepts.
3. **Write one ZenRule per idiom** — never bundle multiple checks into one rule.
4. **Register in `STEP_ZEN_RULES`** — key is the step ID (e.g. `"chapter-04:errors"`).
5. **Write tests** — add a describe block in `zen.test.ts` for the new step.

## Writing Check Functions

Checks are heuristic — regex and string ops only. No AST parsing.

```typescript
// GOOD — simple, targeted regex
check: (code) => /fmt\.Printf/.test(code) && /%[sdvf]/.test(code),

// GOOD — line-by-line analysis for structural patterns
check: (code) => {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*package\s/.test(lines[i])) {
      return i + 1 < lines.length && lines[i + 1].trim() === "";
    }
  }
  return false;
},

// GOOD — scoped to a specific function body
check: (code) => {
  const funcBody = code.match(/func\s+sumCodes[^{]*\{([\s\S]*?)\n\}/);
  if (!funcBody) return false;
  return !funcBody[1].includes("fmt.");
},

// BAD — too broad, false positives on string literals
check: (code) => code.includes("const"),

// BAD — bundles two independent checks (all-or-nothing)
check: (code) => hasBlankAfterPackage(code) && hasBlankAfterImport(code),
```

### Key Principles

- **One check per concept.** If a player gets one thing right but not another, they should get partial credit and a specific suggestion for what they missed.
- **Avoid matching string literals.** Use declaration patterns (`/(?:const|var|:=)\s*(\w+)/`) not raw includes.
- **Scope to function bodies** when the idiom only applies inside a specific function (e.g. "sumCodes should not print").
- **Test against the starter code.** Make sure the check returns `false` for the unmodified starter code (including any `// TODO` comments).

## Writing Jolts (Memory Returning)

Jolts fire when the player **follows** the rule. They are Maya remembering something about Go.

### Requirements

- **Affirm what the player did.** Start by naming the pattern they used.
- **Connect to Go philosophy.** Reference Zen of Go, Effective Go, or Go proverbs.
- **Reference Maya's past.** Her thesis, her professor/advisor, her encryption library, her lab.
- **Lowercase only.** No caps except in code backticks.
- **No exclamation marks.** Maya is recovering, not celebrating.
- **Use `\n\n` for paragraph breaks.** Messages are rendered in a chat bubble.

```typescript
// GOOD jolt
jolt: "...wait. i remember something.\n\nyou grouped the import with parentheses — `import ( ... )`. that's how go does it. even with one import. when you add more later, the diff stays clean.\n\nmy professor called it... \"plan for the code that comes after yours.\""

// BAD jolt — doesn't affirm, too generic
jolt: "imports are important in go. you should always think about how to organize them."

// BAD jolt — uses caps and exclamation
jolt: "Great job! You used Printf correctly!"
```

### Jolt Structure Pattern

1. **Memory trigger** — `"...wait."`, `"...the fog is lifting."`, `"...fragments coming back."`
2. **Name what they did** — reference the specific code pattern with backticks
3. **Explain why it matters** — connect to Go design philosophy
4. **Maya's memory** — her advisor, thesis, encryption library, or lab work

## Writing Suggestions (Improvement Hints)

Suggestions fire when the player **doesn't follow** the rule. They nudge toward the idiom.

### Requirements

- **Start with an actionable verb.** "try", "use", "add", "remove", "call" — not "your code could..."
- **Include a code example.** Always show the concrete syntax in backticks.
- **Be specific.** Name the exact construct, not a vague principle.
- **One suggestion per rule.** Don't list alternatives.

```typescript
// GOOD suggestion
suggestion: "try grouping your import: `import ( \"fmt\" )` — parentheses. even for one. it's the go way... i think i remember that much."

// GOOD suggestion
suggestion: "use `i++` — it's the go way. not `i += 1`, not `i = i + 1`. one operation, one form. simplicity matters."

// BAD suggestion — no code example
suggestion: "you should think about how go handles increments."

// BAD suggestion — doesn't start with action verb
suggestion: "your increment could be more idiomatic."
```

## Context-Aware Suggestions (`getSuggestion`)

Static `suggestion` strings can mislead players. If a player declared `const cell = "B-09"` but didn't reference it in their print call, the suggestion "try declaring named values" is confusing — they already did. Use `getSuggestion` to inspect the player's code and return the right message.

```typescript
// BAD — static suggestion that assumes the player did nothing
suggestion: "try declaring named values — `cell := \"B-09\"` instead of hardcoding."

// GOOD — context-aware, diagnoses what's actually wrong
getSuggestion: (code) => {
  const decls = collectDeclarations(code);
  if (decls.length > 0) {
    return "you declared variables — now use them in your print call. the whole point of a name is to use it.";
  }
  return "try declaring named values — `cell := \"B-09\"` instead of hardcoding.";
},
```

### When to use `getSuggestion`

- The rule has **multiple failure modes** (didn't declare vs. declared-but-unused)
- The static suggestion would **contradict what the player already did**
- The rule checks a **compound condition** (A AND B) where the player might have A but not B

When `getSuggestion` is defined, `analyzeZen` uses it instead of the static `suggestion`. The static `suggestion` field is still required (used as fallback in library recording and content quality tests).

## XP Budget

- **Per rule:** 2-15 XP. Simple formatting rules (blank lines) get 2-5. Idiomatic patterns (switch over if-else, direct bool return) get 10-15.
- **Per step total:** aim for 15-35 max zen XP. Zen is a bonus, not the main reward.
- **Balance with base XP:** if base step XP is 40, zen shouldn't exceed ~25 (roughly 50-60% of base).

## Registering Rules

Add to the `STEP_ZEN_RULES` record in `zen.ts`:

```typescript
const STEP_ZEN_RULES: Record<string, ZenRule[]> = {
  // existing...
  "chapter-04:errors": [errorsReturned, wrapErrors, checkErrImmediately],
};
```

## Testing Pattern

Every step's zen rules need tests in `zen.test.ts`. Follow this structure:

```typescript
describe("chapter-04:errors", () => {
  const stepId = "chapter-04:errors";

  // Test each rule independently with minimal code
  test("errorsReturned — detects error return", () => {
    const code = `func divide(a, b int) (int, error) {\n  if b == 0 { return 0, fmt.Errorf("divide by zero") }\n  return a / b, nil\n}`;
    const result = analyzeZen(stepId, code);
    expect(result.jolts.length).toBeGreaterThanOrEqual(1);
  });

  // Test that starter code doesn't trigger rules
  test("starter code triggers no rules", () => {
    const starter = `package main\n\nimport "fmt"\n\n// TODO: implement divide`;
    const result = analyzeZen(stepId, starter);
    expect(result.bonusXP).toBe(0);
  });

  // Test partial credit
  test("following some rules gives partial XP", () => {
    // code that follows errorsReturned but not wrapErrors
    const result = analyzeZen(stepId, partialCode);
    expect(result.bonusXP).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
```

### Content Quality Tests

The test file includes cross-cutting content quality checks for ALL rules:

```typescript
test("jolts affirm what the player did (not suggest)", () => {
  // jolts should NOT start with "try", "use", "add" etc.
});

test("suggestions contain actionable advice", () => {
  // suggestions MUST start with action verbs or transitional patterns like "but", "instead"
});

test("suggestions contain code examples", () => {
  // every suggestion must include backtick-wrapped code
});
```

New rules must pass these tests. Run `npx vitest zen` to verify.

## Source Material

Base all rules on established Go idioms:

- **Zen of Go:** https://dave.cheney.net/2020/02/23/the-zen-of-go
- **Effective Go:** https://go.dev/doc/effective_go
- **Go Proverbs:** https://go-proverbs.github.io/
- **Go Code Review Comments:** https://go.dev/wiki/CodeReviewComments

## Common Mistakes

- **All-or-nothing rules.** Never bundle two checks. If a player adds blank line after package but not after import, they should get credit for the first and a suggestion for the second.
- **Vague suggestions.** "think about formatting" teaches nothing. Show the code.
- **Jolts that suggest instead of affirm.** A jolt means the player did it right. Don't say "you should" — say "you did".
- **Matching inside string literals.** `code.includes("const")` matches `fmt.Println("constant value")`. Use declaration patterns.
- **Forgetting starter code comments.** Starter code often has `// TODO` lines. Make sure your regex doesn't false-positive on those.
- **XP too high.** Zen is bonus flavor. If zen XP rivals base XP, the balance is wrong.
- **`buildZenMessage` behavior.** It shows ALL jolts (every good practice acknowledged) but only ONE suggestion (focused improvement). Don't assume only one jolt is shown.
