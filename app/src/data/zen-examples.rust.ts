import type { ZenExample } from "./zen-examples";

// Before → after for every Rust zen rule (src/lib/game/zen-rust.ts), Acts I–III.
export const RUST_ZEN_EXAMPLES: Record<string, ZenExample> = {
  rs_brace_same_line: {
    before: 'fn main()\n{\n    println!("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "keep the opening brace on the function's line",
  },
  rs_four_space_indent: {
    before: 'fn main() {\n  println!("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "indent each level by four spaces",
  },
  rs_one_println: {
    before: 'print!("CELL {}", cellblock::CELL);\nprint!(" - SUBLEVEL {}", cellblock::SUBLEVEL);\nprintln!();',
    after: 'println!("CELL {} - SUBLEVEL {}", cellblock::CELL, cellblock::SUBLEVEL);',
    change: "one println! with a {} per value",
  },
  rs_mod_at_top: {
    before: 'fn main() {\n    println!("{}", cellblock::CELL);\n}\nmod cellblock;',
    after: 'mod cellblock;\n\nfn main() {\n    println!("{}", cellblock::CELL);\n}',
    change: "declare the module first, then a blank line",
  },
  rs_no_glob_import: {
    before: 'mod cellblock;\nuse cellblock::*;\n\nfn main() {\n    println!("CELL {}", CELL);\n}',
    after: 'mod cellblock;\n\nfn main() {\n    println!("CELL {}", cellblock::CELL);\n}',
    change: "write the path so the source is visible",
  },
  rs_statement_semicolon: {
    before: 'fn main() {\n    println!("Hello World")\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "end the print statement with a semicolon",
  },
  rs_no_trailing_whitespace: {
    before: 'fn main() {   \n    println!("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "trim the invisible spaces at the end of the line",
  },
  rs_inclusive_range: {
    before: 'for i in 1..11 {\n    println!("{}", i);\n}',
    after: 'for i in 1..=10 {\n    println!("{}", i);\n}',
    change: "use ..= so the range includes its end",
  },
  rs_for_over_while: {
    before: 'let mut i = 1;\nwhile i <= 10 {\n    println!("{}", i);\n    i += 1;\n}',
    after: 'for i in 1..=10 {\n    println!("{}", i);\n}',
    change: "let a for loop walk the range",
  },
  rs_else_if_chain: {
    before: 'if i <= 3 {\n    println!("{} DENY", i);\n} else {\n    if i <= 6 {\n        println!("{} WARN", i);\n    }\n}',
    after: 'if i <= 3 {\n    println!("{} DENY", i);\n} else if i <= 6 {\n    println!("{} WARN", i);\n}',
    change: "flatten the nested if into else if",
  },
  rs_no_paren_condition: {
    before: 'if (i <= 3) {\n    println!("{} DENY", i);\n}',
    after: 'if i <= 3 {\n    println!("{} DENY", i);\n}',
    change: "drop the brackets around the condition",
  },
  rs_operator_spacing: {
    before: "if i<=3 {",
    after: "if i <= 3 {",
    change: "a space on each side of the comparison",
  },
  rs_match_expression: {
    before: 'match i {\n    1..=3 => println!("{} DENY", i),\n    _ => println!("{} OVERRIDE", i),\n}',
    after: 'let level = match i {\n    1..=3 => "DENY",\n    _ => "OVERRIDE",\n};\nprintln!("{} {}", i, level);',
    change: "let the match hand back the word, then print once",
  },
  rs_range_patterns: {
    before: 'let level = match i {\n    1 | 2 | 3 => "DENY",\n    _ => "OVERRIDE",\n};',
    after: 'let level = match i {\n    1..=3 => "DENY",\n    _ => "OVERRIDE",\n};',
    change: "match a whole range in one arm",
  },
  rs_comment_space: {
    before: '//open the panel\nfn main() {\n    println!("Hello World");\n}',
    after: '// open the panel\nfn main() {\n    println!("Hello World");\n}',
    change: "a space after the slashes",
  },
  rs_single_blank_lines: {
    before: 'fn main() {\n\n\n    println!("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "one blank line at most",
  },
  rs_iter_sum: {
    before: "fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    total\n}",
    after: "fn sum_codes(codes: &[i32]) -> i32 {\n    codes.iter().sum()\n}",
    change: "let the iterator do the adding",
  },
  rs_tail_expression: {
    before: "fn sum_codes(codes: &[i32]) -> i32 {\n    let total = codes.iter().sum();\n    return total;\n}",
    after: "fn sum_codes(codes: &[i32]) -> i32 {\n    codes.iter().sum()\n}",
    change: "end on the value, no return or semicolon",
  },
  rs_needless_mut: {
    before: "let mut total = codes.iter().sum();\ntotal",
    after: "let total = codes.iter().sum();\ntotal",
    change: "drop mut from a value that never changes",
  },
  rs_direct_bool: {
    before: "if total > 100 {\n    (total, true)\n} else {\n    (total, false)\n}",
    after: "(total, total > 100)",
    change: "return the comparison itself",
  },
  rs_reuse_sum: {
    before: "fn validate_code(codes: &[i32]) -> (i32, bool) {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    (total, total > 100)\n}",
    after: "fn validate_code(codes: &[i32]) -> (i32, bool) {\n    let total = sum_codes(codes);\n    (total, total > 100)\n}",
    change: "reuse sum_codes instead of re-adding",
  },
  rs_borrow_slice: {
    before: "fn validate_code(codes: Vec<i32>) -> (i32, bool) {",
    after: "fn validate_code(codes: &[i32]) -> (i32, bool) {",
    change: "borrow a slice instead of taking a vec",
  },
  rs_snake_case: {
    before: "fn validateCode(codes: &[i32]) -> (i32, bool) {",
    after: "fn validate_code(codes: &[i32]) -> (i32, bool) {",
    change: "name functions in snake_case",
  },
  rs_line_width: {
    before: 'fn main() {\n    println!("{} {} {} {} {}", "a very long line", "that keeps going", "past the edge", "of the screen", "and on");\n}',
    after: 'fn main() {\n    println!(\n        "{} {} {}",\n        "a long line",\n        "broken inside its brackets",\n        "one argument per line",\n    );\n}',
    change: "keep lines inside 100 columns",
  },
  rs_hashmap_from: {
    before: 'let mut roster = HashMap::new();\nroster.insert("Chen", "Floor 1");\nroster.insert("Alvarez", "Floor 2");\nroster',
    after: 'HashMap::from([\n    ("Chen", "Floor 1"),\n    ("Alvarez", "Floor 2"),\n])',
    change: "build the map in one HashMap::from expression",
  },
  rs_one_pair_per_line: {
    before: 'HashMap::from([("Chen", "Floor 1"), ("Alvarez", "Floor 2"),\n    ("Volkov", "Floor 2")])',
    after: 'HashMap::from([\n    ("Chen", "Floor 1"),\n    ("Alvarez", "Floor 2"),\n    ("Volkov", "Floor 2"),\n])',
    change: "one pair per line, a comma after each",
  },
  rs_map_values: {
    before: "let occupied: HashSet<&str> = guards.iter().map(|(_, floor)| *floor).collect();",
    after: "let occupied: HashSet<&str> = guards.values().copied().collect();",
    change: "ask the map for its values",
  },
  rs_collect_set: {
    before: "let mut occupied = HashSet::new();\nfor floor in guards.values() {\n    occupied.insert(*floor);\n}",
    after: "let occupied: HashSet<&str> = guards.values().copied().collect();",
    change: "collect straight into the set",
  },
  rs_bool_comparison: {
    before: "if occupied.contains(name.as_str()) == false {",
    after: "if !occupied.contains(name.as_str()) {",
    change: "use the bool directly, no == false",
  },
  rs_print_literal: {
    before: 'println!("{}", "Hello World");',
    after: 'println!("Hello World");',
    change: "put the text in the template",
  },
  rs_chars_rev: {
    before: "let bytes: Vec<u8> = s.bytes().rev().collect();\nString::from_utf8(bytes).unwrap()",
    after: "s.chars().rev().collect()",
    change: "walk characters, not bytes",
  },
  rs_collect_string: {
    before: "let mut out = String::new();\nfor c in s.chars().rev() {\n    out.push(c);\n}\nout",
    after: "s.chars().rev().collect()",
    change: "collect the chain instead of pushing",
  },
  rs_split_whitespace: {
    before: 'msg.split(\' \').map(reverse_word).collect::<Vec<String>>().join(" ")',
    after: 'msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")',
    change: "split on any run of whitespace",
  },
  rs_join_words: {
    before: 'let mut out = String::new();\nfor w in msg.split_whitespace() {\n    out.push_str(&reverse_word(w));\n    out.push_str(" ");\n}\nout.trim_end().to_string()',
    after: 'msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")',
    change: "join the words instead of gluing them",
  },
  rs_map_by_name: {
    before: ".map(|w| reverse_word(w))",
    after: ".map(reverse_word)",
    change: "pass the function by name",
  },
  rs_no_unwrap_parse: {
    before: 'format!("F{}-C{}", floor, code.parse::<i32>().unwrap() * 2)',
    after: 'match code.parse::<i32>() {\n    Ok(n) => format!("F{}-C{}", floor, n * 2),\n    Err(_) => format!("F{}-ERR", floor),\n}',
    change: "match on the Result instead of unwrapping",
  },
  rs_format_header: {
    before: '"F".to_string() + &floor.to_string() + "-C" + &(n * 2).to_string()',
    after: 'format!("F{}-C{}", floor, n * 2)',
    change: "build the header with format!",
  },
  rs_println_newline: {
    before: 'print!("Hello World\\n");',
    after: 'println!("Hello World");',
    change: "let println! end the line",
  },
  rs_named_drop_guard: {
    before: "let log = Log(dir.to_string());",
    after: "let _log = Log(dir.to_string());",
    change: "an underscored name keeps the guard alive, quietly",
  },
  rs_strip_suffix: {
    before: "if entry.ends_with('/') {\n    scan(archive, &entry[..entry.len() - 1], count);\n}",
    after: "if let Some(sub) = entry.strip_suffix('/') {\n    scan(archive, sub, count);\n}",
    change: "strip_suffix checks and trims at once",
  },
  rs_question_mark: {
    before: 'let entries = match &archive[dir] {\n    Some(e) => e,\n    None => return Err("corrupted directory".to_string()),\n};',
    after: 'let entries = archive[dir].as_ref().ok_or("corrupted directory")?;',
    change: "let ? pass the error up",
  },
  rs_errors_not_panics: {
    before: 'let entries = archive[dir].as_ref().expect("corrupted directory");',
    after: 'let entries = archive[dir].as_ref().ok_or("corrupted directory")?;',
    change: "return an Err instead of panicking",
  },
  rs_no_unused_use: {
    before: 'use std::thread;\n\nfn main() {\n    println!("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "drop the use line nothing needs yet",
  },
  rs_reuse_cut: {
    before: 'thread::spawn(move || println!("{} circuit: DOWN", name));',
    after: "thread::spawn(move || cut(&name));",
    change: "run the cut you already wrote",
  },
  rs_thread_module_path: {
    before: "use std::thread::spawn;\n\nspawn(move || cut(&name));",
    after: "use std::thread;\n\nthread::spawn(move || cut(&name));",
    change: "call through the thread module",
  },
  rs_spawn_all_then_join: {
    before: 'for name in circuits {\n    let name = name.to_string();\n    let h = thread::spawn(move || format!("{} circuit: DOWN", name));\n    lines.push(h.join().unwrap());\n}',
    after: 'for name in circuits {\n    let name = name.to_string();\n    handles.push(thread::spawn(move || format!("{} circuit: DOWN", name)));\n}\nhandles.into_iter().map(|h| h.join().unwrap()).collect()',
    change: "spawn every thread before joining any",
  },
  rs_join_collect: {
    before: "let mut lines = Vec::new();\nfor h in handles {\n    lines.push(h.join().unwrap());\n}\nlines",
    after: "handles.into_iter().map(|h| h.join().unwrap()).collect()",
    change: "map the joins and collect them",
  },
  rs_sleep_in_thread: {
    before: "thread::sleep(Duration::from_millis(d));\nhandles.push(thread::spawn(move || format!(\"{} circuit: DOWN ({}ms)\", name, d)));",
    after: "handles.push(thread::spawn(move || {\n    thread::sleep(Duration::from_millis(d));\n    format!(\"{} circuit: DOWN ({}ms)\", name, d)\n}));",
    change: "sleep inside the thread, not the loop",
  },
  rs_zip_pairs: {
    before: "for i in 0..circuits.len() {\n    let name = circuits[i].to_string();\n    let d = delays[i];",
    after: "for (name, &d) in circuits.iter().zip(delays) {\n    let name = name.to_string();",
    change: "zip the names with their delays",
  },
  rs_tight_call: {
    before: 'fn main () {\n    println! ("Hello World");\n}',
    after: 'fn main() {\n    println!("Hello World");\n}',
    change: "no space before the bracket",
  },
  rs_from_millis: {
    before: "thread::sleep(Duration::from_secs(delay_ms / 1000));",
    after: "thread::sleep(Duration::from_millis(delay_ms));",
    change: "use from_millis for milliseconds",
  },
  rs_mpsc_path: {
    before: "use std::sync::mpsc::channel;\n\nlet (tx, rx) = channel();",
    after: "use std::sync::mpsc;\n\nlet (tx, rx) = mpsc::channel();",
    change: "call channel through mpsc",
  },
  rs_loop_the_teams: {
    before: "let tx_a = tx.clone();\nthread::spawn(move || { /* alpha */ });\nlet tx_b = tx.clone();\nthread::spawn(move || { /* bravo */ });\nthread::spawn(move || { /* charlie */ });",
    after: "for r in [alpha, bravo, charlie] {\n    let tx = tx.clone();\n    thread::spawn(move || {\n        if let Ok(msg) = r.recv() {\n            let _ = tx.send(msg);\n        }\n    });\n}",
    change: "one loop over every team",
  },
  rs_send_ignore_closed: {
    before: "tx.send(msg).unwrap();",
    after: "let _ = tx.send(msg);",
    change: "let a late send fail quietly",
  },
  rs_recv_timeout: {
    before: "let start = Instant::now();\nloop {\n    if let Ok(msg) = rx.try_recv() {\n        return msg;\n    }\n    if start.elapsed() > deadline {\n        return \"NO CONTACT\".to_string();\n    }\n    thread::sleep(Duration::from_millis(1));\n}",
    after: "match rx.recv_timeout(Duration::from_millis(timeout_ms)) {\n    Ok(msg) => msg,\n    Err(_) => \"NO CONTACT\".to_string(),\n}",
    change: "one recv_timeout instead of a polling loop",
  },
  rs_sweep_no_wait: {
    before: "match ch.recv_timeout(Duration::from_millis(10)) {",
    after: "match ch.try_recv() {",
    change: "try_recv never waits",
  },
};
