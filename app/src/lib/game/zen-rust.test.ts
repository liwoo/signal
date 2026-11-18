import { describe, expect, it } from "vitest";
import { analyzeZen, getZenRules, type ZenRule } from "./zen";
import { fnBody, maskRs, RUST_ZEN_RULES } from "./zen-rust";
import { RUST_ZEN_EXAMPLES } from "@/data/zen-examples.rust";
import { HARDCODED, SOLUTIONS } from "@/lib/lang/fixtures";

const RS = SOLUTIONS.rust;
const HARD = HARDCODED.rust;

function rule(id: string): ZenRule {
  for (const rules of Object.values(RUST_ZEN_RULES)) {
    const r = rules.find((x) => x.id === id);
    if (r) return r;
  }
  throw new Error(`no rule ${id}`);
}

/** Relevant and followed. */
function follows(id: string, code: string): boolean {
  const r = rule(id);
  return (!r.isRelevant || r.isRelevant(code)) && r.check(code);
}

/** Relevant but not followed (so Maya suggests). */
function misses(id: string, code: string): boolean {
  const r = rule(id);
  return (!r.isRelevant || r.isRelevant(code)) && !r.check(code);
}

const main = (body: string) => `fn main() {\n${body.split("\n").map((l) => (l ? `    ${l}` : l)).join("\n")}\n}`;

const SUM_LOOP = RS["chapter-03:sumfunc"];
const VALIDATE = RS["chapter-03:validate"];
const ROSTER = RS["chapter-04:guardmap"];
const CLEAR = RS["chapter-04:clearfloors"];
const REVERSE = RS["chapter-04.2:reverseword"];
const ENCODE = RS["chapter-04.2:encode"];
const HEADER = RS["chapter-04.2:relayheader"];
const SCAN = RS["chapter-07:scan"];
const RECOVER = RS["chapter-07:recover"];
const GOROUTINE = RS["chapter-08:goroutine"];
const FANOUT = RS["chapter-08:fanout"];
const WINDOW = RS["chapter-08:window"];
const HAIL = RS["chapter-09:hail"];
const FIRST = RS["chapter-09:first"];
const TIMEOUT = RS["chapter-09:timeout"];

