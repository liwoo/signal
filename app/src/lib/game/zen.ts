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
  /** If defined, rule is skipped entirely when this returns false.
   *  Prevents irrelevant suggestions (e.g. "use switch" when user has no branching). */
  isRelevant?: (code: string) => boolean;
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

const packageImportSep: ZenRule = {
  id: "package_import_sep",
  principle: "blank line after package",
  check: (code) => {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\s*package\s/.test(lines[i])) {
        return i + 1 < lines.length && lines[i + 1].trim() === "";
      }
    }
    return false;
  },
  bonusXP: 3,
  jolt: "blank line after `package main`. go code breathes in sections — package, imports, functions. gofmt enforces it. you already write like someone who knows.",
  suggestion: "add a blank line after `package main`. go code has rhythm — each section gets its own space.",
};

const importFuncSep: ZenRule = {
  id: "import_func_sep",
  principle: "blank line after imports",
  check: (code) => {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      // after grouped import close or single-line import
      if (/^\s*\)/.test(lines[i]) || /^\s*import\s+"/.test(lines[i])) {
        if (i + 1 < lines.length && lines[i + 1].trim() === "") return true;
      }
    }
    return false;
  },
  bonusXP: 2,
  jolt: "the gap between imports and func — that's not cosmetic. gofmt puts it there. sections breathe.",
  suggestion: "add a blank line between your import block and `func main()`. let the sections breathe.",
};

// Ch01: Transmit
const useNamedValues: ZenRule = {
  id: "use_named_values",
  principle: "named values over hardcoding",
  check: (code) => /\bconst\b/.test(code) || /\w+\s*:=\s*["'`\d]/.test(code),
  bonusXP: 10,
  jolt: "...the gas is clearing.\n\nyou gave things names — variables, not raw strings buried in a print call. that's intent. anyone reading this code knows what \"B-09\" means because you told them.\n\nzen of go: make your intent visible. `const` locks it down at compile time. `:=` is good too — it's short, clear, declared right where it's used.",
  suggestion: "try declaring named values — `cell := \"B-09\"` or `const cell = \"B-09\"` — instead of hardcoding strings directly in the print call. names are documentation.",
};

const usePrintfFormat: ZenRule = {
  id: "use_printf_format",
  principle: "printf formatting",
  // Only relevant when user is printing with variables (concatenation or Printf)
  isRelevant: (code) => /fmt\.\w*[Pp]rint/.test(code) && (/\+\s*"/.test(code) || /"\s*\+/.test(code) || /fmt\.Printf/.test(code) || /,\s*\w+\)/.test(code)),
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
  suggestion: "try using descriptive names — `cell := \"B-09\"` reads better than `x := \"B-09\"`. in go, names are documentation.",
};

// Ch02: Loop
const simpleIncrement: ZenRule = {
  id: "simple_increment",
  principle: "simple increment",
  // Only relevant when user is incrementing a variable (any form)
  isRelevant: (code) => /i\+\+/.test(code) || /i\s*\+=\s*1/.test(code) || /i\s*=\s*i\s*\+\s*1/.test(code),
  check: (code) => /i\+\+/.test(code) && !/i\s*=\s*i\s*\+\s*1/.test(code) && !/i\s*\+=\s*1/.test(code),
  bonusXP: 5,
  jolt: "`i++` — the simplest form. go doesn't have `++i` as an expression. it's a statement. one thing, one way to do it.\n\nzen of go: simplicity matters. fewer ways to write something means fewer ways to misread it.",
  suggestion: "use `i++` — it's the go way. not `i += 1`, not `i = i + 1`. one operation, one form. simplicity matters.",
};

