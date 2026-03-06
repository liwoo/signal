// ── Go Diagnostics ──
// Client-side diagnostic pass for Go code.
// Runs on tokenized output to produce error/warning squiggles.

import { tokenize, isGoKeyword, type Token } from "./tokenizer";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: Severity;
  message: string;
  line: number;
  col: number;
  length: number;
}

// ── Public API ──

export function diagnose(source: string): Diagnostic[] {
  const tokens = tokenize(source);
  const diagnostics: Diagnostic[] = [];

  diagnostics.push(...checkBrackets(tokens, source));
  diagnostics.push(...checkPackageMain(tokens, source));
  diagnostics.push(...checkFuncMain(tokens, source));
  diagnostics.push(...checkUnclosedStrings(source));
  diagnostics.push(...checkUnusedImports(tokens, source));
  diagnostics.push(...checkNearMissKeywords(tokens));
  diagnostics.push(...checkStdlibMethods(tokens));

  return diagnostics;
}

// ── Bracket Matching ──

const OPEN_BRACKETS: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
const CLOSE_BRACKETS = new Set([")", "}", "]"]);

function checkBrackets(tokens: Token[], _source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: { char: string; line: number; col: number }[] = [];

  for (const token of tokens) {
    if (token.type === "string" || token.type === "comment") continue;

    if (token.value in OPEN_BRACKETS) {
      stack.push({ char: token.value, line: token.line, col: token.col });
    } else if (CLOSE_BRACKETS.has(token.value)) {
      const last = stack.pop();
      if (!last) {
        diagnostics.push({
          severity: "error",
          message: `unexpected '${token.value}'`,
          line: token.line,
          col: token.col,
          length: 1,
        });
      } else if (OPEN_BRACKETS[last.char] !== token.value) {
        diagnostics.push({
          severity: "error",
          message: `mismatched bracket: expected '${OPEN_BRACKETS[last.char]}' but found '${token.value}'`,
          line: token.line,
          col: token.col,
          length: 1,
        });
      }
    }
  }

  for (const unclosed of stack) {
    diagnostics.push({
      severity: "error",
      message: `unclosed '${unclosed.char}'`,
      line: unclosed.line,
      col: unclosed.col,
      length: 1,
    });
  }

  return diagnostics;
}

// ── Package Declaration ──

function checkPackageMain(tokens: Token[], _source: string): Diagnostic[] {
  const hasPackage = tokens.some(
    (t, i) =>
      t.type === "keyword" &&
      t.value === "package" &&
      tokens[i + 1]?.value === "main"
  );
  if (!hasPackage) {
    return [
      {
        severity: "error",
        message: "missing 'package main' declaration",
        line: 1,
        col: 1,
        length: 1,
      },
    ];
  }
  return [];
}

// ── func main() ──

function checkFuncMain(tokens: Token[], _source: string): Diagnostic[] {
  const hasFuncMain = tokens.some(
    (t, i) =>
      t.type === "keyword" &&
      t.value === "func" &&
      tokens[i + 1]?.value === "main" &&
      tokens[i + 2]?.value === "("
  );
  if (!hasFuncMain) {
    return [
      {
        severity: "error",
        message: "missing 'func main()' — required for execution",
        line: 1,
        col: 1,
        length: 1,
      },
    ];
  }
  return [];
}

// ── Unclosed Strings ──

function checkUnclosedStrings(source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let inString = false;
    let inRawString = false;
    let inComment = false;
    let quoteStart = -1;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];

      // Skip line comments
      if (!inString && !inRawString && ch === "/" && line[j + 1] === "/") {
        inComment = true;
        break;
      }

      if (inComment) break;

      // Raw strings (backtick) can span lines — skip this check for them
      if (!inString && ch === "`") {
        inRawString = !inRawString;
        continue;
      }

      if (inRawString) continue;

      // Regular strings
      if (ch === '"' && (j === 0 || line[j - 1] !== "\\")) {
        if (!inString) {
          inString = true;
          quoteStart = j;
        } else {
          inString = false;
        }
      }
    }

    if (inString) {
      diagnostics.push({
        severity: "error",
        message: "unclosed string literal",
        line: i + 1,
        col: quoteStart + 1,
        length: line.length - quoteStart,
      });
    }
  }

  return diagnostics;
}

// ── Unused Imports ──

function checkUnusedImports(tokens: Token[], source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Find import strings
  const importTokens: { pkg: string; line: number; col: number; length: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === "keyword" && tokens[i].value === "import") {
      // Single import: import "fmt"
      if (tokens[i + 1]?.type === "string") {
        const raw = tokens[i + 1].value;
        const pkg = raw.slice(1, -1); // strip quotes
        importTokens.push({
          pkg,
          line: tokens[i + 1].line,
          col: tokens[i + 1].col,
          length: tokens[i + 1].value.length,
        });
      }
      // Grouped import: import ( "fmt" "os" )
      if (tokens[i + 1]?.value === "(") {
        for (let j = i + 2; j < tokens.length; j++) {
          if (tokens[j].value === ")") break;
          if (tokens[j].type === "string") {
            const raw = tokens[j].value;
            const pkg = raw.slice(1, -1);
            importTokens.push({
              pkg,
              line: tokens[j].line,
              col: tokens[j].col,
              length: tokens[j].value.length,
            });
          }
        }
      }
    }
  }

  // Check usage — look for the package name (last segment) in identifiers after imports
  for (const imp of importTokens) {
    const pkgName = imp.pkg.includes("/") ? imp.pkg.split("/").pop()! : imp.pkg;
    // Check if pkgName appears as an identifier anywhere in the source after the import
    const used = tokens.some(
      (t) =>
        t.type === "identifier" &&
        t.value === pkgName &&
        t.line > imp.line
    );
    if (!used) {
      diagnostics.push({
        severity: "warning",
        message: `imported and not used: "${imp.pkg}"`,
        line: imp.line,
        col: imp.col,
        length: imp.length,
      });
    }
  }

  return diagnostics;
}

