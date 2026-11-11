// ── Act III in JavaScript ──
// Same steps, stakes, XP and events as the Go chapters; the code-shaped half is
// realized here. Divergences (docs/act-3-plan.md §3):
//   • `defer` becomes try/finally; panic/recover becomes throw/catch
//   • goroutines become the event loop: setTimeout schedules work for later,
//     Promise.all is WaitGroup + results slice in one call
//   • JS never kills unfinished work when the script ends — the observable
//     lesson is ORDER ("orders sent" prints before South)
//   • a channel with room for one becomes a Promise (it settles once)
//   • select → Promise.race; time.After → race a timer; a non-blocking
//     `default` → race against a value that's ready right now
// Code runs on the sandbox's virtual clock (src/lib/javascript/runtime.ts).

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
      { question: "how do i print again?", answer: "`console.log(\"Hello World\");` — one line is the whole program." },
      { question: "do i need an import?", answer: "no. everything this chapter uses is built into javascript." },
    ],
  } satisfies QuickCheck,
  hints: [
    { level: 1, text: "`console.log(...)` writes a line to the terminal.", energyCost: 5 },
    { level: 2, text: "text goes in quotes inside the brackets.", energyCost: 8 },
    { level: 3, text: "`console.log(\"Hello World\");`", energyCost: 12 },
  ] satisfies ChallengeHint[],
});

const ARCHIVE = `const archive = {
  root: ["config.dat", "logs/", "servers/"],
  logs: ["access.log", "error.log"],
  servers: ["alpha/", "beta/", "gamma/"],
  alpha: ["thesis_v1.enc", "readme.txt"],
  beta: ["backup.dat"],
  gamma: ["thesis_v2.enc", "thesis_v3.enc", "notes.txt"],
};`;

const CORRUPTED = `const archive = {
  root: ["config.dat", "logs/", "servers/", "vault/"],
  logs: ["access.log", "error.log"],
  servers: ["alpha/", "beta/", "gamma/"],
  alpha: ["thesis_v1.enc", "readme.txt"],
  beta: ["backup.dat"],
  gamma: ["thesis_v2.enc", "thesis_v3.enc", "notes.txt"],
  vault: null,
};`;

