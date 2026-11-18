// Reference solutions for Act III in each non-Go language — same conventions as
// act1/act2 fixtures: code carries forward between steps, and later steps keep
// earlier top-level output to prove the harness mutes it.

import type { Solutions } from "./act1.fixtures";

// ── JavaScript ──

const JS_SCAN = `function scanArchive(archive, root) {
  let count = 0;
  function scan(dir) {
    try {
      for (const entry of archive[dir]) {
        if (entry.endsWith("/")) scan(entry.slice(0, -1));
        else count++;
      }
    } finally {
      console.log("scanned:", dir);
    }
  }
  scan(root);
  return count;
}`;

const JS_CUT = `function cut(name) {
  console.log(\`\${name} circuit: DOWN\`);
}

function cutAsync(name) {
  setTimeout(() => cut(name), 0);
}`;

const JS_CUTALL = `async function cutAll(circuits) {
  return Promise.all(circuits.map(async (name) => \`\${name} circuit: DOWN\`));
}`;

const JS_HAIL = `function hail(team, delayMs) {
  return new Promise((resolve) => setTimeout(() => resolve(\`\${team} responding\`), delayMs));
}`;

const JS_FIRST = `function firstResponder(alpha, bravo, charlie) {
  return Promise.race([alpha, bravo, charlie]);
}`;

const JS: Solutions = {
  "chapter-07:scaffold": `console.log("Hello World");`,
  "chapter-07:scan": `${JS_SCAN}

console.log("Hello World");`,
  "chapter-07:recover": `${JS_SCAN}

function safeScan(archive, root) {
  let count = 0;
  const errors = [];
  function scan(dir) {
    try {
      if (archive[dir] === null) throw new Error("corrupted directory");
      for (const entry of archive[dir]) {
        if (entry.endsWith("/")) scan(entry.slice(0, -1));
        else count++;
      }
    } catch (e) {
      errors.push(\`\${dir}: \${e.message}\`);
    } finally {
      console.log("scanned:", dir);
    }
  }
  scan(root);
  return { count, errors };
}

console.log(safeScan({ root: null }, "root"));`,
  "chapter-08:scaffold": `console.log("Hello World");`,
  "chapter-08:goroutine": `${JS_CUT}

cutAsync("East");`,
  "chapter-08:fanout": `${JS_CUT}

${JS_CUTALL}

console.log(await cutAll(["North"]));`,
  "chapter-08:window": `${JS_CUT}

${JS_CUTALL}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cutTimed(circuits, delays) {
  return Promise.all(
    circuits.map(async (name, i) => {
      await sleep(delays[i]);
      return \`\${name} circuit: DOWN (\${delays[i]}ms)\`;
    }),
  );
}`,
  "chapter-09:scaffold": `console.log("Hello World");`,
  "chapter-09:hail": `${JS_HAIL}

console.log(await hail("Bravo", 10));`,
  "chapter-09:first": `${JS_HAIL}

${JS_FIRST}`,
  "chapter-09:timeout": `${JS_HAIL}

${JS_FIRST}

function awaitContact(alpha, bravo, charlie, timeoutMs) {
  const deadline = new Promise((resolve) => setTimeout(() => resolve("NO CONTACT"), timeoutMs));
  return Promise.race([alpha, bravo, charlie, deadline]);
}

function sweep(p) {
  return Promise.race([p, "channel silent"]);
}`,
};

// ── Python ──

const PY_SCAN = `def scan_archive(archive, root):
    count = 0

    def scan(d):
        nonlocal count
        try:
            for entry in archive[d]:
                if entry.endswith("/"):
                    scan(entry[:-1])
                else:
                    count += 1
        finally:
            print("scanned:", d)

    scan(root)
    return count`;

const PY_CUT = `import asyncio


async def cut(name):
    print(f"{name} circuit: DOWN")


def cut_async(name):
    return asyncio.create_task(cut(name))`;

const PY_CUTALL = `async def trip(name):
    return f"{name} circuit: DOWN"


async def cut_all(circuits):
    return await asyncio.gather(*(trip(n) for n in circuits))`;