// ── Near-Miss Keywords (Typo Detection) ──

function checkNearMissKeywords(tokens: Token[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const COMMON_TYPOS: Record<string, string> = {
    fnuc: "func", fuc: "func", fucn: "func",
    packge: "package", pakage: "package", pacakge: "package",
    imprt: "import", ipmort: "import", imoprt: "import",
    retrun: "return", retrn: "return", reutrn: "return",
    pritnln: "println", printl: "println", prinln: "println",
    stirng: "string", strng: "string",
    rnage: "range", rnge: "range",
    swtich: "switch", swtch: "switch",
    defualt: "default", defalt: "default",
    cosnt: "const", conts: "const",
  };

  for (const token of tokens) {
    if (token.type !== "identifier") continue;
    const lower = token.value.toLowerCase();
    if (COMMON_TYPOS[lower]) {
      diagnostics.push({
        severity: "warning",
        message: `did you mean '${COMMON_TYPOS[lower]}'?`,
        line: token.line,
        col: token.col,
        length: token.value.length,
      });
    }
  }

  return diagnostics;
}

// ── Standard Library Method Validation ──

export const KNOWN_PKG_METHODS: Record<string, Set<string>> = {
  fmt: new Set([
    "Print", "Println", "Printf",
    "Sprint", "Sprintf", "Sprintln",
    "Fprint", "Fprintf", "Fprintln",
    "Scan", "Scanf", "Scanln",
    "Sscan", "Sscanf", "Sscanln",
    "Fscan", "Fscanf", "Fscanln",
    "Errorf", "Stringer",
  ]),
  strings: new Set([
    "Contains", "HasPrefix", "HasSuffix", "Index", "Join",
    "Replace", "ReplaceAll", "Split", "ToLower", "ToUpper",
    "Trim", "TrimSpace", "TrimLeft", "TrimRight", "TrimPrefix",
    "TrimSuffix", "Count", "Repeat", "NewReader", "NewReplacer",
    "Map", "Title", "Fields", "EqualFold", "Compare",
    "Builder", "Reader", "Replacer",
  ]),
  strconv: new Set([
    "Atoi", "Itoa", "FormatInt", "FormatFloat", "FormatBool",
    "ParseInt", "ParseFloat", "ParseBool",
  ]),
  math: new Set([
    "Abs", "Max", "Min", "Sqrt", "Pow", "Floor", "Ceil",
    "Round", "Log", "Log2", "Log10", "Sin", "Cos", "Tan",
    "Pi", "E", "Inf", "NaN", "IsNaN", "IsInf",
  ]),
  os: new Set([
    "Exit", "Getenv", "Setenv", "Args", "Stdin", "Stdout", "Stderr",
    "Open", "Create", "ReadFile", "WriteFile", "Remove", "Mkdir",
    "MkdirAll", "Stat", "Getwd",
  ]),
};

function checkStdlibMethods(tokens: Token[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Find imported packages
  const importedPkgs = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === "keyword" && tokens[i].value === "import") {
      if (tokens[i + 1]?.type === "string") {
        const pkg = tokens[i + 1].value.slice(1, -1);
        const name = pkg.includes("/") ? pkg.split("/").pop()! : pkg;
        importedPkgs.add(name);
      }
      if (tokens[i + 1]?.value === "(") {
        for (let j = i + 2; j < tokens.length; j++) {
          if (tokens[j].value === ")") break;
          if (tokens[j].type === "string") {
            const pkg = tokens[j].value.slice(1, -1);
            const name = pkg.includes("/") ? pkg.split("/").pop()! : pkg;
            importedPkgs.add(name);
          }
        }
      }
    }
  }

  // Check pkg.Method calls against known methods
  for (let i = 0; i < tokens.length - 2; i++) {
    const pkg = tokens[i];
    const dot = tokens[i + 1];
    const method = tokens[i + 2];

    if (
      pkg.type === "identifier" &&
      dot.value === "." &&
      method.type === "identifier" &&
      importedPkgs.has(pkg.value) &&
      KNOWN_PKG_METHODS[pkg.value]
    ) {
      const known = KNOWN_PKG_METHODS[pkg.value];
      if (!known.has(method.value)) {
        diagnostics.push({
          severity: "error",
          message: `${pkg.value}.${method.value} is not a known function — did you mean ${suggestMethod(pkg.value, method.value, known)}?`,
          line: method.line,
          col: method.col,
          length: method.value.length,
        });
      }
    }
  }

  return diagnostics;
}

function suggestMethod(pkg: string, typo: string, known: Set<string>): string {
  const lower = typo.toLowerCase();
  let best = "";
  let bestScore = 0;

  for (const m of known) {
    const mLower = m.toLowerCase();
    if (mLower.startsWith(lower.slice(0, 3)) || lower.includes(mLower.slice(0, 4))) {
      const score = mLower === lower ? 100 : mLower.startsWith(lower.slice(0, 3)) ? 10 : 5;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
  }

  return best ? `${pkg}.${best}` : `check the ${pkg} package docs`;
}
