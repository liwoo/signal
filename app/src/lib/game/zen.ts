// ── Go Zen System ──
// Heuristic analysis of player code for idiomatic Go patterns.
// Awards bonus XP and triggers Maya's "memory jolt" narrative.
// Based on: The Zen of Go + Effective Go.
// Pure functions only.

// ── Types ──

export interface ZenRule {
  id: string;
  principle: string;       // short name, e.g. "grouped imports"
  check: (code: string) => boolean;
  bonusXP: number;
  jolt: string;            // Maya's memory returning (when followed)
  suggestion: string;      // Maya's hint (when not followed)
}

export interface ZenResult {
  bonusXP: number;
  jolts: string[];         // memory jolts for followed rules
  suggestions: string[];   // tips for unfollowed rules
}

// ── Zen Rules ──

// Ch01: Scaffold
const groupedImport: ZenRule = {
  id: "grouped_import",
  principle: "grouped imports",
  check: (code) => /import\s*\(/.test(code),
  bonusXP: 10,
  jolt: "...wait. i remember something.\n\nyou grouped the import with parentheses — `import ( ... )`. that's how go does it. even with one import. when you add more later, the diff stays clean. one line changes, not two.\n\nmy professor called it... \"plan for the code that comes after yours.\"",
  suggestion: "try grouping your import: `import ( \"fmt\" )` — parentheses. even for one. it's the go way... i think i remember that much.",
};

const cleanStructure: ZenRule = {
  id: "clean_structure",
  principle: "clean structure",
  check: (code) => {
    // blank line between package and import, and between import and func
    const lines = code.split("\n");
    let hasPackageSep = false;
    let hasImportSep = false;
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\s*package\s/.test(lines[i])) {
        // check if next non-empty line gap exists
        if (i + 1 < lines.length && lines[i + 1].trim() === "") hasPackageSep = true;
      }
      // after import block, check for blank line
      if (/^\s*\)/.test(lines[i]) || /^\s*import\s+"/.test(lines[i])) {
        if (i + 1 < lines.length && lines[i + 1].trim() === "") hasImportSep = true;
      }
    }
    return hasPackageSep && hasImportSep;
  },
  bonusXP: 5,
  jolt: "the spacing... blank lines between package, import, and func. that's not random. go code breathes in sections. gofmt enforces it. you already write like someone who knows.",
  suggestion: "add blank lines between your package, import, and func blocks. go code has rhythm — let it breathe.",
};

// Ch01: Transmit
const useConstants: ZenRule = {
  id: "use_constants",
  principle: "const for fixed values",
  check: (code) => /\bconst\b/.test(code),
  bonusXP: 10,
  jolt: "...the gas is clearing.\n\nyou used `const`. that's not just syntax — it's intent. you're telling anyone reading this: \"this value does not change. period.\" in go, constants aren't just immutable... they're evaluated at compile time. zero runtime cost.\n\nzen of go: make the zero value useful. make your intent visible.",
  suggestion: "cell B-09 doesn't move. sublevel 3 doesn't change. those should be `const`, not `var` or `:=`. constants signal intent... i'm sure of it.",
};

const usePrintfFormat: ZenRule = {
  id: "use_printf_format",
  principle: "printf formatting",
  check: (code) => /fmt\.Printf/.test(code) && /%[sdvf]/.test(code),
  bonusXP: 15,
  jolt: "...my thesis notes. i can see them.\n\nyou used Printf with format verbs — `%s`, `%d`. that's how go separates data from presentation. the template is one thing, the values another. when i was writing my encryption library... format strings everywhere. clean. composable.\n\neffective go calls it \"the printer's idiom.\"",
  suggestion: "string concatenation works, but `fmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cell, level)` separates format from data. go has powerful format verbs... try them.",
};

const descriptiveNames: ZenRule = {
  id: "descriptive_names",
  principle: "meaningful names",
  check: (code) => {
    // only check variable/const declarations, not string literals
    const declPattern = /(?:const|var|:=)\s*(\w+)/g;
    let match;
    while ((match = declPattern.exec(code)) !== null) {
      const name = match[1].toLowerCase();
      if (/^(cell|location|block|room|sublevel|level|floor|sub)$/.test(name)) {
        return true;
      }
    }
    // also check left side of := assignments like `cell := ...`
    const shortDecl = /(\w+)\s*:=/g;
    while ((match = shortDecl.exec(code)) !== null) {
      const name = match[1].toLowerCase();
      if (/^(cell|location|block|room|sublevel|level|floor|sub)$/.test(name)) {
        return true;
      }
    }
    return false;
  },
  bonusXP: 10,
  jolt: "good names. `cell`, `sublevel`... not `x` and `y`. in go, a variable's name is its documentation. no javadoc, no docblocks — just honest names.\n\nmy advisor used to say: \"the length of a name should be proportional to its scope.\" short in a loop. descriptive everywhere else.",
  suggestion: "your variable names could say more. `cell := \"B-09\"` reads better than `x := \"B-09\"`. in go, names are documentation.",
};

