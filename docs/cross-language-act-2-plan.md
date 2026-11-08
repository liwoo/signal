# SIGNAL — Cross-Language Plan for Act II

**Status:** Phase 1 in progress · **Date:** 2026-11-08 · **Scope:** Act II ("INSIDE THE MACHINE") in **Python and JavaScript**, alongside Go
**Builds on:** `docs/cross-language-act-1-plan.md` (the seam, the realization model, the divergence policy) and `spec/infrastructure/languages.md` (what shipped).

> Act I proved the architecture: the step is the spine, the code is the realization. Act II reuses it unchanged. The new work is content, plus the first real **topic divergences** — structs, interfaces, error values and Go's `testing` package have no 1:1 twin in Python or JavaScript.

---

## 1. Where Act II stands today

The "script" is the level specs in `spec/levels/` plus `docs/design.md` §Act II. Against the code:

| # | Chapter | Spec | Go | Python | JavaScript | Curriculum |
|---|---|---|---|---|---|---|
| 4 | GUARD ROSTER — maps, sets, range | ✅ | ✅ built (levels, book, zen, notes, banks) | **Phase 1** | **Phase 1** | `ch4` |
| 4.2 | CIPHER RELAY — strings, runes, strconv | ✅ | ✅ built | **Phase 1** | **Phase 1** | `ch4b` |
| 4.3 | SIGNAL SORT — strings pkg, custom sort | ✅ | — | Phase 2 | Phase 2 | not listed |
| B1.5 | RELAY INTERCEPTOR — mini-boss over 4–4.3 | ✅ | — | Phase 2 | Phase 2 | not listed |
| 5 | ACCESS STRUCT — structs, methods, enums, embedding | ✅ | — | Phase 3 | Phase 3 | `ch5` (planned) |
| 6 | LOCK INTERFACE — interfaces, custom errors | ✅ | — | Phase 3 | Phase 3 | `ch6` (planned) |
| 6.2 | TEST CHAMBER — writing tests | ✅ | — | Phase 3 | Phase 3 | not listed |
| B2 | VASIK · TERMINAL 1 — read & repair his code | ✅ | — | Phase 4 | Phase 4 | `boss2` (planned) |

So "Act II for both languages" is two kinds of work:

1. **Catch-up (Phase 1):** realize the two Go-built chapters (4, 4.2) in Python and JS. Pure content on the existing seam — no new infrastructure.
2. **Trilingual from day one (Phases 2–4):** the rest of Act II isn't built in *any* language. Each chapter is authored once as a Go spine (story, adventure levels, book chapter) and realized in all three languages in the same PR. Never again "Go first, port later" — that's how Act I accrued its §9 divergence debt.

---

## 2. Concept mapping — Act II

| Go concept | Python | JavaScript | Divergence |
|---|---|---|---|
| `map[string]string` literal | `dict` literal | object literal `{ Chen: "Floor 1" }` | none — all three have literal syntax |
| `map[string]bool` as a set | **`set`** (real type) | **`Set`** (real type) | Go *lacks* a set; Py/JS lessons get *better* here |
| `for _, v := range m` | `for v in d.values()` | `Object.values(o)` / `for…of` | — |
| `fmt.Sprintf("Floor %d", i)` | f-string | template literal | — |
| `[]rune(s)` reversal | `s[::-1]` | `[...s].reverse().join("")` | JS `[...s]` *is* the rune lesson (`split("")` breaks emoji); Python strings are already code points |
| `strings.Fields` / `Join` | `str.split()` / `" ".join()` | `split(/\s+/)` / `join(" ")` | — |
| `strconv.Itoa` | `str(n)` / f-string | `String(n)` / template | — |
| `strconv.Atoi` → `(int, error)` | `int()` **raises** `ValueError` → `try/except` | `Number()` **returns `NaN`** → `Number.isNaN` | **three error models** — the headline cross-language moment of Act II |
| `strings.ToLower/Replace/Contains/HasPrefix` | `.lower()/.replace()/in/.startswith()` | `.toLowerCase()/.replaceAll()/.includes()/.startsWith()` | — |
| `sort.Slice(s, less)` | `sorted(xs, key=…)` (tuple keys) | `[...xs].sort((a, b) => …)` | JS default sort is lexicographic + mutates — a deliberate trap to teach |
| `type X int` + `iota` | `enum.IntEnum` | frozen object / class statics | — |
| struct + methods | `@dataclass` + methods | `class` | — |
| pointer receiver | (objects are references) | (objects are references) | step reframed: "mutate in place vs return a copy" |
| struct embedding | composition (a field holding the base) | composition (or `extends`) | teach composition in all three — same lesson |
| `interface` (implicit) | duck typing / `typing.Protocol` | duck typing | Python & JS "implement" by shape, like Go — a real parallel |
| `error` / `errors.New` | `raise Exception(...)` | `throw new Error(...)` | — |
| custom error type + `errors.As` | `class LockError(Exception)` + `except LockError as e` | `class LockError extends Error` + `instanceof` | — |
| `testing` + `t.Errorf` + table tests | `assert` + table of tuples (no framework) | `console.assert`-style shipped `check()` helper | no test runner in the sandboxes — see §5.3 |

