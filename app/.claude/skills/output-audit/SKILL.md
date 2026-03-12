---
name: output-audit
description: Audit engine output patterns for common Go pitfalls — ensures every step has targeted feedback for Printf/Println, whitespace, format mismatches, and other gotchas
allowed-tools: Read, Edit, Grep, Glob, Bash
---

# Output Pattern Audit for SIGNAL Levels

Every step bank in `src/lib/ai/engine.ts` needs output patterns that catch common Go output mistakes and give targeted, actionable feedback. Without these, players get vague "output doesn't match" messages and drop off.

## When to Run This Audit

- After creating a new chapter or step bank
- After a player reports confusing error feedback
- As a final check before shipping any level

## The Evaluation Pipeline

Understanding the order is critical — the engine returns the **first match**:

1. **Exact output match** — `compiled.output.trim() === expectedOutput.trim()` → `||COMPLETE||`
2. **Output patterns** — first matching `OutputPattern` wins → targeted feedback
3. **Code patterns** — first matching `CodePattern` wins → structural feedback (also used offline)
4. **Generic wrong** — random pick from `genericWrong[]` → last resort

Output patterns are checked **before** code patterns. Order within `outputPatterns` matters — most specific first.

## Required Output Pattern Checklist

Every step that expects multi-line output MUST have patterns for these common Go pitfalls:

### 1. Printf Without Newline

`fmt.Printf("%d DENY", i)` produces `1 DENY2 DENY3 DENY...` — all on one line.

**Detection:** output contains expected keywords but on fewer lines than expected.

