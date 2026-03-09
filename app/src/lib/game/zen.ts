// ── Go Zen System ──
// Heuristic analysis of player code for idiomatic Go patterns.
// Awards bonus XP and triggers Maya's "memory jolt" narrative.
// Based on: The Zen of Go + Effective Go.
// Pure functions only.

import { tokenize, type Token } from "@/lib/go/tokenizer";

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

// ══════════════════════════════════════════════════════════════
//  Structural helpers — analyse code SHAPE, not string patterns
// ══════════════════════════════════════════════════════════════

/**
 * Extract the body of a named function (handles nested braces).
 * Returns null if function not found.
 */
function extractFuncBody(code: string, funcName: string): string | null {
  const pattern = new RegExp(`func\\s+${funcName}\\b`);
  const match = code.match(pattern);
  if (!match || match.index === undefined) return null;

  // Find the opening brace
  const fromMatch = code.indexOf("{", match.index);
  if (fromMatch === -1) return null;

  let depth = 0;
  for (let i = fromMatch; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") {
      depth--;
      if (depth === 0) return code.slice(fromMatch + 1, i);
    }
  }
  return null;
}

/**
 * Collect all variable/const declarations in a code block.
 * Returns the names (not string literal values).
 */
function collectDeclarations(code: string): string[] {
  const tokens = tokenize(code);
  const names: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // const name = ... or var name = ...
    if (t.type === "keyword" && (t.value === "const" || t.value === "var")) {
      // Skip whitespace/paren to find the identifier
      let j = i + 1;
      // Handle const ( block
      if (tokens[j]?.value === "(") {
        j++;
        while (j < tokens.length && tokens[j]?.value !== ")") {
          if (tokens[j]?.type === "identifier") {
            names.push(tokens[j].value);
          }
          j++;
        }
      } else {
        while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
        if (tokens[j]?.type === "identifier") {
          names.push(tokens[j].value);
        }
      }
    }

    // name := value (short declaration)
    if (t.type === "identifier") {
      // Look ahead for := (tokenizer emits := as a single operator token)
      let j = i + 1;
      while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
      if (tokens[j]?.value === ":=") {
        names.push(t.value);
      }
    }
  }

  return names;
}

/**
 * Check if print calls (fmt.Println/Printf/Print) reference variables
 * vs having all arguments as string literals.
 */
function printArgsUseVariables(code: string): boolean {
  const tokens = tokenize(code);

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== "fmt") continue;
    if (tokens[i + 1]?.value !== ".") continue;
    const method = tokens[i + 2]?.value;
    if (!method || !["Println", "Printf", "Print"].includes(method)) continue;

    // Scan args inside parens
    let j = i + 3;
    while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
    if (tokens[j]?.value !== "(") continue;

    let depth = 0;
    let hasVariable = false;
    for (let k = j; k < tokens.length; k++) {
      if (tokens[k].value === "(") depth++;
      if (tokens[k].value === ")") { depth--; if (depth === 0) break; }
      if (depth >= 1 && tokens[k].type === "identifier" && tokens[k].value !== "fmt") {
        // It's referencing a variable/identifier in the print call
        hasVariable = true;
      }
    }
    if (hasVariable) return true;
  }
  return false;
}

/**
 * Check if code uses Printf with format verbs (separating template from data).
 */
function usesPrintfWithVerbs(code: string): boolean {
  const tokens = tokenize(code);

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== "fmt") continue;
    if (tokens[i + 1]?.value !== ".") continue;
    if (tokens[i + 2]?.value !== "Printf") continue;

    // Find the first string arg (the format string)
    let j = i + 3;
    while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
    if (tokens[j]?.value !== "(") continue;

    // Look for a string literal containing % verbs
    for (let k = j + 1; k < tokens.length; k++) {
      if (tokens[k].value === ")") break;
      if (tokens[k].type === "string") {
        // Check for format verbs in the string
        const s = tokens[k].value;
        if (/%[sdvftxXoObBeEgGqcp]/.test(s)) return true;
        break; // only check first string arg
      }
    }
  }
  return false;
}

/**
 * Detect whether print calls use string concatenation with +.
 */
function printUsesConcat(code: string): boolean {
  const tokens = tokenize(code);

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== "fmt") continue;
    if (tokens[i + 1]?.value !== ".") continue;
    const method = tokens[i + 2]?.value;
    if (!method || !["Println", "Print"].includes(method)) continue;

    let j = i + 3;
    while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
    if (tokens[j]?.value !== "(") continue;

    let depth = 0;
    for (let k = j; k < tokens.length; k++) {
      if (tokens[k].value === "(") depth++;
      if (tokens[k].value === ")") { depth--; if (depth === 0) break; }
      if (depth === 1 && tokens[k].value === "+") return true;
    }
  }
  return false;
}

