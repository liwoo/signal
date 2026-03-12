import { describe, it, expect } from "vitest";
import { callMayaEngine } from "./engine";

// ── Helper ──

function chat(stepId: string, msg: string) {
  return callMayaEngine(stepId, msg, false, false, false, 0);
}

// ═══════════════════════════════════════════════
//  CHAPTER 1 — HANDSHAKE (15 questions)
// ═══════════════════════════════════════════════

describe("ch01 chat — scaffold step questions", () => {
  const step = "chapter-01:scaffold";

  it("Q1: what should I do first?", () => {
    const r = chat(step, "what should I do first?");
    expect(r.reply).toMatch(/skeleton|package|func main/i);
    expect(r.isComplete).toBe(false);
  });

  it("Q2: what is package main?", () => {
    const r = chat(step, "what is package main?");
    expect(r.reply).toMatch(/package main/);
    expect(r.reply).toMatch(/first line|executable|runnable/i);
  });

  it("Q3: how do I import something?", () => {
    const r = chat(step, "how do I import something?");
    expect(r.reply).toMatch(/import.*"fmt"/);
  });

  it("Q4: what is func main?", () => {
    const r = chat(step, "what is func main?");
    expect(r.reply).toMatch(/entry point|program runs|starts here/i);
  });

  it("Q5: how do I run my code?", () => {
    const r = chat(step, "how do I run my code?");
    expect(r.reply).toMatch(/transmit|skeleton|write/i);
  });

  it("Q6: why are we using golang?", () => {
    const r = chat(step, "why are we using golang?");
    expect(r.reply).toMatch(/fast|simple|binary/i);
  });

  it("Q7: do I need a go.mod file?", () => {
    const r = chat(step, "do I need a go.mod file?");
    expect(r.reply).toMatch(/module|terminal handles|focus/i);
  });

  it("Q8: where do the curly braces go?", () => {
    const r = chat(step, "where does the opening brace belong?");
    expect(r.reply).toMatch(/same line|func main/i);
  });

  it("Q9: my code isn't working what's wrong?", () => {
    const r = chat(step, "my code isn't working what's wrong?");
    expect(r.reply).toMatch(/package main|import|func main|order/i);
  });

  it("Q10: do I need semicolons?", () => {
    const r = chat(step, "do I need semicolons?");
    expect(r.reply).toMatch(/semicolon|doesn't use/i);
  });

  it("Q11: is Println case sensitive?", () => {
    const r = chat(step, "is Println case sensitive?");
    expect(r.reply).toMatch(/case.sensitive|capital P|Println/i);
  });
});

describe("ch01 chat — location step questions", () => {
  const step = "chapter-01:location";

  it("Q12: how do I print text?", () => {
    const r = chat(step, "how do I print text?");
    expect(r.reply).toMatch(/fmt\.Println|print/i);
  });

  it("Q13: how do I use variables?", () => {
    const r = chat(step, "how do I use variables?");
    expect(r.reply).toMatch(/:=|var.*string/);
  });

  it("Q14: what is a constant?", () => {
    const r = chat(step, "what is a constant?");
    expect(r.reply).toMatch(/const|locked|can't change/i);
  });

  it("Q15: can you show me an example?", () => {
    const r = chat(step, "can you show me an example?");
    expect(r.reply).toMatch(/cell|B-09|fmt/i);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 2 — DOOR CODE (15 questions)
// ═══════════════════════════════════════════════

describe("ch02 chat — loop step questions", () => {
  const step = "chapter-02:loop";

  it("Q1: what do I do now?", () => {
    const r = chat(step, "what do I do now?");
    expect(r.reply).toMatch(/for loop|1.*10|prints/i);
    expect(r.isComplete).toBe(false);
  });

  it("Q2: how do I write a for loop?", () => {
    const r = chat(step, "how do I write a for loop?");
    expect(r.reply).toMatch(/for\s+i\s*:=\s*1/);
  });

  it("Q3: does Go have a while loop?", () => {
    const r = chat(step, "does Go have a while loop?");
    expect(r.reply).toMatch(/no while|only loop|for/i);
  });

  it("Q4: how do I print each number?", () => {
    const r = chat(step, "how do I print each number?");
    expect(r.reply).toMatch(/fmt\.Println|one per line/i);
  });

  it("Q5: what does i++ mean?", () => {
    const r = chat(step, "what does i++ mean?");
    expect(r.reply).toMatch(/increment|by 1/i);
  });

  it("Q6: should I start at 0 or 1?", () => {
    const r = chat(step, "should I start at 0 or 1?");
    expect(r.reply).toMatch(/start at 1|i := 1/i);
  });

  it("Q7: what does := do?", () => {
    const r = chat(step, "what does := do?");
    expect(r.reply).toMatch(/:=|declare/i);
  });
});

describe("ch02 chat — classify step questions", () => {
  const step = "chapter-02:classify";

  it("Q8: how does switch work?", () => {
    const r = chat(step, "how does switch work in Go?");
    expect(r.reply).toMatch(/switch|case/);
  });

  it("Q9: can I use if/else instead?", () => {
    const r = chat(step, "can I use if/else to branch?");
    expect(r.reply).toMatch(/if.*else|works.*too|cleaner/i);
  });

  it("Q10: what are the ranges again?", () => {
    const r = chat(step, "what are the ranges for each label?");
    expect(r.reply).toMatch(/DENY|WARN|GRANT|OVERRIDE/);
  });

  it("Q11: does Go switch fall through?", () => {
    const r = chat(step, "does it fall through like C?");
    expect(r.reply).toMatch(/fall.*through|no.*break|doesn't fall/i);
  });

  it("Q12: how do I print both number and label?", () => {
    const r = chat(step, "how do I print both the number and the label?");
    expect(r.reply).toMatch(/fmt\.Println.*DENY|number and label/i);
  });

  it("Q13: what should I do for this step?", () => {
    const r = chat(step, "what should I do?");
    expect(r.reply).toMatch(/loop|classify|DENY|WARN|GRANT|OVERRIDE/i);
  });
});

describe("ch02 chat — rewrite step questions", () => {
  const step = "chapter-02:rewrite";

  it("Q14: why do I need to rewrite?", () => {
    const r = chat(step, "why do I need to rewrite this?");
    expect(r.reply).toMatch(/redundancy|different|switch.*if|if.*switch/i);
  });

  it("Q15: what's the difference between switch and if?", () => {
    const r = chat(step, "difference between the two approaches?");
    expect(r.reply).toMatch(/same result|cleaner|both/i);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 3 — SHAFT CODES (15 questions)
// ═══════════════════════════════════════════════

describe("ch03 chat — scaffold step questions", () => {
  const step = "chapter-03:scaffold";

  it("Q1: what functions will I need?", () => {
    const r = chat(step, "do I need sumCodes or validate?");
    expect(r.reply).toMatch(/function|sumCodes|skeleton|next step/i);
    expect(r.isComplete).toBe(false);
  });

  it("Q2: how do I set up the scaffold?", () => {
    const r = chat(step, "how do I set up the scaffold?");
    // Should not answer with deflection
    expect(r.reply).not.toMatch(/signal lost/);
  });
});

describe("ch03 chat — sumfunc step questions", () => {
  const step = "chapter-03:sumfunc";

  it("Q3: what should I do here?", () => {
    const r = chat(step, "what should I do here?");
    expect(r.reply).toMatch(/sumCodes|variadic|func/i);
  });

  it("Q4: what is a variadic parameter?", () => {
    const r = chat(step, "what is variadic?");
    expect(r.reply).toMatch(/\.\.\.int|three dots|any number/i);
  });

  it("Q5: how do I define a function?", () => {
    const r = chat(step, "how do I define a function?");
    expect(r.reply).toMatch(/func|return/i);
  });

  it("Q6: how does range work?", () => {
    const r = chat(step, "how does range work?");
    expect(r.reply).toMatch(/range|index|value/i);
  });

  it("Q7: what does the underscore do?", () => {
    const r = chat(step, "what does the underscore do?");
    expect(r.reply).toMatch(/_|blank identifier|discard|ignores/i);
  });

  it("Q8: how do I add to a total?", () => {
    const r = chat(step, "how do I add to a total?");
    expect(r.reply).toMatch(/\+=|total|accumulate|adds/i);
  });

  it("Q9: how do I call sumCodes?", () => {
    const r = chat(step, "how to call sumCodes in main?");
    expect(r.reply).toMatch(/sumCodes\(|result.*:=/i);
  });

  it("Q10: what return type does it need?", () => {
    const r = chat(step, "what return type does it need?");
    expect(r.reply).toMatch(/int|return/i);
  });
});

describe("ch03 chat — validate step questions", () => {
  const step = "chapter-03:validate";

  it("Q11: what do I need to do now?", () => {
    const r = chat(step, "what do I need to do now?");
    expect(r.reply).toMatch(/validateCode|sumCodes|total.*100/i);
  });

  it("Q12: how do I return two values?", () => {
    const r = chat(step, "how do I return two values?");
    expect(r.reply).toMatch(/\(int.*bool\)|multiple|parens/i);
  });

  it("Q13: what does greater than 100 mean?", () => {
    const r = chat(step, "why is the threshold 100?");
    expect(r.reply).toMatch(/100|threshold|validates/i);
  });

  it("Q14: how do I pass variadic args to another function?", () => {
    const r = chat(step, "how do I spread codes to sumCodes?");
    expect(r.reply).toMatch(/codes\.\.\.|spread/i);
  });

  it("Q15: can I reuse sumCodes?", () => {
    const r = chat(step, "can I reuse sumCodes?");
    expect(r.reply).toMatch(/sumCodes|reuse|spread/i);
  });
});

// ═══════════════════════════════════════════════
//  CROSS-CUTTING: Global handlers apply everywhere
// ═══════════════════════════════════════════════

describe("global chat handlers", () => {
  const steps = [
    "chapter-01:scaffold",
    "chapter-01:location",
    "chapter-02:loop",
    "chapter-02:classify",
    "chapter-03:sumfunc",
    "chapter-03:validate",
  ];

  it("responds to 'help' with stuck response across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "help I'm stuck");
      expect(r.reply.length).toBeGreaterThan(10);
      expect(r.isComplete).toBe(false);
    }
  });

  it("responds to greetings with redirect across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "hello maya");
      expect(r.reply).toMatch(/focus|brief|work|pleasantries/i);
      expect(r.isComplete).toBe(false);
    }
  });

  it("responds to acknowledgments across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "ok got it thanks");
      expect(r.reply).toMatch(/good|go\.|code|terminal|waiting/i);
      expect(r.isComplete).toBe(false);
    }
  });

  it("responds to identity questions across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "who are you?");
      expect(r.reply).toMatch(/maya chen/i);
      expect(r.isComplete).toBe(false);
    }
  });

  it("responds to location questions across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "where are you?");
      expect(r.reply).toMatch(/B-09|sublevel 3/i);
      expect(r.isComplete).toBe(false);
    }
  });

  it("deflects off-topic questions across all steps", () => {
    for (const step of steps) {
      const r = chat(step, "tell me about quantum physics");
      expect(r.reply.length).toBeGreaterThan(5);
      expect(r.isComplete).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════
//  EDGE CASES: phrasing variants
// ═══════════════════════════════════════════════

describe("phrasing variants", () => {
  it("matches 'where do I start' for ch01 scaffold", () => {
    const r = chat("chapter-01:scaffold", "where do I start?");
    expect(r.reply).toMatch(/skeleton|package|Println/i);
  });

  it("matches 'I don't know what to do' via stuck handler", () => {
    const r = chat("chapter-02:loop", "I don't know what to do");
    expect(r.reply.length).toBeGreaterThan(10);
    expect(r.isComplete).toBe(false);
  });

  it("matches 'what is this' for ch03 validate", () => {
    const r = chat("chapter-03:validate", "what is a boolean?");
    expect(r.reply).toMatch(/bool|true|false/i);
  });

  it("matches short keyword 'for' in ch02 loop", () => {
    const r = chat("chapter-02:loop", "explain the for loop");
    expect(r.reply).toMatch(/for|loop|i\s*:=/i);
  });

  it("matches '...' for ch03 sumfunc variadic", () => {
    const r = chat("chapter-03:sumfunc", "what are the three dots for?");
    expect(r.reply).toMatch(/variadic|\.\.\.int|any number/i);
  });

  it("matches 'what next' for ch02 classify", () => {
    const r = chat("chapter-02:classify", "what now?");
    expect(r.reply).toMatch(/loop|classify|DENY|WARN|GRANT/i);
  });

  it("matches 'how do I concatenate' for ch01 location", () => {
    const r = chat("chapter-01:location", "how do I concatenate values together?");
    expect(r.reply).toMatch(/concat|Println|Printf|args/i);
  });

  it("matches 'what does += do' for ch03 sumfunc", () => {
    const r = chat("chapter-03:sumfunc", "what does += do?");
    expect(r.reply).toMatch(/\+=|adds|total/i);
  });
});
