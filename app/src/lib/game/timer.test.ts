import { describe, it, expect } from "vitest";
import {
  mainTimeRemaining,
  isMainTimerExpired,
  resolveRushExpiry,
  timerTick,
} from "./timer";
import type { RushConfig } from "@/types/game";

// ── helpers ──

const SEC = 1000; // ms

const rushConfig: RushConfig = {
  durationSeconds: 15,
  label: "GUARD APPROACHING",
  onExpiry: "guard_entered",
  bonusTimeSeconds: 30,
};

// ── mainTimeRemaining ──

describe("mainTimeRemaining", () => {
  it("returns full time at game start", () => {
    const start = 10_000;
    expect(mainTimeRemaining(start, start, 120, 0)).toBe(120);
  });

  it("counts down correctly", () => {
    const start = 0;
    expect(mainTimeRemaining(start, 30 * SEC, 120, 0)).toBe(90);
  });

  it("includes bonus seconds", () => {
    const start = 0;
    // 120s limit + 30s bonus, 100s elapsed → 50s left
    expect(mainTimeRemaining(start, 100 * SEC, 120, 30)).toBe(50);
  });

  it("goes negative when expired", () => {
    const start = 0;
    expect(mainTimeRemaining(start, 130 * SEC, 120, 0)).toBe(-10);
  });

  it("handles fractional milliseconds", () => {
    const start = 0;
    const remaining = mainTimeRemaining(start, 500, 120, 0);
    expect(remaining).toBeCloseTo(119.5);
  });
});

// ── isMainTimerExpired ──

describe("isMainTimerExpired", () => {
  it("false when time remains", () => {
    expect(isMainTimerExpired(0, 60 * SEC, 120, 0)).toBe(false);
  });

  it("true at exactly zero", () => {
    expect(isMainTimerExpired(0, 120 * SEC, 120, 0)).toBe(true);
  });

  it("true when past zero", () => {
    expect(isMainTimerExpired(0, 150 * SEC, 120, 0)).toBe(true);
  });

  it("bonus seconds delay expiry", () => {
    // 120s limit + 30s bonus = 150s total
    expect(isMainTimerExpired(0, 140 * SEC, 120, 30)).toBe(false);
    expect(isMainTimerExpired(0, 150 * SEC, 120, 30)).toBe(true);
  });
});

// ── timerTick ──

describe("timerTick", () => {
  it("returns remaining and not expired mid-game", () => {
    const result = timerTick(0, 60 * SEC, 120, 0);
    expect(result.remaining).toBe(60);
    expect(result.expired).toBe(false);
  });

  it("clamps remaining to zero (never negative)", () => {
    const result = timerTick(0, 200 * SEC, 120, 0);
    expect(result.remaining).toBe(0);
    expect(result.expired).toBe(true);
  });

  it("includes bonus in calculation", () => {
    const result = timerTick(0, 130 * SEC, 120, 30);
    expect(result.remaining).toBe(20);
    expect(result.expired).toBe(false);
  });
});

// ── resolveRushExpiry ──

describe("resolveRushExpiry", () => {
  it("returns jeopardy effect from rush config", () => {
    const result = resolveRushExpiry(rushConfig, 0, 60 * SEC, 120, 0);
    expect(result.jeopardyEffect).toBe("guard_entered");
  });

  it("main timer still alive after rush expires", () => {
    // 120s limit, rush ends at 60s → 60s left on main
    const result = resolveRushExpiry(rushConfig, 0, 60 * SEC, 120, 0);
    expect(result.mainTimerExpired).toBe(false);
  });

  it("main timer expired during rush — the critical case", () => {
    // 120s main timer started at 0, rush ends at 130s → main died 10s ago
    const result = resolveRushExpiry(rushConfig, 0, 130 * SEC, 120, 0);
    expect(result.mainTimerExpired).toBe(true);
  });

  it("main timer expires at exact moment rush ends", () => {
    // 120s main, rush ends exactly at 120s
    const result = resolveRushExpiry(rushConfig, 0, 120 * SEC, 120, 0);
    expect(result.mainTimerExpired).toBe(true);
  });

  it("bonus time from earlier rush keeps main alive", () => {
    // 120s limit + 30s bonus from a previous rush = 150s total
    // Rush ends at 140s → 10s still left
    const result = resolveRushExpiry(rushConfig, 0, 140 * SEC, 120, 30);
    expect(result.mainTimerExpired).toBe(false);
  });

  it("bonus time not enough — main still expired", () => {
    // 120s + 30s bonus = 150s total, rush ends at 160s
    const result = resolveRushExpiry(rushConfig, 0, 160 * SEC, 120, 30);
    expect(result.mainTimerExpired).toBe(true);
  });

  it("uses the rush config's specific onExpiry effect", () => {
    const customRush: RushConfig = {
      durationSeconds: 10,
      label: "POWER SURGE",
      onExpiry: "power_reduced",
      bonusTimeSeconds: 20,
    };
    const result = resolveRushExpiry(customRush, 0, 50 * SEC, 120, 0);
    expect(result.jeopardyEffect).toBe("power_reduced");
  });
});

