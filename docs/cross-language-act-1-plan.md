# SIGNAL — Cross-Language Plan for Act I

**Status:** Act I built in all three languages (Phases 0–3) — see §14 for what shipped and where it differs from this plan · **Date:** 2026-10-19 · **Scope:** Act I ("FIRST CONTACT") across **Go, Python, JavaScript**

> Goal: let a player **choose or switch** the language they learn in, while the story, characters, scenes, maps, and mission structure stay identical. Act I is the proving ground for the architecture; Acts II–IX follow the same pattern once this holds.

---

## 1. The one-sentence thesis

**The plot is already language-agnostic. The lesson _intent_ is authored once. Only the lesson _realization_ (code, expected output, hints, idiom checks, notes, Maya's answers) is per-language.**

A grep across the entire story/adventure/sprite layer (`lib/adventure/*`, `components/story/*`, `components/adventure/*`, `lib/sprites/*`) finds Go in exactly **one** place: the boss weapon-config code. Everything else — the prison break, Maya, Reeves, Lockmaster, the 3D stealth beats, the cutscenes, the timers, XP, hearts, energy — is free to reuse verbatim.

---

## 2. What ships unchanged (reused verbatim across all three languages)

| Layer | Files | Why it's safe |
|---|---|---|
| Story beats / cutscenes | `lib/adventure/levels.ts`, `components/adventure/*`, `components/story/*` | No code content |
| Sprites / painters / scenes | `lib/sprites/*` | Pure visuals |
| Twists & prose | `chapterNNTwist` exports | Narrative strings |
| Generic game logic | `lib/game/{xp,energy,streaks,timer,hearts,jeopardy,zen-core}` | Pure, language-neutral math |
| Chapter wiring | `app/play/page.tsx` `ChapterConfig` / `CHAPTERS[]` | Structure neutral (a few story lines name "Go" — see §9) |
| Editor shell, vim | `components/game/CodeEditor.tsx` chrome, `hooks/useVim.ts` | Behavior is language-neutral once the Go imports are abstracted (§4) |
| Mission/HUD/timer UI | `MissionPanel`, `TopBar`, `LevelTimer`, `ObjectiveBar` | Reads neutral fields |

---

## 3. What is Go-coupled today (the work surface)

| Subsystem | File(s) | Coupling |
|---|---|---|
| Remote compile/format | `lib/go/playground.ts`, `app/api/compile`, `app/api/fmt` | Hardwired to go.dev Playground |
| Grading orchestrator | `lib/ai/engine.ts` (`callMayaEngineAsync`, `buildModuleSource`, `replaceMain`, `formatCompileError`) | Go txtar, `func main`, go vet |
| Local linter | `lib/go/diagnostics.ts` | `package main`, Go stdlib |
| Tokenizer | `lib/go/tokenizer.ts` | Go keyword/builtin/type sets |
| Completions | `lib/go/completions.ts` | Go stdlib + Go symbol parsing |
| Editor imports | `CodeEditor.tsx` | **hard-imports** `lib/go/*` — no `language` prop |
| Maya answer banks | `lib/ai/engine.ts` `BANKS` | Keys neutral, content 100% Go |
| LLM prompt | `lib/ai/prompts.ts`, `lib/ai/maya.ts` | Interpolates Go concepts + `||COMPLETE||` |
| Zen rules | `lib/game/zen.ts`, `data/zen-examples.ts` | Go idioms only |
| Beginner notes | `data/beginner-notes.ts` | Neutral shape, Go content |
| Field manual | `data/book.ts` | Titled *"GO: A Field Manual"* |
| Challenge data | `data/challenges/*.ts` | Go starter code / output / `compileModule` |

---

## 4. The core abstraction: `LanguageService`

Introduce **one seam** that every language implements. This is the single highest-leverage change — the editor and engine stop importing `lib/go/*` directly and instead resolve a service from a registry.

```ts
// src/lib/lang/types.ts
export type LanguageId = "go" | "python" | "javascript";

export interface LanguageService {
  id: LanguageId;
  label: string;                 // "Go" | "Python" | "JavaScript"
  fileExtension: string;         // ".go" | ".py" | ".js"

  // Editor
  tokenize(src: string): Token[];                         // highlight
  getCompletions(ctx: CompletionContext): Completion[];   // autocomplete
  diagnose(src: string): Diagnostic[];                    // instant local lint
  format?(src: string): Promise<FormatResult>;            // Cmd/Ctrl+S

  // Execution
  run(req: RunRequest): Promise<RunResult>;               // compile/interpret + capture stdout

  // Idiom coaching
  zenRules: Record<string /* stepId */, ZenRule[]>;
}
```

```ts
// src/lib/lang/registry.ts
const SERVICES: Record<LanguageId, LanguageService> = { go, python, javascript };
export function getLanguageService(id: LanguageId) { return SERVICES[id]; }
```

- `lib/go/*` becomes the first implementation behind this interface (pure refactor, no behavior change).
- `lib/python/*` and `lib/javascript/*` follow the same shape.
- `CodeEditor` gains a `language: LanguageId` prop and pulls `tokenize`/`getCompletions`/`format` from `getLanguageService(language)` instead of hard-importing Go.
- `lib/ai/engine.ts`'s `callMayaEngineAsync` takes `language` and dispatches `run()`, `buildModuleSource()`, and `replaceMain()` through the service (each language implements its own test-harness injection).

### Content realization model

Keep the **`Challenge`/`ChallengeStep` as the language-neutral spine** (story, stake, brief, XP, events, rush, timer). Move everything code-shaped into a per-language **realization** keyed by `stepId`:

```ts
// src/types/game.ts (additions)
export interface StepRealization {
  starterCode: string | null;
  testHarness?: string;
  expectedOutput?: string;
  expectedBehavior: string;
  requiredCode?: string[];
  compileModule?: CompileModule;   // generalized: "extra files shipped alongside"
  hints: ChallengeHint[];
  quickCheck?: QuickCheck;
}

export type StepRealizations = Record<LanguageId, StepRealization>;
```

Lookups become language-aware with the **existing key scheme** (`"chapter-01:scaffold"`):
- `BANKS` → `BANKS[lang][stepId]` (or key `"go:chapter-01:scaffold"`)
- `STEP_ZEN_RULES` → per-language
- `BEGINNER_NOTES` → per-language

> The step **IDs are already perfect** — neutral strings. We namespace the _realization_ lookups, not the story.

---

## 5. Data model & persistence

Add `language` as a first-class, persisted setting and **track progress per language** — a player who is "Chapter 3 in Python" is genuinely at a different place than the same player in Go.

```ts
// PlayerSettings (persistence.ts DEFAULTS.settings)
language: "go",           // active language

// PlayerProgress — key the progress block by language
progressByLanguage: {
  go:         { currentAct, currentChapter, completedChapters, ... },
  python:     { ... },
  javascript: { ... },
}
```

- `GameRouter` reads `settings.language`, selects the matching progress slice, and passes `language` down to `GameScreen`/`useGame`, which forwards it to the engine and editor.
- Migration: existing saves (shape `version: 1`) fold their single progress block into `progressByLanguage.go` and set `language: "go"`. Bump `PersistedState.progress.version`.

---

## 6. Execution backends (per language)

Honor the current "works offline, falls back locally" philosophy. Each `run()` is an implementation detail behind `LanguageService`.

| Language | Primary backend | Offline/local fallback | Notes |
|---|---|---|---|
| **Go** | go.dev Playground (existing `/api/compile`) | existing pattern-match fallback | No change |
| **JavaScript** | **Sandboxed Web Worker / iframe** in-browser | native — it *is* local | Cheapest. No server. Capture `console.log`. Hard timeout + no network. |
| **Python** | **Pyodide** (CPython→WASM, in-browser) | native once loaded | ~6 MB lazy load; cache aggressively. Alt: server sandbox (Piston/Judge0) if WASM size is unacceptable. |

Recommendation: **JS-in-Worker + Python-via-Pyodide + Go-via-Playground.** This keeps Python/JS fully client-side (matching Go's offline resilience) and avoids standing up a multi-language sandbox service for Act I. Revisit a unified server sandbox (Piston/Judge0 do all three) only if Pyodide load time hurts.

`RunResult` normalizes across backends: `{ success, stdout, stderr, diagnostics }`. The engine's `outputsMatch()` (already normalizes Go's `·` interpunct) stays, plus per-language stdout normalization (Python trailing newline, etc.).

---

## 7. Act I content, mapped lesson-by-lesson

This is the heart of the plan. Act I = **Ch1 HANDSHAKE · Ch2 DOOR CODE · Ch3 SHAFT CODES · Boss LOCKMASTER**. The _story, stakes, briefs, XP, events, timers_ are shared. Below is the per-language **realization** of each coding step, with exact expected output and the concept-mapping nuance.

### Concept mapping cheat-sheet

| Go concept (Act I) | Python | JavaScript |
|---|---|---|
| `package main` + `import "fmt"` + `func main()` | *(none — top-level code)* | *(none — top-level code)* |
| `fmt.Println` / `fmt.Printf("%s %d")` | `print()` / f-strings | `console.log` / template literals |
| `for i := 1; i <= 10; i++` | `for i in range(1, 11)` | `for (let i = 1; i <= 10; i++)` |
| `switch { case i<=3: }` | `if/elif/else` (or `match` 3.10+) | `switch` or `if/else if` |
| variadic `func f(x ...int) int` | `def f(*xs)` | `function f(...xs)` |
| multiple return `(int, bool)` | tuple `return s, ok` | array/object `return [s, ok]` |
| import a shipped package | import a shipped module | import a shipped module |

> **Key divergence up front:** Go's scaffold step exists to tease out `package/import/main`. **Python and JS have no such boilerplate** — `print("Hello World")` runs as-is. See §8 for how the scaffold step adapts (it becomes "how to run / the shape of a program" rather than "assemble the skeleton").

---

### Chapter 1 — HANDSHAKE

**Step `chapter-01:scaffold`** — *brief: make the program print `Hello World`.* Expected output: `Hello World`

```go
// Go
package main
import "fmt"
func main() { fmt.Println("Hello World") }
```
```python
# Python
print("Hello World")
```
```javascript
// JavaScript
console.log("Hello World");
```
*Nuance:* Go teaches 3 structural concepts here; Python/JS teach ~0. For Py/JS the quickCheck/hints pivot to "how do I print?" and "how is this program run?" (see §8). XP can stay identical.

**Step `chapter-01:location`** — *import `cellblock`, print `CELL B-09 · SUBLEVEL 3`.* Shipped module exports a `Cell` constant (`"B-09"`) and `Sublevel` value (`3`). `requiredCode` must reference both exported names (anti-hardcoding). Expected output: `CELL B-09 · SUBLEVEL 3`

```go
// Go — compileModule ships terminal/cellblock/cellblock.go
import ("fmt"; "terminal/cellblock")
fmt.Printf("CELL %s · SUBLEVEL %d\n", cellblock.Cell, cellblock.Sublevel)
// requiredCode: ["cellblock.Cell", "cellblock.Sublevel"]
```
```python
# Python — ships cellblock.py: CELL = "B-09"; SUBLEVEL = 3
import cellblock
print(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")
# requiredCode: ["cellblock.CELL", "cellblock.SUBLEVEL"]
```
```javascript
// JS — ships cellblock.js: export const CELL="B-09"; export const SUBLEVEL=3
import { CELL, SUBLEVEL } from "./cellblock.js";
console.log(`CELL ${CELL} · SUBLEVEL ${SUBLEVEL}`);
// requiredCode: ["CELL", "SUBLEVEL"]
```
*Nuance:* `compileModule` generalizes cleanly to "extra files shipped alongside the user's code." Go uses a txtar module; Python ships a `.py` beside `main.py`; JS ships an ESM module. Autocomplete for the shipped module (`extraPackagesFromModule`) needs a per-language parser for exported symbols.

---

### Chapter 2 — DOOR CODE

**Step `chapter-02:scaffold`** — Hello World again (same adaptation as Ch1 scaffold).

**Step `chapter-02:loop`** — *print 1..10, each on its own line.* Expected output: `1\n2\n…\n10`. `requiredCode` must prove a loop (not 10 print calls).

```go
for i := 1; i <= 10; i++ { fmt.Println(i) }   // requiredCode: ["for", "Println(i"]
```
```python
for i in range(1, 11): print(i)               # requiredCode: ["for", "range", "print(i"]
```
```javascript
for (let i = 1; i <= 10; i++) console.log(i);  // requiredCode: ["for", "console.log(i"]
```
*Nuance:* `range(1, 11)` off-by-one is the classic Python teaching moment — bake it into the hint ladder and a diagnostics check.

**Step `chapter-02:classify`** — *1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE; print `N LABEL`.* Expected output: `1 DENY … 10 OVERRIDE`.

```go
switch { case i <= 3: fmt.Println(i, "DENY") case i <= 6: ... default: fmt.Println(i, "OVERRIDE") }
```
```python
for i in range(1, 11):
    if   i <= 3: print(i, "DENY")
    elif i <= 6: print(i, "WARN")
    elif i <= 9: print(i, "GRANT")
    else:        print(i, "OVERRIDE")
```
```javascript
if (i <= 3) console.log(i, "DENY");
else if (i <= 6) console.log(i, "WARN");
else if (i <= 9) console.log(i, "GRANT");
else console.log(i, "OVERRIDE");
```
*Nuance:* Go's `print(i, "DENY")` joins with a space → `1 DENY`. Python's `print(i, "DENY")` also space-joins → matches. JS `console.log(i, "DENY")` space-joins → matches. Good — output parity holds naturally.

**Step `chapter-02:rewrite`** — *"rewrite it using the other approach" (switch ↔ if/else).* ⚠️ **This step is Go-specific in its framing.**

- **Go:** switch ↔ if/else (as authored).
- **JS:** switch ↔ if/else works identically.
- **Python:** has no `switch` before 3.10. **Policy decision needed** (§9). Options: (a) `if/elif` ↔ `match/case` (needs Pyodide/CPython ≥3.10 — Pyodide is fine), or (b) `if/elif` ↔ **dict dispatch** (more Pythonic, teaches a real idiom), or (c) replace the rewrite step for Python with "refactor the chain into a function." Recommendation: **(b) dict-dispatch** — it's the idiomatic Python answer and makes a better lesson than forcing `match`.

---

### Chapter 3 — SHAFT CODES

**Step `chapter-03:scaffold`** — Hello World (same adaptation).

**Step `chapter-03:sumfunc`** — *variadic `sumCodes` that sums any number of ints; call from main.* Test harness calls `sumCodes(25,30,50,10)`, `(1,2,3)`, `(100)`. Expected output: `Sum: 115\nSum: 6\nSum: 100`.

```go
func sumCodes(codes ...int) int { total := 0; for _, c := range codes { total += c }; return total }
// harness: fmt.Println("Sum:", sumCodes(25,30,50,10)) ...
```
```python
def sum_codes(*codes):
    return sum(codes)
# harness: print("Sum:", sum_codes(25,30,50,10)) ...
```
```javascript
function sumCodes(...codes) { return codes.reduce((a, c) => a + c, 0); }
// harness: console.log("Sum:", sumCodes(25,30,50,10)) ...
```
*Nuance:* each language injects the test harness differently — Go swaps `func main()` (`replaceMain`), Python/JS append a driver block that calls the user's function and prints. The service owns harness injection. Naming convention differs (`sumCodes` vs `sum_codes`); `requiredCode` and harness must match the language's idiom, so they live in the **realization**, not the shared step.

**Step `chapter-03:validate`** — *`validateCode(...) -> (sum, total>100)`; reuse `sumCodes`; return both.* Expected output: `Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false`.

```go
func validateCode(codes ...int) (int, bool) { total := sumCodes(codes...); return total, total > 100 }
// fmt.Printf("Result: %d, Valid: %v\n", s, v)
```
```python
def validate_code(*codes):
    total = sum_codes(*codes)
    return total, total > 100
# s, v = validate_code(...); print(f"Result: {s}, Valid: {str(v).lower()}")
```
```javascript
function validateCode(...codes) { const total = sumCodes(...codes); return [total, total > 100]; }
// const [s, v] = validateCode(...); console.log(`Result: ${s}, Valid: ${v}`);
```
*Nuance — boolean rendering:* Go prints `true`/`false` (lowercase). Python's native is `True`/`False`; JS is `true`/`false`. To keep the **expected output identical across languages** (`Valid: true`), the Python harness must lowercase (`str(v).lower()`) or we accept a per-language `expectedOutput` (`Valid: True` for Python). **Recommendation:** per-language `expectedOutput` — don't contort idiomatic code to force byte-identical output. (This is exactly why `expectedOutput` lives in the realization.) Also Go's variadic **spread** `sumCodes(codes...)` ↔ Python `sum_codes(*codes)` ↔ JS `sumCodes(...codes)` — a lovely cross-language teaching moment; call it out in the notes.

---

### Boss 01 — LOCKMASTER

The boss ships **four weapon files** the player repairs/writes: `Aim` (sector→coords), `Load` (threat→ammo list), `Fire` (→"HIT"), `Combo` (variadic join). ⚠️ **The boss is the most language-coupled piece in Act I** because its "corruption" bugs are Go-type bugs (`in`→`int`, `sting`→`string`).

What transfers cleanly:
- The **6-turn structure**, telegraphs, damage, grid shift at turn 5, expected outputs (`AIM 384 160`, `pierce\npierce\npierce`, `HIT`, `HIT | HIT | HIT`) — all **shared**.
- The **functions' behavior** — `Aim(sector)→(x,y)`, `Load(threat)→[ammo]`, `Fire→"HIT"`, `Combo(...)→join(" | ")`.

What must be re-authored per language:
- **Starter "corruption".** Go's bugs are type-name typos that don't exist in Python/JS. Each language needs **analogous, idiomatic bugs**:
  - Python: wrong indentation, wrong variable name (`ammo` vs `ammo_type`), missing `return`, `=` vs `==`, off-by-one.
  - JS: missing `}`/`return`, `&&` vs `||` (this one transfers!), `const` reassignment, wrong template literal.
- **Multiple return / join:** `Aim` returns `(int,int)` in Go → Python tuple → JS array `[x,y]`. `Combo` uses `strings.Join(shots, " | ")` → Python `" | ".join(shots)` → JS `shots.join(" | ")`.
- **Package import** (`main.go` imports `weapon`) → Python `from weapon import ...` → JS `import { ... } from "./weapon.js"`.

**Recommendation:** model the boss like the regular steps — a neutral `BossTurn` spine (telegraph, damage, expectedOutput, effects) + a per-language realization holding the corrupted `starterCode` and `testHarness`. Author the three languages' bug sets deliberately so each teaches that language's real failure modes (this is a feature, not overhead).

---

## 8. The scaffold-step problem (important)

Go's "print Hello World → discover package/import/main" is a load-bearing teaching device. **It has almost no payload in Python/JS.** Decide a consistent treatment:

- **Option A (recommended):** keep the beat for story continuity ("get the terminal live"), but repoint its _lesson_: for Python/JS the scaffold step teaches **"how a program is run"** and **"the one line that proves you're connected"** (`print` / `console.log`), plus — crucially — **how this language differs from the others** ("no boilerplate here; the file *is* the program"). This turns a weakness into a cross-language insight.
- **Option B:** collapse scaffold into the next step for Python/JS (fewer steps). Rejected — breaks step-count parity the adventure levels and XP assume, and loses a gentle on-ramp.

Keep Option A: same step IDs, same story, per-language realization and beginner notes.

---

## 9. Divergence policy (where languages can't map 1:1)

Make these explicit rather than defaulting silently:

1. **`chapter-02:rewrite` (switch↔if/else):** Python → `if/elif` ↔ **dict dispatch** (idiomatic), not forced `match`. Go/JS unchanged.
2. **Boolean / output formatting** (`true` vs `True`): use **per-language `expectedOutput`**; don't distort code to force identical bytes.
3. **Scaffold payload:** per §8, Option A.
4. **Boss corruption bugs:** per-language, idiomatic failure modes.
5. **Story strings naming "Go":** `play/page.tsx` has a few lines ("she needs a Go programmer", "for loops. switch statements."). Parameterize these by `settings.language` (template the language name), or neutralize them ("she needs a programmer").
6. **Field manual title:** *"GO: A Field Manual"* → per-language title/skin (`PYTHON` / `JAVASCRIPT`), driven by `settings.language`. `data/book.ts` becomes language-keyed (or a title template + per-language chapter bodies).
7. **Later acts (II–IX):** goroutines/channels/mutexes (Acts III–V) and `strings`/`strconv` stdlib have **no clean Python/JS analog**. Act I maps cleanly (print, loops, branching, functions, variadics, multi-return, imports); the divergence is a later-act problem. Flag it now, solve it when those acts are built — the per-language realization model already supports topic divergence (a step's concept can differ per language, or a language can skip/replace a step).

---

## 10. Per-subsystem work breakdown (Act I)

| Subsystem | Go | JavaScript | Python |
|---|---|---|---|
| `LanguageService` impl | wrap existing `lib/go/*` | new `lib/javascript/*` | new `lib/python/*` |
| Tokenizer | reuse `lib/go/tokenizer.ts` | JS keyword/builtin sets (same `Token` interface) | Python keyword/builtin sets |
| Completions | reuse | `console`, array methods, globals | `print`, builtins, stdlib subset |
| Diagnostics | reuse `lib/go/diagnostics.ts` | missing `;`?/undeclared/`console.log` typos | indentation, `print(` typos, `:` missing |
| `run()` backend | Playground (existing) | Web Worker sandbox | Pyodide |
| Harness injection | `replaceMain` (existing) | append driver block | append `if __name__` driver |
| Shipped-module parse | `extraPackagesFromModule` | parse ESM exports | parse module-level names |
| Zen rules (Act I steps) | existing | JS idioms (const/let, arrow fns, template literals, `===`) | Python idioms (f-strings, comprehensions, `enumerate`, EAFP, PEP8 spacing) |
| Beginner notes (Ch1–3) | existing | re-author bodies (neutral shape) | re-author bodies |
| Maya banks (`BANKS`) | existing | re-author answers per step | re-author answers per step |
| Field manual | existing | re-skin title + bodies | re-skin title + bodies |
| Challenge realizations | existing | author Ch1–3 + boss | author Ch1–3 + boss |

**Honest cost:** the plot is free; the **per-language learning content is ~3× authoring** (challenge code, zen rules, beginner notes, Maya banks) **+ two new language services** (tokenizer/completions/diagnostics/run). Budget accordingly.

---

## 11. Phased delivery

1. **Phase 0 — Refactor to the seam (no new language).** Extract `LanguageService`; route Go through it; add `language` prop to `CodeEditor` and `language` param through `useGame`→engine. Add `language` to settings + `progressByLanguage` with migration. **Acceptance:** all 891 tests green, Go plays byte-identically. Pure refactor.
2. **Phase 1 — JavaScript (cheapest backend).** Web Worker `run()`; JS tokenizer/completions/diagnostics; author Ch1–3 + boss realizations, zen rules, beginner notes, Maya banks, field-manual skin. **Acceptance:** full Act I playable in JS; language switch in settings works; progress tracked separately.
3. **Phase 2 — Python (Pyodide).** Pyodide `run()` (lazy-loaded, cached); Python tokenizer/completions/diagnostics; author Act I content incl. dict-dispatch rewrite. **Acceptance:** full Act I playable in Python; Pyodide cold-load under an acceptable budget or gated behind a loading beat.
4. **Phase 3 — Choose/switch UX.** Language picker (on first run + in settings/MORE tab). Switch policy: per-language progress, confirm on switch mid-chapter. Parameterize "Go"-naming story strings.

Sequence rationale: JS validates the abstraction with the cheapest backend before paying the Pyodide tax; Python stress-tests divergence (rewrite step, boolean formatting) once the seam is proven.

---

## 12. Testing

- **Keep the Go suite as the regression anchor** through Phase 0.
- Per-language **golden tests**: for every Act I step, assert `run(correctCode).stdout === expectedOutput[lang]`.
- **Anti-hardcode tests**: `requiredCode[lang]` present/absent cases.
- **Harness injection tests**: user function + injected driver compiles & runs per language.
- **Switch-integrity test**: switching language preserves each language's independent progress; migration folds legacy save into `go`.
- **Boss**: each language's corrupted starter fails, each turn's fix passes, expected outputs match.
- Reuse the adventure `levels.test.ts` reachability/voice checks unchanged (story is shared).

---

## 13. Open questions (decide before Phase 1)

1. **Pyodide vs server sandbox** for Python — accept ~6 MB WASM lazy-load, or stand up Piston/Judge0 for all three? (Recommendation: Pyodide for Act I.)
2. **Rewrite step for Python** — dict dispatch vs `match`? (Recommendation: dict dispatch.)
3. **Per-language `expectedOutput`** confirmed as the policy for boolean/format differences? (Recommendation: yes.)
4. **Progress model** — fully independent per language, or shared story progress with per-language skill tracking? (Recommendation: independent per language.)
5. **Field manual** — one Reeves book re-skinned per language, or three distinct manuals? (Recommendation: re-skinned, shared structure.)
6. **Default language** on first run — pick for the player, or force a choice? (Recommendation: ask once, default Go.)

---

## Appendix — files touched (Act I)

- **New:** `src/lib/lang/{types,registry}.ts`, `src/lib/javascript/*`, `src/lib/python/*`, `src/data/challenges/<lang>/*`, `src/data/beginner-notes.<lang>.ts`, Maya banks per language.
- **Changed:** `src/types/game.ts` (realizations, `LanguageId`), `src/lib/storage/persistence.ts` (settings + `progressByLanguage` + migration), `src/components/game/CodeEditor.tsx` (`language` prop), `src/lib/ai/engine.ts` (`language` dispatch), `src/lib/go/*` (wrapped behind service), `src/app/play/page.tsx` (language-aware wiring + neutralized story strings), `src/data/book.ts`, `src/data/curriculum.ts` (language-aware concepts).
- **Unchanged:** all of `lib/adventure/*`, `components/story/*`, `components/adventure/*`, `lib/sprites/*`, `lib/game/{xp,energy,streaks,timer,hearts}`.

---

## 14. Implementation notes (what shipped)

Reference: `spec/infrastructure/languages.md`. Decisions on §13's open questions: Pyodide for Python; dict dispatch for the Python rewrite; per-language `expectedOutput`; progress fully independent per language (XP, hearts, and the zen library stay shared); one Reeves manual re-skinned per language; asked once on the chapter-1 intro, defaulting to Go, switchable on any chapter intro.

Where the build differs from the plan above:

1. **Go stays inline as the spine's own realization.** Rather than moving Go's code fields out of the chapter files, other languages overlay a `StepRealization` (`realizeChallenge`). Go is byte-identical by construction, and every consumer still reads a plain `Challenge`. `brief` and `hints` are required in a realization; optional fields it omits (harness, module, quickCheck) are dropped, never inherited from Go.
2. **Zen rules live in `lib/game` registries keyed by language**, not on `LanguageService` — keeps `lib/game` pure and avoids an import cycle.
3. **JS anti-hardcoding:** the plan's `CELL`/`SUBLEVEL` exports would let `console.log("CELL B-09 · SUBLEVEL 3")` satisfy `requiredCode`. JS exports `cell`/`sublevel`, and JS/Python check `requiredCode` with import lines stripped (`codeForRequiredCheck`).
4. **The boss is the 3D duel** (three rearm phases at cover), not the legacy four-tab 2D boss §7 describes. Each language realizes the three phases' starter code; the spec lines are shared.
5. **Backends:** JS runs in a fresh Web Worker per run (4s kill), with acorn for line-accurate syntax errors and a line-preserving ESM rewrite. Pyodide 314 (CPython 3.14) only ships an ES-module loader, so Python runs in a module worker (`public/pyodide-worker.mjs`) loaded from the CDN, warmed during the intro, killed and respawned on a 5s timeout. Tests run real Pyodide in Node (`pyodide` dev dependency).
6. **Scaffold steps grade by `expectedOutput: "Hello World"`** in JS/Python (Go still uses its skeleton patterns).
7. **Story text:** the only Go mention in the adventure layer ("'go: a field manual'") is localized by `realizeAdventureLevel`; intro story lines template the language name.

