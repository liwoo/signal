# Languages — Go, Python, JavaScript, Rust

**Status:** Acts I–III (built chapters) in Go, Python, JavaScript; Act I in Rust · **Plans:** `docs/cross-language-act-1-plan.md`, `docs/cross-language-act-2-plan.md`, `docs/act-3-plan.md`, `docs/rust-act-1-plan.md`

The story is shared. A lesson's *intent* (the step: stake, XP, events, rush, timer) is authored once; its *realization* (brief, hints, quickCheck, starter code, harness, expected output, requiredCode, shipped module) is per language. Go is authored inline in the chapter files and is the spine's own realization.

## The seam — `LanguageService` (`app/src/lib/lang/`)

| Member | Go | JavaScript | Python | Rust |
|---|---|---|---|---|
| `tokenize` | `lib/go/tokenizer` | `lib/javascript/tokenizer` | `lib/python/tokenizer` | `lib/rust/tokenizer` (macros incl. `!` are builtins) |
| `diagnose` (errors block submit) | `lib/go/diagnostics` | acorn parse + bracket/opener line + `fmt.`/`print(` slips | brackets, missing `:`, `fmt.`/`console.` slips | brackets, macro without `!`, `fmt.`/`console.` slips |
| completions | stdlib registry + shipped package | `console`/`Math`/`JSON`… + shipped module exports + own symbols | stdlib modules + shipped module + own symbols | `name::` paths (editor treats `::` like `.`): shipped module's `pub` items once `mod name;` is written, a few std paths, macros, own symbols |
| `format` | gofmt via Playground | — (FMT button hidden) | — | rustfmt via Rust Playground (`/api/rust`, `action: "format"`) |
| `run` | Go Playground (`/api/compile`); offline → local patterns | fresh Web Worker per run, 4s kill (`lib/javascript/run.ts`) | Pyodide 314 (CPython 3.14) in a module worker, CDN, 5s kill + respawn (`public/pyodide-worker.mjs`); can't load → offline | Rust Playground (`/api/rust` → play.rust-lang.org, stable, 2021); runaway program (500 + `{error}`) = failed run, not offline; unreachable → offline |
| harness injection | replace `func main` | run after main, main's output muted, harness in its own block | run after main, main's output muted | player's `fn main` blanked line-for-line, harness `fn main` appended |
| shipped module | txtar `terminal/cellblock` | `./cellblock.js` (ESM rewritten line-preserving) | `cellblock.py` on `sys.path`, reloaded each run | `cellblock.rs` inlined on the player's `mod cellblock;` line |
| `codeForRequiredCheck` | identity | strips `import` lines | strips `import`/`from … import` lines | identity (`cellblock::CELL` is a path) |
| warnings | go vet blocks | — | — | rustc warnings never block (zen coaches style) |

Consumers resolve a service with `getLanguageService(id)` — never import `lib/go/*` (or any language) directly. React code below `GameRouter` reads the active language from `LanguageProvider` (`useLanguage()` / `useLanguageService()`); `CodeEditor` and `BossFight3D` take an explicit `language` prop.

## Per-language content lookups (all keyed by the shared ids)

- Step realizations: `app/src/data/challenges/<lang>/act-<n>.ts` → `realizeChallenge(challenge, lang)` (`data/challenges/realizations.ts`). A chapter is playable in a language only if it has a realization (`isChallengeAvailable`); every step must be realized.
- Boss arena phases: `data/challenges/<lang>/boss-01.ts` → `realizeBossLevel`.
- Story levels: `realizeAdventureLevel` swaps the manual's name and the Go concept names Maya says ("maps", "runes" → `STORY_TERMS`) in her lines. Book chapters override `title`/`marginNote`/`found` per language.
- Maya banks: `lib/ai/banks/<lang>.ts` → `getStepBank(stepId, lang)`.
- Zen rules: `lib/game/zen-<lang>.ts` → `getZenRules(stepId, lang)`; ids prefixed `js_` / `py_` / `rs_`; examples in `data/zen-examples.<lang>.ts`.
- Field manual: `data/beginner-notes.<lang>.ts` (`blocks` + `notesBlocks`, no Go diagrams); `bookFor(lang)` re-skins the cover title.
- Warm-up drills, AI suggestions, guided tour copy, concept tracker (`curriculumFor(lang)`) are language-aware.

