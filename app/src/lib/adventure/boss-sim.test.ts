import { describe, it, expect } from "vitest";
import {
  createBossFight, stepBossFight, armWeapon, canFire, currentPhase,
  bossFightXP, bossHpFraction, telegraphProgress, drainBossEvents, ARM_GRACE_MS,
} from "./boss-sim";
import type { AdventureLevel, BossFightState, WeaponConfig } from "./types";

const WEAPON: WeaponConfig = { damage: 50, fireRateMs: 100, range: 10 };

function makeLevel(): AdventureLevel {
  return {
    id: "test-boss",
    title: "TEST",
    subtitle: "",
    location: "",
    theme: "boss",
    // #########
    // #m.....L#
    // #.......#
    // #...h...#
    // #########
    map: [
      "#########",
      "#m.....L#",
      "#.......#",
      "#...h...#",
      "#########",
    ],
    guards: [],
    objectives: [],
    ending: "relinquish",
    boss: {
      name: "TESTMASTER",
      hp: 100,
      anchor: "lockmaster-1",
      attackMinMs: 4000,
      attackMaxMs: 6000,
      telegraphMs: 800,
      projectileSpeed: 8,
      blastRadius: 1.2,
      defeatXP: 500,
      perPhaseXP: 100,
      flawlessBonus: 250,
      phases: [
        { id: "p0", floor: 66, stake: "arm", brief: "", starterCode: "", expectedOutput: "", weapon: WEAPON, hint: "" },
        { id: "p1", floor: 33, stake: "re", brief: "", starterCode: "", expectedOutput: "", weapon: WEAPON, hint: "" },
        { id: "p2", floor: 0, stake: "kill", brief: "", starterCode: "", expectedOutput: "", weapon: WEAPON, hint: "" },
      ],
    },
  };
}

/** Walk Maya onto a tile centre and step so her `hidden` flag updates. */
function placeOn(state: BossFightState, x: number, y: number): void {
  state.maya.x = x + 0.5;
  state.maya.y = y + 0.5;
}

describe("createBossFight", () => {
  it("sets up HP, phase and boss position from the anchor", () => {
    const s = createBossFight(makeLevel(), 3);
    expect(s.boss.hp).toBe(100);
    expect(s.boss.maxHp).toBe(100);
    expect(s.boss.armed).toBe(false);
    expect(s.boss.phaseIndex).toBe(0);
    expect(s.bossPos).toEqual({ x: 7.5, y: 1.5 });
    expect(s.maya.x).toBe(1.5);
    expect(s.hearts).toBe(3);
    expect(s.status).toBe("fighting");
  });

  it("throws without a boss def", () => {
    const lvl = makeLevel();
    delete lvl.boss;
    expect(() => createBossFight(lvl, 3)).toThrow();
  });
});

describe("cover → coding", () => {
  it("drops into coding when Maya reaches cover while un-armed", () => {
    let s = createBossFight(makeLevel(), 3);
    placeOn(s, 4, 3); // the hide tile
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.status).toBe("coding");
    expect(drainBossEvents(s).some((e) => e.type === "enter-cover")).toBe(true);
  });

  it("freezes the sim while coding (time still advances, nothing else moves)", () => {
    let s = createBossFight(makeLevel(), 3);
    placeOn(s, 4, 3);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    const hp = s.boss.hp;
    s = stepBossFight(s, { move: { x: 1, y: 0 } }, 16);
    expect(s.status).toBe("coding");
    expect(s.boss.hp).toBe(hp);
    expect(s.maya.x).toBe(4.5); // did not move
  });
});

describe("armWeapon", () => {
  it("arms the weapon and resumes the fight with a grace window", () => {
    let s = createBossFight(makeLevel(), 3);
    placeOn(s, 4, 3);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.status).toBe("coding");
    s = armWeapon(s, WEAPON);
    expect(s.status).toBe("fighting");
    expect(s.boss.armed).toBe(true);
    expect(s.boss.weapon).toEqual(WEAPON);
    expect(s.boss.nextAttackAt).toBe(s.time + ARM_GRACE_MS);
    expect(drainBossEvents(s).some((e) => e.type === "phase-armed")).toBe(true);
  });
});

describe("weapon fire + phase gates", () => {
  it("fires at the boss with line of sight and drains to the phase floor, then hardens", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, WEAPON); // arm phase 0 directly
    expect(canFire(s)).toBe(true);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    // 100 - 50 = 50, clamped up to floor 66 → hardens into phase 1.
    expect(s.boss.hp).toBe(66);
    expect(s.boss.armed).toBe(false);
    expect(s.boss.phaseIndex).toBe(1);
  });

  it("cannot fire from cover or without line of sight", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, WEAPON);
    placeOn(s, 4, 3); // on cover → hidden
    s.maya.hidden = true;
    expect(canFire(s)).toBe(false);
  });

  it("cannot fire beyond range", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, { ...WEAPON, range: 2 });
    expect(canFire(s)).toBe(false); // ~6 tiles away
  });

  it("wins when the last phase floor (0) is reached", () => {
    let s = createBossFight(makeLevel(), 3);
    // Phase 0: 100→66
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.boss.phaseIndex).toBe(1);
    // Phase 1: 66→33
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.boss.phaseIndex).toBe(2);
    // Phase 2: 33→0 over one shot (damage 50 clamps to 0)
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.boss.hp).toBe(0);
    expect(s.status).toBe("won");
  });
});

describe("boss attacks + dodging", () => {
  it("telegraphs then fires a projectile at Maya's position", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, { ...WEAPON, range: 0 }); // keep the fight alive without draining HP
    s.boss.nextAttackAt = s.time; // attack now
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.boss.telegraphUntil).toBeGreaterThan(0); // boss is charging
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 50);
    expect(telegraphProgress(s)).toBeGreaterThan(0);
    // Advance past the telegraph window (800ms) until the shot launches.
    for (let i = 0; i < 40 && s.projectiles.length === 0; i++) {
      s = stepBossFight(s, { move: { x: 0, y: 0 } }, 50);
    }
    expect(s.projectiles.length).toBeGreaterThan(0);
  });

  it("costs a heart when a shot lands on a stationary Maya", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, { ...WEAPON, range: 0 });
    s.boss.nextAttackAt = s.time;
    // Run ~3s of frames without moving → a shot should land on her.
    for (let i = 0; i < 200 && s.hearts === 3; i++) {
      s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    }
    expect(s.hearts).toBe(2);
  });

  it("loses when hearts reach zero", () => {
    let s = createBossFight(makeLevel(), 1);
    s = armWeapon(s, { ...WEAPON, range: 0 });
    s.boss.nextAttackAt = s.time;
    for (let i = 0; i < 400 && s.status === "fighting"; i++) {
      s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    }
    expect(s.status).toBe("lost");
    expect(s.hearts).toBe(0);
  });
});

describe("xp + helpers", () => {
  it("awards defeat + phase + flawless XP on a clean win", () => {
    let s = createBossFight(makeLevel(), 3);
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    s = armWeapon(s, WEAPON);
    s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
    expect(s.status).toBe("won");
    const xp = bossFightXP(s);
    expect(xp.defeatBonus).toBe(500);
    expect(xp.phaseXP).toBe(300); // 3 phases × 100
    expect(xp.flawlessBonus).toBe(250);
    expect(xp.total).toBe(1050);
  });

  it("reports HP fraction and current phase", () => {
    const s = createBossFight(makeLevel(), 3);
    expect(bossHpFraction(s)).toBe(1);
    expect(currentPhase(s)?.id).toBe("p0");
  });
});
