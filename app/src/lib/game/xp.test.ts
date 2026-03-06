import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  xpForNextLevel,
  calculateSpeedXP,
  getStreakMultiplier,
  calculateTotalXP,
} from "./xp";

describe("calculateLevel", () => {
  it("returns level 1 at 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("returns level 1 at 299 XP", () => {
    expect(calculateLevel(299)).toBe(1);
  });

  it("returns level 2 at 300 XP", () => {
    expect(calculateLevel(300)).toBe(2);
  });

  it("returns level 3 at 700 XP", () => {
    expect(calculateLevel(700)).toBe(3);
  });

  it("returns level 5 at 2000 XP", () => {
    expect(calculateLevel(2000)).toBe(5);
  });

  it("returns level 12 at 18000 XP", () => {
    expect(calculateLevel(18000)).toBe(12);
  });

  it("stays at level 12 beyond max threshold", () => {
    expect(calculateLevel(99999)).toBe(12);
  });

  it("returns level 1 for negative XP", () => {
    expect(calculateLevel(-100)).toBe(1);
  });
});

describe("xpForNextLevel", () => {
  it("returns correct progress at 0 XP", () => {
    const result = xpForNextLevel(0);
    expect(result.current).toBe(0);
    expect(result.required).toBe(300); // level 1 → 2
    expect(result.progress).toBe(0);
  });

  it("returns correct progress at 150 XP (halfway to level 2)", () => {
    const result = xpForNextLevel(150);
    expect(result.current).toBe(150);
    expect(result.required).toBe(300);
    expect(result.progress).toBe(0.5);
  });

  it("returns correct progress at 300 XP (just hit level 2)", () => {
    const result = xpForNextLevel(300);
    expect(result.current).toBe(0);
    expect(result.required).toBe(400); // 700 - 300 = 400 to level 3
    expect(result.progress).toBe(0);
  });

  it("returns correct progress at 500 XP (mid level 2)", () => {
    const result = xpForNextLevel(500);
    expect(result.current).toBe(200); // 500 - 300
    expect(result.required).toBe(400); // 700 - 300
    expect(result.progress).toBe(0.5);
  });

  it("returns progress 1 at max level", () => {
    const result = xpForNextLevel(18000);
    expect(result.progress).toBe(1);
  });
});

describe("calculateSpeedXP", () => {
  it("returns 0 when over par time", () => {
    expect(calculateSpeedXP(100, 120, 60)).toBe(0);
  });

  it("returns 0 when exactly at par time", () => {
    expect(calculateSpeedXP(100, 60, 60)).toBe(0);
  });

  it("returns max bonus when completed instantly", () => {
    expect(calculateSpeedXP(100, 0, 60)).toBe(50); // 100 * 1.0 * 0.5
  });

  it("returns partial bonus for half par time", () => {
    expect(calculateSpeedXP(100, 30, 60)).toBe(25); // 100 * 0.5 * 0.5
  });

  it("returns correct bonus for 200 base XP", () => {
    expect(calculateSpeedXP(200, 0, 120)).toBe(100); // 200 * 1.0 * 0.5
  });

  it("floors the result", () => {
    // 100 * (1 - 40/60) * 0.5 = 100 * 0.333... * 0.5 = 16.66... → 16
    expect(calculateSpeedXP(100, 40, 60)).toBe(16);
  });
});

describe("getStreakMultiplier", () => {
  it("returns 1.0x for streak 0", () => {
    const r = getStreakMultiplier(0);
    expect(r.multiplier).toBe(1.0);
    expect(r.label).toBeNull();
  });

  it("returns 1.0x for streak 1", () => {
    const r = getStreakMultiplier(1);
    expect(r.multiplier).toBe(1.0);
    expect(r.label).toBeNull();
  });

  it("returns 1.2x SHARP for streak 2", () => {
    const r = getStreakMultiplier(2);
    expect(r.multiplier).toBe(1.2);
    expect(r.label).toBe("SHARP");
  });

  it("returns 1.4x ON FIRE for streak 3", () => {
    const r = getStreakMultiplier(3);
    expect(r.multiplier).toBe(1.4);
    expect(r.label).toBe("ON FIRE");
  });

  it("returns 1.7x CRACKING for streak 4", () => {
    const r = getStreakMultiplier(4);
    expect(r.multiplier).toBe(1.7);
    expect(r.label).toBe("CRACKING");
  });

  it("returns 2.0x GHOST MODE for streak 5", () => {
    const r = getStreakMultiplier(5);
    expect(r.multiplier).toBe(2.0);
    expect(r.label).toBe("GHOST MODE");
  });

  it("returns 2.0x GHOST MODE for streak > 5", () => {
    const r = getStreakMultiplier(10);
    expect(r.multiplier).toBe(2.0);
    expect(r.label).toBe("GHOST MODE");
  });
});

describe("calculateTotalXP", () => {
  it("returns base XP with no bonuses", () => {
    expect(calculateTotalXP(100, false, 0, 1.0)).toBe(100);
  });

  it("adds first-try bonus (50% of base)", () => {
    expect(calculateTotalXP(100, true, 0, 1.0)).toBe(150);
  });

  it("adds speed bonus", () => {
    expect(calculateTotalXP(100, false, 25, 1.0)).toBe(125);
  });

  it("adds both first-try and speed bonus", () => {
    expect(calculateTotalXP(100, true, 25, 1.0)).toBe(175);
  });

  it("applies streak multiplier", () => {
    expect(calculateTotalXP(100, false, 0, 2.0)).toBe(200);
  });

  it("applies everything together", () => {
    // base 100 + first-try 50 + speed 25 = 175 * 1.4 = 244.999... → 244
    expect(calculateTotalXP(100, true, 25, 1.4)).toBe(244);
  });

  it("floors the result", () => {
    // 100 * 1.3 = 130
    expect(calculateTotalXP(100, false, 0, 1.3)).toBe(130);
    // 150 * 1.7 = 255
    expect(calculateTotalXP(100, true, 0, 1.7)).toBe(255);
  });
});