const PY_HAIL = `import asyncio


def hail(team, delay_ms):
    async def respond():
        await asyncio.sleep(delay_ms / 1000)
        return f"{team} responding"

    return asyncio.create_task(respond())`;

const PY_FIRST = `async def first_responder(alpha, bravo, charlie):
    done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
    return done.pop().result()`;

const PY: Solutions = {
  "chapter-07:scaffold": `print("Hello World")`,
  "chapter-07:scan": `${PY_SCAN}


print("Hello World")`,
  "chapter-07:recover": `${PY_SCAN}


def safe_scan(archive, root):
    count = 0
    errors = []

    def scan(d):
        nonlocal count
        try:
            if archive[d] is None:
                raise RuntimeError("corrupted directory")
            for entry in archive[d]:
                if entry.endswith("/"):
                    scan(entry[:-1])
                else:
                    count += 1
        except Exception as e:
            errors.append(f"{d}: {e}")
        finally:
            print("scanned:", d)

    scan(root)
    return count, errors


print(safe_scan({"root": None}, "root"))`,
  "chapter-08:scaffold": `print("Hello World")`,
  "chapter-08:goroutine": `${PY_CUT}`,
  "chapter-08:fanout": `${PY_CUT}


${PY_CUTALL}


print(cut_all)`,
  "chapter-08:window": `${PY_CUT}


${PY_CUTALL}


async def cut_timed(circuits, delays):
    async def trip_timed(n, d):
        await asyncio.sleep(d / 1000)
        return f"{n} circuit: DOWN ({d}ms)"

    return await asyncio.gather(*(trip_timed(n, d) for n, d in zip(circuits, delays)))`,
  "chapter-09:scaffold": `print("Hello World")`,
  "chapter-09:hail": `${PY_HAIL}`,
  "chapter-09:first": `${PY_HAIL}


${PY_FIRST}`,
  "chapter-09:timeout": `${PY_HAIL}


${PY_FIRST}


async def await_contact(alpha, bravo, charlie, timeout_ms):
    done, pending = await asyncio.wait(
        [alpha, bravo, charlie], timeout=timeout_ms / 1000, return_when=asyncio.FIRST_COMPLETED
    )
    for t in pending:
        t.cancel()
    if not done:
        return "NO CONTACT"
    return done.pop().result()


def sweep(task):
    if task.done():
        return task.result()
    return "channel silent"`,
};

export const ACT3_SOLUTIONS: Record<"javascript" | "python", Solutions> = { javascript: JS, python: PY };

/** The classic mistake each step exists to catch — all must fail. */
export const ACT3_HARDCODED: Record<"javascript" | "python", Partial<Solutions>> = {
  javascript: {
    // Runs South right now instead of scheduling it.
    "chapter-08:goroutine": `function cut(name) {
  console.log(\`\${name} circuit: DOWN\`);
}

function cutAsync(name) {
  cut(name);
}`,
    // One breaker at a time: the window is the sum.
    "chapter-08:window": `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cutTimed(circuits, delays) {
  const lines = [];
  for (let i = 0; i < circuits.length; i++) {
    await sleep(delays[i]);
    lines.push(\`\${circuits[i]} circuit: DOWN (\${delays[i]}ms)\`);
  }
  return Promise.all(lines);
}`,
    // Waits on Alpha first.
    "chapter-09:first": `${JS_HAIL}

async function firstResponder(alpha, bravo, charlie) {
  return Promise.race([await alpha]);
}`,
    // A fixed deadline instead of timeoutMs.
    "chapter-09:timeout": `${JS_HAIL}

function awaitContact(alpha, bravo, charlie, timeoutMs) {
  return Promise.race([alpha, bravo, charlie, new Promise((resolve) => setTimeout(() => resolve("NO CONTACT"), 200))]);
}

function sweep(p) {
  return Promise.race([p, "channel silent"]);
}`,
  },
  python: {
    // The coroutine is created but never scheduled — South never runs.
    "chapter-08:goroutine": `import asyncio


async def cut(name):
    print(f"{name} circuit: DOWN")


def cut_async(name):
    return cut(name)`,
    // Missing nonlocal: UnboundLocalError.
    "chapter-07:scan": PY_SCAN.replace("        nonlocal count\n", ""),
    // One breaker at a time: the window is the sum.
    "chapter-08:window": `import asyncio


async def cut_timed(circuits, delays):
    lines = []
    for n, d in zip(circuits, delays):
        await asyncio.sleep(d / 1000)
        lines.append(f"{n} circuit: DOWN ({d}ms)")
    return await asyncio.gather(*[])  or lines`,
    // Waits on Alpha first.
    "chapter-09:first": `${PY_HAIL}


async def first_responder(alpha, bravo, charlie):
    # FIRST_COMPLETED
    return await alpha`,
    // Milliseconds passed as seconds: the "200ms" deadline waits 200 seconds.
    "chapter-09:timeout": PY["chapter-09:timeout"].replace("timeout=timeout_ms / 1000", "timeout=timeout_ms"),
  },
};