/**
 * Count how many times a string literal appears in the code (outside const blocks).
 */
function countRepeatedStrings(code: string): Map<string, number> {
  const tokens = tokenize(code);
  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (t.type === "string") {
      const v = t.value;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Check if the code has const declarations that hold string values
 * which are then used elsewhere (extracted magic strings).
 */
function hasExtractedStringConstants(code: string, minCount: number): boolean {
  const tokens = tokenize(code);

  // Find const declarations with string values
  let inConst = false;
  let constStrings = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "keyword" && t.value === "const") {
      inConst = true;
      // Check if next non-whitespace is ( for a const block
      let j = i + 1;
      while (j < tokens.length && tokens[j]?.type === "whitespace") j++;
      if (tokens[j]?.value === "(") {
        // Scan the const block for string assignments
        let depth = 0;
        for (let k = j; k < tokens.length; k++) {
          if (tokens[k].value === "(") depth++;
          if (tokens[k].value === ")") { depth--; if (depth === 0) break; }
          if (tokens[k].type === "string") constStrings++;
        }
      } else {
        // Single const — look for string on the right side
        for (let k = j; k < tokens.length; k++) {
          if (tokens[k].type === "string") { constStrings++; break; }
          if (tokens[k].value === "\n" || k > j + 10) break;
        }
      }
      inConst = false;
    }
  }

  return constStrings >= minCount;
}

/**
 * Detect the shape of a for loop's increment clause.
 * Returns: "postfix" (x++), "compound" (x += 1), "longform" (x = x + 1), or null.
 */
function detectIncrementShape(code: string): "postfix" | "compound" | "longform" | null {
  const tokens = tokenize(code);

  for (let i = 0; i < tokens.length; i++) {
    // Look for a for keyword
    if (tokens[i].type !== "keyword" || tokens[i].value !== "for") continue;

    // Find the opening brace of the for loop body
    let braceIdx = -1;
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].value === "{") { braceIdx = j; break; }
    }
    if (braceIdx === -1) continue;

    // The increment is the part between the last ; and {
    // Collect tokens between last semicolon and brace
    let lastSemiIdx = -1;
    for (let j = i + 1; j < braceIdx; j++) {
      if (tokens[j].value === ";") lastSemiIdx = j;
    }
    if (lastSemiIdx === -1) {
      // While-style loop — check body for increment
      continue;
    }

    // Extract increment tokens (between last ; and {)
    const incTokens = tokens.slice(lastSemiIdx + 1, braceIdx)
      .filter(t => t.type !== "whitespace");

    if (incTokens.length === 0) continue;

    // x++ pattern: identifier followed by ++
    if (incTokens.length >= 2 &&
        incTokens[0].type === "identifier" &&
        incTokens[1].value === "+" && incTokens[2]?.value === "+") {
      return "postfix";
    }

    // x += 1 pattern
    if (incTokens.length >= 3 &&
        incTokens[0].type === "identifier" &&
        incTokens[1].value === "+" && incTokens[2].value === "=" &&
        incTokens[3]?.value === "1") {
      return "compound";
    }

    // x = x + 1 pattern
    if (incTokens.length >= 4 &&
        incTokens[0].type === "identifier" &&
        incTokens[1].value === "=" &&
        incTokens[2].type === "identifier" &&
        incTokens[0].value === incTokens[2].value &&
        incTokens[3].value === "+") {
      return "longform";
    }
  }

  // Check body for while-style loops with increment statements
  const hasPostfix = /\w+\+\+/.test(code);
  const hasCompound = /\w+\s*\+=\s*1/.test(code);
  const hasLong = /(\w+)\s*=\s*\1\s*\+\s*1/.test(code);

  if (hasPostfix && !hasCompound && !hasLong) return "postfix";
  if (hasCompound) return "compound";
  if (hasLong) return "longform";

  return null;
}

/**
 * Get variable names used in range loop headers.
 * Returns pairs like ["_", "c"] or ["i", "v"].
 */