// Ch02: Classify — constants for labels
const useConstantsForLabels: ZenRule = {
  id: "use_constants_labels",
  principle: "constants over magic strings",
  // Only relevant when user has string literals like "DENY", "WARN" etc. in their code
  isRelevant: (code) => /"(DENY|WARN|GRANT|OVERRIDE)"/.test(code),
  check: (code) => {
    // Check that const block exists and contains at least 2 label-like string assignments
    const constBlock = code.match(/\bconst\s*\([\s\S]*?\)/);
    const constSingle = code.match(/\bconst\s+\w+\s*=\s*"/g);
    const labelCount = (constBlock?.[0]?.match(/=\s*"/g)?.length ?? 0) +
      (constSingle?.length ?? 0);
    return labelCount >= 2;
  },
  bonusXP: 10,
  jolt: "...something's coming back.\n\nyou named the labels — constants instead of magic strings buried in switch cases. `\"DENY\"` scattered everywhere is invisible intent. a `const` says \"this matters, this has meaning.\"\n\nzen of go: make the important things visible. when you change a label, you change it in one place.",
  suggestion: "try defining constants for your labels: `const deny = \"DENY\"` (or a const block). magic strings in switch cases are fragile — named constants make intent visible and changes safe.",
};

// Ch02: Classify — switch (only jolt if used, never suggest switching approach)
const switchOverIfElse: ZenRule = {
  id: "switch_over_ifelse",
  principle: "switch over if-else chains",
  // Only relevant when user chose switch — reward the choice, never nag about if/else
  isRelevant: (code) => /\bswitch\b/.test(code),
  check: (code) => /\bswitch\b/.test(code),
  bonusXP: 15,
  jolt: "...fragments coming back.\n\nswitch without a variable — `switch { case condition: }` — that's go's secret weapon. it replaces if-else chains and reads like a truth table. each case is a contract.\n\neffective go: \"switch on true replaces if-else chains.\" i wrote that in my notes once. i'm sure of it now.\n\nthe compiler checks completeness. your intent is crystal clear.",
  suggestion: "",
};

const noUnnecessaryBreak: ZenRule = {
  id: "no_unnecessary_break",
  principle: "no fallthrough by default",
  // Only relevant when user actually wrote a switch statement
  isRelevant: (code) => /\bswitch\b/.test(code),
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
  // Only relevant when user wrote a range loop
  isRelevant: (code) => /\brange\b/.test(code),
  check: (code) => {
    // check for range loop with short variable names (1-2 chars)
    return /for\s+[_a-z],?\s*[a-z]\s*:=\s*range/.test(code);
  },
  bonusXP: 10,
  jolt: "...short variable names in the loop. `c`, not `codeValue`. in go, a name's length matches its scope.\n\ni remember — effective go says: \"the further from its declaration a name is used, the more descriptive the name should be.\" inside a 3-line loop? single letter is perfect.\n\nmy encryption library... every loop var was one letter. reviewers loved it.",
  suggestion: "try shorter names in small loops — `c` instead of `codeValue`. go convention: shorter scope = shorter name. save long names for long-lived things.",
};

const underscoreUnused: ZenRule = {
  id: "underscore_unused",
  principle: "blank identifier for unused values",
  // Only relevant when user wrote a range loop
  isRelevant: (code) => /\brange\b/.test(code),
  check: (code) => /for\s+_\s*,/.test(code),
  bonusXP: 5,
  jolt: "the blank identifier — `_`. you threw away the index because you don't need it. that's not laziness, that's precision.\n\ngo forces you to use every variable. `_` is how you say \"i acknowledge this exists, but i don't need it.\" intentional discards.",
  suggestion: "you're not using the index from range. use `_` to discard it: `for _, c := range codes`. go demands every variable be used — `_` is the escape hatch.",
};

const singlePurposeFunc: ZenRule = {
  id: "single_purpose",
  principle: "single-purpose function",
  // Only relevant when user wrote the sumCodes function
  isRelevant: (code) => /func\s+sumCodes/.test(code),
  check: (code) => {
    // sumCodes only sums — no prints, no validation inside it
    const funcBody = code.match(/func\s+sumCodes[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    const body = funcBody[1];
    return !body.includes("fmt.") && !body.includes("Println") && !body.includes("Printf");
  },
  bonusXP: 10,
  jolt: "sumCodes does one thing — sums. no printing, no validation. just the sum.\n\nzen of go: \"each package fulfils a single purpose.\" same for functions. a function that sums AND prints is two functions pretending to be one.\n\ni remember now... my thesis had a function called `encrypt`. it only encrypted. everything else was someone else's job.",
  suggestion: "try keeping `sumCodes` pure — just the math, no printing. let `main()` handle output. single purpose, single responsibility.",
};

// Ch03: Validate
const directBoolReturn: ZenRule = {
  id: "direct_bool_return",
  principle: "direct boolean returns",
  // Only relevant when user wrote the validateCode function
  isRelevant: (code) => /func\s+validateCode/.test(code),
  check: (code) => {
    // Shape check: function body has no if/else branching to return true/false.
    // If they avoid that anti-pattern, they're returning the bool directly.
    const funcBody = code.match(/func\s+validateCode[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    const body = funcBody[1];
    const hasIfElse = /\bif\b/.test(body);
    const returnsTrueFalse = /return\s+.+,\s*(true|false)\b/.test(body);
    return !hasIfElse && !returnsTrueFalse;
  },
  bonusXP: 15,
  jolt: "...the fog is lifting.\n\n`return total, total > 100` — you returned the comparison directly. no if/else wrapping a boolean that's already right there.\n\neffective go: \"don't test a boolean against true.\" and don't build one with if/else when the expression already IS a boolean.\n\nmy advisor circled this pattern in red ink. \"this,\" she said, \"is how you know someone actually thinks in go.\"",
  suggestion: "you're using if/else to return true/false. but `total > 100` already IS a boolean. try: `return total, total > 100`. direct. clean.",
};

const reuseFunctions: ZenRule = {
  id: "reuse_functions",
  principle: "compose by calling existing functions",
  // Only relevant when validateCode exists (sumCodes will be in scope from previous step)
  isRelevant: (code) => /func\s+validateCode/.test(code),
  check: (code) => {
    const funcBody = code.match(/func\s+validateCode[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    return funcBody[1].includes("sumCodes");
  },
  bonusXP: 10,
  jolt: "you called sumCodes inside validateCode. composition — not duplication.\n\nif you'd rewritten the sum logic... that's two places to fix when something changes. go's standard library is built this way. `io.Copy` calls `Read` and `Write`. layers of simple functions.\n\nmy encryption library had 47 functions. the longest was 12 lines. each one called others.",
  suggestion: "you're re-implementing the sum inside validateCode. call `sumCodes(codes...)` instead — reuse what you already built. composition over duplication.",
};

// Boss01: Predict
const sliceIndexing: ZenRule = {
  id: "slice_indexing",
  principle: "dynamic slice length",
  check: (code) => /\blen\s*\(/.test(code),
  bonusXP: 5,
  jolt: "...fragments. you used `len(codes)` to find the end. never hardcode a length — the slice knows its own size. my advisor said something about that... \"let the data describe itself.\"",
  suggestion: "use `len(codes)` to find the last element — never hardcode the index. slices know their own length.",
};

const deltaComputation: ZenRule = {
  id: "delta_computation",
  principle: "delta pattern for consecutive differences",
  check: (code) => /codes\s*\[.*\]\s*-\s*codes\s*\[/.test(code),
  bonusXP: 10,
  jolt: "...the delta pattern. you computed differences between consecutive codes. that's signal analysis — my thesis was about detecting patterns in encrypted streams. this felt... familiar.",
  suggestion: "try computing deltas: `delta := codes[i] - codes[i-1]`. the pattern lives in the differences.",
};

const earlyReturn: ZenRule = {
  id: "early_return",
  principle: "guard clause for edge cases",
  check: (code) => {
    // look for an early return guard near the top of predictNext
    const funcBody = code.match(/func\s+predictNext[^{]*\{([\s\S]*?)\n\}/);
    if (!funcBody) return false;
    const body = funcBody[1];
    // check for if len(...) < N { ... return ... } in the first few lines
    const lines = body.split("\n").slice(0, 6);
    const chunk = lines.join("\n");
    return /if\s+len\s*\(.*\)\s*</.test(chunk) && /return/.test(chunk);
  },
  bonusXP: 5,
  jolt: "you guarded the edge case. `if len(codes) < 2` — return early, don't process garbage. defensive coding. that's... that's what we did in the lab. validate inputs first, always.",
  suggestion: "add a guard: `if len(codes) < 2 { return 0 }`. handle edge cases before the main logic — go functions should fail fast.",
};

const namedVariables: ZenRule = {
  id: "named_variables",
  principle: "descriptive variable names for domain concepts",
  check: (code) => /\b(delta|diff|difference)\s*(:=|=)/.test(code),
  bonusXP: 5,
  jolt: "you named it `delta`. not `x`, not `d` — a real name. \"a good name is the best documentation\" — that's from effective go. my professor had it on his office door.",
  suggestion: "use descriptive names: `delta` or `diff` instead of `d` or `x`. go values clarity.",
};

// ── Registry ──

const STEP_ZEN_RULES: Record<string, ZenRule[]> = {
  "chapter-01:scaffold": [groupedImport, packageImportSep, importFuncSep],
  "chapter-01:location": [useNamedValues, usePrintfFormat, descriptiveNames],
  "chapter-02:scaffold": [groupedImport, packageImportSep, importFuncSep],
  "chapter-02:loop": [simpleIncrement],
  "chapter-02:classify": [switchOverIfElse, noUnnecessaryBreak, useConstantsForLabels],
  "chapter-03:scaffold": [groupedImport, packageImportSep, importFuncSep],
  "chapter-03:sumfunc": [shortVarInLoop, underscoreUnused, singlePurposeFunc],
  "chapter-03:validate": [directBoolReturn, reuseFunctions],
  "boss-01:scaffold": [groupedImport, packageImportSep, importFuncSep],
  "boss-01:predict": [sliceIndexing, deltaComputation, earlyReturn, namedVariables],
};

// ── Analysis ──

/**
 * Analyze code for zen patterns.
 * @param masteredIds — IDs of rules the player already mastered in previous rounds.
 *   Mastered rules are skipped: no XP, no jolt, no suggestion.
 */
export function analyzeZen(
  stepId: string,
  code: string,
  masteredIds?: Set<string>
): ZenResult {
  const rules = STEP_ZEN_RULES[stepId];
  if (!rules || rules.length === 0) {
    return { bonusXP: 0, jolts: [], suggestions: [] };
  }

  let bonusXP = 0;
  const jolts: string[] = [];
  const suggestions: string[] = [];

  for (const rule of rules) {
    const alreadyMastered = masteredIds?.has(rule.id) ?? false;
    if (alreadyMastered) continue;

    // Skip rules that aren't relevant to the user's code
    if (rule.isRelevant && !rule.isRelevant(code)) continue;

    if (rule.check(code)) {
      bonusXP += rule.bonusXP;
      jolts.push(rule.jolt);
    } else if (rule.suggestion) {
      suggestions.push(rule.suggestion);
    }
  }

  return { bonusXP, jolts, suggestions };
}

export function buildZenMessage(result: ZenResult, missedXP?: number): string | null {
  if (result.jolts.length === 0 && result.suggestions.length === 0) return null;

  const parts: string[] = [];

  // Show all jolts — every good practice should be acknowledged
  for (const jolt of result.jolts) {
    parts.push(jolt);
  }

  // Pick one suggestion — keep improvement feedback focused
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

export function calculateMissedXP(stepId: string, result: ZenResult, code?: string): number {
  const rules = STEP_ZEN_RULES[stepId];
  if (!rules) return 0;
  const relevant = code
    ? rules.filter((r) => !r.isRelevant || r.isRelevant(code))
    : rules;
  const maxXP = relevant.reduce((sum, r) => sum + r.bonusXP, 0);
  return maxXP - result.bonusXP;
}

// ── Exports for testing ──

export const ZEN_RULES = STEP_ZEN_RULES;