// ── Rust ──

const RS_HELLO = `fn main() {
    println!("Hello World");
}`;

const RS_LOG = `struct Log(String);

impl Drop for Log {
    fn drop(&mut self) {
        println!("scanned: {}", self.0);
    }
}`;

const RS_SCAN = `use std::collections::HashMap;

${RS_LOG}

fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {
    let _log = Log(dir.to_string());
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub, count);
        } else {
            *count += 1;
        }
    }
}

fn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {
    let mut count = 0;
    scan(archive, root, &mut count);
    count
}`;

const RS_CUT = `use std::thread;
use std::time::Duration;

fn cut(name: &str) {
    println!("{} circuit: DOWN", name);
}

fn cut_async(name: &str) {
    let name = name.to_string();
    thread::spawn(move || cut(&name));
}`;

const RS_HAIL = `use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::Duration;

fn hail(team: &str, delay_ms: u64) -> Receiver<String> {
    let (tx, rx) = mpsc::channel();
    let team = team.to_string();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(delay_ms));
        let _ = tx.send(format!("{} responding", team));
    });
    rx
}`;

const RS_FANIN = `fn fan_in(teams: [Receiver<String>; 3]) -> Receiver<String> {
    let (tx, rx) = mpsc::channel();
    for r in teams {
        let tx = tx.clone();
        thread::spawn(move || {
            if let Ok(msg) = r.recv() {
                let _ = tx.send(msg);
            }
        });
    }
    rx
}

fn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String {
    fan_in([alpha, bravo, charlie]).recv().unwrap()
}`;

const RS: Solutions = {
  "chapter-07:scaffold": RS_HELLO,
  "chapter-07:scan": `${RS_SCAN}

${RS_HELLO}`,
  "chapter-07:recover": `${RS_SCAN}

fn walk(archive: &HashMap<&str, Option<Vec<&str>>>, dir: &str, count: &mut usize, errors: &mut Vec<String>) -> Result<(), String> {
    let _log = Log(dir.to_string());
    let entries = archive[dir].as_ref().ok_or("corrupted directory")?;
    for entry in entries {
        if let Some(sub) = entry.strip_suffix('/') {
            if let Err(e) = walk(archive, sub, count, errors) {
                errors.push(format!("{}: {}", sub, e));
            }
        } else {
            *count += 1;
        }
    }
    Ok(())
}

fn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>) {
    let mut count = 0;
    let mut errors = Vec::new();
    if let Err(e) = walk(archive, root, &mut count, &mut errors) {
        errors.push(format!("{}: {}", root, e));
    }
    (count, errors)
}

fn main() {
    println!("{:?}", safe_scan(&HashMap::from([("root", None)]), "root"));
}`,
  "chapter-08:scaffold": RS_HELLO,
  "chapter-08:goroutine": `${RS_CUT}

fn main() {
    cut_async("East");
    thread::sleep(Duration::from_millis(10));
}`,
  "chapter-08:fanout": `${RS_CUT}

fn cut_all(circuits: &[&str]) -> Vec<String> {
    let mut handles = Vec::new();
    for name in circuits {
        let name = name.to_string();
        handles.push(thread::spawn(move || format!("{} circuit: DOWN", name)));
    }
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

fn main() {
    println!("{:?}", cut_all(&["East"]));
}`,
  "chapter-08:window": `${RS_CUT}

fn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String> {
    let mut handles = Vec::new();
    for (name, &d) in circuits.iter().zip(delays) {
        let name = name.to_string();
        handles.push(thread::spawn(move || {
            thread::sleep(Duration::from_millis(d));
            format!("{} circuit: DOWN ({}ms)", name, d)
        }));
    }
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

fn main() {
    println!("{:?}", cut_timed(&["East"], &[5]));
}`,
  "chapter-09:scaffold": RS_HELLO,
  "chapter-09:hail": `${RS_HAIL}

fn main() {
    println!("{}", hail("Delta", 5).recv().unwrap());
}`,
  "chapter-09:first": `${RS_HAIL}

${RS_FANIN}

fn main() {
    println!("{}", first_responder(hail("A", 3), hail("B", 1), hail("C", 2)));
}`,
  "chapter-09:timeout": `${RS_HAIL}

${RS_FANIN}

fn await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String {
    match fan_in([alpha, bravo, charlie]).recv_timeout(Duration::from_millis(timeout_ms)) {
        Ok(msg) => msg,
        Err(_) => "NO CONTACT".to_string(),
    }
}

fn sweep(ch: &Receiver<String>) -> String {
    match ch.try_recv() {
        Ok(msg) => msg,
        Err(_) => "channel silent".to_string(),
    }
}

fn main() {
    println!("{}", await_contact(hail("A", 3), hail("B", 1), hail("C", 2), 50));
}`,
};