function getRangeLoopVars(code: string): Array<[string, string]> {
  const tokens = tokenize(code);
  const pairs: Array<[string, string]> = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "keyword" || tokens[i].value !== "for") continue;

    // Look for "range" keyword after "for"
    let hasRange = false;
    let rangeIdx = -1;
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].value === "{") break;
      if (tokens[j].type === "keyword" && tokens[j].value === "range") {
        hasRange = true;
        rangeIdx = j;
        break;
      }
    }
    if (!hasRange) continue;

    // Collect identifiers between "for" and ":=" (the loop variables)
    const loopVars: string[] = [];
    for (let j = i + 1; j < rangeIdx; j++) {
      if (tokens[j].type === "identifier" || tokens[j].value === "_") {
        loopVars.push(tokens[j].value);
      }
    }

    if (loopVars.length === 2) {
      pairs.push([loopVars[0], loopVars[1]]);
    } else if (loopVars.length === 1) {
      pairs.push([loopVars[0], ""]);
    }
  }

  return pairs;
}

/**
 * Check whether a function body contains calls to a specific function.
 */
function funcBodyContainsCall(code: string, funcName: string, calledFunc: string): boolean {
  const body = extractFuncBody(code, funcName);
  if (!body) return false;
  const bodyTokens = tokenize(body);
  return bodyTokens.some(t => t.type === "identifier" && t.value === calledFunc);
}

/**
 * Check whether a function body contains any print/output calls.
 */
function funcBodyContainsPrinting(code: string, funcName: string): boolean {
  const body = extractFuncBody(code, funcName);
  if (!body) return false;
  const bodyTokens = tokenize(body);
  for (let i = 0; i < bodyTokens.length; i++) {
    if (bodyTokens[i].value === "fmt" &&
        bodyTokens[i + 1]?.value === "." &&
        ["Println", "Printf", "Print", "Fprintf", "Sprintf"].includes(bodyTokens[i + 2]?.value ?? "")) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a function uses if/else to construct a boolean return value.
 * This is the anti-pattern for directBoolReturn.
 */
function funcWrapsReturnInIfElse(code: string, funcName: string): boolean {
  const body = extractFuncBody(code, funcName);
  if (!body) return false;
  const bodyTokens = tokenize(body);

  // Look for pattern: if ... { return ..., true } ... return ..., false
  // or any if/else branching that returns true/false literals
  let hasIf = false;
  let returnsTrueFalse = false;

  for (let i = 0; i < bodyTokens.length; i++) {
    if (bodyTokens[i].type === "keyword" && bodyTokens[i].value === "if") {
      hasIf = true;
    }
    if (bodyTokens[i].type === "keyword" && bodyTokens[i].value === "return") {
      // Look at what follows the return
      for (let j = i + 1; j < bodyTokens.length; j++) {
        if (bodyTokens[j].value === "\n" || bodyTokens[j].value === "}") break;
        if (bodyTokens[j].type === "keyword" &&
            (bodyTokens[j].value === "true" || bodyTokens[j].value === "false")) {
          // Actually "true" and "false" are identifiers in our tokenizer, not keywords
          returnsTrueFalse = true;
        }
        if (bodyTokens[j].type === "identifier" &&
            (bodyTokens[j].value === "true" || bodyTokens[j].value === "false")) {
          returnsTrueFalse = true;
        }
      }
    }
  }

  return hasIf && returnsTrueFalse;
}

/**
 * Check if a function contains an early return guard
 * (if <condition> { return ... } near the top).
 */
function hasEarlyReturnGuard(code: string, funcName: string, maxLines: number): boolean {
  const body = extractFuncBody(code, funcName);
  if (!body) return false;

  // Look at the first N lines of the body
  const lines = body.split("\n").slice(0, maxLines);
  const topChunk = lines.join("\n");
  const topTokens = tokenize(topChunk);

  // Shape: if ... { return ... }
  let foundIf = false;
  let foundReturn = false;

  for (const t of topTokens) {
    if (t.type === "keyword" && t.value === "if") foundIf = true;
    if (foundIf && t.type === "keyword" && t.value === "return") foundReturn = true;
  }

  return foundIf && foundReturn;
}

/**
 * Check if code computes differences between consecutive elements of a slice/array.
 * Shape: anySlice[expr] - anySlice[expr] (subtraction of indexed accesses).
 */
function computesConsecutiveDifferences(code: string): boolean {
  const tokens = tokenize(code);

  for (let i = 0; i < tokens.length - 6; i++) {
    // Look for: identifier [ ... ] - identifier [ ... ]
    // where both identifiers are the same (same slice)
    if (tokens[i].type !== "identifier") continue;
    const sliceName = tokens[i].value;

    // Find [ after identifier
    if (tokens[i + 1]?.value !== "[") continue;

    // Find matching ]
    let closeIdx1 = -1;
    let depth = 0;
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].value === "[") depth++;
      if (tokens[j].value === "]") { depth--; if (depth === 0) { closeIdx1 = j; break; } }
    }
    if (closeIdx1 === -1) continue;

    // Look for - after ]
    let nextIdx = closeIdx1 + 1;
    while (nextIdx < tokens.length && tokens[nextIdx].type === "whitespace") nextIdx++;
    if (tokens[nextIdx]?.value !== "-") continue;

    // Look for same identifier after -
    nextIdx++;
    while (nextIdx < tokens.length && tokens[nextIdx].type === "whitespace") nextIdx++;
    if (tokens[nextIdx]?.type !== "identifier") continue;
    if (tokens[nextIdx].value === sliceName && tokens[nextIdx + 1]?.value === "[") {
      return true;
    }
  }

  return false;
}

