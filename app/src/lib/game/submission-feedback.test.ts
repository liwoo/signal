import { describe, expect, it } from "vitest";
import { buildSubmissionFeedback } from "./submission-feedback";

describe("buildSubmissionFeedback", () => {
  it("uses the exact local diagnostic line when one is available", () => {
    const feedback = buildSubmissionFeedback(
      "package main\nfunc main() {\n",
      "line 2: unclosed '{'",
      "close the function body before submitting again.",
    );

    expect(feedback.line).toBe(2);
    expect(feedback.lesson).toContain("close");
  });

  it("reads a compiler line when the local diagnostic pass is clean", () => {
    const feedback = buildSubmissionFeedback(
      "package main\nfunc main() {}",
      "4:6: undefined: signal",
    );

    expect(feedback.line).toBe(4);
  });
});
