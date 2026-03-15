// ── Pure Vim Engine ──
// All vim command logic as pure functions. No React, no DOM.
// The useVim hook is a thin wrapper around this.

export type VimMode = "normal" | "insert" | "visual";

export interface VimInput {
  code: string;
  pos: number;
  mode: VimMode;
  pending: string;
  yank: string;
  yankLinewise: boolean;
  undoStack: string[];
  key: string;
}

export interface VimOutput {
  code: string;
  pos: number;
  mode: VimMode;
  pending: string;
  yank: string;
  yankLinewise: boolean;
  undoStack: string[];
  handled: boolean;
  codeChanged: boolean;
}

// ── Helpers (exported for unit testing) ──

export function lineStart(code: string, pos: number): number {
  return code.lastIndexOf("\n", pos - 1) + 1;
}

export function lineEnd(code: string, pos: number): number {
  const i = code.indexOf("\n", pos);
  return i === -1 ? code.length : i;
}

/** Last character position on the line (before the \n). Safe for empty lines. */
function lastCharOnLine(code: string, pos: number): number {
  const le = lineEnd(code, pos);
  const ls = lineStart(code, pos);
  return le > ls ? le - 1 : ls;
}

/** Clamp pos to valid normal-mode position (never on \n unless empty line, never past end) */
function clampNormal(code: string, pos: number): number {
  if (code.length === 0) return 0;
  const p = Math.max(0, Math.min(pos, code.length - 1));
  // If we landed on a newline, back up — unless it's an empty line
  if (code[p] === "\n" && p > 0) {
    // Check if this is an empty line (previous char is also \n or we're at pos 0)
    if (code[p - 1] === "\n") return p; // empty line — stay here
    return p - 1;
  }
  return p;
}

export function firstNonBlank(code: string, from: number): number {
  const end = lineEnd(code, from);
  const slice = code.slice(from, end);
  const m = slice.search(/\S/);
  return m === -1 ? from : from + m;
}

export function wordEndPos(code: string, pos: number): number {
  let i = pos + 1;
  while (i < code.length && /\s/.test(code[i])) i++;
  if (i < code.length && /\w/.test(code[i])) {
    while (i + 1 < code.length && /\w/.test(code[i + 1])) i++;
  } else {
    while (i + 1 < code.length && /\S/.test(code[i + 1]) && !/\w/.test(code[i + 1])) i++;
  }
  return Math.min(i, Math.max(0, code.length - 1));
}

export function wordForwardPos(code: string, pos: number): number {
  if (pos >= code.length - 1) return pos;
  let i = pos;
  const ch = code[i];

  if (/\w/.test(ch)) {
    // Skip rest of current word
    while (i < code.length && /\w/.test(code[i])) i++;
  } else if (/\S/.test(ch)) {
    // Skip rest of current non-word non-whitespace sequence
    while (i < code.length && /\S/.test(code[i]) && !/\w/.test(code[i])) i++;
  }

  // Skip whitespace (including newlines)
  while (i < code.length && /\s/.test(code[i])) i++;

  return Math.min(i, code.length - 1);
}

export function wordBackPos(code: string, pos: number): number {
  if (pos <= 0) return 0;
  let i = pos - 1;
  while (i > 0 && /\s/.test(code[i])) i--;
  if (i >= 0 && /\w/.test(code[i])) {
    while (i > 0 && /\w/.test(code[i - 1])) i--;
  } else if (i >= 0 && /\S/.test(code[i])) {
    while (i > 0 && /\S/.test(code[i - 1]) && !/\w/.test(code[i - 1])) i--;
  }
  return i;
}

export function deleteLine(code: string, pos: number): { newCode: string; newPos: number; deleted: string } {
  const ls = lineStart(code, pos);
  const le = lineEnd(code, pos);
  const isLastLine = le === code.length;
  const delEnd = isLastLine ? le : le + 1;
  // If deleting the last line, consume the preceding newline
  const delStart = isLastLine && ls > 0 ? ls - 1 : ls;
  const deleted = code.slice(ls, le);
  const newCode = code.slice(0, delStart) + code.slice(delEnd);

  let newPos: number;
  if (newCode.length === 0) {
    newPos = 0;
  } else if (isLastLine) {
    // Deleted last line — cursor goes to start of new last line
    newPos = lineStart(newCode, Math.min(delStart, newCode.length - 1));
  } else {
    // Deleted non-last line — cursor stays at same position (now on next line's content)
    newPos = Math.min(delStart, newCode.length - 1);
  }

  // Never land on a newline
  newPos = clampNormal(newCode, newPos);

  return { newCode, newPos, deleted };
}