// Ch02: Loop
const simpleIncrement: ZenRule = {
  id: "simple_increment",
  principle: "simple increment",
  check: (code) => /i\+\+/.test(code) && !/i\s*=\s*i\s*\+\s*1/.test(code) && !/i\s*\+=\s*1/.test(code),
  bonusXP: 5,
  jolt: "`i++` — the simplest form. go doesn't have `++i` as an expression. it's a statement. one thing, one way to do it.\n\nzen of go: simplicity matters. fewer ways to write something means fewer ways to misread it.",
  suggestion: "`i++` is the go way. not `i += 1`, not `i = i + 1`. one operation, one form. simplicity matters.",
};

// Ch02: Classify
const switchOverIfElse: ZenRule = {
  id: "switch_over_ifelse",
  principle: "switch over if-else chains",
  check: (code) => /\bswitch\b/.test(code),
  bonusXP: 15,
  jolt: "...fragments coming back.\n\nswitch without a variable — `switch { case condition: }` — that's go's secret weapon. it replaces if-else chains and reads like a truth table. each case is a contract.\n\neffective go: \"switch on true replaces if-else chains.\" i wrote that in my notes once. i'm sure of it now.\n\nthe compiler checks completeness. your intent is crystal clear.",
  suggestion: "if-else chains work, but `switch { case i <= 3: ... }` is more idiomatic. go's switch is powerful — no variable needed for range checks.",
};

const noUnnecessaryBreak: ZenRule = {
  id: "no_unnecessary_break",
  principle: "no fallthrough by default",
  check: (code) => {
    // check that switch is used but break is NOT present (go doesn't fall through)
    return /\bswitch\b/.test(code) && !/\bbreak\b/.test(code);
  },
  bonusXP: 10,
  jolt: "no `break` statements. good. that's one of go's best decisions.\n\nin C and Java, forgetting break causes fallthrough bugs. go said no — each case exits automatically. if you WANT fallthrough, you say `fallthrough` explicitly.\n\ndefaults should be safe. opt-in to danger, not out.",
  suggestion: "you added `break` in your switch — in go, you don't need it. cases don't fall through by default. that's a safety feature. remove the breaks.",
};

// Ch03: Sum
const shortVarInLoop: ZenRule = {
  id: "short_var_loop",
  principle: "short names in small scope",
  check: (code) => {
    // check for range loop with short variable names (1-2 chars)
    return /for\s+[_a-z],?\s*[a-z]\s*:=\s*range/.test(code);
  },
  bonusXP: 10,
  jolt: "...short variable names in the loop. `c`, not `codeValue`. in go, a name's length matches its scope.\n\ni remember — effective go says: \"the further from its declaration a name is used, the more descriptive the name should be.\" inside a 3-line loop? single letter is perfect.\n\nmy encryption library... every loop var was one letter. reviewers loved it.",
  suggestion: "in a short loop, `c` is better than `codeValue`. go convention: shorter scope = shorter name. save long names for long-lived things.",
};

const underscoreUnused: ZenRule = {
  id: "underscore_unused",
  principle: "blank identifier for unused values",
  check: (code) => /for\s+_\s*,/.test(code),
  bonusXP: 5,
  jolt: "the blank identifier — `_`. you threw away the index because you don't need it. that's not laziness, that's precision.\n\ngo forces you to use every variable. `_` is how you say \"i acknowledge this exists, but i don't need it.\" intentional discards.",
  suggestion: "you're not using the index from range. use `_` to discard it: `for _, c := range codes`. go demands every variable be used — `_` is the escape hatch.",
};

