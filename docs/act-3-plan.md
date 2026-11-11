# SIGNAL — Act III Plan: DEEPER IN

**Status:** built (all three languages) · **Date:** 2026-11-10/11 · **Scope:** Ch 7 FILE TREE, Ch 8 CIRCUIT CUT, Ch 9 CHANNEL OF ESCAPE, Boss 3 KIRA · ALLEGIANCE — **trilingual from day one** (Go spine, Python + JavaScript realizations in the same PR).
**Builds on:** `docs/cross-language-act-2-plan.md` (seam, realization model, "never Go-first-port-later"), the level specs in `spec/levels/chapter-07…09` + `boss-03`, and `spec/levels/level-playbook.md`.

> Act III is where the game stops being about values and starts being about *time*: recursion that unwinds, deferred work, goroutines, channels. It is also the act whose divergences are the deepest — Python and JavaScript have no goroutines. The decision this plan makes is that they don't need them: **each language teaches its own real concurrency model against the same story and the same output**, and the sandboxes get a virtual clock so that model is deterministic.

---

## 1. Where Act III sits

| # | Chapter | Spec | Built before this plan | Curriculum key |
|---|---|---|---|---|
| 7 | FILE TREE — closures, recursion, defer, panic/recover | ✅ | — | `ch7` |
| 8 | CIRCUIT CUT — goroutines, WaitGroups | ✅ | — | `ch8` |
| 9 | CHANNEL OF ESCAPE — channels, select, timeouts | ✅ | — | `ch9` |
| B3 | KIRA · ALLEGIANCE — judgment boss | ✅ | — | `boss3` |

**The Act II gap.** Ch 4.3, Relay Interceptor, Ch 5, Ch 6, Ch 6.2 and Vasik T1 are still unbuilt in every language. Act III does not depend on them: its prerequisites are functions, slices, maps (Act I + Ch 4) and the error-value idea (Ch 4.2's `Atoi`). So Act III ships now and plays straight after Ch 4.2; the roadmap keeps showing the Act II chapters as SOON between them.

- **Save keys:** `Challenge.chapter` is the completion key (not a display number). Act III takes **13–16** so the unbuilt Act II chapters can take 7–12 later without colliding with anyone's save.
- **Story continuity:** Act III's story assumes Vasik T1 happened (Kira's first contact comes out of it). Until T1 exists, Ch 7's intro beat opens with Kira's unregistered channel cold — that reads fine, and gets a one-line callback when T1 lands.

---

## 2. Infrastructure — async sandboxes on a virtual clock

Go's playground already runs goroutines on a **fake clock** (`time.Sleep(450ms)` returns instantly, `time.Since` reports exactly 450ms). Act III's harnesses rely on it: Ch 8 step 3 *measures* the window to prove the cuts were concurrent; Ch 9 races teams on distinct delays.

Python and JavaScript get the same property:

