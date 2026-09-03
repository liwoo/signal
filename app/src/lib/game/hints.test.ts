import { describe, it, expect } from "vitest";
import {
  createHintState,
  isStuck,
  nextHint,
  revealNextHint,
  markOffered,
  hintCostXP,
  STUCK_ATTEMPTS,
  STUCK_AFTER_MS,
} from "./hints";
import type { ChallengeHint } from "@/types/game";

const HINTS: ChallengeHint[] = [
  { level: 1, text: "one", energyCost: 8 },
  { level: 2, text: "two", energyCost: 12 },
  { level: 3, text: "three", energyCost: 20 },
];

describe("hints", () => {
  it("starts with nothing revealed and no offer made", () => {
    expect(createHintState()).toEqual({ revealed: 0, offered: false });
  });

  it("detects stuck by attempts or by idle time", () => {
    expect(isStuck(0, 0)).toBe(false);
    expect(isStuck(STUCK_ATTEMPTS - 1, STUCK_AFTER_MS - 1)).toBe(false);
    expect(isStuck(STUCK_ATTEMPTS, 0)).toBe(true);
    expect(isStuck(0, STUCK_AFTER_MS)).toBe(true);
  });

  it("reveals hints one at a time and charges XP", () => {
    let state = createHintState();
    expect(nextHint(HINTS, state)?.level).toBe(1);

    let r = revealNextHint(HINTS, state, 100);
    expect(r.hint?.level).toBe(1);
    expect(r.xp).toBe(92);
    state = r.state;

    r = revealNextHint(HINTS, state, r.xp);
    expect(r.hint?.level).toBe(2);
    expect(r.xp).toBe(80);
    state = r.state;

    r = revealNextHint(HINTS, state, r.xp);
    expect(r.hint?.level).toBe(3);
    expect(r.xp).toBe(60);
    state = r.state;

    expect(nextHint(HINTS, state)).toBeNull();
    const done = revealNextHint(HINTS, state, 60);
    expect(done.hint).toBeNull();
    expect(done.state).toBe(state);
    expect(done.xp).toBe(60);
  });

  it("never drives XP below zero", () => {
    const r = revealNextHint(HINTS, createHintState(), 3);
    expect(r.xp).toBe(0);
  });

  it("prices hints by their authored cost", () => {
    expect(hintCostXP(HINTS[2])).toBe(20);
  });

  it("marks the offer once", () => {
    const a = markOffered(createHintState());
    expect(a.offered).toBe(true);
    expect(markOffered(a)).toBe(a);
  });
});
