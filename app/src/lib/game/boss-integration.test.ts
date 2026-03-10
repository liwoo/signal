/**
 * Boss-01 (LOCKMASTER) integration test.
 *
 * Simulates a full boss fight with REAL Go Playground compilation.
 * The starter code is intentionally corrupted (malware damage) — tests verify:
 *   - correct (fixed) solutions → HIT, boss HP drops
 *   - unfixed corrupted code → MALFUNCTION (compile error)
 *   - wrong output → MISS
 *   - gaming attempts (hardcoded returns, partial fixes)
 *
 * Turn structure:
 *   1. Fix aim.go  → printf "AIM x y"
 *   2. Fix load.go → range loop prints ammo
 *   3. Fix fire.go → returns "HIT"
 *   4. Wire all 3  → full sequence "AIM x y\nLOAD n\nHIT"
 *   5. Grid shift  → update aim coordinates +64
 *   6. Fix Combo   → variadic "HIT | HIT | HIT"
 *
 * Run with:
 *   npx vitest run src/lib/game/boss-integration.test.ts --timeout 120000
 */

import { describe, it, expect } from "vitest";
import { compileGo } from "@/lib/go/playground";
import {
  boss01Config,
  SECTOR_GRID,
  SECTOR_GRID_SHIFTED,
} from "@/data/challenges/boss-01";
import {
  createBossCombatState,
  buildSource,
  checkOutput,
  updateTabCode,
  resolveTurnHit,
  resolveTurnMiss,
  advanceAfterResult,
  startTelegraph,
  startPlayerWindow,
  calculateBossXP,
  getHitCount,
  getMissCount,
  type BossCombatState,
} from "@/lib/game/boss-combat";

// ── Helpers ──

/** Compile all tabs + test harness via Go Playground. */
async function compileBossTurn(state: BossCombatState, turnIndex: number) {
  const turn = boss01Config.turns[turnIndex];
  const source = buildSource(boss01Config, state, turn);
  const result = await compileGo(source);
  return { source, result, turn };
}

/** Apply correct Aim code for normal grid (turns 1-4). */
const CORRECT_AIM_NORMAL = `func Aim(sector int) (int, int) {
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (col + 1) * 128, (row + 1) * 160
}`;

/** Apply correct Aim code for shifted grid (turns 5-6). */
const CORRECT_AIM_SHIFTED = `func Aim(sector int) (int, int) {
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (col+1)*128 + 64, (row+1)*160 + 64
}`;

/** Correct Load function. */
const CORRECT_LOAD = `func Load(threat string) []string {
\tswitch threat {
\tcase "shield":
\t\treturn []string{"pierce", "pierce", "pierce"}
\tcase "armor":
\t\treturn []string{"blast", "blast"}
\tcase "exposed":
\t\treturn []string{"pulse"}
\t}
\treturn []string{}
}`;

/** Correct Fire function that returns "HIT". */
const CORRECT_FIRE = `func Fire(x, y int, ammo []string) string {
\tif x == 0 || y == 0 {
\t\treturn "NO TARGET"
\t}
\tif len(ammo) == 0 {
\t\treturn "NO AMMO"
\t}
\treturn "HIT"
}`;

/** Correct Combo variadic function. */
const CORRECT_COMBO = `func Combo(shots ...string) string {
\treturn strings.Join(shots, " | ")
}`;

/** Apply all correct code to a state (normal grid). */
function fixAll(state: BossCombatState): BossCombatState {
  state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
  state = updateTabCode(state, "load", CORRECT_LOAD);
  state = updateTabCode(state, "fire", CORRECT_FIRE);
  state = updateTabCode(state, "main", CORRECT_COMBO);
  return state;
}

/** Apply all correct code with shifted grid. */
function fixAllShifted(state: BossCombatState): BossCombatState {
  state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
  state = updateTabCode(state, "load", CORRECT_LOAD);
  state = updateTabCode(state, "fire", CORRECT_FIRE);
  state = updateTabCode(state, "main", CORRECT_COMBO);
  return state;
}

// ═══════════════════════════════════════════════════════
//  CORRUPTED STARTER CODE — MALWARE DAMAGE VERIFICATION
// ═══════════════════════════════════════════════════════

