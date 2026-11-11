// ── Act III in Python ──
// Same steps, stakes, XP and events as the Go chapters; the code-shaped half is
// realized here. Divergences (docs/act-3-plan.md §3):
//   • a closure that changes an outer counter needs `nonlocal`
//   • `defer` becomes try/finally; panic/recover becomes raise/except
//   • goroutines become asyncio tasks; WaitGroup + results slice is gather()
//   • a channel with room for one becomes a Task (it holds its one result)
//   • select → asyncio.wait(FIRST_COMPLETED); time.After → wait(timeout=…);
//     a non-blocking `default` → task.done(), in a plain (non-async) function
// Async code runs on the sandbox's virtual clock, so sleeps are instant and
// timings are exact (src/lib/python/driver.ts).

import type { ChallengeRealization, ChallengeHint, QuickCheck, StepRealization } from "@/types/game";
import { CH07_RECOVER_OUTPUT, CH07_SCAN_OUTPUT } from "../chapter-07";
import { CH08_FANOUT_OUTPUT, CH08_WINDOW_OUTPUT } from "../chapter-08";
import { CH09_TIMEOUT_OUTPUT } from "../chapter-09";

const helloScaffold = (note: string): StepRealization => ({
  brief: `Wake the terminal: print \`Hello World\`. ${note}`,
  expectedBehavior: "Hello World",
  expectedOutput: "Hello World",
  quickCheck: {
    prompt: "same one-liner, new terminal — tap whatever you need a refresher on.",
    items: [
      { question: "how do i print again?", answer: "`print(\"Hello World\")` — one line is the whole program." },
      { question: "do i need an import yet?", answer: "not for this line. add an import at the top of the file when a step first uses it." },
    ],
  } satisfies QuickCheck,
  hints: [
    { level: 1, text: "`print(...)` writes a line to the terminal.", energyCost: 5 },
    { level: 2, text: "text goes in quotes inside the brackets.", energyCost: 8 },
    { level: 3, text: "`print(\"Hello World\")`", energyCost: 12 },
  ] satisfies ChallengeHint[],
});

const ARCHIVE = `archive = {
    "root": ["config.dat", "logs/", "servers/"],
    "logs": ["access.log", "error.log"],
    "servers": ["alpha/", "beta/", "gamma/"],
    "alpha": ["thesis_v1.enc", "readme.txt"],
    "beta": ["backup.dat"],
    "gamma": ["thesis_v2.enc", "thesis_v3.enc", "notes.txt"],
}`;

const CORRUPTED = `archive = {
    "root": ["config.dat", "logs/", "servers/", "vault/"],
    "logs": ["access.log", "error.log"],
    "servers": ["alpha/", "beta/", "gamma/"],
    "alpha": ["thesis_v1.enc", "readme.txt"],
    "beta": ["backup.dat"],
    "gamma": ["thesis_v2.enc", "thesis_v3.enc", "notes.txt"],
    "vault": None,
}`;