const singlePurposeFunc: ZenRule = {
  id: "single_purpose",
  principle: "single-purpose function",
  check: (code) => {
    // sumCodes only sums — no prints, no validation inside it
    const funcBody = code.match(/func\s+sumCodes[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    const body = funcBody[1];
    return !body.includes("fmt.") && !body.includes("Println") && !body.includes("Printf");
  },
  bonusXP: 10,
  jolt: "sumCodes does one thing — sums. no printing, no validation. just the sum.\n\nzen of go: \"each package fulfils a single purpose.\" same for functions. a function that sums AND prints is two functions pretending to be one.\n\ni remember now... my thesis had a function called `encrypt`. it only encrypted. everything else was someone else's job.",
  suggestion: "your sumCodes function does more than sum. keep it pure — just the math. let main() handle printing. single purpose, single responsibility.",
};

// Ch03: Validate
const directBoolReturn: ZenRule = {
  id: "direct_bool_return",
  principle: "direct boolean returns",
  check: (code) => {
    // check for `return total, total > 100` pattern (no if/else for the bool)
    const funcBody = code.match(/func\s+validateCode[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    const body = funcBody[1];
    // should have a direct comparison return, not an if/else
    return /return\s+\w+\s*,\s*\w+\s*[><=!]/.test(body);
  },
  bonusXP: 15,
  jolt: "...the fog is lifting.\n\n`return total, total > 100` — you returned the comparison directly. no if/else wrapping a boolean that's already right there.\n\neffective go: \"don't test a boolean against true.\" and don't build one with if/else when the expression already IS a boolean.\n\nmy advisor circled this pattern in red ink. \"this,\" she said, \"is how you know someone actually thinks in go.\"",
  suggestion: "you're using if/else to return true/false. but `total > 100` already IS a boolean. try: `return total, total > 100`. direct. clean.",
};

const reuseFunctions: ZenRule = {
  id: "reuse_functions",
  principle: "compose by calling existing functions",
  check: (code) => {
    const funcBody = code.match(/func\s+validateCode[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    return funcBody[1].includes("sumCodes");
  },
  bonusXP: 10,
  jolt: "you called sumCodes inside validateCode. composition — not duplication.\n\nif you'd rewritten the sum logic... that's two places to fix when something changes. go's standard library is built this way. `io.Copy` calls `Read` and `Write`. layers of simple functions.\n\nmy encryption library had 47 functions. the longest was 12 lines. each one called others.",
  suggestion: "you're re-implementing the sum inside validateCode. call `sumCodes(codes...)` instead — reuse what you already built. composition over duplication.",
};

// ── Registry ──

const STEP_ZEN_RULES: Record<string, ZenRule[]> = {
  "chapter-01:scaffold": [groupedImport, cleanStructure],
  "chapter-01:location": [useConstants, usePrintfFormat, descriptiveNames],
  "chapter-02:loop": [simpleIncrement],
  "chapter-02:classify": [switchOverIfElse, noUnnecessaryBreak],
  "chapter-03:sumfunc": [shortVarInLoop, underscoreUnused, singlePurposeFunc],
  "chapter-03:validate": [directBoolReturn, reuseFunctions],
};

// ── Analysis ──

export function analyzeZen(stepId: string, code: string): ZenResult {
  const rules = STEP_ZEN_RULES[stepId];
  if (!rules || rules.length === 0) {
    return { bonusXP: 0, jolts: [], suggestions: [] };
  }

  let bonusXP = 0;
  const jolts: string[] = [];
  const suggestions: string[] = [];

  for (const rule of rules) {
    if (rule.check(code)) {
      bonusXP += rule.bonusXP;
      jolts.push(rule.jolt);
    } else {
      suggestions.push(rule.suggestion);
    }
  }

  return { bonusXP, jolts, suggestions };
}

export function buildZenMessage(result: ZenResult, missedXP?: number): string | null {
  if (result.jolts.length === 0 && result.suggestions.length === 0) return null;

  const parts: string[] = [];

  // Pick one jolt (the first/most relevant) to avoid overwhelming
  if (result.jolts.length > 0) {
    parts.push(result.jolts[0]);
  }

  // Pick one suggestion if no jolts, or if there are some
  if (result.suggestions.length > 0 && result.jolts.length === 0) {
    // Only suggestions — frame as memory trying to return
    parts.push("...something's trying to come back.\n\n" + result.suggestions[0]);
  } else if (result.suggestions.length > 0 && result.jolts.length > 0) {
    // Mix of good and improvement
    parts.push("one more thing... " + result.suggestions[0]);
  }

  if (result.bonusXP > 0) {
    parts.push(`[ZEN +${result.bonusXP} XP]`);
  }

  // Show missed XP to motivate idiomatic code
  if (missedXP && missedXP > 0) {
    parts.push(`next time you could earn +${missedXP} more XP with cleaner go.`);
  }

  return parts.join("\n\n");
}

export function calculateMissedXP(stepId: string, result: ZenResult): number {
  const rules = STEP_ZEN_RULES[stepId];
  if (!rules) return 0;
  const maxXP = rules.reduce((sum, r) => sum + r.bonusXP, 0);
  return maxXP - result.bonusXP;
}

// ── Exports for testing ──

export const ZEN_RULES = STEP_ZEN_RULES;
