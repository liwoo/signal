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