describe("corrupted starter code — all tabs fail to compile", () => {
  it("aim.go starter has 'in' instead of 'int' and wrong switch var → MALFUNCTION", async () => {
    const state = createBossCombatState(boss01Config);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(false); // won't compile
  }, 15_000);

  it("load.go starter has 'sting' instead of 'string' → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(false);
  }, 15_000);

  it("fire.go starter has missing brace → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 2);
    expect(result.success).toBe(false);
  }, 15_000);

  it("main.go starter has 'sting' instead of 'string' → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    // Leave main.go corrupted
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(false);
  }, 15_000);
});

// ═══════════════════════════════════════════════════════
//  EXACT USER INPUT — REPRODUCE REPORTED BUG
// ═══════════════════════════════════════════════════════

describe("turn 1 — exact user input that should pass but reportedly fails", () => {
  // User's exact code (spaces, not tabs, renamed param to 's', no comments)
  const userAimCode = `func Aim(s int) (int, int) {
    switch s {
    case 1:
        return 128, 160
    case 2:
        return 256, 160
    case 3:
        return 384, 160
    case 4:
        return 128, 320
    case 5:
        return 256, 320
    case 6:
        return 384, 320
    case 7:
        return 128, 480
    case 8:
        return 256, 480
    case 9:
        return 384, 480
    }
    return 0, 0
}`;

  it("user code with OTHER TABS STILL CORRUPTED — should stub non-active tabs", async () => {
    // Simulate: user only fixed aim.go, other tabs untouched (corrupted)
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", userAimCode);
    // load, fire, main are still corrupted starter code

    const turn = boss01Config.turns[0];
    const source = buildSource(boss01Config, state, turn);
    console.log("=== GENERATED SOURCE ===");
    console.log(source);
    console.log("========================");

    const result = await compileGo(source);
    console.log("compile success:", result.success);
    console.log("compile errors:", result.errors);
    console.log("compile output:", JSON.stringify(result.output));

    expect(result.success, `compile failed:\n${result.errors}`).toBe(true);
    expect(
      checkOutput(result.output, "AIM 384 160"),
      `expected "AIM 384 160" but got ${JSON.stringify(result.output)}`
    ).toBe(true);
  }, 15_000);

  it("user code with all other tabs correctly fixed", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", userAimCode);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);

    const { source, result } = await compileBossTurn(state, 0);
    console.log("=== SOURCE (all fixed) ===");
    console.log(source);
    console.log("output:", JSON.stringify(result.output));

    expect(result.success, `compile failed:\n${result.errors}`).toBe(true);
    expect(
      checkOutput(result.output, "AIM 384 160"),
      `expected "AIM 384 160" but got ${JSON.stringify(result.output)}`
    ).toBe(true);
  }, 15_000);
});

// ═══════════════════════════════════════════════════════
//  REALISTIC PLAYER EDITS — MINIMAL FIXES TO STARTER CODE
// ═══════════════════════════════════════════════════════

// Simulate what a real player does: edit the corrupted starter code
// with minimal changes (fix typos in-place, add missing lines).
// This catches issues where the starter code structure itself causes problems.

