// ── Act III in Rust ──
// Same steps, stakes, XP and events as the Go chapters; the code-shaped half is
// realized here. Rust has real threads and real channels, so it sits closest
// to Go — the divergences (spec/infrastructure/languages.md §Divergences):
//   • a closure can't call itself, so the walker is a nested `fn` that takes
//     the counter as `&mut usize`
//   • `defer` becomes a Drop guard: a value whose `drop` prints, run on every
//     way out of the function — return, `?`, or panic
//   • panic/recover becomes `Result` + `?`: panics are for bugs in Rust (like
//     Go), errors are values you return and handle at the boundary
//   • goroutines are `thread::spawn`; WaitGroup + results slice is "keep the
//     JoinHandles, join them in order"
//   • a borrowed `&str` can't go into a thread that might outlive it — `move`
//     an owned `String` in instead (the compiler's lesson, not ours)
//   • there's no `select` in std: fan every receiver into one channel (Senders
//     clone), take the first message; `recv_timeout` is `time.After`,
//     `try_recv` is `default:`
// Threads sleep in real time on the Playground (there's no virtual clock), so
// delays stay small and margins between them are ≥100ms.
// Harnesses name std paths in full so they never collide with the player's
// own `use` lines.

import type { ChallengeRealization, ChallengeHint, QuickCheck, StepRealization } from "@/types/game";
import { CH07_RECOVER_OUTPUT, CH07_SCAN_OUTPUT } from "../chapter-07";
import { CH08_FANOUT_OUTPUT, CH08_WINDOW_OUTPUT } from "../chapter-08";
import { CH09_TIMEOUT_OUTPUT } from "../chapter-09";

const helloScaffold = (note: string): StepRealization => ({
  brief: `Wake the terminal: print \`Hello World\`. ${note}`,
  expectedBehavior: "Hello World",
  expectedOutput: "Hello World",
  quickCheck: {
    prompt: "same skeleton, new terminal — tap whatever you need a refresher on.",
    items: [
      { question: "how do i print again?", answer: "`fn main() { println!(\"Hello World\"); }` — the bang, the quotes, the semicolon." },
      { question: "do i need a `use` line yet?", answer: "not for this line. add a `use` at the top when a step first needs something from the standard library." },
    ],
  } satisfies QuickCheck,
  hints: [
    { level: 1, text: "`fn main() { }` is where it starts.", energyCost: 5 },
    { level: 2, text: "inside it, `println!(...)` prints a line.", energyCost: 8 },
    { level: 3, text: "`fn main() { println!(\"Hello World\"); }`", energyCost: 12 },
  ] satisfies ChallengeHint[],
});

const ARCHIVE = `std::collections::HashMap::from([
        ("root", vec!["config.dat", "logs/", "servers/"]),
        ("logs", vec!["access.log", "error.log"]),
        ("servers", vec!["alpha/", "beta/", "gamma/"]),
        ("alpha", vec!["thesis_v1.enc", "readme.txt"]),
        ("beta", vec!["backup.dat"]),
        ("gamma", vec!["thesis_v2.enc", "thesis_v3.enc", "notes.txt"]),
    ])`;

const CORRUPTED = `std::collections::HashMap::from([
        ("root", Some(vec!["config.dat", "logs/", "servers/", "vault/"])),
        ("logs", Some(vec!["access.log", "error.log"])),
        ("servers", Some(vec!["alpha/", "beta/", "gamma/"])),
        ("alpha", Some(vec!["thesis_v1.enc", "readme.txt"])),
        ("beta", Some(vec!["backup.dat"])),
        ("gamma", Some(vec!["thesis_v2.enc", "thesis_v3.enc", "notes.txt"])),
        ("vault", None),
    ])`;

