// Reference solutions for Act I in each non-Go language — the code a player
// would plausibly write at each step (code carries forward between steps, and
// later steps keep earlier top-level output to prove the harness mutes it).
// Shared by the golden tests and the engine/bank contract tests.

import type { LanguageId } from "@/types/game";

export type Solutions = Record<string, string>;

const JS: Solutions = {
  "chapter-01:scaffold": `console.log("Hello World");`,
  "chapter-01:location": `import { cell, sublevel } from "./cellblock.js";

console.log(\`CELL \${cell} · SUBLEVEL \${sublevel}\`);`,
  "chapter-02:scaffold": `console.log("Hello World");`,
  "chapter-02:loop": `for (let i = 1; i <= 10; i++) {
  console.log(i);
}`,
  "chapter-02:classify": `for (let i = 1; i <= 10; i++) {
  if (i <= 3) {
    console.log(i, "DENY");
  } else if (i <= 6) {
    console.log(i, "WARN");
  } else if (i <= 9) {
    console.log(i, "GRANT");
  } else {
    console.log(i, "OVERRIDE");
  }
}`,
  "chapter-02:rewrite": `for (let i = 1; i <= 10; i++) {
  switch (true) {
    case i <= 3:
      console.log(i, "DENY");
      break;
    case i <= 6:
      console.log(i, "WARN");
      break;
    case i <= 9:
      console.log(i, "GRANT");
      break;
    default:
      console.log(i, "OVERRIDE");
  }
}`,
  "chapter-03:scaffold": `console.log("Hello World");`,
  "chapter-03:sumfunc": `function sumCodes(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;
}

console.log("Hello World", sumCodes(1, 2));`,
  "chapter-03:validate": `function sumCodes(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;
}

function validateCode(...codes) {
  const total = sumCodes(...codes);
  return [total, total > 100];
}

const [s, v] = validateCode(1);
console.log(s, v);`,
};

const PY: Solutions = {
  "chapter-01:scaffold": `print("Hello World")`,
  "chapter-01:location": `import cellblock

print(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")`,
  "chapter-02:scaffold": `print("Hello World")`,
  "chapter-02:loop": `for i in range(1, 11):
    print(i)`,
  "chapter-02:classify": `for i in range(1, 11):
    if i <= 3:
        print(i, "DENY")
    elif i <= 6:
        print(i, "WARN")
    elif i <= 9:
        print(i, "GRANT")
    else:
        print(i, "OVERRIDE")`,
  "chapter-02:rewrite": `levels = {
    1: "DENY", 2: "DENY", 3: "DENY",
    4: "WARN", 5: "WARN", 6: "WARN",
    7: "GRANT", 8: "GRANT", 9: "GRANT",
    10: "OVERRIDE",
}

for i in range(1, 11):
    print(i, levels[i])`,
  "chapter-03:scaffold": `print("Hello World")`,
  "chapter-03:sumfunc": `def sum_codes(*codes):
    total = 0
    for c in codes:
        total += c
    return total


print("Hello World", sum_codes(1, 2))`,
  "chapter-03:validate": `def sum_codes(*codes):
    return sum(codes)


def validate_code(*codes):
    total = sum_codes(*codes)
    return total, total > 100


s, v = validate_code(1)
print(s, v)`,
};

export const SOLUTIONS: Record<Exclude<LanguageId, "go">, Solutions> = { javascript: JS, python: PY };

export const HARDCODED: Record<Exclude<LanguageId, "go">, Partial<Solutions>> = {
  javascript: {
    "chapter-01:location": `console.log("CELL B-09 · SUBLEVEL 3");`,
    "chapter-02:loop": Array.from({ length: 10 }, (_, k) => `console.log(${k + 1});`).join("\n"),
  },
  python: {
    "chapter-01:location": `print("CELL B-09 · SUBLEVEL 3")`,
    "chapter-02:loop": Array.from({ length: 10 }, (_, k) => `print(${k + 1})`).join("\n"),
    "chapter-02:rewrite": PY["chapter-02:classify"],
  },
};
