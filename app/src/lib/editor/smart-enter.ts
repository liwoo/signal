/**
 * Smart Enter for the code editor — pure, no DOM.
 *
 * Pressing Enter keeps the current line's indentation. When the caret sits
 * right after an opening bracket the new line is indented one level deeper,
 * and when it sits between a bracket pair (`{|}`, `(|)`, `[|]`) the closer is
 * pushed onto its own line at the original indent:
 *
 *   func main() {|}      →   func main() {
 *                                |
 *                            }
 *
 * Beginners otherwise end up with `}` glued to the end of their code line and
 * only the FMT button to rescue them.
 */

const OPEN_TO_CLOSE: Record<string, string> = { "{": "}", "(": ")", "[": "]" };

export interface SmartEnterResult {
  code: string;
  /** Caret position after the edit. */
  cursor: number;
}

/** One indent level, matching the file's style: a tab once gofmt has run, else 4 spaces. */
export function indentUnit(code: string): string {
  const m = /^([ \t])/m.exec(code.replace(/^[ \t]*$/gm, ""));
  return m && m[1] === "\t" ? "\t" : "    ";
}

/**
 * Compute the result of pressing Enter with the selection `[start, end)`.
 * The selection (if any) is replaced, like a native newline insert.
 */
export function smartEnter(code: string, start: number, end: number = start): SmartEnterResult {
  const lineStart = code.lastIndexOf("\n", start - 1) + 1;
  const indent = /^[ \t]*/.exec(code.slice(lineStart, start))![0];

  // Ignore trailing spaces before the caret when looking for the opener.
  const before = code.slice(lineStart, start).replace(/[ \t]+$/, "");
  const opener = before[before.length - 1];
  const close = opener ? OPEN_TO_CLOSE[opener] : undefined;

  const tail = code.slice(end);

  if (!close) {
    const head = code.slice(0, start);
    const insert = "\n" + indent;
    return { code: head + insert + tail, cursor: head.length + insert.length };
  }

  // Drop the stray spaces between the opener and the caret.
  const head = code.slice(0, lineStart) + before;
  const insert = "\n" + indent + indentUnit(code);
  const tailTrimmed = tail.replace(/^[ \t]+/, "");
  const closerOwnLine = tailTrimmed[0] === close ? "\n" + indent + tailTrimmed : tail;
  return { code: head + insert + closerOwnLine, cursor: head.length + insert.length };
}
