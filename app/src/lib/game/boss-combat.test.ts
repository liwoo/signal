import { describe, test, expect } from "vitest";
import {
  createBossCombatState,
  getCurrentTurn,
  startTelegraph,
  startPlayerWindow,
  updateTabCode,
  buildSource,
  checkOutput,
  resolveTurnHit,
  resolveTurnMiss,
  advanceAfterResult,
  calculateBossXP,
  isBossDefeated,
  isFightOver,
  getTotalDamageDealt,
  getHitCount,
  getMissCount,
} from "./boss-combat";
import type { BossFightConfig, BossTurn, BossTab } from "@/types/game";

// ── Test fixtures ──

const TABS: BossTab[] = [
  {
    id: "aim",
    filename: "aim.go",
    label: "AIM",
    starterCode: `func Aim(sector int) (int, int) {\n\treturn 0, 0\n}`,
    functionSignature: "func Aim(sector int) (int, int)",
  },
  {
    id: "load",
    filename: "load.go",
    label: "LOAD",
    starterCode: `func Load(threat string) []string {\n\treturn []string{}\n}`,
    functionSignature: "func Load(threat string) []string",
  },
  {
    id: "fire",
    filename: "fire.go",
    label: "FIRE",
    starterCode: `func Fire(x, y int, ammo []string) string {\n\treturn ""\n}`,
    functionSignature: "func Fire(x, y int, ammo []string) string",
  },
];

const TURNS: BossTurn[] = [
  {
    id: 1,
    telegraph: "LOCKMASTER activating sector 3 lock...",
    hint: "aim at sector 3",
    activeTab: "aim",
    windowSeconds: 10,
    testHarness: `func main() {\n\tx, y := Aim(3)\n\tfmt.Println(x, y)\n}`,
    expectedOutput: "384 160",
    damage: 20,
    bossCharge: "charge-sector",
    hitEffect: "node-explode",
    missEffect: "emp-hit",
  },
  {
    id: 2,
    telegraph: "LOCKMASTER deploying SHIELD ARRAY",
    hint: "load piercing rounds",
    activeTab: "load",
    windowSeconds: 9,
    testHarness: `func main() {\n\tammo := Load("shield")\n\tfmt.Println(ammo)\n}`,
    expectedOutput: "[pierce pierce pierce]",
    damage: 15,
    bossCharge: "shield-deploy",
    hitEffect: "shield-shatter",
    missEffect: "reflect-blast",
  },
  {
    id: 3,
    telegraph: "LOCKMASTER core EXPOSED at sector 7!",
    hint: "aim fast",
    activeTab: "aim",
    windowSeconds: 8,
    testHarness: `func main() {\n\tx, y := Aim(7)\n\tfmt.Println(x, y)\n}`,
    expectedOutput: "128 480",
    damage: 20,
    bossCharge: "core-expose",
    hitEffect: "core-hit",
    missEffect: "counter-attack",
  },
];

const CONFIG: BossFightConfig = {
  bossName: "LOCKMASTER",
  bossHP: 100,
  tabs: TABS,
  turns: TURNS,
  defeatXP: 500,
  survivalXP: 200,
  retreatThreshold: 30,
  perHitXP: 50,
  flawlessBonus: 250,
  speedBonus: 150,
};

// ── createBossCombatState ──

describe("createBossCombatState", () => {
  test("initializes with correct defaults", () => {
    const state = createBossCombatState(CONFIG);
    expect(state.phase).toBe("ready");
    expect(state.bossHP).toBe(100);
    expect(state.turnIndex).toBe(0);
    expect(state.heartsLost).toBe(0);
    expect(state.turnResults).toEqual([]);
  });

  test("populates tab code from starter code", () => {
    const state = createBossCombatState(CONFIG);
    expect(state.tabCode["aim"]).toContain("func Aim");
    expect(state.tabCode["load"]).toContain("func Load");
    expect(state.tabCode["fire"]).toContain("func Fire");
  });
});

// ── getCurrentTurn ──

