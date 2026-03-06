import { describe, test, expect } from "vitest";
import {
  EXPLAIN_COST_XP,
  createPauseState,
  isPaused,
  shouldQueueEvent,
  startPause,
  markTypingDone,
  resume,
  requestExplain,
  resetExplainForNewStep,
  splitMayaMessage,
} from "./pause";

describe("pause system", () => {
  test("EXPLAIN_COST_XP is 10", () => {
    expect(EXPLAIN_COST_XP).toBe(10);
  });

  describe("createPauseState", () => {
    test("returns idle state", () => {
      const state = createPauseState();
      expect(state.pauseStartMs).toBe(0);
      expect(state.waitingForContinue).toBe(false);
      expect(state.explainUsed).toBe(false);
    });
  });

  describe("isPaused", () => {
    test("false when pauseStartMs is 0", () => {
      expect(isPaused(createPauseState())).toBe(false);
    });

    test("true when pauseStartMs > 0", () => {
      expect(isPaused({ pauseStartMs: 1000, waitingForContinue: false, explainUsed: false })).toBe(true);
    });
  });

  describe("shouldQueueEvent", () => {
    test("false when not paused", () => {
      expect(shouldQueueEvent(createPauseState())).toBe(false);
    });

    test("true when paused", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: false };
      expect(shouldQueueEvent(state)).toBe(true);
    });

    test("true when waiting for continue (still paused)", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false };
      expect(shouldQueueEvent(state)).toBe(true);
    });
  });

  describe("startPause", () => {
    test("starts pause with timestamp", () => {
      const state = createPauseState();
      const result = startPause(state, 10000, false);
      expect(result).not.toBeNull();
      expect(result!.pauseStartMs).toBe(10000);
      expect(result!.waitingForContinue).toBe(false);
    });

    test("returns null if timer is already stopped", () => {
      const state = createPauseState();
      expect(startPause(state, 10000, true)).toBeNull();
    });

    test("returns null if already paused", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: false };
      expect(startPause(state, 10000, false)).toBeNull();
    });

    test("returns null if both timer stopped AND already paused", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: false };
      expect(startPause(state, 10000, true)).toBeNull();
    });

    test("preserves explainUsed from previous cycle if somehow set", () => {
      const state = { pauseStartMs: 0, waitingForContinue: false, explainUsed: true };
      const result = startPause(state, 10000, false);
      expect(result).not.toBeNull();
      expect(result!.explainUsed).toBe(true);
    });
  });

  describe("markTypingDone", () => {
    test("sets waitingForContinue to true", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: false };
      const result = markTypingDone(state);
      expect(result).not.toBeNull();
      expect(result!.waitingForContinue).toBe(true);
      expect(result!.pauseStartMs).toBe(5000); // still paused
    });

    test("returns null if not paused", () => {
      expect(markTypingDone(createPauseState())).toBeNull();
    });

    test("idempotent — calling twice is safe", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false };
      const result = markTypingDone(state);
      expect(result).not.toBeNull();
      expect(result!.waitingForContinue).toBe(true);
    });

    test("preserves explainUsed state", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: true };
      const result = markTypingDone(state);
      expect(result!.explainUsed).toBe(true);
    });
  });

  describe("resume", () => {
    test("returns idle state and bonus seconds", () => {
      const state = { pauseStartMs: 10000, waitingForContinue: true, explainUsed: true };
      const result = resume(state, 17000);
      expect(result).not.toBeNull();
      expect(result!.state).toEqual(createPauseState());
      expect(result!.bonusSeconds).toBe(7);
    });

    test("returns null if not paused", () => {
      expect(resume(createPauseState(), 10000)).toBeNull();
    });

    test("calculates correct bonus for short pauses", () => {
      const state = { pauseStartMs: 10000, waitingForContinue: true, explainUsed: false };
      const result = resume(state, 10500);
      expect(result!.bonusSeconds).toBe(0.5);
    });

    test("calculates correct bonus for long pauses", () => {
      const state = { pauseStartMs: 10000, waitingForContinue: true, explainUsed: false };
      const result = resume(state, 70000);
      expect(result!.bonusSeconds).toBe(60);
    });

    test("resets all fields including explainUsed", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: true };
      const result = resume(state, 12000);
      expect(result!.state.pauseStartMs).toBe(0);
      expect(result!.state.waitingForContinue).toBe(false);
      expect(result!.state.explainUsed).toBe(false);
    });

    test("works even without markTypingDone (force resume)", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: false, explainUsed: false };
      const result = resume(state, 8000);
      expect(result).not.toBeNull();
      expect(result!.bonusSeconds).toBe(3);
    });
  });

  describe("requestExplain", () => {
    test("sets explainUsed and clears waitingForContinue", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false };
      const result = requestExplain(state, 100);
      expect(result).not.toBeNull();
      expect(result!.state.explainUsed).toBe(true);
      expect(result!.state.waitingForContinue).toBe(false);
      expect(result!.state.pauseStartMs).toBe(5000); // still paused
    });

    test("deducts EXPLAIN_COST_XP from current XP", () => {
      const result = requestExplain(
        { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false },
        100
      );
      expect(result!.newXP).toBe(90);
    });

    test("XP never goes below 0", () => {
      const result = requestExplain(
        { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false },
        5
      );
      expect(result!.newXP).toBe(0);
    });

    test("XP 0 stays at 0", () => {
      const result = requestExplain(
        { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false },
        0
      );
      expect(result!.newXP).toBe(0);
    });

    test("returns null if already used", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: true };
      expect(requestExplain(state, 100)).toBeNull();
    });

    test("cannot be used twice in same cycle", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false };
      const first = requestExplain(state, 100);
      expect(first).not.toBeNull();
      const second = requestExplain(first!.state, first!.newXP);
      expect(second).toBeNull();
    });
  });

  describe("resetExplainForNewStep", () => {
    test("clears explainUsed", () => {
      const state = { pauseStartMs: 0, waitingForContinue: false, explainUsed: true };
      const result = resetExplainForNewStep(state);
      expect(result.explainUsed).toBe(false);
    });

    test("preserves other fields", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: true };
      const result = resetExplainForNewStep(state);
      expect(result.pauseStartMs).toBe(5000);
      expect(result.waitingForContinue).toBe(true);
      expect(result.explainUsed).toBe(false);
    });

    test("no-op when already false", () => {
      const state = { pauseStartMs: 0, waitingForContinue: false, explainUsed: false };
      const result = resetExplainForNewStep(state);
      expect(result).toEqual(state);
    });
  });

  describe("full flow: pause → typing done → continue", () => {
    test("complete cycle returns correct bonus", () => {
      let state = createPauseState();

      // Maya starts typing at t=10000
      const s1 = startPause(state, 10000, false);
      expect(s1).not.toBeNull();
      state = s1!;
      expect(isPaused(state)).toBe(true);
      expect(shouldQueueEvent(state)).toBe(true);

      // Maya finishes typing
      const s2 = markTypingDone(state);
      expect(s2).not.toBeNull();
      state = s2!;
      expect(state.waitingForContinue).toBe(true);

      // Player clicks continue at t=15000 (5s later)
      const result = resume(state, 15000);
      expect(result).not.toBeNull();
      expect(result!.bonusSeconds).toBe(5);
      expect(isPaused(result!.state)).toBe(false);
    });
  });

  describe("full flow: pause → typing done → explain → typing done → continue", () => {
    test("explain adds another pause cycle", () => {
      let state = createPauseState();

      // Maya types, pause at t=10000
      state = startPause(state, 10000, false)!;
      state = markTypingDone(state)!;

      // Player clicks explain at t=13000
      const explainResult = requestExplain(state, 50);
      expect(explainResult).not.toBeNull();
      state = explainResult!.state;
      expect(explainResult!.newXP).toBe(40);
      expect(state.waitingForContinue).toBe(false); // Maya typing again
      expect(state.explainUsed).toBe(true);
      expect(state.pauseStartMs).toBe(10000); // original pause time preserved

      // Maya finishes typing explanation
      state = markTypingDone(state)!;
      expect(state.waitingForContinue).toBe(true);

      // Can't explain again
      expect(requestExplain(state, 40)).toBeNull();

      // Player clicks continue at t=20000
      const result = resume(state, 20000);
      expect(result).not.toBeNull();
      expect(result!.bonusSeconds).toBe(10); // full 10s compensated
    });
  });

  describe("full flow: step transition resets explain", () => {
    test("explain available again after step advance", () => {
      let state = createPauseState();

      // First step: use explain
      state = startPause(state, 10000, false)!;
      state = markTypingDone(state)!;
      const r1 = requestExplain(state, 100);
      state = r1!.state;
      expect(state.explainUsed).toBe(true);

      // Resume
      const resumed = resume(state, 15000);
      state = resumed!.state;

      // New step starts — reset explain
      state = resetExplainForNewStep(state);
      expect(state.explainUsed).toBe(false);

      // New step: Maya types, explain is available again
      state = startPause(state, 20000, false)!;
      state = markTypingDone(state)!;
      const r2 = requestExplain(state, 90);
      expect(r2).not.toBeNull();
      expect(r2!.newXP).toBe(80);
    });
  });

  describe("edge cases", () => {
    test("resume at exact same timestamp as pause start gives 0 bonus", () => {
      let state = startPause(createPauseState(), 10000, false)!;
      state = markTypingDone(state)!;
      const result = resume(state, 10000);
      expect(result!.bonusSeconds).toBe(0);
    });

    test("multiple startPause calls are idempotent", () => {
      const state = startPause(createPauseState(), 10000, false)!;
      // Second pause attempt while already paused
      const second = startPause(state, 15000, false);
      expect(second).toBeNull();
      // Original pause time preserved
      expect(state.pauseStartMs).toBe(10000);
    });

    test("markTypingDone without startPause returns null", () => {
      expect(markTypingDone(createPauseState())).toBeNull();
    });

    test("resume without startPause returns null", () => {
      expect(resume(createPauseState(), 10000)).toBeNull();
    });

    test("requestExplain works even before markTypingDone", () => {
      // Unusual but shouldn't crash
      const state = startPause(createPauseState(), 10000, false)!;
      const result = requestExplain(state, 50);
      expect(result).not.toBeNull();
      expect(result!.state.explainUsed).toBe(true);
    });

    test("XP deduction is exactly EXPLAIN_COST_XP", () => {
      const state = { pauseStartMs: 5000, waitingForContinue: true, explainUsed: false };
      const result = requestExplain(state, 1000);
      expect(result!.newXP).toBe(1000 - EXPLAIN_COST_XP);
    });

    test("events should be queued during entire pause lifecycle", () => {
      let state = createPauseState();
      expect(shouldQueueEvent(state)).toBe(false);

      state = startPause(state, 10000, false)!;
      expect(shouldQueueEvent(state)).toBe(true); // paused, Maya typing

      state = markTypingDone(state)!;
      expect(shouldQueueEvent(state)).toBe(true); // waiting for continue

      // After explain, still paused
      const r = requestExplain(state, 50)!;
      expect(shouldQueueEvent(r.state)).toBe(true); // Maya re-typing

      // After resume, not queued
      state = markTypingDone(r.state)!;
      const resumed = resume(state, 20000)!;
      expect(shouldQueueEvent(resumed.state)).toBe(false);
    });

    test("bonus seconds are fractional for sub-second pauses", () => {
      const state = startPause(createPauseState(), 10000, false)!;
      const result = resume(state, 10333);
      expect(result!.bonusSeconds).toBeCloseTo(0.333, 2);
    });
  });

  describe("splitMayaMessage", () => {
    test("splits on double newlines", () => {
      expect(splitMayaMessage("a\n\nb\n\nc")).toEqual(["a", "b", "c"]);
    });

    test("single paragraph returns one chunk", () => {
      expect(splitMayaMessage("hello world")).toEqual(["hello world"]);
    });

    test("filters empty chunks from extra newlines", () => {
      expect(splitMayaMessage("a\n\n\n\nb")).toEqual(["a", "b"]);
    });

    test("empty string returns empty array", () => {
      expect(splitMayaMessage("")).toEqual([]);
    });

    test("whitespace-only string returns empty array", () => {
      expect(splitMayaMessage("   \n\n   ")).toEqual([]);
    });

    test("preserves single newlines within paragraphs", () => {
      expect(splitMayaMessage("line one\nline two\n\nparagraph two")).toEqual([
        "line one\nline two",
        "paragraph two",
      ]);
    });
  });
});
