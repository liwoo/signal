# SIGNAL — Act I in Rust

**Status:** built · **Date:** 2026-11-13 · **Scope:** Act I ("FIRST CONTACT") — Ch 1 HANDSHAKE, Ch 2 DOOR CODE, Ch 3 SHAFT CODES, Boss 1 LOCKMASTER — in **Rust**, the fourth language.

> Same story, same steps, same stakes, XP, events and timers. Only the realization (code, briefs, hints, Maya's answers, zen rules, field manual) is Rust. It plugs into the seam built for Python and JavaScript (`docs/cross-language-act-1-plan.md`); nothing in the story layer changed.

## 1. Scope

| In | Out (SOON for Rust) |
|---|---|
| Ch 1–3 + LOCKMASTER rearm phases | Act II (Ch 4, 4.2) and Act III (Ch 7–9, Kira) — Go/Python/JS only |
| Maya banks, zen rules (`rs_*`), field manual, takeaways, warm-up, mascot, theme | Jev semantic criteria for `rs_*` rules (heuristics only for now) |

A Rust player plays Act I, then the roadmap shows the rest as SOON (`curriculumFor("rust")`). Progress is per language, so switching to Go/Python/JS to continue keeps the shared XP, hearts and library.

## 2. How Rust runs

- **Compiler:** the official Rust Playground (`play.rust-lang.org/execute`, stable, edition 2021, debug) through our own proxy `app/api/rust/route.ts` — the same shape as Go's `/api/compile`. `rustfmt` runs through the same proxy (`action: "format"`), so the FMT button / Cmd+S works.
- **One file only.** The Playground compiles `src/main.rs`, so:
  - a **test harness** replaces the player's `fn main` (like Go). The player's main is blanked line-for-line and the harness is appended, so errors in the player's own functions keep the line numbers they see;
  - a **shipped module** (`cellblock.rs`) is inlined where the player writes `mod cellblock;` — `mod cellblock { … }` on that same line. If the player never declares it, rustc's "cannot find module" error is the lesson (Maya: "put `mod cellblock;` at the top").
- **Errors:** the first `error[E…]` block of rustc's output (cargo chatter and warnings dropped) or the panic block becomes one Maya line (`lib/rust/harness.ts` → `explainRustError`): macro without `!`, missing `fn main`, immutable reassignment → `let mut`, unresolved module → `mod name;`, mismatched types, moved values, format-arg count, overflow/index panics.
- **Warnings never block.** rustc warnings (unused `mut`, dead code after the harness swaps main) are style — the zen rules coach them instead.
- **Runaway programs:** the Playground answers a timeout or >640K of output with HTTP 500 + `{"error"}`. That's reported as a failed run ("is there a loop that never ends?"), never as offline — offline falls back to pattern matching, which must not grade an infinite loop.
- **Offline:** network down → `status: "offline"` → the engine's local pattern matching against the Rust bank's `codePatterns`, exactly like Go.
- **Tests** never hit the Playground: `lib/rust/node-backend.ts` (`installLocalRustc()`) compiles with a local `rustc --edition 2021`. Without a toolchain, the run-dependent tests skip.

## 3. Divergences from the Go spine

1. **Scaffolds keep `fn main`.** Rust needs an entry point like Go, so the Hello World steps teach `fn main() { println!(...); }` — no package line, no import.
2. **Printing is a macro.** `println!("CELL {} - SUBLEVEL {}", a, b)` — `{}` placeholders, values in order. Every Maya line keeps `println!` in backticks (the voice check bans bare `!`).
3. **Modules are paths.** Ch 1 ships `cellblock.rs` (`pub const CELL: &str`, `pub const SUBLEVEL: u8`). `requiredCode` is `cellblock::CELL` / `cellblock::SUBLEVEL`, so the hardcoded string can't pass (identity `codeForRequiredCheck`, like Go).
4. **Ch 2 loop** is `for i in 1..=10` (inclusive range); `requiredCode` `for ` / ` in ` / `..`. **Rewrite** rebuilds the if/else chain as a `match` on ranges with `_` as the catch-all (`requiredCode` adds `match`, `=>`).
5. **Ch 3: no variadics in Rust.** `sum_codes(codes: &[i32]) -> i32` takes a slice; the harness calls `sum_codes(&[25, 30, 50, 10])`. `validate_code` returns a tuple `(i32, bool)` and the harness destructures it. Booleans print `true`/`false`, so `expectedOutput` matches Go's byte for byte.
6. **LOCKMASTER:** each rearm phase is a full program with its own `fn main`; same spec lines (`DMG 12 RATE 500 RANGE 6` …).
7. **Theme:** copper `#ffa47a` (`[data-lang="rust"]`, `LANGUAGE_OPTIONS`) — deliberately softer than the HUD's amber alert and red danger. Mascot: an original pixel crab.
8. **Story terms:** Maya's Go words in story lines localize to "hashmaps" / "chars" (`STORY_TERMS.rust`) for the day Act II is realized.

## 4. Where things live

| What | File |
|---|---|
| Service (seam) | `app/src/lib/lang/rust.ts` |
| Tokenizer · lint · completions | `app/src/lib/rust/{tokenizer,diagnostics,completions}.ts` |
| Harness, module inlining, error text | `app/src/lib/rust/harness.ts` |
| Playground client / test backend | `app/src/lib/rust/playground.ts`, `node-backend.ts` |
| Proxy | `app/src/app/api/rust/route.ts` |
| Realizations | `app/src/data/challenges/rust/{act-1,boss-01,index}.ts` |
| Banks · zen · notes | `lib/ai/banks/rust.ts`, `lib/game/zen-rust.ts` + `data/zen-examples.rust.ts`, `data/beginner-notes.rust.ts` |
| Reference solutions | `app/src/lib/lang/act1.fixtures.ts` (`RS`) |

## 5. QA

- `src/lib/lang/golden.test.ts` / `content.test.ts` iterate `NON_GO_LANGUAGES` over `chaptersRealizedIn(language)`, so Rust is held to the same contract as Python/JS for exactly the chapters it plays.
- `src/lib/rust/rust.test.ts` — tokenizer, lint, harness/module injection, error explanations, real runs on local rustc.
- `/dev/lang?lang=rust`, `/dev/book?chapter=chapter-01&lang=rust`, `/dev/mascots`.

## 6. Next: Act II in Rust

Ch 4 GUARD ROSTER → `HashMap<&str, …>` (and `HashSet` where Python/JS use a real set); Ch 4.2 → `chars().rev()` for the rune reversal, `parse::<i32>()` returning a `Result` for bad numbers (closest to Go's `(value, err)`). Add realizations to `data/challenges/rust/act-2.ts`, then banks/zen/notes/fixtures — the tests pick them up automatically once `RUST_REALIZATIONS` lists the chapter.
