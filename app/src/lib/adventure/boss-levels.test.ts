import { describe, it, expect } from "vitest";
import { BOSS_ARENAS } from "./boss-levels";
import { createBossFight, canFire, armWeapon, stepBossFight } from "./boss-sim";
import { parseMap, isWalkable } from "./grid";

describe("boss arenas", () => {
  for (const level of BOSS_ARENAS) {
    describe(level.id, () => {
      const def = level.boss!;

      it("has a boss def with an anchor that exists in the map", () => {
        const grid = parseMap(level.map);
        expect(def).toBeTruthy();
        expect(grid.interactables.get(def.anchor)).toBeTruthy();
      });

      it("has a rectangular map and a walkable spawn", () => {
        const w = level.map[0].length;
        for (const row of level.map) expect(row.length).toBe(w);
        const grid = parseMap(level.map);
        expect(isWalkable(grid, grid.spawn.x, grid.spawn.y)).toBe(true);
      });

      it("has at least one cover (hide) tile", () => {
        const grid = parseMap(level.map);
        expect(grid.tiles.some((t) => t.kind === "hide")).toBe(true);
      });

      it("ends with a floor-0 phase and every phase has a non-empty weapon", () => {
        expect(def.phases.length).toBeGreaterThan(0);
        expect(def.phases[def.phases.length - 1].floor).toBe(0);
        for (const p of def.phases) {
          expect(p.weapon.damage).toBeGreaterThan(0);
          expect(p.weapon.fireRateMs).toBeGreaterThan(0);
          expect(p.weapon.range).toBeGreaterThan(0);
          expect(p.expectedOutput.trim().length).toBeGreaterThan(0);
        }
      });

      it("phase floors strictly descend", () => {
        for (let i = 1; i < def.phases.length; i++) {
          expect(def.phases[i].floor).toBeLessThan(def.phases[i - 1].floor);
        }
      });

      it("Maya has a clear shot on the boss from spawn once armed", () => {
        let s = createBossFight(level, 5);
        s = armWeapon(s, { ...def.phases[0].weapon, range: 50 });
        expect(canFire(s)).toBe(true);
      });

      it("is winnable: arming each phase and firing drains to zero", () => {
        let s = createBossFight(level, 5);
        for (let p = 0; p < def.phases.length && s.status !== "won"; p++) {
          s = armWeapon(s, { ...def.phases[p].weapon, range: 50, damage: 100 });
          for (let i = 0; i < 20 && s.boss.armed && s.status === "fighting"; i++) {
            s = stepBossFight(s, { move: { x: 0, y: 0 } }, 16);
          }
        }
        expect(s.status).toBe("won");
      });
    });
  }
});
