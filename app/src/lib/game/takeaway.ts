// Lift the reusable part of the player's own solution — the statement or
// function the chapter was really about — so the chapter debrief can show it
// back to them. Pure: code in, snippet out.

export interface SnippetRule {
  /** The line a candidate block starts on (e.g. a `func validateCode` line). */
  start: RegExp;
  /** The block must also contain this (e.g. it reads `cellblock.`). */
  contains?: RegExp;
}

const MAX_LINES = 14;

/** Blank out string contents so brackets inside them don't count. */
function stripStrings(line: string): string {
  return line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, '""');
}

function depthDelta(line: string): number {
  const s = stripStrings(line).replace(/(\/\/|#).*$/, "");
  let d = 0;
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
  }
  return d;
}

const indentOf = (line: string) => line.length - line.trimStart().length;

/** The lines of the block starting at `i`: bracket-balanced, or (indent) the suite under it. */
function blockFrom(lines: string[], i: number, indentBased: boolean): string[] {
  const block = [lines[i]];
  let depth = depthDelta(lines[i]);
  let j = i + 1;
  // Bracket continuation (a call or literal spanning lines, a braced body).
  while (depth > 0 && j < lines.length) {
    block.push(lines[j]);
    depth += depthDelta(lines[j]);
    j++;
  }
  // Python: a header ending in ":" owns the more-indented lines below it.
  if (indentBased && /:\s*(#.*)?$/.test(lines[i + block.length - 1] ?? "")) {
    const base = indentOf(lines[i]);
    while (j < lines.length && (lines[j].trim() === "" || indentOf(lines[j]) > base)) {
      block.push(lines[j]);
      j++;
    }
  }
  while (block.length > 1 && block[block.length - 1].trim() === "") block.pop();
  return block;
}

function dedent(lines: string[]): string[] {
  const indents = lines.filter((l) => l.trim()).map(indentOf);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(Math.min(cut, indentOf(l))));
}

/**
 * The first block in `code` that starts on `rule.start` (and contains
 * `rule.contains`), dedented and capped. Null when nothing matches.
 */
export function extractSnippet(code: string, rule: SnippetRule, indentBased = false): string | null {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!rule.start.test(lines[i])) continue;
    const block = blockFrom(lines, i, indentBased);
    if (rule.contains && !rule.contains.test(block.join("\n"))) continue;
    const out = dedent(block);
    return out.length > MAX_LINES ? [...out.slice(0, MAX_LINES - 1), "…"].join("\n") : out.join("\n");
  }
  return null;
}