// [rule id, code that follows it, code that misses it]
const CASES: [string, string, string][] = [
  ["rs_brace_same_line", RS["chapter-01:scaffold"], 'fn main()\n{\n    println!("Hello World");\n}'],
  ["rs_four_space_indent", RS["chapter-02:rewrite"], 'fn main() {\n  println!("Hello World");\n}'],
  [
    "rs_one_println",
    RS["chapter-01:location"],
    'mod cellblock;\n\nfn main() {\n    print!("CELL {}", cellblock::CELL);\n    println!(" - SUBLEVEL {}", cellblock::SUBLEVEL);\n}',
  ],
  ["rs_mod_at_top", RS["chapter-01:location"], 'mod cellblock;\nfn main() {\n    println!("{}", cellblock::CELL);\n}'],
  [
    "rs_no_glob_import",
    RS["chapter-01:location"],
    'mod cellblock;\nuse cellblock::*;\n\nfn main() {\n    println!("CELL {} - SUBLEVEL {}", CELL, SUBLEVEL);\n}',
  ],
  ["rs_statement_semicolon", RS["chapter-02:scaffold"], 'fn main() {\n    println!("Hello World")\n}'],
  ["rs_no_trailing_whitespace", RS["chapter-02:scaffold"], 'fn main() {  \n    println!("Hello World");\n}'],
  ["rs_inclusive_range", RS["chapter-02:loop"], main('for i in 1..11 {\n    println!("{}", i);\n}')],
  ["rs_inclusive_range", RS["chapter-02:loop"], main('for i in 0..10 {\n    println!("{}", i + 1);\n}')],
  ["rs_for_over_while", RS["chapter-02:loop"], main('let mut i = 1;\nwhile i <= 10 {\n    println!("{}", i);\n    i += 1;\n}')],
  [
    "rs_else_if_chain",
    RS["chapter-02:classify"],
    main('for i in 1..=10 {\n    if i <= 3 {\n        println!("{} DENY", i);\n    } else {\n        if i <= 6 {\n            println!("{} WARN", i);\n        } else {\n            println!("{} OVERRIDE", i);\n        }\n    }\n}'),
  ],
  ["rs_no_paren_condition", RS["chapter-02:classify"], main('for i in 1..=10 {\n    if (i <= 3) {\n        println!("{} DENY", i);\n    }\n}')],
  ["rs_operator_spacing", RS["chapter-02:classify"], main('for i in 1..=10 {\n    if i<=3 {\n        println!("{} DENY", i);\n    }\n}')],
  [
    "rs_match_expression",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    match i {\n        1..=3 => println!("{} DENY", i),\n        _ => println!("{} OVERRIDE", i),\n    }\n}'),
  ],
  [
    "rs_range_patterns",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    let level = match i {\n        1 | 2 | 3 => "DENY",\n        _ => "OVERRIDE",\n    };\n    println!("{} {}", i, level);\n}'),
  ],
  [
    "rs_range_patterns",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    let level = match i {\n        n if n <= 3 => "DENY",\n        _ => "OVERRIDE",\n    };\n    println!("{} {}", i, level);\n}'),
  ],
  ["rs_comment_space", `// open the panel\n${RS["chapter-03:scaffold"]}`, `//open the panel\n${RS["chapter-03:scaffold"]}`],
  ["rs_single_blank_lines", RS["chapter-03:sumfunc"], 'fn main() {\n\n\n    println!("Hello World");\n}'],
  ["rs_iter_sum", VALIDATE, SUM_LOOP],
  [
    "rs_tail_expression",
    SUM_LOOP,
    "fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    return total;\n}",
  ],
  ["rs_needless_mut", SUM_LOOP, "fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = codes.iter().sum();\n    total\n}"],
  [
    "rs_direct_bool",
    VALIDATE,
    VALIDATE.replace("(total, total > 100)", "if total > 100 {\n        (total, true)\n    } else {\n        (total, false)\n    }"),
  ],
  [
    "rs_reuse_sum",
    VALIDATE,
    VALIDATE.replace("let total = sum_codes(codes);", "let total: i32 = codes.iter().sum();"),
  ],
  ["rs_borrow_slice", VALIDATE, VALIDATE.replace("fn validate_code(codes: &[i32])", "fn validate_code(codes: Vec<i32>)")],
  ["rs_snake_case", VALIDATE, VALIDATE.replaceAll("validate_code", "validateCode")],

  // ── Act II ──
  ["rs_line_width", RS["chapter-04:scaffold"], main(`println!("{}", "${"x".repeat(100)}");`)],
  [
    "rs_hashmap_from",
    ROSTER,
    ROSTER.replace(/HashMap::from\(\[[\s\S]*?\]\)/, 'let mut r = HashMap::new();\n    r.insert("Chen", "Floor 1");\n    r'),
  ],
  [
    "rs_one_pair_per_line",
    ROSTER,
    ROSTER.replace(/HashMap::from\(\[[\s\S]*?\]\)/, 'HashMap::from([("Chen", "Floor 1"), ("Alvarez", "Floor 2"),\n        ("Volkov", "Floor 2"), ("Park", "Floor 3"), ("Santos", "Floor 1")])'),
  ],
  [
    "rs_one_pair_per_line",
    ROSTER,
    ROSTER.replace('("Santos", "Floor 1"),', '("Santos", "Floor 1")'),
  ],
  [
    "rs_map_values",
    CLEAR,
    CLEAR.replace("guards.values().copied().collect()", "guards.iter().map(|(_, f)| *f).collect()"),
  ],
  [
    "rs_collect_set",
    CLEAR,
    CLEAR.replace(
      "let occupied: HashSet<&str> = guards.values().copied().collect();",
      "let mut occupied = HashSet::new();\n    for f in guards.values() {\n        occupied.insert(*f);\n    }",
    ),
  ],
  ["rs_bool_comparison", CLEAR, CLEAR.replace("!occupied.contains(name.as_str())", "occupied.contains(name.as_str()) == false")],
  ["rs_print_literal", RS["chapter-04.2:scaffold"], main('println!("{}", "Hello World");')],
  [
    "rs_chars_rev",
    REVERSE,
    "fn reverse_word(s: &str) -> String {\n    String::from_utf8(s.bytes().rev().collect()).unwrap()\n}",
  ],
  [
    "rs_collect_string",
    REVERSE,
    "fn reverse_word(s: &str) -> String {\n    let mut out = String::new();\n    for c in s.chars().rev() {\n        out.push(c);\n    }\n    out\n}",
  ],
  ["rs_split_whitespace", ENCODE, ENCODE.replace("split_whitespace()", "split(' ')")],
  [
    "rs_join_words",
    ENCODE,
    ENCODE.replace(
      'msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")',
      'let mut out = String::new();\n    for w in msg.split_whitespace() {\n        out.push_str(&reverse_word(w));\n        out.push_str(" ");\n    }\n    out.trim_end().to_string()',
    ),
  ],
  ["rs_map_by_name", ENCODE, ENCODE.replace(".map(reverse_word)", ".map(|w| reverse_word(w))")],
  ["rs_no_unwrap_parse", HEADER, HARD["chapter-04.2:relayheader"]!],
  [
    "rs_format_header",
    HEADER,
    HEADER.replace('format!("F{}-C{}", floor, n * 2)', '"F".to_string() + &floor.to_string() + "-C" + &(n * 2).to_string()'),
  ],

  // ── Act III ──
  ["rs_println_newline", RS["chapter-07:scaffold"], main('print!("Hello World\\n");')],
  ["rs_named_drop_guard", SCAN, SCAN.replace("let _log = Log(", "let log = Log(")],
  ["rs_named_drop_guard", SCAN, SCAN.replace("let _log = Log(", "let _ = Log(")],
  [
    "rs_strip_suffix",
    SCAN,
    SCAN.replace(
      "if let Some(sub) = entry.strip_suffix('/') {\n            scan(archive, sub, count);",
      "if entry.ends_with('/') {\n            scan(archive, &entry[..entry.len() - 1], count);",
    ),
  ],
  [
    "rs_question_mark",
    RECOVER,
    RECOVER.replace(
      'let entries = archive[dir].as_ref().ok_or("corrupted directory")?;',
      'let entries = match &archive[dir] {\n        Some(e) => e,\n        None => return Err("corrupted directory".to_string()),\n    };',
    ),
  ],
  [
    "rs_errors_not_panics",
    RECOVER,
    RECOVER.replace('archive[dir].as_ref().ok_or("corrupted directory")?', 'archive[dir].as_ref().expect("corrupted directory")'),
  ],
  ["rs_no_unused_use", RS["chapter-08:scaffold"], `use std::thread;\n\n${RS["chapter-08:scaffold"]}`],
  ["rs_no_unused_use", RS["chapter-09:hail"], `use std::sync::mpsc::{self, Receiver, Sender};\n${RS["chapter-08:scaffold"]}`],
  ["rs_reuse_cut", GOROUTINE, GOROUTINE.replace("thread::spawn(move || cut(&name));", 'thread::spawn(move || println!("{} circuit: DOWN", name));')],
  [
    "rs_thread_module_path",
    GOROUTINE,
    GOROUTINE.replace("use std::thread;", "use std::thread::{self, spawn};").replace("thread::spawn(move", "spawn(move"),
  ],
  [
    "rs_spawn_all_then_join",
    FANOUT,
    FANOUT.replace(
      "handles.push(thread::spawn(move || format!(\"{} circuit: DOWN\", name)));",
      "handles.push(thread::spawn(move || format!(\"{} circuit: DOWN\", name)).join().unwrap());",
    ),
  ],
  [
    "rs_spawn_all_then_join",
    FANOUT,
    FANOUT.replace(
      "handles.push(thread::spawn(move || format!(\"{} circuit: DOWN\", name)));",
      "let h = thread::spawn(move || format!(\"{} circuit: DOWN\", name));\n        handles.push(h.join().unwrap());",
    ),
  ],
  [
    "rs_join_collect",
    FANOUT,
    FANOUT.replace(
      "handles.into_iter().map(|h| h.join().unwrap()).collect()",
      "let mut lines = Vec::new();\n    for h in handles {\n        lines.push(h.join().unwrap());\n    }\n    lines",
    ),
  ],
  [
    "rs_sleep_in_thread",
    WINDOW,
    WINDOW.replace("        handles.push(", "        thread::sleep(Duration::from_millis(d));\n        handles.push(").replace(
      "            thread::sleep(Duration::from_millis(d));\n",
      "",
    ),
  ],
  [
    "rs_zip_pairs",
    WINDOW,
    WINDOW.replace("for (name, &d) in circuits.iter().zip(delays) {\n        let name = name.to_string();", "for i in 0..circuits.len() {\n        let name = circuits[i].to_string();\n        let d = delays[i];"),
  ],
  ["rs_tight_call", RS["chapter-09:scaffold"], 'fn main () {\n    println!("Hello World");\n}'],
  ["rs_tight_call", RS["chapter-09:scaffold"], 'fn main() {\n    println! ("Hello World");\n}'],
  ["rs_from_millis", HAIL, HAIL.replace("Duration::from_millis(delay_ms)", "Duration::from_secs(delay_ms / 1000)")],
  [
    "rs_mpsc_path",
    HAIL,
    HAIL.replace("use std::sync::mpsc::{self, Receiver};", "use std::sync::mpsc::{channel, Receiver};").replace("mpsc::channel()", "channel()"),
  ],
  [
    "rs_loop_the_teams",
    FIRST,
    FIRST.replace(
      /    for r in teams \{[\s\S]*?\n    \}\n/,
      "    let [a, b, c] = teams;\n" +
        ["a", "b", "c"]
          .map((r) => `    let t = tx.clone();\n    thread::spawn(move || {\n        if let Ok(msg) = ${r}.recv() {\n            let _ = t.send(msg);\n        }\n    });\n`)
          .join(""),
    ),
  ],
  ["rs_send_ignore_closed", FIRST, FIRST.replace("let _ = tx.send(msg);", "tx.send(msg).unwrap();")],
  [
    "rs_recv_timeout",
    TIMEOUT,
    TIMEOUT.replace(
      'match fan_in([alpha, bravo, charlie]).recv_timeout(Duration::from_millis(timeout_ms)) {\n        Ok(msg) => msg,\n        Err(_) => "NO CONTACT".to_string(),\n    }',
      'let rx = fan_in([alpha, bravo, charlie]);\n    let start = std::time::Instant::now();\n    while start.elapsed() < Duration::from_millis(timeout_ms) {\n        if let Ok(msg) = rx.try_recv() {\n            return msg;\n        }\n        thread::sleep(Duration::from_millis(1));\n    }\n    "NO CONTACT".to_string()',
    ),
  ],
  ["rs_sweep_no_wait", TIMEOUT, TIMEOUT.replace("ch.try_recv()", "ch.recv_timeout(Duration::from_millis(10))")],
];