describe("getCurrentTurn", () => {
  test("returns turn at current index", () => {
    const state = createBossCombatState(CONFIG);
    const turn = getCurrentTurn(CONFIG, state);
    expect(turn?.id).toBe(1);
  });

  test("returns null when all turns exhausted", () => {
    const state = { ...createBossCombatState(CONFIG), turnIndex: 3 };
    expect(getCurrentTurn(CONFIG, state)).toBeNull();
  });
});

// ── Phase transitions ──

describe("phase transitions", () => {
  test("startTelegraph sets phase", () => {
    const state = createBossCombatState(CONFIG);
    expect(startTelegraph(state).phase).toBe("telegraph");
  });

  test("startPlayerWindow sets phase and timestamp", () => {
    const state = startTelegraph(createBossCombatState(CONFIG));
    const result = startPlayerWindow(state, 1000);
    expect(result.phase).toBe("player_window");
    expect(result.turnStartMs).toBe(1000);
  });
});

// ── updateTabCode ──

describe("updateTabCode", () => {
  test("updates specific tab code immutably", () => {
    const state = createBossCombatState(CONFIG);
    const updated = updateTabCode(state, "aim", "func Aim(sector int) (int, int) { return 384, 160 }");
    expect(updated.tabCode["aim"]).toContain("384, 160");
    // Original unchanged
    expect(state.tabCode["aim"]).not.toContain("384, 160");
    // Other tabs unchanged
    expect(updated.tabCode["load"]).toBe(state.tabCode["load"]);
  });
});

// ── buildSource ──

describe("buildSource", () => {
  test("concatenates package, imports, tab code, and harness", () => {
    const state = createBossCombatState(CONFIG);
    const source = buildSource(CONFIG, state, TURNS[0]);
    expect(source).toContain("package main");
    expect(source).toContain(`import "fmt"`);
    expect(source).toContain("func Aim");
    expect(source).toContain("func Load");
    expect(source).toContain("func Fire");
    expect(source).toContain("func main()");
  });

  test("strips duplicate package/import from tab code", () => {
    const state = updateTabCode(
      createBossCombatState(CONFIG),
      "aim",
      `package main\nimport "fmt"\nfunc Aim(sector int) (int, int) { return 1, 2 }`
    );
    const source = buildSource(CONFIG, state, TURNS[0]);
    // Should only have one package declaration
    const pkgCount = (source.match(/package main/g) || []).length;
    expect(pkgCount).toBe(1);
  });

  test("uses updated tab code, not starter code", () => {
    const state = updateTabCode(
      createBossCombatState(CONFIG),
      "aim",
      "func Aim(sector int) (int, int) { return 384, 160 }"
    );
    const source = buildSource(CONFIG, state, TURNS[0]);
    expect(source).toContain("return 384, 160");
  });
});

// ── checkOutput ──

describe("checkOutput", () => {
  test("matches exact output", () => {
    expect(checkOutput("384 160", "384 160")).toBe(true);
  });

  test("trims whitespace", () => {
    expect(checkOutput("384 160\n", "384 160")).toBe(true);
    expect(checkOutput("  384 160  ", "384 160")).toBe(true);
  });

  test("rejects wrong output", () => {
    expect(checkOutput("0 0", "384 160")).toBe(false);
  });

  test("handles multi-line output", () => {
    expect(checkOutput("448 544\n[pulse]\nHIT", "448 544\n[pulse]\nHIT")).toBe(true);
  });
});

// ── resolveTurnHit ──