---

## 3. Phase 1 — Chapter 4 GUARD ROSTER (step by step)

Shared spine unchanged (story, XP, events, timer). New: a `stake` on every step (the WHY line; Go gains it too).

**`chapter-04:scaffold`** — prints `Hello World` (Py/JS scaffold policy, Act I §8).

**`chapter-04:guardmap`** — build the roster. Expected output `Floor 2\nFloor 1\n5` (harness looks up Volkov, Chen, size).

```python
def build_roster():
    return {"Chen": "Floor 1", "Alvarez": "Floor 2", "Volkov": "Floor 2", "Park": "Floor 3", "Santos": "Floor 1"}
# harness: r = build_roster(); print(r["Volkov"]); print(r["Chen"]); print(len(r))
```
```javascript
function buildRoster() {
  return { Chen: "Floor 1", Alvarez: "Floor 2", Volkov: "Floor 2", Park: "Floor 3", Santos: "Floor 1" };
}
// harness: const r = buildRoster(); console.log(r.Volkov); console.log(r.Chen); console.log(Object.keys(r).length);
```
*Decision:* JS teaches the **plain object** as the dictionary (it's what JSON and every codebase uses); `Map` is mentioned in the manual, not required.

**`chapter-04:clearfloors`** — first floor no guard is on. Expected `Floor 4\nFloor 2\nFloor 3`.

```python
def find_clear_floor(guards, max_floor):
    occupied = set(guards.values())
    for i in range(1, max_floor + 1):
        if f"Floor {i}" not in occupied:
            return f"Floor {i}"
```
```javascript
function findClearFloor(guards, maxFloor) {
  const occupied = new Set(Object.values(guards));
  for (let i = 1; i <= maxFloor; i++) {
    if (!occupied.has(`Floor ${i}`)) return `Floor ${i}`;
  }
}
```
*Nuance:* Go fakes a set with `map[string]bool`; Python and JS have the real thing. The notes call this out — it's the first time another language is *simpler* than Go, which is worth saying. `range(1, max_floor + 1)` reprises the Ch2 off-by-one.

## 4. Phase 1 — Chapter 4.2 CIPHER RELAY (step by step)

**`chapter-04.2:scaffold`** — `Hello World`. (Go's three-import scaffold has no payload: everything this chapter uses is built in to Python and JS. The notes say so.)

**`chapter-04.2:reverseword`** — expected `olleh\noG\na`.
- Python: `s[::-1]` — slicing with a step; strings are immutable and already sequences of characters.
- JS: `[...s].reverse().join("")` — spreading a string yields whole characters (code points), the exact analog of Go's `[]rune`. `s.split("")` works on ASCII but splits emoji in half; a zen rule rewards the spread.

**`chapter-04.2:encode`** — expected `roolf si raelc\nevom ot tfahs 3\nround trip` (round trip is tested).
- Python: `" ".join(reverse_word(w) for w in msg.split())`
- JS: `msg.split(" ").map(reverseWord).join(" ")`

**`chapter-04.2:relayheader`** — expected `F2-C100\nF3-ERR\nF1-C50`. Rush mode shared.
- Python: `try: n = int(code)` / `except ValueError: return f"F{floor}-ERR"` — EAFP ("easier to ask forgiveness").
- JS: `const n = Number(code); if (Number.isNaN(n)) return ...` — JS doesn't throw on bad numbers, it hands back `NaN`. `parseInt("12abc")` is `12` — a trap the hints warn about.
- The manual's closing page puts the three side by side: Go returns the error, Python throws it, JavaScript poisons the value.

Book chapter titles: "Maps & Sets" → Python **"Dicts & Sets"**, JS **"Objects & Sets"**; "Strings & Runes" → **"Strings & Slices"** (Py) / **"Strings & Characters"** (JS). Maya's found-lines that say "maps" are localized too.

## 5. Phases 2–4 — the unbuilt chapters

### 5.1 Phase 2 — Ch 4.3 SIGNAL SORT + RELAY INTERCEPTOR (mini-boss)

Low divergence. `cleanMessage` → `.lower().replace()` / `.toLowerCase().replaceAll()`; `filterUrgent` → comprehension with `in`/`startswith` / `.filter()` with `includes`/`startsWith`; `sortByPriority` → `sorted(key=lambda m: (priority(m), m))` / `[...msgs].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))`.

- JS teaching trap: `.sort()` with no comparator sorts as strings (`[10, 9].sort()` → `[10, 9]`) **and mutates** — copy first. Zen rule + hint.
- Python's tuple key `(priority, text)` replaces Go's two-level `less` — a better lesson than the Go one; call it out.
- Relay Interceptor: four waves, each a function over a message buffer. The boss *mechanic* (waves, buffer, damage) is shared; per-language realization = starter code + harness per wave, exactly like the LOCKMASTER phases.
- **Decision needed:** 4.3 and B1.5 aren't in `curriculum.ts` Act II today. Recommendation: add both (they're specced, and 4.3's sorting is a prerequisite for the interceptor).

### 5.2 Phase 3 — Ch 5 ACCESS STRUCT + Ch 6 LOCK INTERFACE

The highest-divergence chapters. Same story, same expected output, different idiom per step:

| Step | Go | Python | JavaScript |
|---|---|---|---|
| 5·1 clearance enum | `type Clearance int` + `iota` + `String()` | `class Clearance(IntEnum)` + `__str__`, `Clearance(5)` → handled by a lookup helper | `Object.freeze({ VISITOR: 0, … })` + `clearanceName(c)` |
| 5·2 guard + methods | struct + value receivers `EndHour()`, `IsOnDuty(h)` | `@dataclass class Guard` + `end_hour()` / `is_on_duty(h)` | `class Guard` + `endHour()` / `isOnDuty(h)` |
| 5·2b pointer receiver | `func (g *Guard) Reassign()` mutates | "mutate `self`" vs "return a new guard" (`dataclasses.replace`) | "mutate `this`" vs spread copy `{ ...g }` |
| 5·3 embedding | `RadioEquipment{Equipment}` promotes `Gear()` | composition: `self.base.gear()` (or inheritance — notes compare) | composition (or `extends` + `super.gear()`) |
| 6·1 Lock + KeypadLock | implicit interface | duck typing; `typing.Protocol` shown in notes | duck typing; any object with `unlock(code)` |
| 6·2 LockError + Biometric | `type LockError struct` + `Error()`; `errors.New` | `class LockError(Exception)` with fields; `raise` | `class LockError extends Error` with fields; `throw` |
| 6·3 `openDoor(l Lock)` | `errors.As(err, &le)` | `except LockError as e` / `except Exception` | `catch (e) { if (e instanceof LockError) … }` |

- Ch 6's Go lesson is "errors are values". In Python/JS errors are *exceptions*, so the step's lesson is "catch the specific error first, the general one last". Same expected output (`OPEN`, `DENIED: west keypad`, `FAULT: east scanner (code 7)` …).
- Twist (K. VOLKOV in the roster) is shared story — no change.

### 5.3 Phase 3 — Ch 6.2 TEST CHAMBER

Go has `go test`; our sandboxes run one program and read stdout. Grading must stay "expectedOutput on stdout" for every language.

- **Go:** the spec already runs the tests from `main` and prints `PASS`/`FAIL` lines — keep that.
- **Python:** plain `assert` + a table of `(input, want)` tuples in a `test_reverse_word()` function the harness calls; the harness prints `PASS` if no `AssertionError`. `unittest` works in Pyodide but its stderr output fights stdout grading — keep it to the manual.
- **JavaScript:** no `node:test` in a Worker. Ship a tiny module (`./check.js` exporting `check(name, got, want)`) via `compileModule`, the same mechanism as Ch1's `cellblock`. Table tests are an array of objects + `for…of`.
- Callback to Ch 4.2/5 functions works in all three — the reference solutions carry forward.

### 5.4 Phase 4 — VASIK · TERMINAL 1

"Read his code, fix it" — the Go spec's bugs are syntax/compile errors (field vs method declaration, swallowed `return nil`). Model like the LOCKMASTER phases: shared duel, per-language **corrupted starter** that teaches that language's real failure modes:

- Python: `self` missing from a method, `raise` swallowed by a bare `except: pass`, mutable default argument, `==` vs `is`.
- JS: `this` lost in a callback, `catch {}` swallowing, `==` vs `===`, missing `return` in an arrow with braces.
- Expected outputs and Vasik's taunts are shared; only the code differs.

---

## 6. Infrastructure changes (small — the seam holds)

1. **Tests are per-realized-chapter, not per-act.** `act1-golden.test.ts` / `act1-content.test.ts` become `golden.test.ts` / `content.test.ts` and iterate over every chapter that has a realization. Fixtures split per act (`act1.fixtures.ts`, `act2.fixtures.ts`).
2. **Book `byLanguage` gains `found`**, so Maya's "maps — keys and values" line can say "dicts".
3. **`stake` on every Act II step** in the Go spine (the playbook rule Act II predates).
4. Phase 3 only: a shipped JS `check.js` module for 6.2 — uses the existing `compileModule` path; no backend change.
5. No backend work expected: Pyodide (3.14) has `enum`, `dataclasses`, `typing`; the JS worker runs ES2023 (`class`, `#private`, `replaceAll`, `Set`).

## 7. Per-chapter checklist (each language)

- [ ] Realization in `src/data/challenges/<lang>/act-2.ts` (brief, hints ×3, quickCheck, harness, expectedOutput, requiredCode if hardcoding is possible)
- [ ] Reference solution + hardcoded shortcut in `src/lib/lang/act2.fixtures.ts`
- [ ] Maya bank per step in `src/lib/ai/banks/<lang>.ts` (offline patterns recognise a correct program; classic mistakes caught first)
- [ ] Zen rules (`py_*` / `js_*`) with `isRelevant` guards + before/after in `zen-examples.<lang>.ts`
- [ ] Field-manual notes in `beginner-notes.<lang>.ts` (`blocks` + `notesBlocks`, no Go diagrams)
- [ ] Book chapter title/found overrides in `book.ts`
- [ ] `golden.test.ts` + `content.test.ts` green; `/dev/lang?lang=<lang>` RUN; one manual playthrough

## 8. Decisions (recommendations — flag if you disagree)

1. **JS dictionary = plain object**, not `Map`, for Ch 4. *(Matches JSON/real-world code; `Map` noted in the manual.)*
2. **Scaffold steps stay `Hello World`** in Py/JS even where Go's scaffold teaches multi-import (4.2).
3. **Error-model divergence is the feature**: Python `try/except`, JS `NaN` check — not a forced "return a tuple/result" style to mimic Go.
4. **Add Ch 4.3 and the Relay Interceptor to the Act II curriculum** (Phase 2).
5. **Test Chamber grades on stdout** in every language (no test-runner integration).
6. **Phases 2–4 ship trilingual** — every new chapter lands in Go, Python and JS in one PR.
7. **Go Act II catch-up (separate, Go-only):** Ch 4/4.2 Go scaffolds still inject `package main` and print `ready`, against today's "empty editor → Hello World" rule. Worth a Go-only pass; out of scope for the cross-language work.