export const RS_ACT3 = RS;

/** Shortcuts and the classic mistake each step exists to catch — all must fail. */
export const RS_ACT3_HARDCODED: Partial<Solutions> = {
  // Prints after the loop instead of a Drop guard — same output, but no defer.
  "chapter-07:scan": `use std::collections::HashMap;

fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub, count);
        } else {
            *count += 1;
        }
    }
    println!("scanned: {}", dir);
}

fn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {
    let mut count = 0;
    scan(archive, root, &mut count);
    count
}`,
  // The scan without the guard: the corrupted directory bails before its log line.
  "chapter-07:recover": `use std::collections::HashMap;

fn walk(archive: &HashMap<&str, Option<Vec<&str>>>, dir: &str, count: &mut usize, errors: &mut Vec<String>) -> Result<(), String> {
    let entries = archive[dir].as_ref().ok_or("corrupted directory")?;
    for entry in entries {
        if let Some(sub) = entry.strip_suffix('/') {
            if let Err(e) = walk(archive, sub, count, errors) {
                errors.push(format!("{}: {}", sub, e));
            }
        } else {
            *count += 1;
        }
    }
    println!("scanned: {}", dir);
    Ok(())
}

fn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>) {
    let mut count = 0;
    let mut errors = Vec::new();
    if let Err(e) = walk(archive, root, &mut count, &mut errors) {
        errors.push(format!("{}: {}", root, e));
    }
    (count, errors)
}`,
  // Calls cut on the spot — never leaves the main thread.
  "chapter-08:goroutine": `fn cut(name: &str) {
    println!("{} circuit: DOWN", name);
}

fn cut_async(name: &str) {
    let name = name.to_string();
    let run = move || cut(&name);
    run();
}`,
  // Spawn-then-join inside the loop: each breaker waits for the last — the sum, not the max.
  "chapter-08:window": `${RS_CUT}

fn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String> {
    let mut lines = Vec::new();
    for (name, &d) in circuits.iter().zip(delays) {
        let name = name.to_string();
        let h = thread::spawn(move || {
            thread::sleep(Duration::from_millis(d));
            format!("{} circuit: DOWN ({}ms)", name, d)
        });
        lines.push(h.join().unwrap());
    }
    lines
}`,
  // Listens to Alpha first — waits on the slow team even though Bravo answered.
  "chapter-09:first": `${RS_HAIL}

fn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String {
    let first = alpha.recv().unwrap();
    let _ = (bravo, charlie);
    first.clone()
}`,
};