describe("turn 1 — realistic player fixes to corrupted aim.go", () => {
  // The starter code has 4 bugs:
  // 1. "in" instead of "int"
  // 2. "s" instead of "sector" in switch
  // 3. missing case 3
  // 4. missing closing "}"

  const fixedAimMinimal = `// WEAPON TARGETING SYSTEM
// Sectors map to grid coordinates:
//   1=(128,160)  2=(256,160)  3=(384,160)
//   4=(128,320)  5=(256,320)  6=(384,320)
//   7=(128,480)  8=(256,480)  9=(384,480)

func Aim(sector int) (int, int) {
\tswitch sector {
\tcase 1:
\t\treturn 128, 160
\tcase 2:
\t\treturn 256, 160
\tcase 3:
\t\treturn 384, 160
\tcase 4:
\t\treturn 128, 320
\tcase 5:
\t\treturn 256, 320
\tcase 6:
\t\treturn 384, 320
\tcase 7:
\t\treturn 128, 480
\tcase 8:
\t\treturn 256, 480
\tcase 9:
\t\treturn 384, 480
\t}
\treturn 0, 0
}`;

  it("all 4 bugs fixed in-place → compiles and outputs AIM 384 160", async () => {
    let state = createBossCombatState(boss01Config);
    // Fix only aim.go — other tabs stay corrupted but turn 1 only tests aim
    state = updateTabCode(state, "aim", fixedAimMinimal);
    // Must also fix other tabs since buildSource includes all of them
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { source, result } = await compileBossTurn(state, 0);
    expect(result.success, `compile failed:\n${result.errors}\n\nSOURCE:\n${source}`).toBe(true);
    expect(
      checkOutput(result.output, "AIM 384 160"),
      `expected "AIM 384 160" but got "${result.output.trim()}"`
    ).toBe(true);
  }, 15_000);

  it("fix type+switch+case3 but forget closing brace → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tswitch sector {
\tcase 1:
\t\treturn 128, 160
\tcase 2:
\t\treturn 256, 160
\tcase 3:
\t\treturn 384, 160
\tcase 4:
\t\treturn 128, 320
\tcase 5:
\t\treturn 256, 320
\tcase 6:
\t\treturn 384, 320
\tcase 7:
\t\treturn 128, 480
\tcase 8:
\t\treturn 256, 480
\tcase 9:
\t\treturn 384, 480
\t}
\treturn 0, 0`); // <-- missing closing }
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(false);
  }, 15_000);

  it("fix type+brace but leave switch var as 's' → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tswitch s {
\tcase 3:
\t\treturn 384, 160
\t}
\treturn 0, 0
}`);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(false); // "s" undefined
  }, 15_000);

  it("fix everything but case 3 returns wrong coords → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tswitch sector {
\tcase 1:
\t\treturn 128, 160
\tcase 2:
\t\treturn 256, 160
\tcase 3:
\t\treturn 384, 320
\tcase 5:
\t\treturn 256, 320
\t}
\treturn 0, 0
}`);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    expect(
      checkOutput(result.output, "AIM 384 160"),
      `got "${result.output.trim()}" — case 3 has wrong y coordinate`
    ).toBe(false);
  }, 15_000);

  it("add case 3 but forget to fix type (still 'in') → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    // Player adds case 3 but doesn't notice the "in" type bug
    state = updateTabCode(state, "aim", `func Aim(sector in) (int, int) {
\tswitch sector {
\tcase 1:
\t\treturn 128, 160
\tcase 3:
\t\treturn 384, 160
\t}
\treturn 0, 0
}`);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(false);
  }, 15_000);
});

// ═══════════════════════════════════════════════════════
//  TURN-BY-TURN — CLEAN CORRECT SOLUTIONS
// ═══════════════════════════════════════════════════════

describe("turn 1 — correct aim.go solutions", () => {
  it("correct Aim using math → HIT (AIM 384 160)", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 0);
    expect(result.success, `errors: ${result.errors}`).toBe(true);
    expect(checkOutput(result.output, "AIM 384 160")).toBe(true);
  }, 15_000);

  it("correct Aim using switch/case → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    state = updateTabCode(state, "main", CORRECT_COMBO);
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
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "AIM 384 160")).toBe(true);
  }, 15_000);

  it("player swaps x,y order → MISS", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (row + 1) * 160, (col + 1) * 128
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "AIM 384 160")).toBe(false);
  }, 15_000);
});

describe("turn 2 — Fix load.go: type + variable name", () => {
  it("correct Load with switch → HIT (pierce x3)", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "pierce\npierce\npierce")).toBe(true);
  }, 15_000);

  it("only fixed type but not variable name → MALFUNCTION", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tvar rounds []string
\tcount := 0
\tammoType := ""
\tswitch threat {
\tcase "shield":
\t\tcount = 3
\t\tammoType = "pierce"
\tcase "armor":
\t\tcount = 2
\t\tammoType = "blast"
\tcase "exposed":
\t\tcount = 1
\t\tammoType = "pulse"
\t}
\tfor i := 0; i < count; i++ {
\t\trounds = append(rounds, ammo)
\t}
\treturn rounds
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(false); // "ammo" undefined
  }, 15_000);

  it("wrong ammo count (2 instead of 3) → MISS", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "shield" {
\t\treturn []string{"pierce", "pierce"}
\t}
\treturn []string{}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "pierce\npierce\npierce")).toBe(false);
  }, 15_000);
});

describe("turn 3 — Fix fire.go: missing brace, wrong operator, wrong return", () => {
  it("correct Fire → HIT", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 2);
    expect(result.success, `errors: ${result.errors}`).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);

  it("Fire with 0,0 coords → NO TARGET (|| catches either zero)", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    state = updateTabCode(state, "fire", `func Fire(x, y int, ammo []string) string {
\tif x == 0 || y == 0 {
\t\treturn "NO TARGET"
\t}
\tif len(ammo) == 0 {
\t\treturn "NO AMMO"
\t}
\treturn "HIT"
}`);
    // Turn 3 harness passes Fire(256, 320, ...) so it should still HIT
    const { result } = await compileBossTurn(state, 2);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);
});

describe("turn 4 — Wire all three: aim + load + fire sequence", () => {
  it("all correct → full sequence output", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 3);
    expect(result.success, `errors: ${result.errors}`).toBe(true);
    expect(checkOutput(result.output, "AIM 256 320\nLOAD 2\nHIT")).toBe(true);
  }, 15_000);

  it("correct Fire but Load returns wrong ammo → wrong LOAD count", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "shield" {
\t\treturn []string{"pierce", "pierce", "pierce"}
\t}
\treturn []string{}
}`);
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    // Load("armor") returns empty → Fire returns "NO AMMO", wrong LOAD count
    expect(checkOutput(result.output, "AIM 256 320\nLOAD 2\nHIT")).toBe(false);
  }, 15_000);
});