export const RS_CHAPTER_07: ChallengeRealization = {
  concepts: ["Recursion", "&mut parameters", "Drop guards", "Result & ?"],
  steps: {
    "chapter-07:scaffold": helloScaffold("The archive scan comes next."),
    "chapter-07:scan": {
      brief:
        "Write `scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize` that returns how many files are in the tree.\n\nThe walk is a function that calls itself: `scan(archive, dir, count: &mut usize)`. An entry ending in `/` is a directory (scan it, without the slash); anything else is a file (`*count += 1`).\n\nEach directory logs `scanned: <dir>` as it finishes — to run a line on the way out, make a value whose `Drop` prints: `struct Log(String);` with `impl Drop for Log`, and `let _log = Log(dir.to_string());` first thing in `scan`.\n\nscanned: logs\nscanned: alpha\nscanned: beta\nscanned: gamma\nscanned: servers\nscanned: root\ntotal files: 9\nscanned: b\nscanned: a\ntotal files: 2",
      expectedBehavior: CH07_SCAN_OUTPUT,
      testHarness: `fn main() {
    let archive = ${ARCHIVE};
    println!("total files: {}", scan_archive(&archive, "root"));
    let small = std::collections::HashMap::from([("a", vec!["x.txt", "b/"]), ("b", vec!["y.txt"])]);
    println!("total files: {}", scan_archive(&small, "a"));
}`,
      expectedOutput: CH07_SCAN_OUTPUT,
      requiredCode: ["impl Drop", "&mut"],
      quickCheck: {
        prompt: "stuck in the tree? tap the question that's in your head.",
        items: [
          { question: "how can a function call itself?", answer: "just call it by name inside its own body — `scan(archive, sub, count)`. each call gets its own `dir` and walks one level deeper." },
          { question: "why not a closure that counts?", answer: "a rust closure can't call itself. so the walker is a plain `fn`, and the counter travels with it as `count: &mut usize` — one counter, lent to every call." },
          { question: "what is Drop?", answer: "code that runs when a value goes away. `let _log = Log(...)` lives until `scan` ends — however it ends — then its `drop` prints. cleanup that can't be skipped." },
          { question: "why does `scanned: root` print last?", answer: "root's `_log` is created first and dropped last, when root's call finishes — after every directory inside it." },
          { question: "how do i tell a directory from a file?", answer: "`entry.strip_suffix('/')` gives back `Some(name)` without the slash for a directory, `None` for a file." },
        ],
      },
      hints: [
        { level: 1, text: "`struct Log(String);` and `impl Drop for Log { fn drop(&mut self) { println!(\"scanned: {}\", self.0); } }` — the line that runs on the way out.", energyCost: 5 },
        { level: 2, text: "`fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize)` — first line `let _log = Log(dir.to_string());`, then `for entry in &archive[dir]`.", energyCost: 8 },
        { level: 3, text: "inside the loop: `if let Some(sub) = entry.strip_suffix('/') { scan(archive, sub, count) } else { *count += 1 }`. scan_archive: `let mut count = 0; scan(archive, root, &mut count); count`.", energyCost: 12 },
      ],
    },
    "chapter-07:recover": {
      brief:
        "Write `safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>)` — the same scan, but a directory that's `None` is corrupted.\n\nMake the walk return `Result<(), String>`: a corrupted directory is `Err(\"corrupted directory\".to_string())` (`.ok_or(...)?` does it in one line). Each call that walks into a subdirectory checks the result — `if let Err(e) = ...` — pushes `<dir>: <e>` onto `errors`, and the scan carries on. Keep the Drop guard that prints `scanned:`.\n\nscanned: logs … scanned: vault\nscanned: root\ntotal files: 9\nERROR: vault: corrupted directory\n…and the same for a small test tree.",
      expectedBehavior: CH07_RECOVER_OUTPUT,
      testHarness: `fn main() {
    let archive = ${CORRUPTED};
    let (count, errors) = safe_scan(&archive, "root");
    println!("total files: {}", count);
    for e in &errors {
        println!("ERROR: {}", e);
    }
    let small = std::collections::HashMap::from([("a", Some(vec!["x.txt", "bad/", "b/"])), ("b", Some(vec!["y.txt"])), ("bad", None)]);
    let (count, errors) = safe_scan(&small, "a");
    println!("total files: {}", count);
    for e in &errors {
        println!("ERROR: {}", e);
    }
}`,
      expectedOutput: CH07_RECOVER_OUTPUT,
      requiredCode: ["Result<", "Err("],
      quickCheck: {
        prompt: "stuck on the trap? tap the question that's in your head.",
        items: [
          { question: "why not just panic when it's corrupted?", answer: "in rust a panic means a bug — something that should never happen. a corrupted directory is just bad data, so it's an error value: `Err(...)`, returned like any other answer." },
          { question: "what does `?` do?", answer: "on `Ok(v)` it hands you `v`. on `Err(e)` it returns that error from your function on the spot. `archive[dir].as_ref().ok_or(\"corrupted directory\")?` reads the entries or bails." },
          { question: "where do i catch it?", answer: "where you call into a subdirectory: `if let Err(e) = walk(archive, sub, count, errors) { errors.push(format!(\"{}: {}\", sub, e)); }` — and once more for root." },
          { question: "does `scanned: vault` still print?", answer: "yes. `?` leaves the function early, and leaving drops `_log`. the guard runs on every way out." },
        ],
      },
      hints: [
        { level: 1, text: "`fn walk(archive: &HashMap<&str, Option<Vec<&str>>>, dir: &str, count: &mut usize, errors: &mut Vec<String>) -> Result<(), String>` — `Ok(())` at the end.", energyCost: 5 },
        { level: 2, text: "after the guard: `let entries = archive[dir].as_ref().ok_or(\"corrupted directory\")?;` — then loop over `entries` as before.", energyCost: 8 },
        { level: 3, text: "for a subdirectory: `if let Err(e) = walk(archive, sub, count, errors) { errors.push(format!(\"{}: {}\", sub, e)); }`. safe_scan does the same for root and returns `(count, errors)`.", energyCost: 12 },
      ],
    },
  },
};