| | Before | After |
|---|---|---|
| **Python** (Pyodide) | `exec` only — no way to drive asyncio (Pyodide's WebLoop is "always running", so `asyncio.run` refuses) | The driver compiles main + harness with `PyCF_ALLOW_TOP_LEVEL_AWAIT`; a coroutine result runs on a **virtual-time event loop** (`BaseEventLoop` subclass whose `select(timeout)` advances the clock instead of sleeping). `asyncio.sleep(0.45)` is instant; `loop.time()` reads virtual seconds. When nothing is ready and nothing is scheduled the loop raises *"deadlock: every task is waiting and nothing can wake them"* — Go's `all goroutines are asleep` for free. Pending tasks are cancelled at the end like `asyncio.run` does — and, like Go, a task nobody waited for **never runs**. |
| **JavaScript** | synchronous `executeJs` — a `setTimeout` callback or an awaited promise never printed | `executeJsAsync`: the program body is wrapped in an `async` function (top-level `await` works in main and harness), and the sandbox gets its own `setTimeout`/`setInterval`/`clear*`, `Date.now` and `performance.now` driven by a **virtual timer queue** — drain microtasks, jump the clock to the next timer, fire, repeat. A program whose top-level await never settles reports *"unsettled top-level await — waiting on a promise that never resolves"*. |

Both are deterministic and instant, which keeps tests fast and makes "concurrent = max of delays, sequential = sum" an exact measurement in every language.

---

## 3. Concept mapping — Act III

| Go | Python | JavaScript | Divergence / lesson |
|---|---|---|---|
| closure mutates captured `count` | inner `def` + **`nonlocal count`** | arrow/inner function over `let count` | Python makes the capture explicit — `UnboundLocalError` without it is the chapter's trap |
| recursion | recursion | recursion | — |
| `defer fmt.Println(...)` | `try: … finally: print(...)` | `try { … } finally { console.log(...) }` | Go schedules cleanup at the top; Py/JS wrap the body. Same post-order output |
| `panic` / `recover` in a deferred func | `raise RuntimeError(...)` / `except Exception as e` | `throw new Error(...)` / `catch (e)` | Go: panic is *not* try/catch. Py/JS: exceptions *are* the normal error path — the lesson becomes "catch at the boundary, keep scanning" |
| `go f()` | `asyncio.create_task(f())` | `setTimeout(() => f(), 0)` | Go/Py: unawaited work dies with main. JS: the event loop finishes it anyway — the observable lesson is *order* ("orders sent" prints before South) |
| `sync.WaitGroup` + results by index | `await asyncio.gather(...)` (ordered results) | `await Promise.all(...)` (ordered results) | gather/all are WaitGroup **and** the results slice in one call — say so |
| loop-variable capture trap | late-binding lambdas in a loop | `var` in a `for` loop + callbacks | each language has its own famous version; zen rules flag each |
| `time.Sleep(d)` in goroutine | `await asyncio.sleep(d / 1000)` | `await sleep(d)` (`new Promise(r => setTimeout(r, d))`) | JS players write `sleep` themselves — their first hand-built Promise |
| `chan string` (buffered 1) returned from `hail` | a **Task** returned from `hail` (holds its one result) | a **Promise** returned from `hail` (settles once) | Task/Promise *are* capacity-1 mailboxes: the loser delivers and nobody blocks |
| `select` first-ready | `asyncio.wait(..., return_when=FIRST_COMPLETED)` | `Promise.race([...])` | Py: cancel the losers (zen) |
| `case <-time.After(d)` | `asyncio.wait(..., timeout=s)` → empty `done` | race against `sleep(ms).then(() => "NO CONTACT")` | — |
| `select { default: }` | `task.done()` — a plain `def`, no `await` | `Promise.race([p, "channel silent"])` | Py: "doesn't wait" = "isn't async". JS: a settled promise beats a ready value only if it's already settled |
| `data[i:]` aliases the backing array | `memoryview(data)[i:]` aliases (`bytearray[i:]` copies!) | `data.subarray(i)` aliases (`slice(i)` copies!) | Boss 3: every language has a "zero-copy" view that betrays you |

---

## 4. Chapter 7 — FILE TREE (step by step)

Spec deltas (applied to `spec/levels/chapter-07-file-tree.md`): the scaffold prints `Hello World` (CLAUDE.md rule); the code moves out of `main` into a function the harness calls, so a second tree can catch hardcoding; the teaching note about `defer` order is corrected (the print defer runs *first* during the panic unwind, then the recover — LIFO).

- **`chapter-07:scaffold`** — `Hello World`.
- **`chapter-07:scan`** — `scanArchive(archive, root) int` / `scan_archive` / `scanArchive`: a closure counter + recursive inner `scan`, logging `scanned: <dir>` on the way *out*. Harness runs the archive and a two-dir tree:
  ```
  scanned: logs … scanned: root / total files: 8 / scanned: b / scanned: a / total files: 2
  ```
- **`chapter-07:recover`** — `safeScan(archive, root) (int, []string)` / `safe_scan` → `(count, errors)` / `safeScan` → `{ count, errors }`: `vault` is corrupted (nil/None/null) — panic/raise/throw, recover/except/catch per directory, keep scanning. Output adds `scanned: vault` and `ERROR: vault: corrupted directory`.
- No rush (narrative tension only); Kira's first messages render in her own colour.

## 5. Chapter 8 — CIRCUIT CUT

- **`chapter-08:scaffold`** — `Hello World`.
- **`chapter-08:goroutine`** — `cut(name)` + `cutAsync(name)`. Go output per spec. Py/JS harnesses print `orders sent` right after launching, proving the caller didn't wait: `North circuit: DOWN / orders sent / South circuit: DOWN / power cycle complete`.
- **`chapter-08:fanout`** — `cutAll(circuits)`: WaitGroup + results-by-index / `gather` / `Promise.all`. Four `DOWN` lines + `ALL CIRCUITS DOWN`.
- **`chapter-08:window`** — `cutTimed(circuits, delays)`: sleep inside each concurrent unit; the harness measures the virtual window and prints `SINGLE CYCLE — alarm blind` only if elapsed < 1100ms. A sequential loop prints `MULTI CYCLE` and fails. Rush at T+120s (Grid Retaliation → `power_reduced`).

## 6. Chapter 9 — CHANNEL OF ESCAPE

- **`chapter-09:scaffold`** — `Hello World`.
- **`chapter-09:hail`** — `hail(team, delayMs)` returns a buffered channel / Task / Promise immediately.
- **`chapter-09:first`** — `firstResponder(a, b, c)`: `select` / `asyncio.wait(FIRST_COMPLETED)` / `Promise.race`. `first contact: Bravo responding`.
- **`chapter-09:timeout`** — `awaitContact(..., timeoutMs)` + `sweep(ch)`: timeout case and non-blocking poll. Two rushes (Signal Scramble, Energy Drain).

## 7. Boss 3 — KIRA · ALLEGIANCE (the judgment boss)

A new boss grammar: **no hearts, no game over, no kill-timer**. Built as its own stage, `AllegianceBoss` (`src/components/boss/allegiance/`), with pure logic in `src/lib/game/allegiance.ts`:

1. **Study** — Kira's `transmit` (read-only, realized per language) + Reeves' receiver log. Click to mark the suspect lines (mutation + alias-ship). Wrong marks free twice, then −25 phase XP each (floor 50).
2. **Verdict** — a prose explanation (code is rejected) + TRUST / REJECT. Graded against the 3-marker rubric (shared backing array · mutation after send · missing copy), **≥2 of 3**. The grader is a pure heuristic (causal-chain aware, rejects keyword salad) so it works offline and in tests; it's language-aware (memoryview / subarray vocabulary). Outcome matrix per spec (contradiction challenge, one revision on lucky guess). Soft 300s bonus decay, clock hidden until 240s.
3. **Redemption** — optional, 180s: rewrite `transmitSafe` with an explicit copy; graded in the real sandbox by the "lie detector" harness. One retry.

The verdict is saved to `PlayerProgress.kiraVerdict` (`trusted`/`rejected`) and `storyBranch` (`a`/`b`) — the fields already exist for Act IV. The twist display differs per verdict.

Per-language Kira code:

```go
func transmit(data []byte, ch chan<- []byte) {
    for i := range data {
        data[i] ^= 0xFF
        ch <- data[i:]
    }
}
```
```python
def transmit(data, ch):
    view = memoryview(data)
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(view[i:])
```
```javascript
function transmit(data, ch) {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= 0xff;
    ch.push(data.subarray(i));
  }
}
```

---

## 8. Story & presentation

- **Kira's pages.** Reeves' manual ends at chapter six. In Act III the new chapters are pages *Kira* leaves in Maya's path — sharper handwriting, margin notes that read like invoices. The player learns from the person they'll have to judge. The boss's book chapter is Reeves again: "read before you run".
- **Playable beats.** Each chapter gets an intro level (manual pages before the terminal) and an aftermath level in `src/lib/adventure/levels.ts`: server-room archive (Ch 7), power-plant circuit array (Ch 8), comms array (Ch 9), Kira's channel (Boss 3). Film fallbacks in `scenes.ts`.
- **Kira's voice** — capitalised, dry, transactional (she is not Maya; Maya stays lowercase).

## 9. Per-chapter checklist (what "built" means)

For each of Ch 7/8/9 in **each** of Go, Python, JS:
- [ ] Challenge spine (`src/data/challenges/chapter-0N.ts`) with stakes, asks, events, rush, timer, twist
- [ ] Py/JS realizations (`data/challenges/<lang>/act-3.ts`), reference solutions + hardcoded checks (`lib/lang/act3.fixtures.ts`), listed in `REALIZED_CHAPTERS`
- [ ] Maya banks (Go in `engine.ts`, `banks/python.ts`, `banks/javascript.ts`)
- [ ] Zen rules with `isRelevant` guards + before/after examples (`zen.ts`, `zen-python.ts`, `zen-javascript.ts`, `zen-examples*.ts`)
- [ ] Field-manual notes per language (`beginner-notes*.ts`) + book chapter (`book.ts`)
- [ ] Takeaway (`takeaways.ts`), classroom entry, curriculum `chapterId`
- [ ] Intro + aftermath adventure levels, film fallbacks, cam-feed scene
- [ ] Play-page wiring (`CHAPTERS`)

## 10. Build order

1. Async sandboxes + virtual clocks (Python driver, JS runtime) with tests.
2. Challenge spines + realizations + fixtures — golden tests prove every reference solution passes and every hardcoded answer fails, in all three languages (Go through the playground, skipped offline).
3. In parallel, by file ownership: Go content · Python content · JS content · adventure levels/films.
4. Boss 3 stage + logic + wiring + persistence.
5. Integrate: curriculum, classroom, takeaways, play page; full test suite, typecheck, lint, browser QA.

---

## 11. What shipped, and known limits

- **Built:** Ch 7, 8, 9 and Boss 3 in Go, Python and JavaScript — spines, realizations, Maya banks, zen rules (Go 18, Python 23, JS 23) with before/after examples, Kira's field-manual pages (Reeves' for the boss), takeaways, classroom + curriculum entries, 8 adventure levels + film fallbacks, the `AllegianceBoss` stage, verdict persistence (`kiraVerdict` / `storyBranch`), `/dev/kira`, `test-visual/capture-kira.mjs`.
- **Verified:** every reference solution passes and every catalogued shortcut fails — Go on the local toolchain (`act3-go.test.ts`), Python on real Pyodide, JS in-process; plus all 27 realized steps in the real browser workers (`/dev/lang` RUN ALL) for both Python and JS. The boss was played end to end in all three languages (real Go Playground for the redemption), on desktop and phone, through every verdict branch.
- **Spec corrections:** the archive holds 9 files, not 8; the Ch 7 defer-order note was backwards; scaffolds print `Hello World`.
- **Limits:**
  - The explanation grader is a deterministic heuristic, not an LLM. It accepts the spec's plain-language examples and rejects keyword salad, but a determined player can phrase around it. Routing it through Jev (`/api/jev`) with the heuristic as the offline fallback is the natural next step.
  - Go offline grading (no playground) falls back to bank pattern-matching keyed on the brief's function names.
  - Python `hail` with `// 1000` passes its own step (both delays become 0); it's caught one step later.
  - Act II's unbuilt chapters (4.3, B1.5, 5, 6, 6.2, Vasik T1) still sit between 4.2 and Ch 7 on the roadmap; save keys 7–12 are reserved for them.
