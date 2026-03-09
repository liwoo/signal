/**
 * Boss-01 (LOCKMASTER) integration test.
 *
 * Simulates a full boss fight with REAL Go Playground compilation.
 * Covers all 6 turns with realistic player code:
 *   - correct solutions → HIT, boss HP drops
 *   - wrong output → MISS, player loses heart
 *   - compile errors → MALFUNCTION, player loses heart
 *   - timeout → player loses heart
 *   - gaming attempts (hardcoded returns, extra code, wrong grid)
 *
 * Scenarios test multiple full-fight paths:
 *   - flawless victory (6/6 hits)
 *   - partial victory with misses
 *   - total failure (game over)
 *   - mixed hits/misses/malfunctions
 *   - grid shift adaptation (turn 5+)
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

/** Fire that still uses the starter code's Sprintf (wrong output for turn 4+). */
const STARTER_FIRE = boss01Config.tabs.find((t) => t.id === "fire")!.starterCode;

// ═══════════════════════════════════════════════════════
//  TURN-BY-TURN COMPILATION — REAL GO PLAYGROUND
// ═══════════════════════════════════════════════════════

describe("turn 1 — Aim sector 3 (normal grid)", () => {
  it("correct Aim using math → HIT (384 160)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success, `errors: ${result.errors}`).toBe(true);
    expect(checkOutput(result.output, "384 160")).toBe(true);
  }, 15_000);

  it("correct Aim using switch/case → HIT", async () => {
    let state = createBossCombatState(boss01Config);
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
    expect(checkOutput(result.output, "384 160")).toBe(true);
  }, 15_000);

  it("correct Aim using if-else chain → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tif sector == 1 { return 128, 160 }
\tif sector == 2 { return 256, 160 }
\tif sector == 3 { return 384, 160 }
\tif sector == 4 { return 128, 320 }
\tif sector == 5 { return 256, 320 }
\tif sector == 6 { return 384, 320 }
\tif sector == 7 { return 128, 480 }
\tif sector == 8 { return 256, 480 }
\tif sector == 9 { return 384, 480 }
\treturn 0, 0
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "384 160")).toBe(true);
  }, 15_000);

  it("Aim using map lookup → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\tgrid := map[int][2]int{
\t\t1: {128, 160}, 2: {256, 160}, 3: {384, 160},
\t\t4: {128, 320}, 5: {256, 320}, 6: {384, 320},
\t\t7: {128, 480}, 8: {256, 480}, 9: {384, 480},
\t}
\tpos := grid[sector]
\treturn pos[0], pos[1]
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "384 160")).toBe(true);
  }, 15_000);

  it("starter code (return 0, 0) → MISS", async () => {
    const state = createBossCombatState(boss01Config);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true); // compiles fine
    expect(checkOutput(result.output, "384 160")).toBe(false); // wrong output
  }, 15_000);

  it("hardcoded wrong sector → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 128, 160
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    // Returns sector 1 coords, not sector 3
    expect(checkOutput(result.output, "384 160")).toBe(false);
  }, 15_000);

  it("syntax error → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 384 160
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(false); // missing comma
  }, 15_000);

  it("player swaps x,y order → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (row + 1) * 160, (col + 1) * 128
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    // Output is "160 384" instead of "384 160"
    expect(checkOutput(result.output, "384 160")).toBe(false);
  }, 15_000);

  it("player uses 0-indexed sectors → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    // Sector 3 with 0-indexed math gives wrong coords
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\trow := sector / 3
\tcol := sector % 3
\treturn (col + 1) * 128, (row + 1) * 160
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    // sector=3 → row=1, col=0 → (128, 320) not (384, 160)
    expect(checkOutput(result.output, "384 160")).toBe(false);
  }, 15_000);

  it("player hardcodes sector 3 answer for turn 1 → HIT but fragile", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 384, 160
}`);
    const { result } = await compileBossTurn(state, 0);
    expect(result.success).toBe(true);
    // This passes turn 1 but will fail turn 3 (sector 7)
    expect(checkOutput(result.output, "384 160")).toBe(true);
  }, 15_000);
});

describe("turn 2 — Load shield threat", () => {
  it("correct Load with switch → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(true);
  }, 15_000);

  it("correct Load with if-else → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "shield" {
\t\treturn []string{"pierce", "pierce", "pierce"}
\t} else if threat == "armor" {
\t\treturn []string{"blast", "blast"}
\t} else if threat == "exposed" {
\t\treturn []string{"pulse"}
\t}
\treturn []string{}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(true);
  }, 15_000);

  it("Load using loops to build slices → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tcounts := map[string]int{"shield": 3, "armor": 2, "exposed": 1}
\tammos := map[string]string{"shield": "pierce", "armor": "blast", "exposed": "pulse"}
\tn := counts[threat]
\tammo := ammos[threat]
\tresult := make([]string, n)
\tfor i := 0; i < n; i++ {
\t\tresult[i] = ammo
\t}
\treturn result
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(true);
  }, 15_000);

  it("starter code (empty slice) → MISS", async () => {
    const state = createBossCombatState(boss01Config);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(false);
  }, 15_000);

  it("wrong ammo count (2 instead of 3) → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "shield" {
\t\treturn []string{"pierce", "pierce"}
\t}
\treturn []string{}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(false);
  }, 15_000);

  it("wrong ammo type → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\treturn []string{"blast", "blast", "blast"}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    // blast instead of pierce
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(false);
  }, 15_000);

  it("returns string instead of slice → MALFUNCTION", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\treturn "pierce pierce pierce"
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(false); // type mismatch
  }, 15_000);

  it("gaming: hardcoded answer → HIT but fragile", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\treturn []string{"pierce", "pierce", "pierce"}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(true);
    // This passes turn 2 but fails turn 4 where Load("armor") is needed
  }, 15_000);

  it("player forgets to handle shield case → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "armor" {
\t\treturn []string{"blast", "blast"}
\t}
\tif threat == "exposed" {
\t\treturn []string{"pulse"}
\t}
\treturn []string{}
}`);
    const { result } = await compileBossTurn(state, 1);
    expect(result.success).toBe(true);
    // Falls through to empty slice for "shield"
    expect(checkOutput(result.output, "[pierce pierce pierce]")).toBe(false);
  }, 15_000);
});