// ══════════════════════════════════════════════════════
//  Zen Rules
// ══════════════════════════════════════════════════════

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
  check: (code) => {
    // Shape: print calls reference variables, not just raw literals.
    // The player declared at least one named value AND their print uses it.
    const decls = collectDeclarations(code);
    if (decls.length === 0) return false;
    return printArgsUseVariables(code);
  },
  bonusXP: 10,
  jolt: "...the gas is clearing.\n\nyou gave things names — variables, not raw strings buried in a print call. that's intent. anyone reading this code knows what \"B-09\" means because you told them.\n\nzen of go: make your intent visible. `const` locks it down at compile time. `:=` is good too — it's short, clear, declared right where it's used.",
  suggestion: "try declaring named values — `cell := \"B-09\"` or `const cell = \"B-09\"` — instead of hardcoding strings directly in the print call. names are documentation.",
};

const usePrintfFormat: ZenRule = {
  id: "use_printf_format",
  principle: "printf formatting",
  // Only relevant when the player is combining data with text
  // (using concatenation, or already using Printf, or passing variables to print)
  isRelevant: (code) => printUsesConcat(code) || usesPrintfWithVerbs(code) || printArgsUseVariables(code),
  check: (code) => usesPrintfWithVerbs(code),
  bonusXP: 15,
  jolt: "...my thesis notes. i can see them.\n\nyou used Printf with format verbs — `%s`, `%d`. that's how go separates data from presentation. the template is one thing, the values another. when i was writing my encryption library... format strings everywhere. clean. composable.\n\neffective go calls it \"the printer's idiom.\"",
  suggestion: "string concatenation works, but `fmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cell, level)` separates format from data. go has powerful format verbs... try them.",
};

const descriptiveNames: ZenRule = {
  id: "descriptive_names",
  principle: "meaningful names",
  check: (code) => {
    // Shape: declarations in main() use names that are 3+ chars
    // (not single-letter throwaway names like x, a, b).
    // We check that at least one declared name is descriptive (length >= 3)
    // and none are single-letter (unless there are also descriptive ones).
    const mainBody = extractFuncBody(code, "main");
    if (!mainBody) return false;

    const decls = collectDeclarations(mainBody);
    if (decls.length === 0) return false;

    // Filter out loop vars and common short names
    const meaningfulNames = decls.filter(n =>
      n.length >= 3 && n !== "fmt" && n !== "err"
    );

    return meaningfulNames.length > 0;
  },
  bonusXP: 10,
  jolt: "good names. `cell`, `sublevel`... not `x` and `y`. in go, a variable's name is its documentation. no javadoc, no docblocks — just honest names.\n\nmy advisor used to say: \"the length of a name should be proportional to its scope.\" short in a loop. descriptive everywhere else.",
  suggestion: "try using descriptive names — `cell := \"B-09\"` reads better than `x := \"B-09\"`. in go, names are documentation.",
};

// Ch02: Loop
const simpleIncrement: ZenRule = {
  id: "simple_increment",
  principle: "simple increment",
  // Only relevant when the code has any kind of increment pattern
  isRelevant: (code) => detectIncrementShape(code) !== null,
  check: (code) => detectIncrementShape(code) === "postfix",
  bonusXP: 5,
  jolt: "`i++` — the simplest form. go doesn't have `++i` as an expression. it's a statement. one thing, one way to do it.\n\nzen of go: simplicity matters. fewer ways to write something means fewer ways to misread it.",
  suggestion: "use `i++` — it's the go way. not `i += 1`, not `i = i + 1`. one operation, one form. simplicity matters.",
};