export const PY_CHAPTER_07: ChallengeRealization = {
  concepts: ["Closures", "nonlocal", "Recursion", "try/finally", "Exceptions"],
  steps: {
    "chapter-07:scaffold": helloScaffold("The archive scan comes next."),
    "chapter-07:scan": {
      brief:
        "Write `scan_archive(archive, root)` that returns how many files are in the tree.\n\nInside it: `count = 0`, and an inner function `scan(d)` that walks one directory — an entry ending in `/` is a directory (call `scan` on the name without the slash), anything else is a file. The inner function changes `count`, so it needs `nonlocal count`. Wrap the walk in `try:` … `finally: print(\"scanned:\", d)` so each directory logs as it finishes.\n\nThe terminal scans the archive, then a small test tree:\n\nscanned: logs\nscanned: alpha\nscanned: beta\nscanned: gamma\nscanned: servers\nscanned: root\ntotal files: 9\nscanned: b\nscanned: a\ntotal files: 2",
      expectedBehavior: CH07_SCAN_OUTPUT,
      testHarness: `${ARCHIVE}
print("total files:", scan_archive(archive, "root"))
print("total files:", scan_archive({"a": ["x.txt", "b/"], "b": ["y.txt"]}, "a"))`,
      expectedOutput: CH07_SCAN_OUTPUT,
      requiredCode: ["nonlocal", "finally"],
      quickCheck: {
        prompt: "stuck in the tree? tap the question that's in your head.",
        items: [
          { question: "how can a function call itself?", answer: "just call it by name inside its own body — `scan(entry[:-1])`. each call gets its own `d` and walks one level deeper." },
          { question: "why do i get UnboundLocalError on count?", answer: "assigning `count += 1` inside `scan` makes python treat `count` as scan's own variable. `nonlocal count` says: i mean the one in scan_archive." },
          { question: "why does `scanned: root` print last?", answer: "`finally` runs as the function finishes. root starts first and finishes last, so its line comes out at the end." },
          { question: "how do i tell a directory from a file?", answer: "`entry.endswith(\"/\")`. strip the slash with `entry[:-1]`." },
        ],
      },
      hints: [
        { level: 1, text: "`count = 0` in scan_archive, `count += 1` inside scan — and `nonlocal count` as scan's first line so it's the same variable.", energyCost: 5 },
        { level: 2, text: "inside scan: `for entry in archive[d]:` — `if entry.endswith(\"/\"): scan(entry[:-1])`, `else: count += 1`.", energyCost: 8 },
        { level: 3, text: "wrap the loop: `try:` … `finally: print(\"scanned:\", d)`. after the inner function: `scan(root)` then `return count`.", energyCost: 12 },
      ],
    },
    "chapter-07:recover": {
      brief:
        "Write `safe_scan(archive, root)` that returns `(count, errors)` — the same scan, but a directory whose entries are `None` is corrupted: `raise RuntimeError(\"corrupted directory\")`.\n\nEach `scan` call catches its own error with `except Exception as e:`, appends `f\"{d}: {e}\"` to `errors`, and the walk carries on. Keep the `finally` that prints `scanned:`.\n\nscanned: logs … scanned: vault\nscanned: root\ntotal files: 9\nERROR: vault: corrupted directory\n…and the same for a small test tree.",
      expectedBehavior: CH07_RECOVER_OUTPUT,
      testHarness: `${CORRUPTED}
count, errors = safe_scan(archive, "root")
print("total files:", count)
for e in errors:
    print("ERROR:", e)
count, errors = safe_scan({"a": ["x.txt", "bad/", "b/"], "b": ["y.txt"], "bad": None}, "a")
print("total files:", count)
for e in errors:
    print("ERROR:", e)`,
      expectedOutput: CH07_RECOVER_OUTPUT,
      requiredCode: ["raise", "except"],
      quickCheck: {
        prompt: "stuck on the trap? tap the question that's in your head.",
        items: [
          { question: "what does raise do?", answer: "it stops the function on the spot and travels back up the calls until something catches it. if nothing does, the program crashes." },
          { question: "where does the except go?", answer: "inside `scan`, around the walk: `try:` the loop, `except Exception as e:` record it, `finally:` print. each call guards itself." },
          { question: "why does the scan keep going after vault?", answer: "vault's own call catches vault's error and returns normally, so root's loop simply moves on to the next entry." },
          { question: "does errors need nonlocal too?", answer: "no — `errors.append(...)` changes the list, it doesn't reassign the name. only `count += 1` needs `nonlocal`." },
        ],
      },
      hints: [
        { level: 1, text: "`if archive[d] is None: raise RuntimeError(\"corrupted directory\")` at the top of the walk.", energyCost: 5 },
        { level: 2, text: "`try:` the walk, `except Exception as e: errors.append(f\"{d}: {e}\")`, `finally: print(\"scanned:\", d)`.", energyCost: 8 },
        { level: 3, text: "`errors = []` next to `count = 0`. at the end: `scan(root)` and `return count, errors`.", energyCost: 12 },
      ],
    },
  },
};

const CIRCUITS = `["North", "South", "East", "West"]`;