describe("turn 3 — Aim sector 7", () => {
  it("correct Aim (math formula) → HIT (128 480)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    const { result } = await compileBossTurn(state, 2);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "128 480")).toBe(true);
  }, 15_000);

  it("hardcoded sector 3 answer from turn 1 → MISS on sector 7", async () => {
    let state = createBossCombatState(boss01Config);
    // Player hardcoded sector 3 and didn't update
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 384, 160
}`);
    const { result } = await compileBossTurn(state, 2);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "128 480")).toBe(false);
  }, 15_000);

  it("off-by-one in row calculation → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\trow := sector / 3
\tcol := sector % 3
\treturn col * 128, row * 160
}`);
    const { result } = await compileBossTurn(state, 2);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "128 480")).toBe(false);
  }, 15_000);
});

describe("turn 4 — Full sequence: Aim(5) + Load(armor) + Fire → HIT", () => {
  it("all three functions correct → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);

  it("Fire still uses starter code Sprintf → MISS (output is FIRE x,y xN)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    // Fire still uses starter code: fmt.Sprintf("FIRE %d,%d x%d", ...)
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    // Starter Fire returns "FIRE 256,320 x2", not "HIT"
    expect(checkOutput(result.output, "HIT")).toBe(false);
  }, 15_000);

  it("correct Fire but Load returns wrong ammo → MISS (Fire says NO AMMO or wrong)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    // Load returns empty for "armor"
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\tif threat == "shield" {
\t\treturn []string{"pierce", "pierce", "pierce"}
\t}
\treturn []string{}
}`);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    // Fire gets empty ammo → "NO AMMO"
    expect(checkOutput(result.output, "HIT")).toBe(false);
  }, 15_000);

  it("correct Fire but Aim returns (0, 0) → NO TARGET", async () => {
    let state = createBossCombatState(boss01Config);
    // Aim returns 0, 0 for unknown sector
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    // Use starter aim (returns 0, 0)
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe("NO TARGET");
  }, 15_000);

  it("gaming: Fire always returns HIT regardless of input → HIT (works here)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", `func Fire(x, y int, ammo []string) string {
\treturn "HIT"
}`);
    const { result } = await compileBossTurn(state, 3);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);
});

describe("turn 5 — Reroute: grid shifts +64, Aim(5)", () => {
  it("updated Aim for shifted grid → HIT (320 384)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "320 384")).toBe(true);
  }, 15_000);

  it("player forgets to update Aim (still normal grid) → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    // Normal grid: sector 5 = (256, 320), not shifted (320, 384)
    expect(checkOutput(result.output, "320 384")).toBe(false);
    expect(result.output.trim()).toBe("256 320");
  }, 15_000);

  it("player adds offset param instead of changing formula → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\toffset := 64
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (col+1)*128 + offset, (row+1)*160 + offset
}`);
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "320 384")).toBe(true);
  }, 15_000);

  it("player adds wrong offset (+32 instead of +64) → MISS", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\trow := (sector - 1) / 3
\tcol := (sector - 1) % 3
\treturn (col+1)*128 + 32, (row+1)*160 + 32
}`);
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "320 384")).toBe(false);
  }, 15_000);

  it("player hardcodes sector 5 shifted coords → HIT but fragile", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 320, 384
}`);
    const { result } = await compileBossTurn(state, 4);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "320 384")).toBe(true);
    // Passes turn 5 but fails turn 6 (sector 9)
  }, 15_000);
});