describe("resolveTurnHit", () => {
  test("deals damage and advances turn", () => {
    const state = startPlayerWindow(
      startTelegraph(createBossCombatState(CONFIG)),
      1000
    );
    const { state: next, outcome } = resolveTurnHit(CONFIG, state, TURNS[0], 3000);
    expect(outcome).toBe("hit");
    expect(next.bossHP).toBe(80); // 100 - 20
    expect(next.turnIndex).toBe(1);
    expect(next.turnResults).toHaveLength(1);
    expect(next.turnResults[0].outcome).toBe("hit");
    expect(next.turnResults[0].damageDealt).toBe(20);
  });

  test("sets victory when boss HP reaches 0", () => {
    const state = { ...createBossCombatState(CONFIG), bossHP: 15 };
    const { state: next } = resolveTurnHit(CONFIG, state, TURNS[1], 2000);
    expect(next.bossHP).toBe(0);
    expect(next.phase).toBe("victory");
  });

  test("sets victory when overkill", () => {
    const state = { ...createBossCombatState(CONFIG), bossHP: 5 };
    const { state: next } = resolveTurnHit(CONFIG, state, TURNS[0], 2000);
    expect(next.bossHP).toBe(0); // clamped
    expect(next.phase).toBe("victory");
  });
});

// ── resolveTurnMiss ──

describe("resolveTurnMiss", () => {
  test("deals no damage and does NOT increment hearts lost (misses are free)", () => {
    const state = startPlayerWindow(
      startTelegraph(createBossCombatState(CONFIG)),
      1000
    );
    const { state: next, outcome } = resolveTurnMiss(CONFIG, state, TURNS[0], 5000, "miss");
    expect(outcome).toBe("miss");
    expect(next.bossHP).toBe(100); // no damage
    expect(next.heartsLost).toBe(0); // misses cost nothing — only boss attacks deduct hearts
    expect(next.turnIndex).toBe(1);
    expect(next.turnResults[0].outcome).toBe("miss");
    expect(next.turnResults[0].damageDealt).toBe(0);
  });

  test("records malfunction outcome", () => {
    const state = createBossCombatState(CONFIG);
    const { state: next } = resolveTurnMiss(CONFIG, state, TURNS[0], 3000, "malfunction");
    expect(next.turnResults[0].outcome).toBe("malfunction");
  });

  test("records timeout outcome", () => {
    const state = createBossCombatState(CONFIG);
    const { state: next } = resolveTurnMiss(CONFIG, state, TURNS[0], 10000, "timeout");
    expect(next.turnResults[0].outcome).toBe("timeout");
  });
});

// ── advanceAfterResult ──

describe("advanceAfterResult", () => {
  test("goes to next telegraph when more turns remain", () => {
    const state: ReturnType<typeof createBossCombatState> = {
      ...createBossCombatState(CONFIG),
      phase: "hit",
      turnIndex: 1, // just finished turn 1, turn 2 exists
    };
    const next = advanceAfterResult(CONFIG, state, 3);
    expect(next.phase).toBe("telegraph");
  });

  test("goes to gameover when hearts depleted", () => {
    const state = { ...createBossCombatState(CONFIG), phase: "miss" as const, turnIndex: 1 };
    const next = advanceAfterResult(CONFIG, state, 0);
    expect(next.phase).toBe("gameover");
  });

  test("stays in victory if already won", () => {
    const state = { ...createBossCombatState(CONFIG), phase: "victory" as const, bossHP: 0 };
    const next = advanceAfterResult(CONFIG, state, 3);
    expect(next.phase).toBe("victory");
  });

  test("goes to boss_retreats when all turns exhausted", () => {
    const state = { ...createBossCombatState(CONFIG), phase: "hit" as const, turnIndex: 3, bossHP: 25 };
    const next = advanceAfterResult(CONFIG, state, 2);
    expect(next.phase).toBe("boss_retreats");
  });

  test("goes to boss_retreats even at higher HP", () => {
    const state = { ...createBossCombatState(CONFIG), phase: "miss" as const, turnIndex: 3, bossHP: 80 };
    const next = advanceAfterResult(CONFIG, state, 1);
    expect(next.phase).toBe("boss_retreats");
  });
});

// ── calculateBossXP ──