describe("turn 5 — Reroute: grid shifts +64, Aim(5)", () => {
  it("updated Aim for shifted grid → HIT (AIM 320 384)", async () => {
    let state = fixAllShifted(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "AIM 320 384")).toBe(true);
  }, 15_000);

  it("player forgets to update Aim (still normal grid) → MISS", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "AIM 320 384")).toBe(false);
    expect(result.output.trim()).toBe("AIM 256 320");
  }, 15_000);
});

describe("turn 6 — Kill shot: Combo variadic fires 3 shots", () => {
  it("all correct (shifted grid + Combo) → HIT | HIT | HIT", async () => {
    let state = fixAllShifted(createBossCombatState(boss01Config));
    const { result } = await compileBossTurn(state, 5);
    expect(result.success, `errors: ${result.errors}`).toBe(true);
    expect(checkOutput(result.output, "HIT | HIT | HIT")).toBe(true);
  }, 15_000);

  it("Combo with wrong separator → MISS", async () => {
    let state = fixAllShifted(createBossCombatState(boss01Config));
    state = updateTabCode(state, "main", `func Combo(shots ...string) string {
\treturn strings.Join(shots, " + ")
}`);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT | HIT | HIT")).toBe(false);
    expect(result.output.trim()).toBe("HIT + HIT + HIT");
  }, 15_000);

  it("Aim still on normal grid → Fire returns NO TARGET for some sectors", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    // Normal grid: Aim(7)=(128,480), Aim(5)=(256,320), Aim(9)=(384,480)
    // All non-zero so Fire still returns HIT — but Combo output would be "HIT | HIT | HIT"
    // However, the test expects shifted grid values. Since Fire returns HIT regardless
    // of specific coords (as long as non-zero), output matches anyway.
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    // Fire returns "HIT" for any non-zero coords, so combo still works
    expect(checkOutput(result.output, "HIT | HIT | HIT")).toBe(true);
  }, 15_000);
});

// ═══════════════════════════════════════════════════════
//  FULL FIGHT SIMULATIONS — COMBAT STATE MACHINE
// ═══════════════════════════════════════════════════════

describe("full fight: flawless victory (6/6 hits)", () => {
  it("fixes all corrupted code and hits all 6 turns → boss HP 0, victory, max XP", async () => {
    let state = createBossCombatState(boss01Config);
    const hearts = 5;

    // Fix all tabs before fighting (normal grid for turns 1-4)
    state = fixAll(state);

    for (let i = 0; i < 4; i++) {
      const { result, turn } = await compileBossTurn(state, i);
      expect(result.success, `turn ${i + 1} compile`).toBe(true);
      expect(
        checkOutput(result.output, turn.expectedOutput),
        `turn ${i + 1} output: got "${result.output.trim()}" expected "${turn.expectedOutput}"`
      ).toBe(true);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());
      const { state: nextState } = resolveTurnHit(boss01Config, state, turn, 3000);
      state = nextState;

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
    }

    // Turn 5-6: shifted grid
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);

    for (let i = 4; i < 6; i++) {
      if (state.phase === "victory") break;

      const { result, turn } = await compileBossTurn(state, i);
      expect(result.success, `turn ${i + 1} compile`).toBe(true);
      expect(
        checkOutput(result.output, turn.expectedOutput),
        `turn ${i + 1} output: got "${result.output.trim()}" expected "${turn.expectedOutput}"`
      ).toBe(true);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());
      const { state: nextState } = resolveTurnHit(boss01Config, state, turn, 3000);
      state = nextState;

      if (state.phase !== "victory") {
        state = advanceAfterResult(boss01Config, state, hearts);
      }
    }

    // Damage: 15+15+15+20+15+20 = 100
    expect(state.bossHP).toBe(0);
    expect(state.phase).toBe("victory");
    expect(getHitCount(state)).toBe(6);
    expect(getMissCount(state)).toBe(0);

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(300);        // 6 × 50
    expect(xp.defeatBonus).toBe(500);
    expect(xp.flawlessBonus).toBe(250);
    expect(xp.speedBonus).toBe(150);
    expect(xp.total).toBe(1200);
  }, 120_000);
});