export const JS_CHAPTER_07: ChallengeRealization = {
  concepts: ["Closures", "Recursion", "try/finally", "throw/catch"],
  steps: {
    "chapter-07:scaffold": helloScaffold("The archive scan comes next."),
    "chapter-07:scan": {
      brief:
        "Write `scanArchive(archive, root)` that returns how many files are in the tree.\n\nInside it: `let count = 0;` and an inner function `scan(dir)` that walks one directory — an entry ending in `/` is a directory (call `scan` on the name without the slash), anything else is a file (`count++`). Wrap the walk in `try { … } finally { console.log(\"scanned:\", dir); }` so each directory logs as it finishes.\n\nThe terminal scans the archive, then a small test tree:\n\nscanned: logs\nscanned: alpha\nscanned: beta\nscanned: gamma\nscanned: servers\nscanned: root\ntotal files: 9\nscanned: b\nscanned: a\ntotal files: 2",
      expectedBehavior: CH07_SCAN_OUTPUT,
      testHarness: `${ARCHIVE}
console.log("total files:", scanArchive(archive, "root"));
console.log("total files:", scanArchive({ a: ["x.txt", "b/"], b: ["y.txt"] }, "a"));`,
      expectedOutput: CH07_SCAN_OUTPUT,
      requiredCode: ["finally", "scan("],
      quickCheck: {
        prompt: "stuck in the tree? tap the question that's in your head.",
        items: [
          { question: "how can a function call itself?", answer: "just call it by name inside its own body — `scan(entry.slice(0, -1))`. each call gets its own `dir` and walks one level deeper." },
          { question: "how does the inner function change count?", answer: "it's a closure — `scan` captures `count` from scanArchive, so `count++` inside changes the same variable scanArchive returns." },
          { question: "why does `scanned: root` print last?", answer: "`finally` runs as the function finishes. root starts first and finishes last, so its line comes out at the end." },
          { question: "how do i tell a directory from a file?", answer: "`entry.endsWith(\"/\")`. strip the slash with `entry.slice(0, -1)`." },
        ],
      },
      hints: [
        { level: 1, text: "closures capture outer variables: `let count = 0;` in scanArchive, `count++` inside scan — same variable.", energyCost: 5 },
        { level: 2, text: "inside scan: `for (const entry of archive[dir])` — `if (entry.endsWith(\"/\")) scan(entry.slice(0, -1)); else count++;`.", energyCost: 8 },
        { level: 3, text: "wrap the loop in `try { … } finally { console.log(\"scanned:\", dir); }`. then `scan(root); return count;`.", energyCost: 12 },
      ],
    },
    "chapter-07:recover": {
      brief:
        "Write `safeScan(archive, root)` that returns `{ count, errors }` — the same scan, but a directory whose entries are `null` is corrupted: `throw new Error(\"corrupted directory\")`.\n\nEach `scan` call catches its own error with `catch (e)`, pushes `` `${dir}: ${e.message}` `` onto `errors`, and the walk carries on. Keep the `finally` that logs `scanned:`.\n\nscanned: logs … scanned: vault\nscanned: root\ntotal files: 9\nERROR: vault: corrupted directory\n…and the same for a small test tree.",
      expectedBehavior: CH07_RECOVER_OUTPUT,
      testHarness: `${CORRUPTED}
let result = safeScan(archive, "root");
console.log("total files:", result.count);
for (const e of result.errors) console.log("ERROR:", e);
result = safeScan({ a: ["x.txt", "bad/", "b/"], b: ["y.txt"], bad: null }, "a");
console.log("total files:", result.count);
for (const e of result.errors) console.log("ERROR:", e);`,
      expectedOutput: CH07_RECOVER_OUTPUT,
      requiredCode: ["throw", "catch"],
      quickCheck: {
        prompt: "stuck on the trap? tap the question that's in your head.",
        items: [
          { question: "what does throw do?", answer: "it stops the function on the spot and travels back up the calls until a `catch` takes it. if nothing does, the program crashes." },
          { question: "where does the catch go?", answer: "inside `scan`, around the walk: `try` the loop, `catch (e)` record it, `finally` log. each call guards itself." },
          { question: "why does the scan keep going after vault?", answer: "vault's own call catches vault's error and returns normally, so root's loop simply moves on to the next entry." },
          { question: "how do i return two things?", answer: "an object: `return { count, errors };` — the terminal reads `.count` and `.errors`." },
        ],
      },
      hints: [
        { level: 1, text: "`if (archive[dir] === null) throw new Error(\"corrupted directory\");` at the top of the walk.", energyCost: 5 },
        { level: 2, text: "``try { …walk… } catch (e) { errors.push(`${dir}: ${e.message}`); } finally { console.log(\"scanned:\", dir); }``", energyCost: 8 },
        { level: 3, text: "`const errors = [];` next to `let count = 0;`. at the end: `scan(root); return { count, errors };`.", energyCost: 12 },
      ],
    },
  },
};

const CIRCUITS = `["North", "South", "East", "West"]`;