describe("calculateBossXP", () => {
  test("full defeat, flawless, fast — max XP", () => {
    const state: ReturnType<typeof createBossCombatState> = {
      ...createBossCombatState(CONFIG),
      bossHP: 0,
      heartsLost: 0,
      turnResults: [
        { turnId: 1, outcome: "hit", damageDealt: 20, elapsedMs: 3000 },
        { turnId: 2, outcome: "hit", damageDealt: 15, elapsedMs: 4000 },
        { turnId: 3, outcome: "hit", damageDealt: 20, elapsedMs: 3500 },
      ],
    };
    const xp = calculateBossXP(CONFIG, state);
    expect(xp.hitXP).toBe(150);         // 3 hits × 50
    expect(xp.defeatBonus).toBe(500);   // full defeat
    expect(xp.flawlessBonus).toBe(250); // no hearts lost
    expect(xp.speedBonus).toBe(150);    // avg 3.5s < 5s
    expect(xp.total).toBe(1050);
  });

  test("partial victory — survival XP, no defeat bonus", () => {
    const state: ReturnType<typeof createBossCombatState> = {
      ...createBossCombatState(CONFIG),
      bossHP: 25, // not 0
      heartsLost: 1,
      turnResults: [
        { turnId: 1, outcome: "hit", damageDealt: 20, elapsedMs: 3000 },
        { turnId: 2, outcome: "miss", damageDealt: 0, elapsedMs: 9000 },
        { turnId: 3, outcome: "hit", damageDealt: 20, elapsedMs: 4000 },
      ],
    };
    const xp = calculateBossXP(CONFIG, state);
    expect(xp.hitXP).toBe(100);          // 2 hits × 50
    expect(xp.defeatBonus).toBe(200);    // survival, not defeat
    expect(xp.flawlessBonus).toBe(0);    // lost a heart
    expect(xp.speedBonus).toBe(150);     // avg of hits: 3.5s < 5s
    expect(xp.total).toBe(450);
  });

  test("no speed bonus when slow", () => {
    const state: ReturnType<typeof createBossCombatState> = {
      ...createBossCombatState(CONFIG),
      bossHP: 0,
      heartsLost: 0,
      turnResults: [
        { turnId: 1, outcome: "hit", damageDealt: 20, elapsedMs: 8000 },
        { turnId: 2, outcome: "hit", damageDealt: 15, elapsedMs: 7000 },
        { turnId: 3, outcome: "hit", damageDealt: 20, elapsedMs: 6000 },
      ],
    };
    const xp = calculateBossXP(CONFIG, state);
    expect(xp.speedBonus).toBe(0);
  });

  test("zero hits — no speed bonus, no flawless", () => {
    const state: ReturnType<typeof createBossCombatState> = {
      ...createBossCombatState(CONFIG),
      bossHP: 100,
      heartsLost: 3,
      turnResults: [
        { turnId: 1, outcome: "miss", damageDealt: 0, elapsedMs: 10000 },
        { turnId: 2, outcome: "timeout", damageDealt: 0, elapsedMs: 9000 },
        { turnId: 3, outcome: "malfunction", damageDealt: 0, elapsedMs: 8000 },
      ],
    };
    const xp = calculateBossXP(CONFIG, state);
    expect(xp.hitXP).toBe(0);
    expect(xp.speedBonus).toBe(0);
    expect(xp.flawlessBonus).toBe(0);
    expect(xp.defeatBonus).toBe(200); // survival
  });
});

// ── Helper functions ──