// ── Undo helper ──

function pushUndo(stack: string[], code: string): string[] {
  const next = [...stack];
  if (next.length === 0 || next[next.length - 1] !== code) {
    next.push(code);
    if (next.length > 50) next.shift();
  }
  return next;
}

// ── Text object helpers ──

const QUOTE_CHARS = new Set(['"', "'", "`"]);
const BRACKET_PAIRS: Record<string, string> = {
  "(": ")", ")": "(",
  "{": "}", "}": "{",
  "[": "]", "]": "[",
};

/** Find the inner range for a text object (ci", di(, etc.) */
export function findInnerRange(code: string, pos: number, delim: string): { start: number; end: number } | null {
  if (QUOTE_CHARS.has(delim)) {
    // For quotes: find opening to the left (or at pos), closing to the right
    let open = -1;
    // If cursor is ON the quote, treat it as the opening
    if (code[pos] === delim) {
      open = pos;
    } else {
      for (let i = pos - 1; i >= 0; i--) {
        if (code[i] === "\n") break;
        if (code[i] === delim) { open = i; break; }
      }
    }
    if (open === -1) return null;

    let close = -1;
    for (let i = open + 1; i < code.length; i++) {
      if (code[i] === "\n") break;
      if (code[i] === delim) { close = i; break; }
    }
    if (close === -1) return null;

    return { start: open + 1, end: close };
  }

  // For brackets: handle nesting
  // Normalize to open bracket
  const openChar = BRACKET_PAIRS[delim] && ")}>]".includes(delim) ? BRACKET_PAIRS[delim] : delim;
  const closeChar = BRACKET_PAIRS[openChar];
  if (!closeChar) return null;

  // Find opening bracket (scan left)
  let depth = 0;
  let open = -1;
  for (let i = pos; i >= 0; i--) {
    if (code[i] === closeChar && i !== pos) depth++;
    if (code[i] === openChar) {
      if (depth === 0) { open = i; break; }
      depth--;
    }
  }
  if (open === -1) return null;

  // Find closing bracket (scan right from open)
  depth = 0;
  let close = -1;
  for (let i = open + 1; i < code.length; i++) {
    if (code[i] === openChar) depth++;
    if (code[i] === closeChar) {
      if (depth === 0) { close = i; break; }
      depth--;
    }
  }
  if (close === -1) return null;

  return { start: open + 1, end: close };
}

// ── Main command processor ──