export const JS_CHAPTER_08: ChallengeRealization = {
  concepts: ["Event Loop", "setTimeout", "Promises", "Promise.all"],
  steps: {
    "chapter-08:scaffold": helloScaffold("Breakers come next."),
    "chapter-08:goroutine": {
      brief:
        "Write `cut(name)` that logs `<name> circuit: DOWN`, and `cutAsync(name)` that schedules `cut` to run later — `setTimeout(() => cut(name), 0)` — and returns straight away without waiting.\n\nThe terminal launches South, says so, then waits 100ms:\n\nNorth circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      expectedBehavior: "North circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      testHarness: `cut("North");
cutAsync("South");
console.log("orders sent");
await new Promise((resolve) => setTimeout(resolve, 100));
console.log("power cycle complete");`,
      expectedOutput: "North circuit: DOWN\norders sent\nSouth circuit: DOWN\npower cycle complete",
      quickCheck: {
        prompt: "stuck on scheduling? tap the question that's in your head.",
        items: [
          { question: "what does setTimeout actually do?", answer: "it hands a function to the event loop to run later and returns at once. the code after it keeps going." },
          { question: "why does `orders sent` print before South?", answer: "javascript finishes what it's doing first. the scheduled cut only runs when the current code pauses or ends." },
          { question: "why the 0?", answer: "zero milliseconds means as soon as possible — still later, never right now." },
        ],
      },
      hints: [
        { level: 1, text: "``function cut(name) { console.log(`${name} circuit: DOWN`); }``", energyCost: 5 },
        { level: 2, text: "calling `cut(name)` directly runs it right now — South would print before `orders sent`. schedule it instead.", energyCost: 8 },
        { level: 3, text: "`function cutAsync(name) { setTimeout(() => cut(name), 0); }`", energyCost: 12 },
      ],
    },
    "chapter-08:fanout": {
      brief:
        "Write `async function cutAll(circuits)` that starts one async job per circuit and waits for all of them with `Promise.all`, returning the confirmations in circuit order.\n\n`Promise.all` is the waiting AND the results array in one call: everything runs at once, and the results come back in the order you passed them.\n\nNorth circuit: DOWN\nSouth circuit: DOWN\nEast circuit: DOWN\nWest circuit: DOWN\nALL CIRCUITS DOWN\nAux circuit: DOWN",
      expectedBehavior: CH08_FANOUT_OUTPUT,
      testHarness: `for (const line of await cutAll(${CIRCUITS})) console.log(line);
console.log("ALL CIRCUITS DOWN");
for (const line of await cutAll(["Aux"])) console.log(line);`,
      expectedOutput: CH08_FANOUT_OUTPUT,
      requiredCode: ["Promise.all"],
      quickCheck: {
        prompt: "stuck on the fan-out? tap the question that's in your head.",
        items: [
          { question: "what is a Promise?", answer: "a value that isn't ready yet. `await` pauses until it is. an `async` function always hands back a promise." },
          { question: "what does Promise.all do?", answer: "give it an array of promises and it waits for every one, then hands back an array of their results — in the order you gave them." },
          { question: "how do i make one promise per circuit?", answer: "`circuits.map(async (name) => ...)` — an async arrow returns a promise for each." },
        ],
      },
      hints: [
        { level: 1, text: "``circuits.map(async (name) => `${name} circuit: DOWN`)`` gives you an array of promises.", energyCost: 8 },
        { level: 2, text: "`Promise.all(array)` waits for all of them and keeps their order.", energyCost: 12 },
        { level: 3, text: "``return Promise.all(circuits.map(async (name) => `${name} circuit: DOWN`));``", energyCost: 20 },
      ],
    },
    "chapter-08:window": {
      brief:
        "Write `async function cutTimed(circuits, delays)` — the same fan-out, but each breaker first waits its delay in milliseconds, then returns `<name> circuit: DOWN (<delay>ms)`.\n\nYou need a `sleep(ms)` that returns a promise: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`\n\nThe terminal times it. One at a time takes the SUM — 1100ms, two power cycles, alarm. All at once takes the slowest — 450ms.\n\nNorth circuit: DOWN (300ms)\nSouth circuit: DOWN (150ms)\nEast circuit: DOWN (450ms)\nWest circuit: DOWN (200ms)\nwindow: SINGLE CYCLE - alarm blind\nALL CIRCUITS DOWN",
      expectedBehavior: CH08_WINDOW_OUTPUT,
      testHarness: `const circuits = ${CIRCUITS};
const delays = [300, 150, 450, 200];
const start = performance.now();
const lines = await cutTimed(circuits, delays);
const elapsed = performance.now() - start;
for (const line of lines) console.log(line);
if (elapsed < 1100) console.log("window: SINGLE CYCLE - alarm blind");
else console.log("window: MULTI CYCLE - alarm tripped");
console.log("ALL CIRCUITS DOWN");`,
      expectedOutput: CH08_WINDOW_OUTPUT,
      requiredCode: ["Promise.all", "setTimeout"],
      quickCheck: {
        prompt: "stuck on the timing? tap the question that's in your head.",
        items: [
          { question: "how does sleep work?", answer: "`new Promise((resolve) => setTimeout(resolve, ms))` — a promise that the timer resolves after `ms`. `await sleep(300)` pauses just that job." },
          { question: "how do i get each circuit's delay?", answer: "`map` passes the index as a second argument: `circuits.map(async (name, i) => ...)` — then `delays[i]`." },
          { question: "why not await in a for loop?", answer: "each `await` finishes before the next breaker starts — the sum, not the max. start them all, then wait once with Promise.all." },
        ],
      },
      hints: [
        { level: 1, text: "write `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));` first.", energyCost: 8 },
        { level: 2, text: "`circuits.map(async (name, i) => { await sleep(delays[i]); return ...; })`", energyCost: 12 },
        { level: 3, text: "wrap the map in `Promise.all(...)` and return it. the line is `` `${name} circuit: DOWN (${delays[i]}ms)` ``.", energyCost: 20 },
      ],
    },
  },
};