const CIRCUITS = `["North", "South", "East", "West"]`;

export const RS_CHAPTER_08: ChallengeRealization = {
  concepts: ["thread::spawn", "move closures", "JoinHandle & join"],
  steps: {
    "chapter-08:scaffold": helloScaffold("`std::thread` joins the `use` lines in the next step."),
    "chapter-08:goroutine": {
      brief:
        "Write `cut(name: &str)` that prints `<name> circuit: DOWN`, and `cut_async(name: &str)` that runs `cut` on a new thread — `thread::spawn` — and returns straight away without waiting.\n\nThe thread might outlive the borrowed `name`, so give it its own copy: `let name = name.to_string();` and a `move` closure.\n\nThe terminal holds main open for 100ms so the thread gets to finish:\n\nNorth circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      expectedBehavior: "North circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      testHarness: `fn main() {
    cut("North");
    cut_async("South");
    std::thread::sleep(std::time::Duration::from_millis(100));
    println!("power cycle complete");
}`,
      expectedOutput: "North circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      requiredCode: ["thread::spawn", "move"],
      quickCheck: {
        prompt: "stuck on the thread? tap the question that's in your head.",
        items: [
          { question: "what does thread::spawn do?", answer: "it runs a closure on a new thread, alongside the rest of your program, and hands back a handle at once. the caller doesn't wait. `use std::thread;` at the top." },
          { question: "why won't it compile with `name` inside?", answer: "the thread could still be running after `cut_async` returns — and `name` is only borrowed until then. `let name = name.to_string();` makes an owned copy, and `move` hands it to the thread." },
          { question: "why does the terminal sleep 100ms?", answer: "when main ends, every other thread dies mid-flight. the sleep holds the door open long enough for South to finish. step 2 replaces it with the real tool." },
        ],
      },
      hints: [
        { level: 1, text: "`fn cut(name: &str) { println!(\"{} circuit: DOWN\", name); }`.", energyCost: 5 },
        { level: 2, text: "`thread::spawn(move || cut(&name));` starts it on its own thread. `use std::thread;` at the top.", energyCost: 8 },
        { level: 3, text: "`fn cut_async(name: &str) { let name = name.to_string(); thread::spawn(move || cut(&name)); }` — owned copy, moved in, no waiting.", energyCost: 12 },
      ],
    },
    "chapter-08:fanout": {
      brief:
        "Write `cut_all(circuits: &[&str]) -> Vec<String>`: one thread per circuit, each returning `<name> circuit: DOWN`, and the confirmations returned in circuit order.\n\nKeep every `JoinHandle` `thread::spawn` gives you, in a `Vec`. Launch them all first, THEN `.join()` each one in order — join waits for that thread and hands back what its closure returned.\n\nNorth circuit: DOWN\nSouth circuit: DOWN\nEast circuit: DOWN\nWest circuit: DOWN\nALL CIRCUITS DOWN\nAux circuit: DOWN",
      expectedBehavior: CH08_FANOUT_OUTPUT,
      testHarness: `fn main() {
    for line in cut_all(&${CIRCUITS}) {
        println!("{}", line);
    }
    println!("ALL CIRCUITS DOWN");
    for line in cut_all(&["Aux"]) {
        println!("{}", line);
    }
}`,
      expectedOutput: CH08_FANOUT_OUTPUT,
      requiredCode: ["thread::spawn", ".join()"],
      quickCheck: {
        prompt: "stuck on the fan-out? tap the question that's in your head.",
        items: [
          { question: "what's a JoinHandle?", answer: "the ticket `thread::spawn` hands back. `handle.join()` waits until that thread is done and gives you its return value — wrapped in a `Result`, so `.unwrap()` it." },
          { question: "why launch them all before joining?", answer: "join waits. spawn-then-join inside the same loop runs the circuits one after another. spawn all four first, so they're all running, then collect." },
          { question: "what order do the results come in?", answer: "the order you join them — not the order they finished. join the handles in circuit order and the lines line up." },
          { question: "why not print inside the threads?", answer: "threads finish in any order, so the lines would come out scrambled. each thread returns its line; you print in order after joining." },
        ],
      },
      hints: [
        { level: 1, text: "`let mut handles = Vec::new();` then for each circuit: `let name = name.to_string(); handles.push(thread::spawn(move || format!(\"{} circuit: DOWN\", name)));`.", energyCost: 8 },
        { level: 2, text: "only after the loop: `handles.into_iter().map(|h| h.join().unwrap()).collect()`.", energyCost: 12 },
        { level: 3, text: "the whole shape: spawn all, keep the handles, join them in order, return the `Vec<String>`. joining is the waiting AND the results list.", energyCost: 20 },
      ],
    },
    "chapter-08:window": {
      brief:
        "Write `cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String>` — the same fan-out, but each thread first sleeps its breaker's delay in milliseconds (`thread::sleep(Duration::from_millis(d))`), then returns `<name> circuit: DOWN (<delay>ms)`.\n\nThe terminal times it. One at a time takes the SUM of the delays — 1100ms, two power cycles, alarm. All at once takes the slowest — 450ms.\n\nNorth circuit: DOWN (300ms)\nSouth circuit: DOWN (150ms)\nEast circuit: DOWN (450ms)\nWest circuit: DOWN (200ms)\nwindow: SINGLE CYCLE - alarm blind\nALL CIRCUITS DOWN",
      expectedBehavior: CH08_WINDOW_OUTPUT,
      testHarness: `fn main() {
    let circuits = ${CIRCUITS};
    let delays = [300, 150, 450, 200];
    let start = std::time::Instant::now();
    let lines = cut_timed(&circuits, &delays);
    let elapsed = start.elapsed();
    for line in &lines {
        println!("{}", line);
    }
    if elapsed < std::time::Duration::from_millis(1100) {
        println!("window: SINGLE CYCLE - alarm blind");
    } else {
        println!("window: MULTI CYCLE - alarm tripped");
    }
    println!("ALL CIRCUITS DOWN");
}`,
      expectedOutput: CH08_WINDOW_OUTPUT,
      requiredCode: ["thread::sleep", ".join()"],
      quickCheck: {
        prompt: "stuck on the timing? tap the question that's in your head.",
        items: [
          { question: "how do i sleep for some milliseconds?", answer: "`thread::sleep(Duration::from_millis(d))`. `use std::time::Duration;` at the top." },
          { question: "where does the sleep go?", answer: "inside the thread's closure. sleep in the loop — or join each thread before spawning the next — and the breakers trip one after another: the sum, not the max." },
          { question: "how do i walk names and delays together?", answer: "`circuits.iter().zip(delays)` pairs them up: `for (name, &d) in circuits.iter().zip(delays)`." },
        ],
      },
      hints: [
        { level: 1, text: "the step 2 shape, with a sleep first inside each thread: `thread::sleep(Duration::from_millis(d));`.", energyCost: 8 },
        { level: 2, text: "the delay is loop state too — move it in with the name: `for (name, &d) in circuits.iter().zip(delays) { let name = name.to_string(); ... }`.", energyCost: 12 },
        { level: 3, text: "the line is `format!(\"{} circuit: DOWN ({}ms)\", name, d)`. spawn all four before joining any, so the window is the slowest breaker — not the sum.", energyCost: 20 },
      ],
    },
  },
};