```typescript
{
  match: (output) => {
    const lines = output.trim().split("\n").filter(Boolean);
    const lower = output.toLowerCase();
    // Expected 10 lines but got < 5, and content is there
    return lines.length < expectedLineCount / 2 && lower.includes("expected_keyword") && output.trim().length > 30;
  },
  response:
    "your output is all on one line. `Printf` doesn't add a newline — `Println` does. use `fmt.Println(...)` or add `\\n`: `fmt.Printf(\"...\\n\", ...)`.",
},
```

### 2. Extra Whitespace / Wrong Separator

`fmt.Println(i, " DENY")` produces `1  DENY` (double space). `fmt.Printf("%d\tDENY", i)` produces tabs.

**Detection:** output has right content but whitespace doesn't match.

```typescript
{
  match: (output) => {
    // Normalize whitespace and compare
    const normalized = output.replace(/[ \t]+/g, " ").trim();
    return normalized === expectedNormalized && output.trim() !== expectedOutput.trim();
  },
  response:
    "almost — the content is right but the spacing is off. use `fmt.Println(i, \"DENY\")` which puts exactly one space between arguments.",
},
```

### 3. Trailing/Leading Whitespace Per Line

Player adds extra spaces or tabs around values.

**Detection:** line-by-line trim matches but raw doesn't.

```typescript
{
  match: (output) => {
    const actual = output.trim().split("\n").map(l => l.trim()).join("\n");
    return actual === expectedOutput.trim() && output.trim() !== expectedOutput.trim();
  },
  response:
    "the values are right but there's extra whitespace on some lines. check for extra spaces in your format string.",
},
```

### 4. Wrong Line Count (Missing/Extra Lines)

Player prints a header, footer, or blank lines.

**Detection:** content overlaps expected but line count differs.

```typescript
{
  match: (output) => {
    const lines = output.trim().split("\n").filter(Boolean);
    return lines.length !== expectedLineCount && lines.some(l => expectedOutput.includes(l.trim()));
  },
  response:
    "you have the right idea but wrong number of lines. expected exactly N lines — no headers, no blank lines.",
},
```

### 5. Correct Values, Wrong Order

Player iterates in wrong direction or map iteration is non-deterministic.

**Detection:** same set of lines but different order.

```typescript
{
  match: (output) => {
    const actual = new Set(output.trim().split("\n").map(l => l.trim()));
    const expected = new Set(expectedOutput.trim().split("\n").map(l => l.trim()));
    return actual.size === expected.size && [...actual].every(l => expected.has(l));
  },
  response:
    "all the right values but in the wrong order. check your loop bounds or sort logic.",
},
```

### 6. Case Mismatch

Player uses `"deny"` instead of `"DENY"`.

**Detection:** lowercase comparison matches but raw doesn't.

```typescript
{
  match: (output) => output.trim().toLowerCase() === expectedOutput.trim().toLowerCase() && output.trim() !== expectedOutput.trim(),
  response:
    "almost — the case is wrong. labels should be uppercase: `DENY`, `WARN`, `GRANT`, not lowercase.",
},
```

### 7. Premature Solution (Multi-Step)

Player jumps ahead to step N+1's output while still on step N.

**Detection:** output matches a later step's expected output or contains constructs from a future step.

```typescript
{
  match: (output) => {
    // Contains labels that belong to the NEXT step
    return /DENY|WARN|GRANT/.test(output);
  },
  response:
    "hold on — you're jumping ahead. this step just needs the numbers. labels come next.",
},
```

## Audit Procedure

### Step 1: Inventory

For each step bank, list what the expected output looks like:
- How many lines?
- What format per line? (number, string, mixed?)
- Are there labels, keywords, or specific strings?
- Is order significant?

### Step 2: Enumerate Pitfalls

For each step, ask:
- [ ] Can the player use Printf instead of Println? → Add newline pattern
- [ ] Can spacing vary? (Println vs Printf vs Sprintf) → Add whitespace pattern
- [ ] Can case vary? → Add case mismatch pattern
- [ ] Is this a multi-step level? → Add premature solution pattern
- [ ] Can the player print extra lines? (headers, debug output) → Add line count pattern
- [ ] Does the step use maps? → Map iteration order is non-deterministic in Go — add order-insensitive match or warn about sorting

### Step 3: Order Patterns

Output patterns are checked top-to-bottom, first match wins. Order:

1. **Printf-no-newline** (most specific structural issue)
2. **Premature solution** (wrong step's output — catch before partial matches)
3. **Case mismatch** (right content, wrong case)
4. **Whitespace mismatch** (right content, wrong spacing)
5. **Partial match** (some right elements, some missing)
6. **Catch-all** (output exists but doesn't match anything above)

### Step 4: Verify Feedback Quality

Every output pattern response MUST:
- [ ] Name the specific problem ("output is all on one line", "case is wrong")
- [ ] Show the fix with a code example in backticks
- [ ] Show what correct output looks like if not obvious
- [ ] Stay in Maya's voice (lowercase, no exclamation marks)

### Step 5: Test

Write tests in `src/lib/ai/engine.test.ts` for each pattern:

```typescript
test("detects Printf without newline", async () => {
  // Simulate what Printf("%d DENY", i) produces for i=1..10
  const concatOutput = "1 DENY2 DENY3 DENY4 WARN5 WARN6 WARN7 GRANT8 GRANT9 GRANT10 OVERRIDE";
  const result = await callMayaEngineAsync(stepId, codeWithPrintf, true, 0, false);
  expect(result?.reply).toContain("newline");
});
```

## Map-Specific Pitfalls

Maps in Go have **non-deterministic iteration order**. If a step expects output from ranging over a map:

1. **Never use exact string match for map range output.** The lines could come in any order.
2. **Use set-based comparison** — split into lines, sort both sides, then compare.
3. **Or require the player to sort** — teach `sort.Strings()` and make sorted output the expected behavior.
4. **Add an output pattern** that detects correct content in wrong order and explains map iteration is random.

```typescript
{
  match: (output) => {
    const actual = new Set(output.trim().split("\n").map(l => l.trim()));
    const expected = new Set(expectedLines);
    return actual.size === expected.size && [...actual].every(l => expected.has(l));
  },
  response:
    "the values are right but the order varies. maps in go don't have a guaranteed iteration order. that's fine — ||COMPLETE||",
},
```

## genericWrong as Last Resort

`genericWrong` messages fire when nothing else matches. They MUST still:
- Show the expected output format
- Give at least one concrete example line

```typescript
// BAD
genericWrong: ["that's not right. try again."],

// GOOD
genericWrong: [
  "not matching. each line should be: the number, a space, the label. like `1 DENY`. ten lines total.",
  "wrong output. expected format: `1 DENY`, `2 DENY`... `10 OVERRIDE`. check your ranges.",
],
```

## Common Mistakes When Writing Output Patterns

- **Pattern too broad.** `output.includes("DENY")` matches the premature-solution case AND the correct case AND the wrong-order case. Be specific about what combination of signals indicates which problem.
- **Forgetting that `match` receives raw compiler output.** This may include trailing newlines, program exit messages, or compiler warnings. Always `.trim()` before comparing.
- **Not testing with real Go Playground output.** The playground may add `\nProgram exited.` or similar. Test with actual compiled output.
- **Ordering catch-all before specific patterns.** `output.trim().length > 0` matches everything — put it LAST.
- **Feedback that doesn't show the fix.** "Wrong format" teaches nothing. "`Printf` needs `\\n` at the end: `fmt.Printf(\"%d DENY\\n\", i)`" teaches everything.
