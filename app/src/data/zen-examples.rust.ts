import type { ZenExample } from "./zen-examples";

// Before → after for every Rust zen rule (src/lib/game/zen-rust.ts), Act I.
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
};