export const JS_CHAPTER_09: ChallengeRealization = {
  concepts: ["Promises", "Promise.race", "Timeouts"],
  steps: {
    "chapter-09:scaffold": helloScaffold("Frequencies come next."),
    "chapter-09:hail": {
      brief:
        "Write `hail(team, delayMs)` that returns a promise straight away — `new Promise((resolve) => setTimeout(() => resolve(...), delayMs))` — which settles with `<team> responding` after `delayMs` milliseconds.\n\nA promise settles once and holds its answer. The terminal awaits it — awaiting is waiting:\n\nhailing Bravo...\nBravo responding\nchannel confirmed",
      expectedBehavior: "hailing Bravo...\nBravo responding\nchannel confirmed",
      testHarness: `const p = hail("Bravo", 100);
console.log("hailing Bravo...");
console.log(await p);
console.log("channel confirmed");`,
      expectedOutput: "hailing Bravo...\nBravo responding\nchannel confirmed",
      requiredCode: ["new Promise", "setTimeout"],
      quickCheck: {
        prompt: "stuck on the hail? tap the question that's in your head.",
        items: [
          { question: "what is `resolve`?", answer: "the function a promise hands you to deliver its answer. call `resolve(value)` once and the promise settles with that value." },
          { question: "why return a promise instead of the answer?", answer: "so the call comes back at once and the team answers later. you hail all three teams before waiting on any." },
          { question: "what does `await p` give me?", answer: "the value the promise settled with. if it's already settled, you get it on the next tick." },
        ],
      },
      hints: [
        { level: 1, text: "`return new Promise((resolve) => { ... });` — the function you pass gets `resolve`.", energyCost: 5 },
        { level: 2, text: "inside, start a timer: ``setTimeout(() => resolve(`${team} responding`), delayMs);``", energyCost: 8 },
        { level: 3, text: "``function hail(team, delayMs) { return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), delayMs)); }``", energyCost: 12 },
      ],
    },
    "chapter-09:first": {
      brief:
        "Write `firstResponder(alpha, bravo, charlie)` that returns whichever answer lands first: `Promise.race([...])` settles with the first promise to settle.\n\nhailing all teams...\nfirst contact: Bravo responding",
      expectedBehavior: "hailing all teams...\nfirst contact: Bravo responding",
      testHarness: `const a = hail("Alpha", 200);
const b = hail("Bravo", 100);
const c = hail("Charlie", 300);
console.log("hailing all teams...");
console.log("first contact: " + (await firstResponder(a, b, c)));`,
      expectedOutput: "hailing all teams...\nfirst contact: Bravo responding",
      requiredCode: ["Promise.race"],
      quickCheck: {
        prompt: "stuck on first contact? tap the question that's in your head.",
        items: [
          { question: "what does Promise.race do?", answer: "it takes an array of promises and settles with whichever settles first. the rest are ignored." },
          { question: "why not just `await alpha`?", answer: "that waits for Alpha even though Bravo answered sooner. race listens to all three at once." },
          { question: "what happens to the losers?", answer: "they still settle later, and nobody's waiting — a promise holds its answer, so nothing gets stuck." },
        ],
      },
      hints: [
        { level: 1, text: "`Promise.race([alpha, bravo, charlie])` — one array, all three.", energyCost: 8 },
        { level: 2, text: "return the race itself — the terminal awaits it.", energyCost: 12 },
        { level: 3, text: "`function firstResponder(alpha, bravo, charlie) { return Promise.race([alpha, bravo, charlie]); }`", energyCost: 20 },
      ],
    },
    "chapter-09:timeout": {
      brief:
        "Two functions.\n\n`awaitContact(alpha, bravo, charlie, timeoutMs)` — step 2's race plus a fourth runner: a promise that settles with `NO CONTACT` after `timeoutMs`. Whoever settles first wins.\n\n`sweep(p)` — never waits: race `p` against the plain value `\"channel silent\"`. A promise that has ALREADY settled wins that race; one that hasn't, loses.\n\ncontact: Bravo responding\ncontact: NO CONTACT\ncontact: Alpha responding\nsweep: Bravo holding at dock 4\nsweep: channel silent\nextraction locked",
      expectedBehavior: CH09_TIMEOUT_OUTPUT,
      testHarness: `const a = hail("Alpha", 250);
const b = hail("Bravo", 100);
const c = hail("Charlie", 400);
console.log("contact: " + (await awaitContact(a, b, c, 600)));
const jammed = new Promise(() => {});
console.log("contact: " + (await awaitContact(jammed, jammed, jammed, 200)));
console.log("contact: " + (await awaitContact(hail("Alpha", 300), jammed, jammed, 500)));
const ready = Promise.resolve("Bravo holding at dock 4");
console.log("sweep: " + (await sweep(ready)));
console.log("sweep: " + (await sweep(jammed)));
console.log("extraction locked");`,
      expectedOutput: CH09_TIMEOUT_OUTPUT,
      requiredCode: ["Promise.race"],
      quickCheck: {
        prompt: "stuck on the deadline? tap the question that's in your head.",
        items: [
          { question: "how do i make a timeout?", answer: "a promise a timer settles: `new Promise((resolve) => setTimeout(() => resolve(\"NO CONTACT\"), timeoutMs))`. put it in the race." },
          { question: "how can sweep not wait?", answer: "race the promise against a value that's ready right now. if the promise already settled it goes first and wins; if not, the ready value wins on the spot." },
          { question: "timeout or sweep — which when?", answer: "awaitContact waits, but not past the deadline. sweep doesn't wait at all — it only looks." },
        ],
      },
      hints: [
        { level: 1, text: "the deadline: `new Promise((resolve) => setTimeout(() => resolve(\"NO CONTACT\"), timeoutMs))`.", energyCost: 8 },
        { level: 2, text: "`return Promise.race([alpha, bravo, charlie, deadline]);`", energyCost: 12 },
        { level: 3, text: "`function sweep(p) { return Promise.race([p, \"channel silent\"]); }` — the promise comes first in the array.", energyCost: 20 },
      ],
    },
  },
};

/** Boss 3 is judged, not stepped: its per-language code lives in boss-03.ts (ALLEGIANCE). */
export const JS_BOSS_03: ChallengeRealization = {
  concepts: ["reading code", "subarrays share memory", "copy before you send"],
  steps: {},
};