## Async programs run on a virtual clock (Act III)

Act III teaches concurrency, and its harnesses *measure* it (Ch 8: concurrent = max of the delays, sequential = sum). The Go Playground already runs on a fake clock; the other sandboxes now do too:

- **Python** (`lib/python/driver.ts`): main and harness compile with top-level `await` allowed; a coroutine result runs on `_SignalLoop`, a `BaseEventLoop` whose `select(timeout)` advances virtual time. `asyncio.sleep` is instant, `loop.time()` exact. Nothing runnable + nothing scheduled = `RuntimeError: deadlock`. Unawaited tasks are cancelled at the end, never finished (like goroutines when main returns). Output muting follows a `ContextVar`, so tasks the player's own top-level code started stay muted when they run during the harness.
- **JavaScript** (`lib/javascript/runtime.ts`, `executeJs` is now async): main runs inside an async wrapper; `setTimeout`/`setInterval`/`setImmediate`, `Date` and `performance.now` are sandbox-provided on a virtual timer queue. Main runs (muted) until its top-level code settles, then the harness runs as its own phase; timers keep the mute state they were scheduled under. An unsettled top-level await is reported; promises print as `Promise { <pending> }`.

## Persistence

`settings.language` (default `"go"`) + `settings.languageChosen` (picker shown once on the chapter intro, switchable on any intro). Progress is `ProgressStore { version: 2, byLanguage }`; v1 saves migrate into `byLanguage.go` (`migrateProgress`). XP, hearts, and the zen library are the player's, shared across languages.

## Divergences (plan §9)

1. `chapter-02:rewrite` in Python rebuilds the if/elif chain as a dict lookup table (`levels[i]` required). JS: if/else ↔ `switch (true)`.
2. Booleans: per-language `expectedOutput` (`Valid: True` in Python).
3. Scaffold steps print `Hello World` everywhere; in JS/Python they teach "the file is the program".
4. Boss weapon code is per-language starter code; same spec lines.
5. Act II (plan §2): Python/JS use a real `set`/`Set` where Go fakes one; string reversal is `s[::-1]` / `[...s]` (JS spread is the []rune twin); bad numbers raise `ValueError` (Python, try/except) or yield `NaN` (JS, `Number.isNaN`) instead of returning an error. JS's roster is a plain object.
6. JS anti-hardcoding: exports are `cell`/`sublevel` (camelCase) so the hardcoded `"CELL B-09 …"` string can't satisfy `requiredCode`. Python requires `cellblock.CELL`/`cellblock.SUBLEVEL`.

## Partial languages (Rust)

A language may realize only some chapters. `isChallengeAvailable` gates play, the roadmap (`curriculumFor`) shows the rest as SOON, and tests iterate `chaptersRealizedIn(language)` (`lib/lang/fixtures.ts`). Per-language tables that cover every chapter use `PerLanguage<T>` (Rust optional) — `TAKEAWAYS`, `ALLEGIANCE` (falls back to Go). Rust tests compile with a local `rustc` (`installLocalRustc()`), never the Playground; without a toolchain the run-dependent tests skip.

## QA

- `src/lib/lang/golden.test.ts` — every realized chapter's reference solution (`fixtures.ts` → `act1.fixtures.ts`, `act2.fixtures.ts`, `act3.fixtures.ts`) runs on the real backend (Pyodide in Node for Python, local rustc for Rust) and matches `expectedOutput`; hardcoded shortcuts fail.
- `src/lib/rust/rust.test.ts` — Rust tokenizer, lint, harness/module inlining, error explanations, real runs.
- `src/lib/lang/content.test.ts` — banks/zen/notes contract: complete, Maya's voice, no Go, reference solutions complete through the engine.
- `/dev/lang?lang=python` — editor + RUN on the in-browser backend; RUN ALL pushes every reference solution through the real engine. `test-visual/capture-lang.mjs` drives it.
- `/dev/book?chapter=chapter-02&lang=javascript` — a language's manual chapter.