export const PY_CHAPTER_08: ChallengeRealization = {
  concepts: ["async/await", "Tasks", "asyncio.gather"],
  steps: {
    "chapter-08:scaffold": helloScaffold("`asyncio` joins the imports in the next step."),
    "chapter-08:goroutine": {
      brief:
        "`import asyncio`. Write `async def cut(name)` that prints `<name> circuit: DOWN`, and `cut_async(name)` that starts `cut` as a task — `asyncio.create_task(cut(name))` — and returns straight away without waiting.\n\nThe terminal launches South, says so, then waits 100ms for the task to finish:\n\nNorth circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      expectedBehavior: "North circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      testHarness: `import asyncio
await cut("North")
cut_async("South")
print("orders sent")
await asyncio.sleep(0.1)
print("power cycle complete")`,
      expectedOutput: "North circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      quickCheck: {
        prompt: "stuck on the task? tap the question that's in your head.",
        items: [
          { question: "what does `async def` change?", answer: "calling it no longer runs it — it hands you a coroutine, a plan for the work. something has to `await` it or schedule it." },
          { question: "what does create_task do?", answer: "it schedules the coroutine to run alongside everything else and hands back a task at once. the caller doesn't wait." },
          { question: "why does `orders sent` print before South?", answer: "the task only gets a turn when the caller pauses — at the terminal's `await asyncio.sleep(0.1)`. a task nobody waits for never runs at all." },
        ],
      },
      hints: [
        { level: 1, text: "`async def cut(name):` then `print(f\"{name} circuit: DOWN\")`.", energyCost: 5 },
        { level: 2, text: "calling `cut(\"South\")` on its own does nothing — it just makes a coroutine. `asyncio.create_task(...)` is what starts it.", energyCost: 8 },
        { level: 3, text: "`def cut_async(name): return asyncio.create_task(cut(name))` — and `import asyncio` at the top.", energyCost: 12 },
      ],
    },
    "chapter-08:fanout": {
      brief:
        "Write `async def cut_all(circuits)`: one coroutine per circuit, run together with `asyncio.gather`, returning the confirmations in circuit order.\n\n`gather` is the waiting AND the results list in one call: it runs everything at once, waits for all of it, and hands back the results in the order you passed them.\n\nNorth circuit: DOWN\nSouth circuit: DOWN\nEast circuit: DOWN\nWest circuit: DOWN\nALL CIRCUITS DOWN\nAux circuit: DOWN",
      expectedBehavior: CH08_FANOUT_OUTPUT,
      testHarness: `for line in await cut_all(${CIRCUITS}):
    print(line)
print("ALL CIRCUITS DOWN")
for line in await cut_all(["Aux"]):
    print(line)`,
      expectedOutput: CH08_FANOUT_OUTPUT,
      requiredCode: ["gather"],
      quickCheck: {
        prompt: "stuck on the fan-out? tap the question that's in your head.",
        items: [
          { question: "what does gather do?", answer: "`await asyncio.gather(a, b, c)` runs them all at once and waits until every one is done. you get back a list of their results." },
          { question: "what order do the results come in?", answer: "the order you passed them in — not the order they finished. so the confirmations line up with the circuits." },
          { question: "how do i pass a whole list to gather?", answer: "unpack it with a star: `asyncio.gather(*(trip(n) for n in circuits))`." },
          { question: "can't i just await each one in a loop?", answer: "that runs them one after another — the caller waits on each before starting the next. gather starts them all first." },
        ],
      },
      hints: [
        { level: 1, text: "a helper `async def trip(name): return f\"{name} circuit: DOWN\"` — one coroutine per breaker.", energyCost: 8 },
        { level: 2, text: "`asyncio.gather(...)` takes the coroutines as separate arguments — unpack with `*`.", energyCost: 12 },
        { level: 3, text: "`return await asyncio.gather(*(trip(n) for n in circuits))`.", energyCost: 20 },
      ],
    },
    "chapter-08:window": {
      brief:
        "Write `async def cut_timed(circuits, delays)` — the same fan-out, but each breaker first waits its delay in milliseconds (`await asyncio.sleep(d / 1000)`), then returns `<name> circuit: DOWN (<delay>ms)`.\n\nThe terminal times it. One at a time takes the SUM of the delays — 1100ms, two power cycles, alarm. All at once takes the slowest — 450ms.\n\nNorth circuit: DOWN (300ms)\nSouth circuit: DOWN (150ms)\nEast circuit: DOWN (450ms)\nWest circuit: DOWN (200ms)\nwindow: SINGLE CYCLE - alarm blind\nALL CIRCUITS DOWN",
      expectedBehavior: CH08_WINDOW_OUTPUT,
      testHarness: `import asyncio
loop = asyncio.get_running_loop()
circuits = ${CIRCUITS}
delays = [300, 150, 450, 200]
start = loop.time()
lines = await cut_timed(circuits, delays)
elapsed_ms = round((loop.time() - start) * 1000)
for line in lines:
    print(line)
if elapsed_ms < 1100:
    print("window: SINGLE CYCLE - alarm blind")
else:
    print("window: MULTI CYCLE - alarm tripped")
print("ALL CIRCUITS DOWN")`,
      expectedOutput: CH08_WINDOW_OUTPUT,
      requiredCode: ["gather", "asyncio.sleep"],
      quickCheck: {
        prompt: "stuck on the timing? tap the question that's in your head.",
        items: [
          { question: "how do i wait without freezing everything?", answer: "`await asyncio.sleep(seconds)`. while one breaker waits, the others get their turn. `time.sleep` would stop the whole program." },
          { question: "how do i walk names and delays together?", answer: "`zip(circuits, delays)` pairs them up: `for n, d in zip(circuits, delays)`." },
          { question: "milliseconds or seconds?", answer: "asyncio.sleep takes seconds — `d / 1000`." },
        ],
      },
      hints: [
        { level: 1, text: "the step 2 shape, with a sleep first: `async def trip(n, d): await asyncio.sleep(d / 1000); return ...`.", energyCost: 8 },
        { level: 2, text: "pair them with zip: `asyncio.gather(*(trip(n, d) for n, d in zip(circuits, delays)))`.", energyCost: 12 },
        { level: 3, text: "the line is `f\"{n} circuit: DOWN ({d}ms)\"`. all four sleep at once, so the window is the slowest breaker — not the sum.", energyCost: 20 },
      ],
    },
  },
};

