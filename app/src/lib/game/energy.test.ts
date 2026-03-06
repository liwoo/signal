import { describe, it, expect } from "vitest";
import {
  getMaxEnergy,
  getAttemptCost,
  getHintCost,
  calculateRegen,
  getEnergyState,
} from "./energy";

describe("getMaxEnergy", () => {
  it("returns 100 without extra capacity", () => {
    expect(getMaxEnergy(false)).toBe(100);
  });

  it("returns 150 with extra capacity", () => {
    expect(getMaxEnergy(true)).toBe(150);
  });
});

describe("getAttemptCost", () => {
  it("returns 0 for first attempt", () => {
    expect(getAttemptCost(1)).toBe(0);
  });

  it("returns 0 for attempt 0 (edge case)", () => {
    expect(getAttemptCost(0)).toBe(0);
  });

  it("returns 5 for second attempt", () => {
    expect(getAttemptCost(2)).toBe(5);
  });

  it("returns 10 for third attempt", () => {
    expect(getAttemptCost(3)).toBe(10);
  });

  it("returns 15 for fourth attempt", () => {
    expect(getAttemptCost(4)).toBe(15);
  });

  it("returns 15 for fifth+ attempt", () => {
    expect(getAttemptCost(5)).toBe(15);
    expect(getAttemptCost(10)).toBe(15);
  });
});

describe("getHintCost", () => {
  it("returns 8 for level 1 hint", () => {
    expect(getHintCost(1)).toBe(8);
  });

  it("returns 12 for level 2 hint", () => {
    expect(getHintCost(2)).toBe(12);
  });

  it("returns 20 for level 3 hint", () => {
    expect(getHintCost(3)).toBe(20);
  });
});

describe("calculateRegen", () => {
  it("returns current energy when no time has passed", () => {
    expect(calculateRegen(50, 100, 0)).toBe(50);
  });

  it("regenerates 5 per minute", () => {
    expect(calculateRegen(50, 100, 60_000)).toBe(55);
  });

  it("regenerates 10 in 2 minutes", () => {
    expect(calculateRegen(50, 100, 120_000)).toBe(60);
  });

  it("caps at max energy", () => {
    expect(calculateRegen(95, 100, 120_000)).toBe(100);
  });

  it("caps at extended max energy", () => {
    expect(calculateRegen(145, 150, 120_000)).toBe(150);
  });

  it("handles partial minutes (floors regen)", () => {
    // 30 seconds = 0.5 minutes * 5 = 2.5 → floor to 2
    expect(calculateRegen(50, 100, 30_000)).toBe(52);
  });

  it("handles 0 current energy", () => {
    expect(calculateRegen(0, 100, 60_000)).toBe(5);
  });
});

describe("getEnergyState", () => {
  it("returns 'dead' at 0 energy", () => {
    expect(getEnergyState(0, 100)).toBe("dead");
  });

  it("returns 'critical' at 15% or below", () => {
    expect(getEnergyState(15, 100)).toBe("critical");
    expect(getEnergyState(10, 100)).toBe("critical");
    expect(getEnergyState(1, 100)).toBe("critical");
  });

  it("returns 'warning' at 16-30%", () => {
    expect(getEnergyState(16, 100)).toBe("warning");
    expect(getEnergyState(30, 100)).toBe("warning");
    expect(getEnergyState(20, 100)).toBe("warning");
  });

  it("returns 'normal' above 30%", () => {
    expect(getEnergyState(31, 100)).toBe("normal");
    expect(getEnergyState(50, 100)).toBe("normal");
    expect(getEnergyState(100, 100)).toBe("normal");
  });

  it("works with extended max (150)", () => {
    expect(getEnergyState(0, 150)).toBe("dead");
    expect(getEnergyState(22, 150)).toBe("critical"); // 22/150 = 14.6%
    expect(getEnergyState(23, 150)).toBe("warning"); // 23/150 = 15.3%
    expect(getEnergyState(45, 150)).toBe("warning"); // 45/150 = 30%
    expect(getEnergyState(46, 150)).toBe("normal"); // 46/150 = 30.6%
  });
});
