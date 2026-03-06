import { describe, test, expect } from "vitest";
import {
  calculateTimeRemaining,
  isTimeExpired,
  createJeopardyState,
  applyJeopardyEvent,
  scrambleCode,
  calculateRetryPenalties,
} from "./jeopardy";

// ── Timer ──

describe("calculateTimeRemaining", () => {
  test("full time at start", () => {
    expect(calculateTimeRemaining(1000, 1000, 120, 0)).toBe(120);
  });

  test("decreases as time passes", () => {
    expect(calculateTimeRemaining(0, 60_000, 120, 0)).toBe(60);
  });

  test("includes bonus seconds", () => {
    expect(calculateTimeRemaining(0, 120_000, 120, 30)).toBe(30);
  });

  test("never goes below zero", () => {
    expect(calculateTimeRemaining(0, 999_000, 120, 0)).toBe(0);
  });
});

describe("isTimeExpired", () => {
  test("not expired at start", () => {
    expect(isTimeExpired(0, 0, 120, 0)).toBe(false);
  });

  test("expired when time exceeds limit", () => {
    expect(isTimeExpired(0, 121_000, 120, 0)).toBe(true);
  });

  test("bonus seconds delay expiry", () => {
    expect(isTimeExpired(0, 121_000, 120, 30)).toBe(false);
    expect(isTimeExpired(0, 151_000, 120, 30)).toBe(true);
  });
});

// ── Jeopardy Events ──

describe("applyJeopardyEvent", () => {
  test("guard_entered locks chat for 60s", () => {
    const state = createJeopardyState();
    const now = 10_000;
    const result = applyJeopardyEvent(state, "guard_entered", now);

    expect(result.jeopardy.chatLocked).toBe(true);
    expect(result.jeopardy.chatLockUntilMs).toBe(70_000);
    expect(result.energyDelta).toBe(0);
    expect(result.message).toContain("guard");
  });

  test("power_reduced narrows editor", () => {
    const state = createJeopardyState();
    const result = applyJeopardyEvent(state, "power_reduced", 0);

    expect(result.jeopardy.editorNarrow).toBe(true);
    expect(result.jeopardy.lineNumbersHidden).toBe(true);
  });

  test("signal_scramble activates", () => {
    const state = createJeopardyState();
    const result = applyJeopardyEvent(state, "signal_scramble", 0);

    expect(result.jeopardy.scrambleActive).toBe(true);
  });

  test("energy_drain returns -20 delta", () => {
    const state = createJeopardyState();
    const result = applyJeopardyEvent(state, "energy_drain", 0);

    expect(result.energyDelta).toBe(-20);
  });

  test("hint_burned returns 1 burned hint", () => {
    const state = createJeopardyState();
    const result = applyJeopardyEvent(state, "hint_burned", 0);

    expect(result.hintsBurned).toBe(1);
  });

  test("effects accumulate", () => {
    let state = createJeopardyState();
    state = applyJeopardyEvent(state, "guard_entered", 0).jeopardy;
    const result = applyJeopardyEvent(state, "power_reduced", 0);

    expect(result.jeopardy.activeEffects).toEqual(["guard_entered", "power_reduced"]);
    expect(result.jeopardy.chatLocked).toBe(true);
    expect(result.jeopardy.editorNarrow).toBe(true);
  });
});

// ── Scramble ──

describe("scrambleCode", () => {
  test("replaces characters with block character", () => {
    const result = scrambleCode("hello world", 3);
    const blocks = (result.match(/\u2588/g) || []).length;
    expect(blocks).toBe(3);
    expect(result.length).toBe("hello world".length);
  });

  test("does not scramble whitespace", () => {
    const result = scrambleCode("a b c", 10);
    // Spaces should remain
    expect(result[1]).toBe(" ");
    expect(result[3]).toBe(" ");
  });

  test("handles short strings", () => {
    expect(scrambleCode("", 3)).toBe("");
    expect(scrambleCode("a", 3)).toBe("a");
  });

  test("handles count larger than candidates", () => {
    const result = scrambleCode("abcde", 10);
    const blocks = (result.match(/\u2588/g) || []).length;
    expect(blocks).toBe(5);
  });
});

// ── Retry Penalties ──

describe("calculateRetryPenalties", () => {
  test("carries over effects", () => {
    const result = calculateRetryPenalties(["guard_entered", "power_reduced"]);
    expect(result.carryoverEffects).toEqual(["guard_entered", "power_reduced"]);
    expect(result.speedBonusAvailable).toBe(false);
    expect(result.startingEnergyPct).toBe(0.3);
  });

  test("no speed bonus on retry", () => {
    const result = calculateRetryPenalties([]);
    expect(result.speedBonusAvailable).toBe(false);
  });
});