export const PY_CHAPTER_09: ChallengeRealization = {
  concepts: ["Tasks", "asyncio.wait", "Timeouts"],
  steps: {
    "chapter-09:scaffold": helloScaffold("`asyncio` joins the imports in the next step."),
    "chapter-09:hail": {
      brief:
        "`import asyncio`. Write `hail(team, delay_ms)` — a plain `def` that returns a task right away. Inside, an `async def respond()` sleeps `delay_ms` milliseconds and returns `<team> responding`; `hail` returns `asyncio.create_task(respond())`.\n\nA task holds its one answer until someone asks for it. The terminal awaits it — awaiting is waiting:\n\nhailing Bravo...\nBravo responding\nchannel confirmed",
      expectedBehavior: "hailing Bravo...\nBravo responding\nchannel confirmed",
      testHarness: `t = hail("Bravo", 100)
print("hailing Bravo...")
print(await t)
print("channel confirmed")`,
      expectedOutput: "hailing Bravo...\nBravo responding\nchannel confirmed",
      requiredCode: ["create_task"],
      quickCheck: {
        prompt: "stuck on the hail? tap the question that's in your head.",
        items: [
          { question: "why return a task instead of the answer?", answer: "so the call comes back at once and the team answers in the background. you hail all three teams before waiting on any of them." },
          { question: "can a function be defined inside another one?", answer: "yes — `respond` sees `team` and `delay_ms` from hail, the same closure idea as the archive scan." },
          { question: "what does `await t` give me?", answer: "the task's return value, once it's ready. if it's already finished, you get it immediately." },
        ],
      },
      hints: [
        { level: 1, text: "inside hail: `async def respond(): await asyncio.sleep(delay_ms / 1000); return f\"{team} responding\"`.", energyCost: 5 },
        { level: 2, text: "hail itself is NOT async — it returns `asyncio.create_task(respond())` straight away.", energyCost: 8 },
        { level: 3, text: "full shape: `def hail(team, delay_ms):` → inner `async def respond()` → `return asyncio.create_task(respond())`.", energyCost: 12 },
      ],
    },
    "chapter-09:first": {
      brief:
        "Write `async def first_responder(alpha, bravo, charlie)` that waits on all three tasks at once and returns whichever answer lands first: `asyncio.wait([...], return_when=asyncio.FIRST_COMPLETED)` gives back `(done, pending)`.\n\nhailing all teams...\nfirst contact: Bravo responding",
      expectedBehavior: "hailing all teams...\nfirst contact: Bravo responding",
      testHarness: `a = hail("Alpha", 200)
b = hail("Bravo", 100)
c = hail("Charlie", 300)
print("hailing all teams...")
print("first contact: " + await first_responder(a, b, c))`,
      expectedOutput: "hailing all teams...\nfirst contact: Bravo responding",
      requiredCode: ["FIRST_COMPLETED"],
      quickCheck: {
        prompt: "stuck on first contact? tap the question that's in your head.",
        items: [
          { question: "what does asyncio.wait return?", answer: "two sets: `done` (finished tasks) and `pending` (still running). with FIRST_COMPLETED it returns as soon as one finishes." },
          { question: "how do i get the answer out of done?", answer: "`done.pop().result()` — take the finished task, read its return value." },
          { question: "why not just `await alpha`?", answer: "that waits for Alpha even though Bravo answered sooner. wait listens to all three at once." },
          { question: "what about the teams that lose?", answer: "they're still running. tidy up with `for t in pending: t.cancel()` — a task you've stopped caring about shouldn't keep working." },
        ],
      },
      hints: [
        { level: 1, text: "`done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)`.", energyCost: 8 },
        { level: 2, text: "`done` holds the winner: `return done.pop().result()`.", energyCost: 12 },
        { level: 3, text: "before returning, cancel the losers: `for t in pending: t.cancel()`.", energyCost: 20 },
      ],
    },
    "chapter-09:timeout": {
      brief:
        "Two functions.\n\n`async def await_contact(alpha, bravo, charlie, timeout_ms)` — step 2's wait with a deadline: `asyncio.wait(..., timeout=timeout_ms / 1000, return_when=asyncio.FIRST_COMPLETED)`. If `done` comes back empty, return `NO CONTACT`.\n\n`def sweep(task)` — NOT async: if `task.done()`, return its result, otherwise `channel silent` straight away.\n\ncontact: Bravo responding\ncontact: NO CONTACT\ncontact: Alpha responding\nsweep: Bravo holding at dock 4\nsweep: channel silent\nextraction locked",
      expectedBehavior: CH09_TIMEOUT_OUTPUT,
      testHarness: `import asyncio
loop = asyncio.get_running_loop()
a = hail("Alpha", 250)
b = hail("Bravo", 100)
c = hail("Charlie", 400)
print("contact: " + await await_contact(a, b, c, 600))
jammed = loop.create_future()
t0 = loop.time()
reply = await await_contact(jammed, jammed, jammed, 200)
print("contact: " + (reply if loop.time() - t0 < 1 else f"waited {round(loop.time() - t0)}s for a 200ms deadline"))
print("contact: " + await await_contact(hail("Alpha", 300), loop.create_future(), loop.create_future(), 500))
ready = loop.create_future()
ready.set_result("Bravo holding at dock 4")
print("sweep: " + sweep(ready))
print("sweep: " + sweep(loop.create_future()))
print("extraction locked")`,
      expectedOutput: CH09_TIMEOUT_OUTPUT,
      requiredCode: ["timeout=", ".done()"],
      quickCheck: {
        prompt: "stuck on the deadline? tap the question that's in your head.",
        items: [
          { question: "how does the timeout work?", answer: "`asyncio.wait(tasks, timeout=0.2, ...)` stops waiting after 0.2 seconds. if nothing finished, `done` is empty." },
          { question: "why is sweep a plain def?", answer: "it must never wait. an `async def` exists so it CAN pause — sweep only looks: `task.done()` is true or it isn't." },
          { question: "timeout or a quick look — which when?", answer: "await_contact waits, but not past the deadline. sweep doesn't wait at all. know which one the moment needs." },
        ],
      },
      hints: [
        { level: 1, text: "`done, pending = await asyncio.wait([alpha, bravo, charlie], timeout=timeout_ms / 1000, return_when=asyncio.FIRST_COMPLETED)`.", energyCost: 8 },
        { level: 2, text: "`if not done: return \"NO CONTACT\"` — otherwise `done.pop().result()`.", energyCost: 12 },
        { level: 3, text: "`def sweep(task): return task.result() if task.done() else \"channel silent\"`.", energyCost: 20 },
      ],
    },
  },
};

/** Boss 3 is judged, not stepped: its per-language code lives in boss-03.ts (ALLEGIANCE). */
export const PY_BOSS_03: ChallengeRealization = {
  concepts: ["reading code", "views share memory", "copy before you send"],
  steps: {},
};