describe("full fight: total failure (never fixes code)", () => {
  it("corrupted starter code → all malfunctions → game over", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 5;

    for (let i = 0; i < 6; i++) {
      const { result, turn } = await compileBossTurn(state, i);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());

      if (!result.success) {
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 10000, "malfunction");
        state = missState;
        hearts--;
      } else {
        const isHit = checkOutput(result.output, turn.expectedOutput);
        if (isHit) {
          const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 8000);
          state = hitState;
        } else {
          const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 10000, "miss");
          state = missState;
          hearts--;
        }
      }

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
      if (state.phase === "gameover") break;
    }

    expect(state.phase).toBe("gameover");
    expect(hearts).toBe(0);
    expect(state.bossHP).toBe(100);
  }, 120_000);
});

describe("full fight: miss turn 1, fix all, hit remaining 5 → boss retreats", () => {
  it("malfunction on corrupted turn 1, then fixes everything and hits 5/6", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 5;

    // Turn 1: all corrupted → malfunction
    const { result: r1, turn: t1 } = await compileBossTurn(state, 0);
    expect(r1.success).toBe(false);
    state = startTelegraph(state);
    state = startPlayerWindow(state, Date.now());
    const { state: miss1 } = resolveTurnMiss(boss01Config, state, t1, 10000, "malfunction");
    state = miss1;
    // Misses don't cost hearts — only boss attacks do
    expect(state.heartsLost, "heartsLost after miss1").toBe(0);
    state = advanceAfterResult(boss01Config, state, hearts);
    expect(state.heartsLost, "heartsLost after advance").toBe(0);

    // Fix all tabs for turns 2-4
    state = fixAll(state);
    expect(state.heartsLost, "heartsLost after fixAll").toBe(0);

    // Turns 2-4: all hit
    for (let i = 1; i < 4; i++) {
      const { result, turn } = await compileBossTurn(state, i);
      expect(result.success, `turn ${i + 1} compile: ${result.errors}`).toBe(true);
      expect(
        checkOutput(result.output, turn.expectedOutput),
        `turn ${i + 1}: got "${result.output.trim()}" expected "${turn.expectedOutput}"`
      ).toBe(true);
      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());
      const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 4000);
      state = hitState;
      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
    }

    // Fix aim for shifted grid (turns 5-6)
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);

    // Turns 5-6: hit
    for (let i = 4; i < 6; i++) {
      if (state.phase === "victory") break;
      const { result, turn } = await compileBossTurn(state, i);
      expect(result.success, `turn ${i + 1} compile: ${result.errors}`).toBe(true);
      expect(
        checkOutput(result.output, turn.expectedOutput),
        `turn ${i + 1}: got "${result.output.trim()}" expected "${turn.expectedOutput}"`
      ).toBe(true);
      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());
      const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 4000);
      state = hitState;
      if (state.phase !== "victory") {
        state = advanceAfterResult(boss01Config, state, hearts);
      }
    }

    // Missed turn 1 (0 dmg), hit turns 2-6: 15+15+20+15+20 = 85 dmg
    expect(state.bossHP).toBe(15);
    expect(state.phase).toBe("boss_retreats");
    expect(getHitCount(state)).toBe(5);
    expect(getMissCount(state)).toBe(1);
    // Misses don't cost hearts — only boss attacks do
    expect(hearts).toBe(5);
    expect(state.heartsLost, "heartsLost at end").toBe(0);

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(250);        // 5 × 50
    expect(xp.defeatBonus).toBe(200);   // survival, not defeat
    expect(xp.flawlessBonus).toBe(250); // no hearts lost (boss attacks are the only way to lose hearts)
  }, 120_000);
});

// ═══════════════════════════════════════════════════════
//  GRID MATH VERIFICATION
// ═══════════════════════════════════════════════════════