// Ch02: Classify — constants for labels
const useConstantsForLabels: ZenRule = {
  id: "use_constants_labels",
  principle: "constants over magic strings",
  // Only relevant when code has repeated string literals (magic strings)
  isRelevant: (code) => {
    const tokens = tokenize(code);
    return tokens.some(t => t.type === "string" &&
      /^"(DENY|WARN|GRANT|OVERRIDE)"$/.test(t.value));
  },
  check: (code) => hasExtractedStringConstants(code, 2),
  bonusXP: 10,
  jolt: "...something's coming back.\n\nyou named the labels — constants instead of magic strings buried in switch cases. `\"DENY\"` scattered everywhere is invisible intent. a `const` says \"this matters, this has meaning.\"\n\nzen of go: make the important things visible. when you change a label, you change it in one place.",
  suggestion: "try defining constants for your labels: `const deny = \"DENY\"` (or a const block). magic strings in switch cases are fragile — named constants make intent visible and changes safe.",
};

// Ch02: Classify — switch (only jolt if used, never suggest switching approach)
const switchOverIfElse: ZenRule = {
  id: "switch_over_ifelse",
  principle: "switch over if-else chains",
  // Only relevant when user chose switch — reward the choice, never nag about if/else
  isRelevant: (code) => {
    const tokens = tokenize(code);
    return tokens.some(t => t.type === "keyword" && t.value === "switch");
  },
  check: (code) => {
    const tokens = tokenize(code);
    return tokens.some(t => t.type === "keyword" && t.value === "switch");
  },
  bonusXP: 15,
  jolt: "...fragments coming back.\n\nswitch without a variable — `switch { case condition: }` — that's go's secret weapon. it replaces if-else chains and reads like a truth table. each case is a contract.\n\neffective go: \"switch on true replaces if-else chains.\" i wrote that in my notes once. i'm sure of it now.\n\nthe compiler checks completeness. your intent is crystal clear.",
  suggestion: "",
};