export const RS_CHAPTER_09: ChallengeRealization = {
  concepts: ["mpsc channels", "Fan-in (Sender::clone)", "recv_timeout & try_recv"],
  steps: {
    "chapter-09:scaffold": helloScaffold("`std::sync::mpsc` joins the `use` lines in the next step."),
    "chapter-09:hail": {
      brief:
        "Write `hail(team: &str, delay_ms: u64) -> Receiver<String>`: make a channel — `let (tx, rx) = mpsc::channel();` — start a thread that sleeps `delay_ms` milliseconds then sends `<team> responding` down `tx`, and return `rx` straight away.\n\nThe terminal receives with `rx.recv()` — receiving is waiting:\n\nhailing Bravo...\nBravo responding\nchannel confirmed",
      expectedBehavior: "hailing Bravo...\nBravo responding\nchannel confirmed",
      testHarness: `fn main() {
    let rx = hail("Bravo", 100);
    println!("hailing Bravo...");
    println!("{}", rx.recv().unwrap());
    println!("channel confirmed");
}`,
      expectedOutput: "hailing Bravo...\nBravo responding\nchannel confirmed",
      requiredCode: ["mpsc::", "thread::spawn", ".send("],
      quickCheck: {
        prompt: "stuck on the channel? tap the question that's in your head.",
        items: [
          { question: "what is a channel?", answer: "a pipe between threads. `mpsc::channel()` gives you two ends: `tx` sends, `rx` receives. `rx.recv()` waits until something arrives." },
          { question: "which end goes where?", answer: "`tx` moves into the thread — it's the team's radio. `rx` is what hail returns — maya's earpiece." },
          { question: "why does `hailing Bravo...` print first?", answer: "hail returns `rx` at once — the thread sleeps in the background. then `recv` waits for the reply." },
          { question: "what if nobody's listening when the team sends?", answer: "then `send` returns an error. a team that loses the race doesn't care, so `let _ = tx.send(...)` throws that error away on purpose." },
        ],
      },
      hints: [
        { level: 1, text: "`use std::sync::mpsc;` then `let (tx, rx) = mpsc::channel();` — two ends of one pipe.", energyCost: 5 },
        { level: 2, text: "`let team = team.to_string();` then `thread::spawn(move || { thread::sleep(Duration::from_millis(delay_ms)); let _ = tx.send(format!(\"{} responding\", team)); });`.", energyCost: 8 },
        { level: 3, text: "end hail with `rx` — no semicolon. the return type is `Receiver<String>` (`use std::sync::mpsc::Receiver;`, or write `mpsc::Receiver<String>`).", energyCost: 12 },
      ],
    },
    "chapter-09:first": {
      brief:
        "Write `first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String` that listens to all three at once and returns whichever answer lands first.\n\nThere's no way to wait on three receivers at once — so fan them in. Make one new channel; for each team, spawn a thread that waits on that team's receiver and forwards the answer into a clone of the new sender. The first message out of the new receiver is first contact.\n\nhailing all teams...\nfirst contact: Bravo responding",
      expectedBehavior: "hailing all teams...\nfirst contact: Bravo responding",
      testHarness: `fn main() {
    let a = hail("Alpha", 200);
    let b = hail("Bravo", 100);
    let c = hail("Charlie", 300);
    println!("hailing all teams...");
    println!("first contact: {}", first_responder(a, b, c));
}`,
      expectedOutput: "hailing all teams...\nfirst contact: Bravo responding",
      requiredCode: [".clone()", ".recv()"],
      quickCheck: {
        prompt: "stuck on first contact? tap the question that's in your head.",
        items: [
          { question: "why not just `alpha.recv()`?", answer: "that waits for Alpha even though Bravo answered sooner. you have to listen to all three at once." },
          { question: "how can three threads send into one channel?", answer: "a `Sender` clones. `let tx = tx.clone();` before each spawn gives every forwarder its own sender — all feeding the same receiver. that's the many in mpsc: many producers, single consumer." },
          { question: "what does each forwarder do?", answer: "wait on its team, pass the answer on: `if let Ok(msg) = r.recv() { let _ = tx.send(msg); }`." },
          { question: "what happens to the teams that lose?", answer: "their forwarders send into a channel nobody reads any more — the send just fails quietly, and the threads end with the program." },
        ],
      },
      hints: [
        { level: 1, text: "`let (tx, rx) = mpsc::channel();` — one inbox for all three teams.", energyCost: 8 },
        { level: 2, text: "`for r in [alpha, bravo, charlie] { let tx = tx.clone(); thread::spawn(move || { if let Ok(msg) = r.recv() { let _ = tx.send(msg); } }); }`.", energyCost: 12 },
        { level: 3, text: "after the loop, `rx.recv().unwrap()` — the first message into the inbox is the first team that answered.", energyCost: 20 },
      ],
    },
    "chapter-09:timeout": {
      brief:
        "Two functions.\n\n`await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String` — step 2's fan-in, but wait on the inbox with `recv_timeout(Duration::from_millis(timeout_ms))`. If the deadline passes first, return `NO CONTACT`.\n\n`sweep(ch: &Receiver<String>) -> String` — `ch.try_recv()`: return the message if one is already waiting, otherwise `channel silent` straight away.\n\ncontact: Bravo responding\ncontact: NO CONTACT\ncontact: Alpha responding\nsweep: Bravo holding at dock 4\nsweep: channel silent\nextraction locked",
      expectedBehavior: CH09_TIMEOUT_OUTPUT,
      testHarness: `fn main() {
    use std::sync::mpsc::channel as jam;
    let a = hail("Alpha", 250);
    let b = hail("Bravo", 100);
    let c = hail("Charlie", 400);
    println!("contact: {}", await_contact(a, b, c, 600));
    let (_j1, j1) = jam::<String>();
    let (_j2, j2) = jam::<String>();
    let (_j3, j3) = jam::<String>();
    println!("contact: {}", await_contact(j1, j2, j3, 200));
    let (_j4, j4) = jam::<String>();
    let (_j5, j5) = jam::<String>();
    println!("contact: {}", await_contact(hail("Alpha", 300), j4, j5, 500));
    let (ready_tx, ready) = jam::<String>();
    ready_tx.send("Bravo holding at dock 4".to_string()).unwrap();
    println!("sweep: {}", sweep(&ready));
    let (_silent_tx, silent) = jam::<String>();
    println!("sweep: {}", sweep(&silent));
    println!("extraction locked");
}`,
      expectedOutput: CH09_TIMEOUT_OUTPUT,
      requiredCode: ["recv_timeout", "try_recv"],
      quickCheck: {
        prompt: "stuck on the deadline? tap the question that's in your head.",
        items: [
          { question: "how does recv_timeout work?", answer: "`rx.recv_timeout(d)` waits for a message, but not longer than `d`. it gives back `Ok(msg)`, or `Err(...)` when the time ran out." },
          { question: "how do i turn the Err into NO CONTACT?", answer: "`match rx.recv_timeout(...) { Ok(msg) => msg, Err(_) => \"NO CONTACT\".to_string() }`." },
          { question: "what does try_recv do?", answer: "it never waits. a message already in the channel comes back as `Ok(msg)`, an empty channel as `Err(...)` — right now." },
          { question: "timeout or try — which one when?", answer: "recv_timeout means wait, but not past the deadline. try_recv means don't wait at all. await_contact waits; sweep only glances." },
        ],
      },
      hints: [
        { level: 1, text: "await_contact is first_responder with a deadline: same fan-in, then `rx.recv_timeout(Duration::from_millis(timeout_ms))`.", energyCost: 8 },
        { level: 2, text: "`match rx.recv_timeout(...) { Ok(msg) => msg, Err(_) => \"NO CONTACT\".to_string() }` — the Err arm is the clock winning.", energyCost: 12 },
        { level: 3, text: "`fn sweep(ch: &Receiver<String>) -> String { match ch.try_recv() { Ok(msg) => msg, Err(_) => \"channel silent\".to_string() } }`.", energyCost: 20 },
      ],
    },
  },
};

/** Boss 3 is judged, not stepped: its per-language code lives in boss-03.ts (ALLEGIANCE). */
export const RS_BOSS_03: ChallengeRealization = {
  concepts: ["reading code", "borrows share memory", "copy before you send"],
  steps: {},
};