describe("helpers", () => {
  test("isBossDefeated", () => {
    expect(isBossDefeated({ ...createBossCombatState(CONFIG), bossHP: 0 })).toBe(true);
    expect(isBossDefeated({ ...createBossCombatState(CONFIG), bossHP: 1 })).toBe(false);
  });

  test("isFightOver", () => {
    expect(isFightOver(CONFIG, { ...createBossCombatState(CONFIG), phase: "victory" })).toBe(true);
    expect(isFightOver(CONFIG, { ...createBossCombatState(CONFIG), phase: "boss_retreats" })).toBe(true);
    expect(isFightOver(CONFIG, { ...createBossCombatState(CONFIG), phase: "gameover" })).toBe(true);
    expect(isFightOver(CONFIG, { ...createBossCombatState(CONFIG), phase: "telegraph" })).toBe(false);
    expect(isFightOver(CONFIG, { ...createBossCombatState(CONFIG), phase: "player_window" })).toBe(false);
  });

  test("getTotalDamageDealt", () => {
    const state = {
      ...createBossCombatState(CONFIG),
      turnResults: [
        { turnId: 1, outcome: "hit" as const, damageDealt: 20, elapsedMs: 3000 },
        { turnId: 2, outcome: "miss" as const, damageDealt: 0, elapsedMs: 5000 },
        { turnId: 3, outcome: "hit" as const, damageDealt: 15, elapsedMs: 4000 },
      ],
    };
    expect(getTotalDamageDealt(state)).toBe(35);
  });

  test("getHitCount and getMissCount", () => {
    const state = {
      ...createBossCombatState(CONFIG),
      turnResults: [
        { turnId: 1, outcome: "hit" as const, damageDealt: 20, elapsedMs: 3000 },
        { turnId: 2, outcome: "miss" as const, damageDealt: 0, elapsedMs: 5000 },
        { turnId: 3, outcome: "hit" as const, damageDealt: 15, elapsedMs: 4000 },
      ],
    };
    expect(getHitCount(state)).toBe(2);
    expect(getMissCount(state)).toBe(1);
  });
});

// ── Full fight simulation ──

describe("full fight simulation", () => {
  test("3 hits in sequence — boss defeated", () => {
    let state = createBossCombatState(CONFIG);

    // Turn 1: hit (20 damage)
    state = startTelegraph(state);
    state = startPlayerWindow(state, 1000);
    const r1 = resolveTurnHit(CONFIG, state, TURNS[0], 3000);
    state = r1.state;
    expect(state.bossHP).toBe(80);
    state = advanceAfterResult(CONFIG, state, 3);
    expect(state.phase).toBe("telegraph");

    // Turn 2: hit (15 damage)
    state = startPlayerWindow(state, 5000);
    const r2 = resolveTurnHit(CONFIG, state, TURNS[1], 4000);
    state = r2.state;
    expect(state.bossHP).toBe(65);
    state = advanceAfterResult(CONFIG, state, 3);
    expect(state.phase).toBe("telegraph");

    // Turn 3: hit (20 damage)
    state = startPlayerWindow(state, 10000);
    const r3 = resolveTurnHit(CONFIG, state, TURNS[2], 3500);
    state = r3.state;
    expect(state.bossHP).toBe(45);
    // All 3 turns done
    state = advanceAfterResult(CONFIG, state, 3);
    // Boss retreats (HP > 0 but turns exhausted)
    expect(state.phase).toBe("boss_retreats");
  });

  test("mix of hits and misses — hearts tracking", () => {
    let state = createBossCombatState(CONFIG);
    let hearts = 3;

    // Turn 1: miss — misses don't cost hearts, only boss attacks do
    state = startTelegraph(state);
    state = startPlayerWindow(state, 1000);
    const r1 = resolveTurnMiss(CONFIG, state, TURNS[0], 10000, "timeout");
    state = r1.state;
    // Simulate boss attack hitting Maya (this is what costs hearts, not misses)
    hearts--;
    state = advanceAfterResult(CONFIG, state, hearts);
    expect(state.phase).toBe("telegraph");
    expect(state.heartsLost).toBe(0); // combat heartsLost not incremented by miss

    // Turn 2: miss
    state = startPlayerWindow(state, 12000);
    const r2 = resolveTurnMiss(CONFIG, state, TURNS[1], 9000, "miss");
    state = r2.state;
    hearts--;
    state = advanceAfterResult(CONFIG, state, hearts);
    expect(state.phase).toBe("telegraph");
    expect(state.heartsLost).toBe(0);

    // Turn 3: miss — hearts reach 0 from boss attacks
    state = startPlayerWindow(state, 22000);
    const r3 = resolveTurnMiss(CONFIG, state, TURNS[2], 8000, "malfunction");
    state = r3.state;
    hearts--;
    state = advanceAfterResult(CONFIG, state, hearts);
    expect(state.phase).toBe("gameover");
    expect(state.heartsLost).toBe(0);
  });
});
