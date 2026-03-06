// ── Go Tokenizer ──
// Single-pass regex-based tokenizer for Go source code.
// Shared between syntax highlighting and the diagnostic/LSP layer.

export type TokenType =
  | "keyword"
  | "builtin"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "punctuation"
  | "identifier"
  | "whitespace"
  | "unknown";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

const GO_KEYWORDS = new Set([
  "break", "case", "chan", "const", "continue", "default", "defer",
  "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
  "interface", "map", "package", "range", "return", "select", "struct",
  "switch", "type", "var",
]);

const GO_BUILTINS = new Set([
  "make", "append", "len", "cap", "close", "delete", "copy", "new",
  "panic", "recover", "print", "println",
]);

const GO_TYPES = new Set([
  "int", "int8", "int16", "int32", "int64",
  "uint", "uint8", "uint16", "uint32", "uint64",
  "float32", "float64", "complex64", "complex128",
  "string", "bool", "byte", "rune", "error",
  "any", "comparable",
]);

export function isGoKeyword(word: string): boolean {
  return GO_KEYWORDS.has(word);
}

export function isGoBuiltin(word: string): boolean {
  return GO_BUILTINS.has(word);
}

export function isGoType(word: string): boolean {
  return GO_TYPES.has(word);
}

// ── Tokenize ──

const TOKEN_REGEX = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|`[^`]*`|'(?:[^'\\]|\\.)*'|0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[a-zA-Z_]\w*|:=|&&|\|\||<-|<=|>=|==|!=|\.\.\.|\S/g;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let lineStart = 0;

  TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(source)) !== null) {
    const value = match[0];
    const start = match.index;

    // Track line numbers by counting newlines between last token and this one
    const between = source.slice(tokens.length > 0 ? tokens[tokens.length - 1].end : 0, start);
    for (let i = 0; i < between.length; i++) {
      if (between[i] === "\n") {
        line++;
        lineStart = (tokens.length > 0 ? tokens[tokens.length - 1].end : 0) + i + 1;
      }
    }

    const col = start - lineStart + 1;
    const type = classifyToken(value);

    tokens.push({ type, value, line, col, start, end: start + value.length });

    // Track newlines within the token itself (multi-line comments, raw strings)
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "\n") {
        line++;
        lineStart = start + i + 1;
      }
    }
  }

  return tokens;
}

function classifyToken(value: string): TokenType {
  // Comments
  if (value.startsWith("//") || value.startsWith("/*")) return "comment";

  // Strings
  if (value.startsWith('"') || value.startsWith("`") || value.startsWith("'")) return "string";

  // Numbers
  if (/^[0-9]/.test(value) || /^0[xXoObB]/.test(value)) return "number";

  // Identifiers, keywords, builtins, types
  if (/^[a-zA-Z_]\w*$/.test(value)) {
    if (GO_KEYWORDS.has(value)) return "keyword";
    if (GO_BUILTINS.has(value)) return "builtin";
    if (GO_TYPES.has(value)) return "type";
    return "identifier";
  }

  // Multi-char operators
  if ([":=", "&&", "||", "<-", "<=", ">=", "==", "!=", "..."].includes(value)) return "operator";

  // Single-char operators and punctuation
  if ("+-*/%&|^~<>=!".includes(value)) return "operator";
  if ("(){}[];,.".includes(value)) return "punctuation";

  return "unknown";
}

// ── Exports for LSP/diagnostic use ──

export { GO_KEYWORDS, GO_BUILTINS, GO_TYPES };