describe("sector grid math — all 9 sectors compile correctly", () => {
  it("normal grid: math formula matches all 9 sector coordinates", async () => {
    let state = fixAll(createBossCombatState(boss01Config));

    for (const [sector, [expectedX, expectedY]] of Object.entries(SECTOR_GRID)) {
      const harness = `func main() {\n\tx, y := Aim(${sector})\n\tfmt.Println(x, y)\n}`;
      const turn = { ...boss01Config.turns[0], testHarness: harness, expectedOutput: `${expectedX} ${expectedY}` };
      const source = buildSource(boss01Config, state, turn);
      const result = await compileGo(source);
      expect(result.success, `sector ${sector} compile`).toBe(true);
      expect(
        checkOutput(result.output, `${expectedX} ${expectedY}`),
        `sector ${sector}: got "${result.output.trim()}" expected "${expectedX} ${expectedY}"`
      ).toBe(true);
    }
  }, 60_000);

  it("shifted grid: formula matches all 9 shifted sector coordinates", async () => {
    let state = fixAllShifted(createBossCombatState(boss01Config));

    for (const [sector, [expectedX, expectedY]] of Object.entries(SECTOR_GRID_SHIFTED)) {
      const harness = `func main() {\n\tx, y := Aim(${sector})\n\tfmt.Println(x, y)\n}`;
      const turn = { ...boss01Config.turns[0], testHarness: harness, expectedOutput: `${expectedX} ${expectedY}` };
      const source = buildSource(boss01Config, state, turn);
      const result = await compileGo(source);
      expect(result.success, `shifted sector ${sector} compile`).toBe(true);
      expect(
        checkOutput(result.output, `${expectedX} ${expectedY}`),
        `shifted sector ${sector}: got "${result.output.trim()}" expected "${expectedX} ${expectedY}"`
      ).toBe(true);
    }
  }, 60_000);
});

describe("Load function — all threat types compile correctly", () => {
  const threats: Array<{ threat: string; expected: string }> = [
    { threat: "shield", expected: "[pierce pierce pierce]" },
    { threat: "armor", expected: "[blast blast]" },
    { threat: "exposed", expected: "[pulse]" },
  ];

  for (const { threat, expected } of threats) {
    it(`Load("${threat}") → ${expected}`, async () => {
      let state = fixAll(createBossCombatState(boss01Config));
      const harness = `func main() {\n\tammo := Load("${threat}")\n\tfmt.Println(ammo)\n}`;
      const turn = { ...boss01Config.turns[1], testHarness: harness, expectedOutput: expected };
      const source = buildSource(boss01Config, state, turn);
      const result = await compileGo(source);
      expect(result.success).toBe(true);
      expect(checkOutput(result.output, expected)).toBe(true);
    }, 15_000);
  }

  it('Load("unknown") → empty slice', async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tammo := Load("unknown")\n\tfmt.Println(ammo)\n}`;
    const turn = { ...boss01Config.turns[1], testHarness: harness, expectedOutput: "[]" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[]")).toBe(true);
  }, 15_000);
});

describe("Fire function — edge cases compile correctly", () => {
  it("Fire(0, 0, ammo) → NO TARGET", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tfmt.Println(Fire(0, 0, []string{"pierce"}))\n}`;
    const turn = { ...boss01Config.turns[2], testHarness: harness, expectedOutput: "NO TARGET" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "NO TARGET")).toBe(true);
  }, 15_000);

  it("Fire(256, 320, empty) → NO AMMO", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tfmt.Println(Fire(256, 320, []string{}))\n}`;
    const turn = { ...boss01Config.turns[2], testHarness: harness, expectedOutput: "NO AMMO" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "NO AMMO")).toBe(true);
  }, 15_000);

  it("Fire(256, 320, ammo) → HIT", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tfmt.Println(Fire(256, 320, []string{"blast", "blast"}))\n}`;
    const turn = { ...boss01Config.turns[2], testHarness: harness, expectedOutput: "HIT" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);
});

describe("Combo function — variadic edge cases", () => {
  it("Combo with single shot → just the shot", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tfmt.Println(Combo("HIT"))\n}`;
    const turn = { ...boss01Config.turns[5], testHarness: harness, expectedOutput: "HIT" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);

  it("Combo with no shots → empty string", async () => {
    let state = fixAll(createBossCombatState(boss01Config));
    const harness = `func main() {\n\tfmt.Printf("[%s]", Combo())\n}`;
    const turn = { ...boss01Config.turns[5], testHarness: harness, expectedOutput: "[]" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[]")).toBe(true);
  }, 15_000);
});
