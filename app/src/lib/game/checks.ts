import type { CheckReport, DiffLine, MissionCheck, OutputDiff } from "@/types/game";

/**
 * Normalize program output the way grading does: surrounding whitespace is
 * ignored, and an interpunct separator (· • ∙) from an older brief reads as the
 * plain dash (paste is disabled, so required output is keyboard ASCII).
 */
export function normalizeOutput(s: string): string {
  return s.trim().replace(/[·•∙]/g, "-");
}

export function outputsMatch(output: string, expected: string): boolean {
  return normalizeOutput(output) === normalizeOutput(expected);
}

/** A segment named for a sentence: spaces are invisible, so say so. */
function describe(segment: string): string {
  if (segment.trim() === "") return segment.length === 1 ? "a space" : `${segment.length} spaces`;
  return `"${segment}"`;
}

/** The nearest visible word in `text`, from its start (or its end). */
function word(text: string, fromEnd: boolean): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return fromEnd ? words[words.length - 1] : words[0];
}

/**
 * Find the first place `actual` departs from `expected` and split that line
 * around the differing segment, with one sentence naming the difference.
 * Returns null when they match.
 */
export function diffOutput(expected: string, actual: string): OutputDiff | null {
  if (outputsMatch(actual, expected)) return null;
  const want = normalizeOutput(expected).split("\n");
  const got = normalizeOutput(actual) === "" ? [] : normalizeOutput(actual).split("\n");

  let i = 0;
  while (i < want.length && i < got.length && want[i] === got[i]) i++;

  const totalLines = want.length;
  if (i >= want.length) {
    // Everything expected is there; the program printed more.
    const extra = got[i] ?? "";
    return {
      line: i + 1,
      totalLines,
      expected: { before: "", mid: "", after: "" },
      actual: { before: "", mid: extra, after: "" },
      note: got.length - want.length === 1
        ? `one extra line: ${describe(extra)}`
        : `${got.length - want.length} extra lines, starting with ${describe(extra)}`,
    };
  }
  if (i >= got.length) {
    const missing = want.length - got.length;
    return {
      line: i + 1,
      totalLines,
      expected: { before: "", mid: want[i], after: "" },
      actual: null,
      note: got.length === 0
        ? "nothing was printed"
        : missing === 1
          ? `the last line is missing: ${describe(want[i])}`
          : `${missing} lines are missing, starting with ${describe(want[i])}`,
    };
  }

  const e = want[i];
  const a = got[i];
  let p = 0;
  while (p < e.length && p < a.length && e[p] === a[p]) p++;
  let s = 0;
  while (s < e.length - p && s < a.length - p && e[e.length - 1 - s] === a[a.length - 1 - s]) s++;

  const split = (line: string): DiffLine => ({
    before: line.slice(0, p),
    mid: line.slice(p, line.length - s),
    after: line.slice(line.length - s),
  });
  const exp = split(e);
  const act = split(a);

  let note: string;
  if (exp.mid && !act.mid) {
    const next = word(exp.after, false);
    const prev = word(exp.before, true);
    note = `missing ${describe(exp.mid)}${next ? ` before "${next}"` : prev ? ` after "${prev}"` : ""}`;
  } else if (!exp.mid && act.mid) {
    note = `extra ${describe(act.mid)}${word(act.before, true) ? ` after "${word(act.before, true)}"` : ""}`;
  } else if (exp.mid.toLowerCase() === act.mid.toLowerCase()) {
    note = `check the capitals: ${describe(act.mid)} should be ${describe(exp.mid)}`;
  } else {
    note = `${describe(act.mid)} should be ${describe(exp.mid)}`;
  }
  if (totalLines > 1) note = `line ${i + 1}: ${note}`;

  return { line: i + 1, totalLines, expected: exp, actual: act, note };
}

// ── The three checks ──

export const CHECK_LABELS = {
  runs: "Runs without errors",
  output: "Output matches exactly",
  harness: "Passes the terminal's test run",
  verdict: "Does what the step asks",
} as const;

/**
 * "Uses `cellblock.Cell`, `cellblock.Sublevel`" — or a generic label when the
 * list is long or a pattern is a code fragment (e.g. `Println(i`) that would
 * read as a typo.
 */
export function usesLabel(required: string[]): string {
  return required.length <= 2 && required.every((r) => /^[A-Za-z_][\w.]*$/.test(r))
    ? `Uses ${required.map((r) => `\`${r}\``).join(", ")}`
    : "Uses the required code";
}

/**
 * The anti-hardcoding check, on its own: it can be judged without running the
 * program, so it's reported even when the code doesn't compile.
 */
export function usesCheck(required: string[], checkedCode: string): MissionCheck {
  const missing = required.filter((pat) => !checkedCode.includes(pat));
  return {
    id: "uses",
    label: usesLabel(required),
    status: missing.length === 0 ? "pass" : "fail",
    ...(missing.length > 0 ? { detail: `missing ${missing.map((m) => `\`${m}\``).join(", ")}` } : {}),
  };
}

/** Assemble a report; `passed` is true only when every check passed. */
export function buildReport(
  checks: MissionCheck[],
  extra: Omit<CheckReport, "checks" | "passed"> = {},
): CheckReport {
  return {
    checks,
    passed: checks.length > 0 && checks.every((c) => c.status === "pass"),
    ...extra,
  };
}

/** "2/3" — how many checks passed. */
export function passedCount(report: CheckReport): string {
  return `${report.checks.filter((c) => c.status === "pass").length}/${report.checks.length}`;
}

/** The first check that failed — the one thing to fix next. */
export function firstFailure(report: CheckReport): MissionCheck | undefined {
  return report.checks.find((c) => c.status === "fail");
}
