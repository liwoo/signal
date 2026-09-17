import { diagnose } from "@/lib/go/diagnostics";
import type { SubmissionFeedback } from "@/types/game";

/**
 * Turn a rejected submission into a compact, editor-local explanation. Local
 * diagnostics win because they point to the exact source location; compiler
 * messages are used when the program is otherwise structurally valid.
 */
export function buildSubmissionFeedback(
  code: string,
  message: string,
  lesson?: string,
): SubmissionFeedback {
  const localError = diagnose(code).find((diagnostic) => diagnostic.severity === "error");
  if (localError) {
    return { message, line: localError.line, lesson };
  }

  // Go reports compile positions as "4:6: undefined: name". Some local
  // responses use "line 4:" instead, so support both forms.
  const lineMatch = message.match(/\bline\s+(\d+)\b|\b(\d+):\d+:/i);
  const line = Number(lineMatch?.[1] ?? lineMatch?.[2]);
  return { message, ...(Number.isFinite(line) && line > 0 ? { line } : {}), lesson };
}
