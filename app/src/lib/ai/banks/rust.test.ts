// Offline fallback for the Rust banks: with no compiler reachable, the engine
// grades by codePatterns — so every reference solution must complete on them,
// and the classic mistakes must get their targeted line instead.

import { describe, expect, it } from "vitest";
import { callMayaEngine } from "@/lib/ai/engine";
import { SOLUTIONS, HARDCODED } from "@/lib/lang/fixtures";
import { RUST_BANKS } from "./rust";

const offline = (stepId: string, code: string) => callMayaEngine(stepId, code, true, false, false, 0, "rust");

describe("rust banks · offline completion", () => {
  for (const [stepId, code] of Object.entries(SOLUTIONS.rust)) {
    it(`${stepId}: the reference solution completes`, () => {
      const res = offline(stepId, code);
      expect(res.isComplete, res.reply).toBe(true);
    });
  }

  for (const [stepId, code] of Object.entries(HARDCODED.rust)) {
    it(`${stepId}: the hardcoded shortcut does not`, () => {
      expect(offline(stepId, code!).isComplete).toBe(false);
    });
  }

  it("covers every realized step", () => {
    expect(Object.keys(RUST_BANKS).sort()).toEqual(Object.keys(SOLUTIONS.rust).sort());
  });
});

describe("rust banks · targeted mistakes", () => {
  const cases: [string, string, RegExp][] = [
    ["chapter-01:scaffold", `println!("Hello World");`, /fn main/],
    ["chapter-01:scaffold", `fn main() {\n    println!("hello world");\n}`, /capital H/],
    ["chapter-01:location", `fn main() {\n    println!("CELL {} - SUBLEVEL {}", cellblock::CELL, cellblock::SUBLEVEL);\n}`, /mod cellblock;/],
    ["chapter-01:location", `mod cellblock;\nfn main() {\n    println!("CELL {} - SUBLEVEL {}", cellblock.CELL, cellblock.SUBLEVEL);\n}`, /two colons/],
    ["chapter-01:location", `mod cellblock;\nfn main() {\n    println!("CELL {}", cellblock::CELL, cellblock::SUBLEVEL);\n}`, /slots/],
    ["chapter-02:loop", `fn main() {\n    for i in 1..10 {\n        println!("{}", i);\n    }\n}`, /1\.\.=10/],
    ["chapter-02:loop", `fn main() {\n    for i in 0..10 {\n        println!("{}", i + 1);\n    }\n}`, /COMPLETE|loop confirmed/],
    ["chapter-02:classify", `fn main() {\n    for i in 1..=10 {\n        if i <= 3 {\n            println!("{} DENY", i);\n        } else if i <= 5 {\n            println!("{} WARN", i);\n        } else if i <= 9 {\n            println!("{} GRANT", i);\n        } else {\n            println!("{} OVERRIDE", i);\n        }\n    }\n}`, /wrong one/],
    ["chapter-02:rewrite", `fn main() {\n    for i in 1..=10 {\n        let level = match i {\n            1..=3 => "DENY",\n            4..=6 => "WARN",\n            7..=9 => "GRANT",\n            10 => "OVERRIDE",\n        };\n        println!("{} {}", i, level);\n    }\n}`, /catch-all/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: Vec<i32>) -> i32 {\n    codes.iter().sum()\n}\nfn main() {}`, /slice, not a Vec/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: &[i32]) -> i32 {\n    let total = 0;\n    for c in codes {\n        total += c;\n    }\n    total\n}\nfn main() {}`, /let mut total/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    total;\n}\nfn main() {}`, /semicolon/],
    ["chapter-03:validate", `fn sum_codes(codes: &[i32]) -> i32 {\n    codes.iter().sum()\n}\nfn validate_code(codes: &[i32]) -> (i32, bool) {\n    let total = sum_codes(codes);\n    (total, total >= 100)\n}\nfn main() {}`, />=/],
    // Act II
    ["chapter-04:guardmap", `fn build_roster() -> HashMap<&'static str, &'static str> {\n    HashMap::from([("Chen", "Floor 1")])\n}`, /use std::collections::HashMap;/],
    ["chapter-04:guardmap", `use std::collections::HashMap;\nfn build_roster() -> HashMap<&str, &str> {\n    HashMap::from([("Chen", "Floor 1")])\n}`, /lifetime/],
    ["chapter-04:guardmap", `use std::collections::HashMap;\nfn build_roster() -> HashMap<&'static str, &'static str> {\n    {"Chen": "Floor 1", "Alvarez": "Floor 2"}\n}`, /dict literal/],
    ["chapter-04:clearfloors", `use std::collections::{HashMap, HashSet};\nfn build_roster() -> HashMap<&'static str, &'static str> {\n    HashMap::from([("Chen", "Floor 1"), ("Alvarez", "Floor 2"), ("Volkov", "Floor 2"), ("Park", "Floor 3"), ("Santos", "Floor 1")])\n}\nfn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String {\n    let occupied: HashSet<&str> = guards.values().collect();\n    for i in 1..=max_floor {\n        let name = format!("Floor {}", i);\n        if !occupied.contains(name.as_str()) {\n            return name;\n        }\n    }\n    String::new()\n}`, /copied/],
    ["chapter-04.2:reverseword", `fn reverse_word(s: &str) -> String {\n    s.rev().collect()\n}`, /s\.chars\(\)\.rev\(\)/],
    ["chapter-04.2:reverseword", `fn reverse_word(s: &str) -> String {\n    s.split("").reverse().join("")\n}`, /javascript/],
    ["chapter-04.2:encode", `fn reverse_word(s: &str) -> String {\n    s.chars().rev().collect()\n}\nfn encode(msg: &str) -> String {\n    msg.split_whitespace().map(reverse_word).collect().join(" ")\n}`, /Vec<String>/],
    ["chapter-04.2:relayheader", `fn relay_header(floor: u32, code: &str) -> String {\n    match code.parse() {\n        Ok(n) => format!("F{}-C{}", floor, n * 2),\n        Err(_) => format!("F{}-ERR", floor),\n    }\n}`, /parse::<i32>/],
    ["chapter-04.2:relayheader", `fn relay_header(floor: u32, code: &str) -> String {\n    let n = code.parse::<i32>().unwrap_or(0);\n    format!("F{}-C{}", floor, n * 2)\n}`, /C0/],
    ["chapter-07:scan", `use std::collections::HashMap;\nstruct Log(String);\nimpl Drop for Log {\n    fn drop(&mut self) {\n        println!("scanned: {}", self.0);\n    }\n}\nfn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {\n    let _ = Log(dir.to_string());\n    for entry in &archive[dir] {\n        if let Some(sub) = entry.strip_suffix('/') {\n            scan(archive, sub, count);\n        } else {\n            *count += 1;\n        }\n    }\n}\nfn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {\n    let mut count = 0;\n    scan(archive, root, &mut count);\n    count\n}`, /let _ =/],
    ["chapter-07:scan", `use std::collections::HashMap;\nfn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, mut count: usize) {\n    for entry in &archive[dir] {\n        if let Some(sub) = entry.strip_suffix('/') {\n            scan(archive, sub, count);\n        } else {\n            count += 1;\n        }\n    }\n}\nfn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {\n    let count = 0;\n    scan(archive, root, count);\n    count\n}`, /&mut usize/],
    ["chapter-07:recover", `use std::collections::HashMap;\nfn walk(archive: &HashMap<&str, Option<Vec<&str>>>, dir: &str, count: &mut usize, errors: &mut Vec<String>) {\n    let entries = archive[dir].as_ref().ok_or("corrupted directory")?;\n    for entry in entries {\n        if let Some(sub) = entry.strip_suffix('/') {\n            walk(archive, sub, count, errors);\n        } else {\n            *count += 1;\n        }\n    }\n}\nfn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>) {\n    let mut count = 0;\n    let mut errors = Vec::new();\n    walk(archive, root, &mut count, &mut errors);\n    (count, errors)\n}`, /only works in a function that returns a `Result`/],
    ["chapter-08:goroutine", `use std::thread;\nfn cut(name: &str) {\n    println!("{} circuit: DOWN", name);\n}\nfn cut_async(name: &str) {\n    let name = name.to_string();\n    thread::spawn(|| cut(&name));\n}`, /`move`/],
    ["chapter-08:goroutine", `fn cut(name: &str) {\n    println!("{} circuit: DOWN", name);\n}\nasync fn cut_async(name: &str) {\n    cut(name);\n}`, /runtime/],
    ["chapter-08:fanout", `use std::thread;\nfn cut_all(circuits: &[&str]) -> Vec<String> {\n    let mut lines = Vec::new();\n    for name in circuits {\n        let name = name.to_string();\n        let h = thread::spawn(move || format!("{} circuit: DOWN", name));\n        lines.push(h.join().unwrap());\n    }\n    lines\n}`, /one after another/],
    ["chapter-08:fanout", `use std::thread;\nfn cut(name: &str) {\n    println!("{} circuit: DOWN", name);\n}\nfn cut_all(circuits: &[&str]) -> Vec<String> {\n    let mut handles = Vec::new();\n    for name in circuits {\n        let name = name.to_string();\n        handles.push(thread::spawn(move || cut(&name)));\n    }\n    handles.into_iter().map(|h| h.join().unwrap()).collect()\n}`, /scrambled/],
    ["chapter-09:first", `use std::sync::mpsc::{self, Receiver};\nuse std::thread;\nuse std::time::Duration;\nfn hail(team: &str, delay_ms: u64) -> Receiver<String> {\n    let (tx, rx) = mpsc::channel();\n    let team = team.to_string();\n    thread::spawn(move || {\n        thread::sleep(Duration::from_millis(delay_ms));\n        let _ = tx.send(format!("{} responding", team));\n    });\n    rx\n}\nfn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String {\n    let (tx, rx) = mpsc::channel();\n    for r in [alpha, bravo, charlie] {\n        thread::spawn(move || {\n            if let Ok(msg) = r.recv() {\n                let _ = tx.send(msg);\n            }\n        });\n    }\n    rx.recv().unwrap()\n}`, /tx\.clone\(\)/],
    ["chapter-09:timeout", `use std::sync::mpsc::{self, Receiver};\nuse std::thread;\nuse std::time::Duration;\nfn hail(team: &str, delay_ms: u64) -> Receiver<String> {\n    let (tx, rx) = mpsc::channel();\n    let team = team.to_string();\n    thread::spawn(move || {\n        thread::sleep(Duration::from_millis(delay_ms));\n        let _ = tx.send(format!("{} responding", team));\n    });\n    rx\n}\nfn await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String {\n    let (tx, rx) = mpsc::channel();\n    for r in [alpha, bravo, charlie] {\n        let tx = tx.clone();\n        thread::spawn(move || {\n            if let Ok(msg) = r.recv() {\n                let _ = tx.send(msg);\n            }\n        });\n    }\n    match rx.recv_timeout(Duration::from_millis(timeout_ms)) {\n        Ok(msg) => msg,\n        Err(_) => "NO CONTACT".to_string(),\n    }\n}\nfn sweep(ch: &Receiver<String>) -> String {\n    match ch.recv() {\n        Ok(msg) => msg,\n        Err(_) => "channel silent".to_string(),\n    }\n}`, /try_recv/],
  ];
  for (const [stepId, code, expected] of cases) {
    it(`${stepId}: ${expected}`, () => {
      const res = offline(stepId, code);
      const isCompleteCase = /COMPLETE/.test(expected.source);
      expect(res.isComplete, res.reply).toBe(isCompleteCase);
      if (!isCompleteCase) expect(res.reply).toMatch(expected);
    });
  }
});
