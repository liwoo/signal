# Languages — Go, Python, JavaScript

**Status:** Act I shipped in all three · **Plan:** `docs/cross-language-act-1-plan.md`

The story is shared. A lesson's *intent* (the step: stake, XP, events, rush, timer) is authored once; its *realization* (brief, hints, quickCheck, starter code, harness, expected output, requiredCode, shipped module) is per language. Go is authored inline in the chapter files and is the spine's own realization.

## The seam — `LanguageService` (`app/src/lib/lang/`)

| Member | Go | JavaScript | Python |
|---|---|---|---|
| `tokenize` | `lib/go/tokenizer` | `lib/javascript/tokenizer` | `lib/python/tokenizer` |
| `diagnose` (errors block submit) | `lib/go/diagnostics` | acorn parse + bracket/opener line + `fmt.`/`print(` slips | brackets, missing `:`, `fmt.`/`console.` slips |
| completions | stdlib registry + shipped package | `console`/`Math`/`JSON`… + shipped module exports + own symbols | stdlib modules + shipped module + own symbols |
| `format` | gofmt via Playground | — (FMT button hidden) | — |
| `run` | Go Playground (`/api/compile`); offline → local patterns | fresh Web Worker per run, 4s kill (`lib/javascript/run.ts`) | Pyodide 314 (CPython 3.14) in a module worker, CDN, 5s kill + respawn (`public/pyodide-worker.mjs`); can't load → offline |
| harness injection | replace `func main` | run after main, main's output muted, harness in its own block | run after main, main's output muted |
| shipped module | txtar `terminal/cellblock` | `./cellblock.js` (ESM rewritten line-preserving) | `cellblock.py` on `sys.path`, reloaded each run |
| `codeForRequiredCheck` | identity | strips `import` lines | strips `import`/`from … import` lines |

Consumers resolve a service with `getLanguageService(id)` — never import `lib/go/*` (or any language) directly. React code below `GameRouter` reads the active language from `LanguageProvider` (`useLanguage()` / `useLanguageService()`); `CodeEditor` and `BossFight3D` take an explicit `language` prop.

## Per-language content lookups (all keyed by the shared ids)

- Step realizations: `app/src/data/challenges/<lang>/act-1.ts` → `realizeChallenge(challenge, lang)` (`data/challenges/realizations.ts`). A chapter is playable in a language only if it has a realization (`isChallengeAvailable`); every step must be realized.
- Boss arena phases: `data/challenges/<lang>/boss-01.ts` → `realizeBossLevel`.
- Story levels: `realizeAdventureLevel` only swaps the manual's name in Maya's lines.
- Maya banks: `lib/ai/banks/<lang>.ts` → `getStepBank(stepId, lang)`.
- Zen rules: `lib/game/zen-<lang>.ts` → `getZenRules(stepId, lang)`; ids prefixed `js_` / `py_`; examples in `data/zen-examples.<lang>.ts`.
- Field manual: `data/beginner-notes.<lang>.ts` (`blocks` + `notesBlocks`, no Go diagrams); `bookFor(lang)` re-skins the cover title.
- Warm-up drills, AI suggestions, guided tour copy, concept tracker (`curriculumFor(lang)`) are language-aware.

## Persistence

`settings.language` (default `"go"`) + `settings.languageChosen` (picker shown once on the chapter intro, switchable on any intro). Progress is `ProgressStore { version: 2, byLanguage }`; v1 saves migrate into `byLanguage.go` (`migrateProgress`). XP, hearts, and the zen library are the player's, shared across languages.

## Divergences (plan §9)

1. `chapter-02:rewrite` in Python rebuilds the if/elif chain as a dict lookup table (`levels[i]` required). JS: if/else ↔ `switch (true)`.
2. Booleans: per-language `expectedOutput` (`Valid: True` in Python).
3. Scaffold steps print `Hello World` everywhere; in JS/Python they teach "the file is the program".
4. Boss weapon code is per-language starter code; same spec lines.
5. JS anti-hardcoding: exports are `cell`/`sublevel` (camelCase) so the hardcoded `"CELL B-09 …"` string can't satisfy `requiredCode`. Python requires `cellblock.CELL`/`cellblock.SUBLEVEL`.

## QA

- `src/lib/lang/act1-golden.test.ts` — every Act I reference solution (`act1.fixtures.ts`) runs on the real backend (Pyodide in Node for Python) and matches `expectedOutput`; hardcoded shortcuts fail.
- `src/lib/lang/act1-content.test.ts` — banks/zen/notes contract: complete, Maya's voice, no Go, reference solutions complete through the engine.
- `/dev/lang?lang=python` — editor + RUN on the in-browser backend; RUN ACT I pushes every reference solution through the real engine. `test-visual/capture-lang.mjs` drives it.
- `/dev/book?chapter=chapter-02&lang=javascript` — a language's manual chapter.