describe("rust zen rules", () => {
  it.each(CASES)("%s: follows the good code, misses the bad", (id, good, bad) => {
    expect(follows(id, good), "good").toBe(true);
    expect(misses(id, bad), "bad").toBe(true);
  });

  it("every rule has a test case and an example", () => {
    const tested = new Set(CASES.map(([id]) => id));
    for (const rules of Object.values(RUST_ZEN_RULES)) {
      for (const r of rules) {
        expect(tested.has(r.id), r.id).toBe(true);
        expect(RUST_ZEN_EXAMPLES[r.id], r.id).toBeDefined();
      }
    }
    for (const id of Object.keys(RUST_ZEN_EXAMPLES)) expect(() => rule(id)).not.toThrow();
  });

  it("the reference solutions draw no suggestions except where the loop could be iter().sum()", () => {
    for (const [stepId, rules] of Object.entries(RUST_ZEN_RULES)) {
      const code = RS[stepId];
      for (const r of rules) {
        if (stepId === "chapter-03:sumfunc" && r.id === "rs_iter_sum") continue;
        expect(misses(r.id, code), `${stepId} ${r.id}`).toBe(false);
      }
    }
  });

  it("analyzes through the shared engine and respects mastery", () => {
    const step = "chapter-03:validate";
    expect(getZenRules(step, "rust").map((r) => r.id)).toContain("rs_direct_bool");
    const full = analyzeZen(step, VALIDATE, undefined, "rust");
    expect(full.bonusXP).toBeGreaterThan(0);
    const mastered = analyzeZen(step, VALIDATE, new Set(getZenRules(step, "rust").map((r) => r.id)), "rust");
    expect(mastered.bonusXP).toBe(0);
    expect(mastered.jolts).toEqual([]);
  });

  it("never trips on strings or comments", () => {
    const code = 'fn main() {\n    // if (x) { while\n    println!("if (i <= 3) {{ return 1; }}");\n}';
    expect(maskRs(code)).not.toMatch(/while|return/);
    expect(misses("rs_no_paren_condition", code)).toBe(false);
    expect(fnBody('fn a() { let s = "}"; s }', "a")).toBe(' let s = "x"; s ');
  });
});