const noUnnecessaryBreak: ZenRule = {
  id: "no_unnecessary_break",
  principle: "no fallthrough by default",
  // Only relevant when user actually wrote a switch statement
  isRelevant: (code) => {
    const tokens = tokenize(code);
    return tokens.some(t => t.type === "keyword" && t.value === "switch");
  },
  check: (code) => {
    const tokens = tokenize(code);
    const hasSwitch = tokens.some(t => t.type === "keyword" && t.value === "switch");
    const hasBreak = tokens.some(t => t.type === "keyword" && t.value === "break");
    return hasSwitch && !hasBreak;
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
  isRelevant: (code) => getRangeLoopVars(code).length > 0,
  check: (code) => {
    // Shape: range loop variables are short (1-2 chars).
    // Go convention: shorter scope → shorter name.
    const pairs = getRangeLoopVars(code);
    if (pairs.length === 0) return false;

    return pairs.some(([indexVar, valueVar]) => {
      const indexOk = indexVar === "_" || indexVar.length <= 2;
      const valueOk = valueVar === "" || valueVar.length <= 2;
      return indexOk && valueOk;
    });
  },
  bonusXP: 10,
  jolt: "...short variable names in the loop. `c`, not `codeValue`. in go, a name's length matches its scope.\n\ni remember — effective go says: \"the further from its declaration a name is used, the more descriptive the name should be.\" inside a 3-line loop? single letter is perfect.\n\nmy encryption library... every loop var was one letter. reviewers loved it.",
  suggestion: "try shorter names in small loops — `c` instead of `codeValue`. go convention: shorter scope = shorter name. save long names for long-lived things.",
};

const underscoreUnused: ZenRule = {
  id: "underscore_unused",
  principle: "blank identifier for unused values",
  // Only relevant when user wrote a range loop
  isRelevant: (code) => getRangeLoopVars(code).length > 0,
  check: (code) => {
    // Shape: the index position in a range loop uses _ (blank identifier).
    const pairs = getRangeLoopVars(code);
    return pairs.some(([indexVar]) => indexVar === "_");
  },
  bonusXP: 5,
  jolt: "the blank identifier — `_`. you threw away the index because you don't need it. that's not laziness, that's precision.\n\ngo forces you to use every variable. `_` is how you say \"i acknowledge this exists, but i don't need it.\" intentional discards.",
  suggestion: "you're not using the index from range. use `_` to discard it: `for _, c := range codes`. go demands every variable be used — `_` is the escape hatch.",
};

const singlePurposeFunc: ZenRule = {
  id: "single_purpose",
  principle: "single-purpose function",
  // Only relevant when user wrote the sumCodes function
  isRelevant: (code) => extractFuncBody(code, "sumCodes") !== null,
  check: (code) => {
    // Shape: sumCodes body contains no printing — it only computes.
    return !funcBodyContainsPrinting(code, "sumCodes");
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
  isRelevant: (code) => extractFuncBody(code, "validateCode") !== null,
  check: (code) => {
    // Shape: the function does NOT use if/else to wrap a bool return.
    // If it avoids that anti-pattern, they're returning the comparison directly.
    return !funcWrapsReturnInIfElse(code, "validateCode");
  },
  bonusXP: 15,
  jolt: "...the fog is lifting.\n\n`return total, total > 100` — you returned the comparison directly. no if/else wrapping a boolean that's already right there.\n\neffective go: \"don't test a boolean against true.\" and don't build one with if/else when the expression already IS a boolean.\n\nmy advisor circled this pattern in red ink. \"this,\" she said, \"is how you know someone actually thinks in go.\"",
  suggestion: "you're using if/else to return true/false. but `total > 100` already IS a boolean. try: `return total, total > 100`. direct. clean.",
};

const reuseFunctions: ZenRule = {
  id: "reuse_functions",
  principle: "compose by calling existing functions",
  // Only relevant when validateCode exists
  isRelevant: (code) => extractFuncBody(code, "validateCode") !== null,
  check: (code) => funcBodyContainsCall(code, "validateCode", "sumCodes"),
  bonusXP: 10,
  jolt: "you called sumCodes inside validateCode. composition — not duplication.\n\nif you'd rewritten the sum logic... that's two places to fix when something changes. go's standard library is built this way. `io.Copy` calls `Read` and `Write`. layers of simple functions.\n\nmy encryption library had 47 functions. the longest was 12 lines. each one called others.",
  suggestion: "you're re-implementing the sum inside validateCode. call `sumCodes(codes...)` instead — reuse what you already built. composition over duplication.",
};

// Boss01: Predict
const sliceIndexing: ZenRule = {
  id: "slice_indexing",
  principle: "dynamic slice length",
  check: (code) => {
    // Shape: code calls len() on any variable (dynamic length, not hardcoded)
    const tokens = tokenize(code);
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "builtin" && tokens[i].value === "len" &&
          tokens[i + 1]?.value === "(") {
        return true;
      }
    }
    return false;
  },
  bonusXP: 5,
  jolt: "...fragments. you used `len(codes)` to find the end. never hardcode a length — the slice knows its own size. my advisor said something about that... \"let the data describe itself.\"",
  suggestion: "use `len(codes)` to find the last element — never hardcode the index. slices know their own length.",
};

const deltaComputation: ZenRule = {
  id: "delta_computation",
  principle: "delta pattern for consecutive differences",
  check: (code) => computesConsecutiveDifferences(code),
  bonusXP: 10,
  jolt: "...the delta pattern. you computed differences between consecutive codes. that's signal analysis — my thesis was about detecting patterns in encrypted streams. this felt... familiar.",
  suggestion: "try computing deltas: `delta := codes[i] - codes[i-1]`. the pattern lives in the differences.",
};

const earlyReturn: ZenRule = {
  id: "early_return",
  principle: "guard clause for edge cases",
  check: (code) => hasEarlyReturnGuard(code, "predictNext", 6),
  bonusXP: 5,
  jolt: "you guarded the edge case. `if len(codes) < 2` — return early, don't process garbage. defensive coding. that's... that's what we did in the lab. validate inputs first, always.",
  suggestion: "add a guard: `if len(codes) < 2 { return 0 }`. handle edge cases before the main logic — go functions should fail fast.",
};

const namedVariables: ZenRule = {
  id: "named_variables",
  principle: "descriptive variable names for domain concepts",
  check: (code) => {
    // Shape: the predictNext body declares variables with 3+ char descriptive names
    // (not single-letter throw-aways for domain concepts).
    const body = extractFuncBody(code, "predictNext");
    if (!body) return false;

    const decls = collectDeclarations(body);
    // Check that at least one variable in the function has a meaningful name
    // (3+ chars, not generic like "val" or "tmp")
    return decls.some(n => n.length >= 4 || /^(delta|diff|step|gap|inc)$/.test(n));
  },
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