export function processKey(input: VimInput): VimOutput {
  const { code, pos, mode, yank, key } = input;
  const yankLinewise = input.yankLinewise ?? false;
  let undoStack = input.undoStack;

  // Base output (no change)
  const noop: VimOutput = {
    code, pos, mode, pending: "", yank, yankLinewise, undoStack, handled: true, codeChanged: false,
  };

  // Insert mode: only handle Escape
  if (mode === "insert") {
    if (key === "Escape") {
      return { ...noop, pos: clampNormal(code, pos - 1), mode: "normal" };
    }
    return { ...noop, handled: false };
  }

  // Normal mode
  const pending = input.pending + key;

  // ── Insert mode transitions ──
  if (pending === "i") {
    undoStack = pushUndo(undoStack, code);
    return { ...noop, mode: "insert", undoStack };
  }
  if (pending === "a") {
    undoStack = pushUndo(undoStack, code);
    // Append after cursor — but don't cross newline
    const le = lineEnd(code, pos);
    const insertPos = Math.min(pos + 1, le);
    return { ...noop, mode: "insert", pos: insertPos, undoStack };
  }
  if (pending === "A") {
    undoStack = pushUndo(undoStack, code);
    return { ...noop, mode: "insert", pos: lineEnd(code, pos), undoStack };
  }
  if (pending === "I") {
    undoStack = pushUndo(undoStack, code);
    return { ...noop, mode: "insert", pos: firstNonBlank(code, lineStart(code, pos)), undoStack };
  }
  if (pending === "o") {
    undoStack = pushUndo(undoStack, code);
    const le = lineEnd(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, le) + "\n" + code.slice(le),
      pos: le + 1, undoStack, codeChanged: true,
    };
  }
  if (pending === "O") {
    undoStack = pushUndo(undoStack, code);
    const ls = lineStart(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, ls) + "\n" + code.slice(ls),
      pos: ls, undoStack, codeChanged: true,
    };
  }
  if (pending === "S") {
    undoStack = pushUndo(undoStack, code);
    const ls = lineStart(code, pos);
    const le = lineEnd(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, ls) + code.slice(le),
      pos: ls, undoStack, codeChanged: true,
    };
  }
  if (pending === "C") {
    undoStack = pushUndo(undoStack, code);
    const le = lineEnd(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, pos) + code.slice(le),
      pos, yank: code.slice(pos, le), yankLinewise: false, undoStack, codeChanged: true,
    };
  }

  // s — delete char under cursor and enter insert
  if (pending === "s") {
    undoStack = pushUndo(undoStack, code);
    if (pos < code.length && code[pos] !== "\n") {
      const newCode = code.slice(0, pos) + code.slice(pos + 1);
      return { ...noop, mode: "insert", code: newCode, pos, undoStack, codeChanged: true };
    }
    return { ...noop, mode: "insert", undoStack };
  }

  // D — delete to end of line (stay in normal)
  if (pending === "D") {
    undoStack = pushUndo(undoStack, code);
    const le = lineEnd(code, pos);
    const newCode = code.slice(0, pos) + code.slice(le);
    return {
      ...noop,
      code: newCode,
      pos: clampNormal(newCode, pos - 1),
      yank: code.slice(pos, le), yankLinewise: false, undoStack, codeChanged: true,
    };
  }

  // ── Motion ──
  if (pending === "h") {
    // Don't cross to previous line
    const ls = lineStart(code, pos);
    return { ...noop, pos: Math.max(ls, pos - 1) };
  }
  if (pending === "l") {
    // Don't cross newline — stay on last char of line
    const lc = lastCharOnLine(code, pos);
    return { ...noop, pos: Math.min(lc, pos + 1) };
  }

  if (pending === "j") {
    const ls = lineStart(code, pos);
    const col = pos - ls;
    const le = lineEnd(code, pos);
    if (le < code.length) {
      const nextLS = le + 1;
      const nextLE = lineEnd(code, nextLS);
      const nextLineLen = nextLE - nextLS;
      const target = nextLS + Math.min(col, Math.max(0, nextLineLen - 1));
      return { ...noop, pos: clampNormal(code, target) };
    }
    return noop;
  }

  if (pending === "k") {
    const ls = lineStart(code, pos);
    if (ls > 0) {
      const col = pos - ls;
      const prevLS = lineStart(code, ls - 1);
      const prevLineLen = ls - 1 - prevLS;
      const target = prevLS + Math.min(col, Math.max(0, prevLineLen - 1));
      return { ...noop, pos: clampNormal(code, target) };
    }
    return noop;
  }

  if (pending === "0") return { ...noop, pos: lineStart(code, pos) };
  if (pending === "^" || pending === "_") return { ...noop, pos: firstNonBlank(code, lineStart(code, pos)) };
  if (pending === "$") {
    // Go to last char on line (not the \n)
    return { ...noop, pos: lastCharOnLine(code, pos) };
  }
  if (pending === "w") return { ...noop, pos: clampNormal(code, wordForwardPos(code, pos)) };
  if (pending === "e") return { ...noop, pos: clampNormal(code, wordEndPos(code, pos)) };
  if (pending === "b") return { ...noop, pos: wordBackPos(code, pos) };
  if (pending === "G") {
    // Go to first non-blank of last line (not past end)
    if (code.length === 0) return { ...noop, pos: 0 };
    const lastLS = lineStart(code, code.length - 1);
    return { ...noop, pos: firstNonBlank(code, lastLS) };
  }

  // % — matching bracket
  if (pending === "%") {
    const ch = code[pos];
    const pairs: Record<string, string> = { "(": ")", ")": "(", "{": "}", "}": "{", "[": "]", "]": "[" };
    if (ch && ch in pairs) {
      const open = "({[".includes(ch);
      const target = pairs[ch];
      let depth = 1;
      if (open) {
        for (let i = pos + 1; i < code.length && depth > 0; i++) {
          if (code[i] === ch) depth++;
          if (code[i] === target) depth--;
          if (depth === 0) return { ...noop, pos: i };
        }
      } else {
        for (let i = pos - 1; i >= 0 && depth > 0; i--) {
          if (code[i] === ch) depth++;
          if (code[i] === target) depth--;
          if (depth === 0) return { ...noop, pos: i };
        }
      }
    }
    return noop;
  }

  // gg — go to start (two-key sequence)
  if (pending === "g") return { ...noop, pending: "g" };
  if (pending === "gg") return { ...noop, pos: 0 };

  // ── Editing ──

  // x — delete char under cursor
  if (pending === "x") {
    if (pos < code.length && code[pos] !== "\n") {
      undoStack = pushUndo(undoStack, code);
      const newCode = code.slice(0, pos) + code.slice(pos + 1);
      return {
        ...noop,
        code: newCode,
        pos: clampNormal(newCode, pos),
        yank: code[pos], yankLinewise: false, undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // r — replace char (two-key)
  if (pending === "r") return { ...noop, pending: "r" };
  if (pending.length === 2 && pending[0] === "r") {
    const replacement = pending[1];
    if (pos < code.length && replacement.length === 1) {
      undoStack = pushUndo(undoStack, code);
      return {
        ...noop,
        code: code.slice(0, pos) + replacement + code.slice(pos + 1),
        pos, undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // ~ — toggle case
  if (pending === "~") {
    if (pos < code.length) {
      const ch = code[pos];
      const toggled = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      if (toggled !== ch) {
        undoStack = pushUndo(undoStack, code);
        return {
          ...noop,
          code: code.slice(0, pos) + toggled + code.slice(pos + 1),
          pos: clampNormal(code, pos + 1),
          undoStack, codeChanged: true,
        };
      }
      return { ...noop, pos: clampNormal(code, pos + 1) };
    }
    return noop;
  }

  // J — join lines
  if (pending === "J") {
    const le = lineEnd(code, pos);
    if (le < code.length) {
      undoStack = pushUndo(undoStack, code);
      const nextLineContent = code.slice(le + 1);
      const trimmed = nextLineContent.replace(/^\s+/, "");
      return {
        ...noop,
        code: code.slice(0, le) + " " + trimmed,
        pos: le, undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // u — undo
  if (pending === "u") {
    if (undoStack.length > 0) {
      const newStack = [...undoStack];
      const prev = newStack.pop()!;
      return {
        ...noop,
        code: prev,
        pos: clampNormal(prev, pos),
        undoStack: newStack, codeChanged: true,
      };
    }
    return noop;
  }

  // dd — delete line (linewise yank)
  if (pending === "d") return { ...noop, pending: "d" };
  if (pending === "dd") {
    undoStack = pushUndo(undoStack, code);
    const { newCode, newPos, deleted } = deleteLine(code, pos);
    return { ...noop, code: newCode, pos: newPos, yank: deleted, yankLinewise: true, undoStack, codeChanged: true };
  }
  if (pending === "dw") {
    undoStack = pushUndo(undoStack, code);
    const end = wordForwardPos(code, pos);
    const newCode = code.slice(0, pos) + code.slice(end);
    return {
      ...noop,
      code: newCode,
      pos: clampNormal(newCode, pos),
      yank: code.slice(pos, end), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  if (pending === "de") {
    undoStack = pushUndo(undoStack, code);
    const end = wordEndPos(code, pos) + 1;
    const newCode = code.slice(0, pos) + code.slice(end);
    return {
      ...noop,
      code: newCode,
      pos: clampNormal(newCode, pos),
      yank: code.slice(pos, end), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  if (pending === "db") {
    undoStack = pushUndo(undoStack, code);
    const start = wordBackPos(code, pos);
    const newCode = code.slice(0, start) + code.slice(pos);
    return {
      ...noop,
      code: newCode,
      pos: clampNormal(newCode, start),
      yank: code.slice(start, pos), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  // di — delete inner text object (pending "di", awaiting delimiter)
  if (pending === "di") return { ...noop, pending: "di" };
  if (pending.length === 3 && pending.startsWith("di")) {
    const delim = pending[2];
    const range = findInnerRange(code, pos, delim);
    if (range) {
      undoStack = pushUndo(undoStack, code);
      const yanked = code.slice(range.start, range.end);
      const newCode = code.slice(0, range.start) + code.slice(range.end);
      return {
        ...noop,
        code: newCode, pos: clampNormal(newCode, range.start),
        yank: yanked, yankLinewise: false, undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // cc — change line (linewise yank)
  if (pending === "c") return { ...noop, pending: "c" };
  if (pending === "cc") {
    undoStack = pushUndo(undoStack, code);
    const ls = lineStart(code, pos);
    const le = lineEnd(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, ls) + code.slice(le),
      pos: ls, yank: code.slice(ls, le), yankLinewise: true, undoStack, codeChanged: true,
    };
  }
  if (pending === "cw") {
    undoStack = pushUndo(undoStack, code);
    const end = wordForwardPos(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, pos) + code.slice(end),
      pos, yank: code.slice(pos, end), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  if (pending === "ce") {
    undoStack = pushUndo(undoStack, code);
    const end = wordEndPos(code, pos) + 1;
    return {
      ...noop, mode: "insert",
      code: code.slice(0, pos) + code.slice(end),
      pos, yank: code.slice(pos, end), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  if (pending === "cb") {
    undoStack = pushUndo(undoStack, code);
    const start = wordBackPos(code, pos);
    return {
      ...noop, mode: "insert",
      code: code.slice(0, start) + code.slice(pos),
      pos: start, yank: code.slice(start, pos), yankLinewise: false, undoStack, codeChanged: true,
    };
  }
  // ci — change inner text object (pending "ci", awaiting delimiter)
  if (pending === "ci") return { ...noop, pending: "ci" };
  if (pending.length === 3 && pending.startsWith("ci")) {
    const delim = pending[2];
    const range = findInnerRange(code, pos, delim);
    if (range) {
      undoStack = pushUndo(undoStack, code);
      const yanked = code.slice(range.start, range.end);
      const newCode = code.slice(0, range.start) + code.slice(range.end);
      return {
        ...noop, mode: "insert",
        code: newCode, pos: range.start,
        yank: yanked, yankLinewise: false, undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // yy — yank line (linewise)
  if (pending === "y") return { ...noop, pending: "y" };
  if (pending === "yy") {
    const ls = lineStart(code, pos);
    const le = lineEnd(code, pos);
    return { ...noop, yank: code.slice(ls, le), yankLinewise: true };
  }
  if (pending === "yw") {
    const end = wordForwardPos(code, pos);
    return { ...noop, yank: code.slice(pos, end), yankLinewise: false };
  }

  // p — paste after cursor
  if (pending === "p") {
    if (yank) {
      undoStack = pushUndo(undoStack, code);
      if (yankLinewise) {
        // Paste on line below
        const le = lineEnd(code, pos);
        const newCode = code.slice(0, le) + "\n" + yank + code.slice(le);
        const newPos = le + 1; // start of pasted line
        return {
          ...noop,
          code: newCode,
          pos: firstNonBlank(newCode, newPos),
          undoStack, codeChanged: true,
        };
      }
      // Charwise paste after cursor
      const insertAt = Math.min(pos + 1, code.length);
      return {
        ...noop,
        code: code.slice(0, insertAt) + yank + code.slice(insertAt),
        pos: insertAt + yank.length - 1,
        undoStack, codeChanged: true,
      };
    }
    return noop;
  }
  // P — paste before cursor
  if (pending === "P") {
    if (yank) {
      undoStack = pushUndo(undoStack, code);
      if (yankLinewise) {
        // Paste on line above
        const ls = lineStart(code, pos);
        const newCode = code.slice(0, ls) + yank + "\n" + code.slice(ls);
        return {
          ...noop,
          code: newCode,
          pos: firstNonBlank(newCode, ls),
          undoStack, codeChanged: true,
        };
      }
      // Charwise paste before cursor
      return {
        ...noop,
        code: code.slice(0, pos) + yank + code.slice(pos),
        pos: pos + yank.length - 1,
        undoStack, codeChanged: true,
      };
    }
    return noop;
  }

  // Unrecognized — clear pending
  return noop;
}
