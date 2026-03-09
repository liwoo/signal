import { describe, test, expect } from "vitest";
import { boss01, boss01Config, SECTOR_GRID, SECTOR_GRID_SHIFTED } from "./boss-01";
import {
  createBossCombatState,
  buildSource,
  checkOutput,
  resolveTurnHit,
  resolveTurnMiss,
  advanceAfterResult,
  calculateBossXP,
  updateTabCode,
} from "@/lib/game/boss-combat";

describe("boss-01 challenge metadata", () => {
  test("has correct identity", () => {
    expect(boss01.id).toBe("boss-01");
    expect(boss01.isBoss).toBe(true);
    expect(boss01.title).toBe("LOCKMASTER");
  });

  test("has no steps (boss fights use turns)", () => {
    expect(boss01.steps).toEqual([]);
  });
});

describe("boss-01 config", () => {
  test("has 3 tabs", () => {
    expect(boss01Config.tabs).toHaveLength(3);
    expect(boss01Config.tabs.map((t) => t.id)).toEqual(["aim", "load", "fire"]);
  });

  test("has 6 turns", () => {
    expect(boss01Config.turns).toHaveLength(6);
  });

  test("turn IDs are sequential 1-6", () => {
    expect(boss01Config.turns.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("total damage sums to 100", () => {
    const totalDamage = boss01Config.turns.reduce((sum, t) => sum + t.damage, 0);
    expect(totalDamage).toBe(100);
  });

  test("window seconds decrease each turn", () => {
    const windows = boss01Config.turns.map((t) => t.windowSeconds);
    expect(windows).toEqual([25, 22, 20, 18, 16, 14]);
  });

  test("boss HP is 100", () => {
    expect(boss01Config.bossHP).toBe(100);
  });
});

describe("sector grids", () => {
  test("normal grid has 9 sectors", () => {
    expect(Object.keys(SECTOR_GRID)).toHaveLength(9);
  });

  test("shifted grid is +64 from normal", () => {
    for (const [sector, [nx, ny]] of Object.entries(SECTOR_GRID)) {
      const [sx, sy] = SECTOR_GRID_SHIFTED[Number(sector)];
      expect(sx).toBe(nx + 64);
      expect(sy).toBe(ny + 64);
    }
  });

  test("turn 1 expects sector 3 normal coords", () => {
    const turn = boss01Config.turns[0];
    const [x, y] = SECTOR_GRID[3];
    expect(turn.expectedOutput).toBe(`${x} ${y}`);
  });

  test("turn 3 expects sector 7 normal coords", () => {
    const turn = boss01Config.turns[2];
    const [x, y] = SECTOR_GRID[7];
    expect(turn.expectedOutput).toBe(`${x} ${y}`);
  });

  test("turn 5 expects sector 5 shifted coords", () => {
    const turn = boss01Config.turns[4];
    const [x, y] = SECTOR_GRID_SHIFTED[5];
    expect(turn.expectedOutput).toBe(`${x} ${y}`);
  });

  test("turn 6 expects sector 9 shifted coords", () => {
    const turn = boss01Config.turns[5];
    const [x, y] = SECTOR_GRID_SHIFTED[9];
    expect(turn.expectedOutput).toContain(`${x} ${y}`);
  });
});

describe("source building with correct user code", () => {
  test("turn 1 — correct aim compiles", () => {
    let state = createBossCombatState(boss01Config);
    // User writes correct Aim for normal grid
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tswitch sector {
\tcase 1: return 128, 160
\tcase 2: return 256, 160
\tcase 3: return 384, 160
\tcase 4: return 128, 320
\tcase 5: return 256, 320
\tcase 6: return 384, 320
\tcase 7: return 128, 480
\tcase 8: return 256, 480
\tcase 9: return 384, 480
\t}
\treturn 0, 0
}`);
    const source = buildSource(boss01Config, state, boss01Config.turns[0]);
    expect(source).toContain("package main");
    expect(source).toContain("func Aim");
    expect(source).toContain("case 3: return 384, 160");
    expect(source).toContain("func main()");
  });

  test("turn 2 — correct load output matches", () => {
    expect(checkOutput("[pierce pierce pierce]", boss01Config.turns[1].expectedOutput)).toBe(true);
  });

  test("turn 4 — HIT output matches", () => {
    expect(checkOutput("HIT", boss01Config.turns[3].expectedOutput)).toBe(true);
  });

  test("turn 6 — multi-line output matches", () => {
    const expected = boss01Config.turns[5].expectedOutput;
    expect(checkOutput("448 544\n[pulse]\nHIT", expected)).toBe(true);
  });
});

describe("full boss-01 fight — all hits", () => {
  test("6 hits defeats the boss with max XP", () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    for (let i = 0; i < 6; i++) {
      const turn = boss01Config.turns[i];
      const { state: next } = resolveTurnHit(boss01Config, state, turn, 3000);
      state = next;

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
    }

    expect(state.bossHP).toBe(0);
    expect(state.phase).toBe("victory");

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(300);           // 6 × 50
    expect(xp.defeatBonus).toBe(500);
    expect(xp.flawlessBonus).toBe(250);
    expect(xp.speedBonus).toBe(150);       // 3s avg < 5s
    expect(xp.total).toBe(1200);           // max possible
  });
});

describe("full boss-01 fight — miss one turn", () => {
  test("5 hits + 1 miss — boss retreats", () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    for (let i = 0; i < 6; i++) {
      const turn = boss01Config.turns[i];
      if (i === 1) {
        // Miss turn 2 (15 damage lost)
        const { state: missState } = resolveTurnMiss(boss01Config, { ...state, turnIndex: i }, turn, 9000, "miss");
        state = missState;
        hearts--;
        state = advanceAfterResult(boss01Config, state, hearts);
      } else {
        const { state: next } = resolveTurnHit(boss01Config, { ...state, turnIndex: i }, turn, 3000);
        state = next;
        if (state.phase === "victory") break;
        state = advanceAfterResult(boss01Config, state, hearts);
      }
    }

    // Missed 15 damage, so boss has 15 HP left
    expect(state.bossHP).toBe(15);
    expect(state.phase).toBe("boss_retreats");

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(250);           // 5 × 50
    expect(xp.defeatBonus).toBe(200);     // survival, not defeat
    expect(xp.flawlessBonus).toBe(0);     // lost a heart
    expect(xp.total).toBeLessThan(1200);
  });
});

describe("tab starter code quality", () => {
  test("aim.go has sector grid in comments", () => {
    const aimTab = boss01Config.tabs.find((t) => t.id === "aim")!;
    expect(aimTab.starterCode).toContain("1=(128,160)");
    expect(aimTab.starterCode).toContain("9=(384,480)");
  });

  test("load.go has threat types in comments", () => {
    const loadTab = boss01Config.tabs.find((t) => t.id === "load")!;
    expect(loadTab.starterCode).toContain('"shield"');
    expect(loadTab.starterCode).toContain('"armor"');
    expect(loadTab.starterCode).toContain('"exposed"');
  });

  test("fire.go has validation logic", () => {
    const fireTab = boss01Config.tabs.find((t) => t.id === "fire")!;
    expect(fireTab.starterCode).toContain("NO TARGET");
    expect(fireTab.starterCode).toContain("NO AMMO");
    expect(fireTab.starterCode).toContain("fmt.Sprintf");
  });

  test("every turn has a non-empty test harness", () => {
    for (const turn of boss01Config.turns) {
      expect(turn.testHarness.length).toBeGreaterThan(10);
      expect(turn.testHarness).toContain("func main()");
    }
  });

  test("every turn has non-empty expected output", () => {
    for (const turn of boss01Config.turns) {
      expect(turn.expectedOutput.length).toBeGreaterThan(0);
    }
  });
});
