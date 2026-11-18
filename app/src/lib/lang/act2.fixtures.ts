// Reference solutions for Act II in each non-Go language — same conventions as
// act1.fixtures.ts: code carries forward between steps, and later steps keep
// earlier top-level output to prove the harness mutes it.

import type { Solutions } from "./act1.fixtures";

const JS_ROSTER = `function buildRoster() {
  return {
    Chen: "Floor 1",
    Alvarez: "Floor 2",
    Volkov: "Floor 2",
    Park: "Floor 3",
    Santos: "Floor 1",
  };
}`;

const JS_REVERSE = `function reverseWord(s) {
  return [...s].reverse().join("");
}`;

const JS_ENCODE = `${JS_REVERSE}

function encode(msg) {
  return msg.split(" ").map(reverseWord).join(" ");
}`;

const JS: Solutions = {
  "chapter-04:scaffold": `console.log("Hello World");`,
  "chapter-04:guardmap": `${JS_ROSTER}

console.log("Hello World");`,
  "chapter-04:clearfloors": `${JS_ROSTER}

function findClearFloor(guards, maxFloor) {
  const occupied = new Set(Object.values(guards));
  for (let i = 1; i <= maxFloor; i++) {
    const name = \`Floor \${i}\`;
    if (!occupied.has(name)) return name;
  }
  return "";
}

console.log(findClearFloor(buildRoster(), 4));`,
  "chapter-04.2:scaffold": `console.log("Hello World");`,
  "chapter-04.2:reverseword": `${JS_REVERSE}

console.log(reverseWord("relay"));`,
  "chapter-04.2:encode": `${JS_ENCODE}

console.log(encode("floor is clear"));`,
  "chapter-04.2:relayheader": `${JS_ENCODE}

function relayHeader(floor, code) {
  const n = Number(code);
  if (Number.isNaN(n)) return \`F\${floor}-ERR\`;
  return \`F\${floor}-C\${n * 2}\`;
}

console.log(relayHeader(2, "50"));`,
};

const PY_ROSTER = `def build_roster():
    return {
        "Chen": "Floor 1",
        "Alvarez": "Floor 2",
        "Volkov": "Floor 2",
        "Park": "Floor 3",
        "Santos": "Floor 1",
    }`;

const PY_ENCODE = `def reverse_word(s):
    return s[::-1]


def encode(msg):
    return " ".join(reverse_word(w) for w in msg.split())`;

const PY: Solutions = {
  "chapter-04:scaffold": `print("Hello World")`,
  "chapter-04:guardmap": `${PY_ROSTER}


print("Hello World")`,
  "chapter-04:clearfloors": `${PY_ROSTER}


def find_clear_floor(guards, max_floor):
    occupied = set(guards.values())
    for i in range(1, max_floor + 1):
        name = f"Floor {i}"
        if name not in occupied:
            return name
    return ""


print(find_clear_floor(build_roster(), 4))`,
  "chapter-04.2:scaffold": `print("Hello World")`,
  "chapter-04.2:reverseword": `def reverse_word(s):
    return s[::-1]


print(reverse_word("relay"))`,
  "chapter-04.2:encode": `${PY_ENCODE}


print(encode("floor is clear"))`,
  "chapter-04.2:relayheader": `${PY_ENCODE}


def relay_header(floor, code):
    try:
        n = int(code)
    except ValueError:
        return f"F{floor}-ERR"
    return f"F{floor}-C{n * 2}"


print(relay_header(2, "50"))`,
};

export const ACT2_SOLUTIONS: Record<"javascript" | "python", Solutions> = { javascript: JS, python: PY };

/** Hardcoded shortcuts and the classic mistake each step exists to catch — all must fail. */
export const ACT2_HARDCODED: Record<"javascript" | "python", Partial<Solutions>> = {
  javascript: {
    "chapter-04:guardmap": `console.log("Floor 2");\nconsole.log("Floor 1");\nconsole.log(5);`,
    "chapter-04.2:relayheader": `${JS_ENCODE}

function relayHeader(floor, code) {
  return \`F\${floor}-C\${parseInt(code) * 2}\`;
}`,
  },
  python: {
    "chapter-04:guardmap": `print("Floor 2")\nprint("Floor 1")\nprint(5)`,
    "chapter-04.2:relayheader": `${PY_ENCODE}


def relay_header(floor, code):
    return f"F{floor}-C{int(code) * 2}"`,
  },
};

// ── Rust ──

const RS_ROSTER = `use std::collections::HashMap;

fn build_roster() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("Chen", "Floor 1"),
        ("Alvarez", "Floor 2"),
        ("Volkov", "Floor 2"),
        ("Park", "Floor 3"),
        ("Santos", "Floor 1"),
    ])
}`;

const RS_REVERSE = `fn reverse_word(s: &str) -> String {
    s.chars().rev().collect()
}`;

const RS_ENCODE = `${RS_REVERSE}

fn encode(msg: &str) -> String {
    msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")
}`;

const RS_HELLO = `fn main() {
    println!("Hello World");
}`;

export const RS_ACT2: Solutions = {
  "chapter-04:scaffold": RS_HELLO,
  "chapter-04:guardmap": `${RS_ROSTER}

${RS_HELLO}`,
  "chapter-04:clearfloors": `use std::collections::HashSet;
${RS_ROSTER}

fn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String {
    let occupied: HashSet<&str> = guards.values().copied().collect();
    for i in 1..=max_floor {
        let name = format!("Floor {}", i);
        if !occupied.contains(name.as_str()) {
            return name;
        }
    }
    String::new()
}

fn main() {
    println!("{}", find_clear_floor(&build_roster(), 4));
}`,
  "chapter-04.2:scaffold": RS_HELLO,
  "chapter-04.2:reverseword": `${RS_REVERSE}

fn main() {
    println!("{}", reverse_word("relay"));
}`,
  "chapter-04.2:encode": `${RS_ENCODE}

fn main() {
    println!("{}", encode("floor is clear"));
}`,
  "chapter-04.2:relayheader": `${RS_ENCODE}

fn relay_header(floor: u32, code: &str) -> String {
    match code.parse::<i32>() {
        Ok(n) => format!("F{}-C{}", floor, n * 2),
        Err(_) => format!("F{}-ERR", floor),
    }
}

fn main() {
    println!("{}", relay_header(2, "50"));
}`,
};

export const RS_ACT2_HARDCODED: Partial<Solutions> = {
  "chapter-04:guardmap": `fn main() {
    println!("Floor 2");
    println!("Floor 1");
    println!("5");
}`,
  // A Vec instead of a set — right answer, but the step teaches HashSet.
  "chapter-04:clearfloors": `${RS_ROSTER}

fn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String {
    let occupied: Vec<&str> = guards.values().copied().collect();
    for i in 1..=max_floor {
        let name = format!("Floor {}", i);
        if !occupied.contains(&name.as_str()) {
            return name;
        }
    }
    String::new()
}`,
  // unwrap() promises the parse can't fail — "abc" panics and the relay goes down.
  "chapter-04.2:relayheader": `${RS_ENCODE}

fn relay_header(floor: u32, code: &str) -> String {
    format!("F{}-C{}", floor, code.parse::<i32>().unwrap() * 2)
}`,
};