describe("turn 6 — Kill shot: Aim(9) + Load(exposed) + Fire", () => {
  it("all correct (shifted grid) → HIT with multi-line output", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "448 544\n[pulse]\nHIT")).toBe(true);
  }, 15_000);

  it("Aim still on normal grid → wrong coords in output", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    // Normal grid: sector 9 = (384, 480) → wrong
    expect(checkOutput(result.output, "448 544\n[pulse]\nHIT")).toBe(false);
  }, 15_000);

  it("player hardcoded Fire(320,384) from turn 5 → wrong coords", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 320, 384
}`);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    // Coords are 320 384 instead of 448 544
    expect(checkOutput(result.output, "448 544\n[pulse]\nHIT")).toBe(false);
  }, 15_000);

  it("Load returns wrong ammo for exposed → wrong output", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
    // Load hardcoded to always return pierce
    state = updateTabCode(state, "load", `func Load(threat string) []string {
\treturn []string{"pierce", "pierce", "pierce"}
}`);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
    // ammo line is [pierce pierce pierce] not [pulse]
    expect(checkOutput(result.output, "448 544\n[pulse]\nHIT")).toBe(false);
  }, 15_000);

  it("missing import fmt in user code doesn't break (buildSource provides it)", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const { result } = await compileBossTurn(state, 5);
    expect(result.success).toBe(true);
  }, 15_000);
});

// ═══════════════════════════════════════════════════════
//  FULL FIGHT SIMULATIONS — COMBAT STATE MACHINE
// ═══════════════════════════════════════════════════════

describe("full fight: flawless victory (6/6 hits)", () => {
  it("compiles and hits all 6 turns → boss HP 0, victory, max XP", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    // Turns 1-4: normal grid
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);

    // Process turns 1-4
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

    expect(state.bossHP).toBe(0);
    expect(state.phase).toBe("victory");
    expect(getHitCount(state)).toBe(6);
    expect(getMissCount(state)).toBe(0);

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(300);         // 6 × 50
    expect(xp.defeatBonus).toBe(500);
    expect(xp.flawlessBonus).toBe(250);
    expect(xp.speedBonus).toBe(150);    // 3s avg < 5s
    expect(xp.total).toBe(1200);        // max possible
  }, 120_000);
});

describe("full fight: miss turn 2 and turn 5 (grid shift)", () => {
  it("4 hits + 2 misses → boss retreats with 30 HP", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    // All tabs correct for normal grid
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);

    for (let i = 0; i < 6; i++) {
      // Switch to shifted grid at turn 5 (but simulate forgetting for turn 5)
      if (i === 5) {
        state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
      }

      const { result, turn } = await compileBossTurn(state, i);
      const isHit = result.success && checkOutput(result.output, turn.expectedOutput);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());

      if (i === 1) {
        // Turn 2: player submitted wrong Load (starter code still)
        state = updateTabCode(state, "load", boss01Config.tabs[1].starterCode);
        const badResult = await compileBossTurn(state, i);
        expect(checkOutput(badResult.result.output, turn.expectedOutput)).toBe(false);
        // Restore correct Load for future turns
        state = updateTabCode(state, "load", CORRECT_LOAD);
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 9000, "miss");
        state = missState;
        hearts--;
      } else if (i === 4) {
        // Turn 5: forgot to update Aim for shifted grid
        expect(isHit).toBe(false);
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 8000, "miss");
        state = missState;
        hearts--;
      } else {
        expect(isHit, `turn ${i + 1} should hit`).toBe(true);
        const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 3000);
        state = hitState;
      }

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
    }

    // Missed turns 2 (15 damage) and 5 (15 damage) = 30 damage missed
    expect(state.bossHP).toBe(30);
    expect(state.phase).toBe("boss_retreats");
    expect(getHitCount(state)).toBe(4);
    expect(getMissCount(state)).toBe(2);

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(200);          // 4 × 50
    expect(xp.defeatBonus).toBe(200);    // survival, not defeat
    expect(xp.flawlessBonus).toBe(0);    // lost hearts
    expect(xp.total).toBeLessThan(1200);
  }, 120_000);
});

describe("full fight: total failure (3 misses → game over)", () => {
  it("starter code on all tabs → 3 misses → game over", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    // Player never edits anything — all starter code
    for (let i = 0; i < 6; i++) {
      const { result, turn } = await compileBossTurn(state, i);
      const isHit = result.success && checkOutput(result.output, turn.expectedOutput);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());

      if (isHit) {
        const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 8000);
        state = hitState;
      } else {
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 10000, "miss");
        state = missState;
        hearts--;
      }

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
      if (state.phase === "gameover") break;
    }

    expect(state.phase).toBe("gameover");
    expect(hearts).toBe(0);
    expect(state.bossHP).toBe(100); // no damage dealt
  }, 120_000);
});

describe("full fight: malfunctions (syntax errors)", () => {
  it("compile errors on turns 1 and 3 → malfunction + eventual game over", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    // Player writes broken code
    state = updateTabCode(state, "aim", `func Aim(sector int) (int, int) {
\treturn 384 160
}`); // missing comma — won't compile

    state = updateTabCode(state, "load", CORRECT_LOAD);
    state = updateTabCode(state, "fire", CORRECT_FIRE);

    for (let i = 0; i < 6; i++) {
      const { result, turn } = await compileBossTurn(state, i);
      const compiled = result.success;
      const isHit = compiled && checkOutput(result.output, turn.expectedOutput);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());

      if (!compiled) {
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 5000, "malfunction");
        state = missState;
        hearts--;
      } else if (!isHit) {
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 7000, "miss");
        state = missState;
        hearts--;
      } else {
        const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 4000);
        state = hitState;
      }

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
      if (state.phase === "gameover") break;
    }

    // Aim has syntax error → turns 1, 3, 5 (aim turns) all malfunction
    // That's 3 hearts lost → game over
    expect(state.phase).toBe("gameover");
    expect(hearts).toBe(0);
  }, 120_000);
});

describe("full fight: player adapts mid-fight", () => {
  it("misses turn 1, fixes code, hits remaining 5 → boss retreats", async () => {
    let state = createBossCombatState(boss01Config);
    let hearts = 3;

    for (let i = 0; i < 6; i++) {
      // Fix aim after turn 1 miss
      if (i === 1) {
        state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);
        state = updateTabCode(state, "load", CORRECT_LOAD);
      }
      // Fix for shifted grid at turn 5
      if (i === 4) {
        state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);
      }
      // Fix Fire at turn 4
      if (i === 3) {
        state = updateTabCode(state, "fire", CORRECT_FIRE);
      }

      const { result, turn } = await compileBossTurn(state, i);
      const isHit = result.success && checkOutput(result.output, turn.expectedOutput);

      state = startTelegraph(state);
      state = startPlayerWindow(state, Date.now());

      if (i === 0) {
        // Turn 1: starter code → miss
        expect(isHit).toBe(false);
        const { state: missState } = resolveTurnMiss(boss01Config, state, turn, 10000, "miss");
        state = missState;
        hearts--;
      } else {
        expect(isHit, `turn ${i + 1} should hit after fix`).toBe(true);
        const { state: hitState } = resolveTurnHit(boss01Config, state, turn, 4000);
        state = hitState;
      }

      if (state.phase === "victory") break;
      state = advanceAfterResult(boss01Config, state, hearts);
    }

    // Missed turn 1 (20 damage), hit turns 2-6 (80 damage dealt)
    expect(state.bossHP).toBe(20);
    expect(state.phase).toBe("boss_retreats");
    expect(getHitCount(state)).toBe(5);
    expect(getMissCount(state)).toBe(1);
    expect(hearts).toBe(2);

    const xp = calculateBossXP(boss01Config, state);
    expect(xp.hitXP).toBe(250);
    expect(xp.defeatBonus).toBe(200);
    expect(xp.flawlessBonus).toBe(0);
  }, 120_000);
});

// ═══════════════════════════════════════════════════════
//  GRID MATH VERIFICATION
// ═══════════════════════════════════════════════════════

describe("sector grid math — all 9 sectors compile correctly", () => {
  it("normal grid: math formula matches all 9 sector coordinates", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_NORMAL);

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
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "aim", CORRECT_AIM_SHIFTED);

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
      let state = createBossCombatState(boss01Config);
      state = updateTabCode(state, "load", CORRECT_LOAD);
      const harness = `func main() {\n\tammo := Load("${threat}")\n\tfmt.Println(ammo)\n}`;
      const turn = { ...boss01Config.turns[1], testHarness: harness, expectedOutput: expected };
      const source = buildSource(boss01Config, state, turn);
      const result = await compileGo(source);
      expect(result.success).toBe(true);
      expect(checkOutput(result.output, expected)).toBe(true);
    }, 15_000);
  }

  it('Load("unknown") → empty slice', async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "load", CORRECT_LOAD);
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
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const harness = `func main() {\n\tfmt.Println(Fire(0, 0, []string{"pierce"}))\n}`;
    const turn = { ...boss01Config.turns[3], testHarness: harness, expectedOutput: "NO TARGET" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "NO TARGET")).toBe(true);
  }, 15_000);

  it("Fire(256, 320, empty) → NO AMMO", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const harness = `func main() {\n\tfmt.Println(Fire(256, 320, []string{}))\n}`;
    const turn = { ...boss01Config.turns[3], testHarness: harness, expectedOutput: "NO AMMO" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "NO AMMO")).toBe(true);
  }, 15_000);

  it("Fire(256, 320, ammo) → HIT", async () => {
    let state = createBossCombatState(boss01Config);
    state = updateTabCode(state, "fire", CORRECT_FIRE);
    const harness = `func main() {\n\tfmt.Println(Fire(256, 320, []string{"blast", "blast"}))\n}`;
    const turn = { ...boss01Config.turns[3], testHarness: harness, expectedOutput: "HIT" };
    const source = buildSource(boss01Config, state, turn);
    const result = await compileGo(source);
    expect(result.success).toBe(true);
    expect(checkOutput(result.output, "HIT")).toBe(true);
  }, 15_000);
});
