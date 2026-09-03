import { describe, it, expect } from "vitest";
import { buildReward } from "./reward";

describe("buildReward", () => {
  it("totals base + first-try + speed + zen and lists badges in order", () => {
    const r = buildReward({ stepTitle: "SCAFFOLD", stepIndex: 0, totalSteps: 2, base: 40, firstTry: true, speedXP: 12, zenXP: 5 });
    expect(r.breakdown).toEqual({ base: 40, firstTry: 20, speed: 12, zen: 5, total: 77 });
    expect(r.badges).toEqual(["FIRST TRY +20", "SPEED +12", "ZEN +5"]);
    expect(r.title).toBe("STEP CLEAR");
    expect(r.subtitle).toBe("SCAFFOLD · 1/2");
    expect(r.chapterClear).toBe(false);
  });

  it("marks the last step as a chapter clear and omits empty badges", () => {
    const r = buildReward({ stepTitle: "TRANSMIT", stepIndex: 1, totalSteps: 2, base: 60, firstTry: false, speedXP: 0, zenXP: 0 });
    expect(r.title).toBe("CHAPTER CLEAR");
    expect(r.chapterClear).toBe(true);
    expect(r.badges).toEqual([]);
    expect(r.breakdown.total).toBe(60);
  });
});