// ── scenario: full timeline ──

describe("full timeline scenarios", () => {
  it("rush starts mid-game, main expires during rush, captured on rush end", () => {
    const mainLimit = 90; // 90s level
    const start = 0;

    // t=50s: rush starts (15s duration). Main has 40s left.
    const atRushStart = 50 * SEC;
    expect(mainTimeRemaining(start, atRushStart, mainLimit, 0)).toBe(40);

    // t=65s: rush would end naturally (50 + 15). Main has 25s left — still alive.
    // But player is slow...

    // t=95s: player fails rush at this point. Main died at t=90s.
    const atRushEnd = 95 * SEC;
    const result = resolveRushExpiry(rushConfig, start, atRushEnd, mainLimit, 0);
    expect(result.mainTimerExpired).toBe(true);
    expect(result.jeopardyEffect).toBe("guard_entered");
  });

  it("rush completed (not expired) grants bonus, extending main timer", () => {
    const mainLimit = 90;
    const start = 0;

    // t=50s: rush starts. Player completes rush at t=58s → bonus +30s
    // New effective limit = 90 + 30 = 120s
    const bonusAfterRush = 30;

    // t=100s: still playing. Without bonus would be dead (90s). With bonus, 20s left.
    expect(mainTimeRemaining(start, 100 * SEC, mainLimit, bonusAfterRush)).toBe(20);
    expect(isMainTimerExpired(start, 100 * SEC, mainLimit, bonusAfterRush)).toBe(false);

    // t=120s: now it's over
    expect(isMainTimerExpired(start, 120 * SEC, mainLimit, bonusAfterRush)).toBe(true);
  });

  it("multiple bonus accumulations from successive rushes", () => {
    const mainLimit = 60;
    const start = 0;

    // Rush 1 completed at t=20s → +30s bonus (total bonus=30, effective=90s)
    // Rush 2 completed at t=50s → +30s bonus (total bonus=60, effective=120s)
    const totalBonus = 60;

    // t=100s: 20s left
    expect(mainTimeRemaining(start, 100 * SEC, mainLimit, totalBonus)).toBe(20);

    // t=119s: 1s left
    expect(mainTimeRemaining(start, 119 * SEC, mainLimit, totalBonus)).toBe(1);
    expect(isMainTimerExpired(start, 119 * SEC, mainLimit, totalBonus)).toBe(false);

    // t=120s: expired
    expect(isMainTimerExpired(start, 120 * SEC, mainLimit, totalBonus)).toBe(true);
  });

  it("rush expires with main barely alive — no capture", () => {
    const mainLimit = 120;
    const start = 0;

    // Rush ends at t=119s → main has 1s left, NOT expired
    const result = resolveRushExpiry(rushConfig, start, 119 * SEC, mainLimit, 0);
    expect(result.mainTimerExpired).toBe(false);

    // But the very next tick at t=120s would expire
    const tick = timerTick(start, 120 * SEC, mainLimit, 0);
    expect(tick.expired).toBe(true);
    expect(tick.remaining).toBe(0);
  });
});
