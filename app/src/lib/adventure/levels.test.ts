import { describe, it, expect } from "vitest";
import { ALL_LEVELS, levelById } from "./levels";
import { parseMap, findPath, isWalkable, adjacentWalkable } from "./grid";
import { createSim, stepSim } from "./sim";
import { WALKABLE } from "./types";
import type { AdventureLevel } from "./types";

/** Doors every objective up to (and including) index i could have opened. */
function doorsOpenBefore(level: AdventureLevel, index: number): Set<string> {
  const open = new Set<string>();
  for (let i = 0; i < index; i++) {
    for (const id of level.objectives[i].unlocks ?? []) open.add(id);
    for (const cue of level.objectives[i].cues ?? []) for (const id of cue.unlock ?? []) open.add(id);
  }
  // Cues on the current objective fire before the player needs the door too.
  for (const cue of level.objectives[index]?.cues ?? []) for (const id of cue.unlock ?? []) open.add(id);
  return open;
}

describe("adventure levels", () => {
  it("has twelve levels with unique ids, one intro and one aftermath per chapter", () => {
    expect(ALL_LEVELS).toHaveLength(12);
    const ids = ALL_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id.endsWith("-intro"))).toHaveLength(6);
    expect(ids.filter((id) => id.endsWith("-complete"))).toHaveLength(6);
    expect(levelById("chapter-01-intro")?.ending).toBe("relinquish");
  });

  for (const level of ALL_LEVELS) {
    describe(level.id, () => {
      const grid = parseMap(level.map);

      it("has rectangular rows and a spawn on a walkable tile", () => {
        const widths = new Set(level.map.map((r) => r.length));
        expect(widths.size).toBe(1);
        expect(isWalkable(grid, grid.spawn.x, grid.spawn.y)).toBe(true);
      });

      it("intro levels end at a terminal-style hand-off; aftermath levels end on a card", () => {
        if (level.id.endsWith("-intro")) {
          expect(level.ending).toBe("relinquish");
          const last = level.objectives[level.objectives.length - 1];
          const target = grid.interactables.get(last.target)!;
          expect(["terminal", "panel", "lockmaster"]).toContain(target.kind);
        } else {
          expect(level.ending).toBe("exit");
          expect(level.endCard?.text).toBeTruthy();
        }
      });

      it("hides exactly one book chapter in intro levels, taken before the terminal; none in aftermaths", () => {
        const books = [...grid.interactables.values()].filter((t) => t.kind === "book");
        const bookObjectives = level.objectives.filter((o) => o.target === "book-1");
        if (level.id.endsWith("-intro")) {
          expect(books).toHaveLength(1);
          expect(bookObjectives).toHaveLength(1);
          expect(bookObjectives[0].kind).toBe("interact");
          const index = level.objectives.indexOf(bookObjectives[0]);
          expect(index).toBeLessThan(level.objectives.length - 1);
        } else {
          expect(books).toHaveLength(0);
          expect(bookObjectives).toHaveLength(0);
        }
      });

      it("every objective targets an existing interactable, reachable in order", () => {
        let from = { x: grid.spawn.x, y: grid.spawn.y };
        level.objectives.forEach((objective, index) => {
          const target = grid.interactables.get(objective.target);
          expect(target, `${objective.id} → ${objective.target}`).toBeDefined();
          const open = doorsOpenBefore(level, index);
          const standing = WALKABLE.has(target!.kind) ? [target!] : adjacentWalkable(grid, target!, open);
          expect(standing.length, `${objective.id}: nowhere to stand next to ${objective.target}`).toBeGreaterThan(0);
          const reachable = standing.find((s) => findPath(grid, from, s, open) !== null);
          expect(reachable, `${objective.id}: ${objective.target} unreachable from ${from.x},${from.y}`).toBeDefined();
          from = reachable!;
          if (objective.kind === "interact") expect(objective.verb).toBeTruthy();
          for (const id of objective.unlocks ?? []) expect(grid.interactables.get(id)?.kind).toBe("door");
        });
      });

      it("guard routes stay on walkable tiles and trigger ids exist", () => {
        const objectiveIds = new Set(level.objectives.map((o) => o.id));
        const allDoors = new Set([...grid.interactables.values()].filter((t) => t.kind === "door").map((t) => t.id!));
        for (const guard of level.guards) {
          expect(guard.route.length).toBeGreaterThanOrEqual(2);
          for (const stop of guard.route) {
            expect(isWalkable(grid, stop.x, stop.y, allDoors), `${guard.id} stop ${stop.x},${stop.y}`).toBe(true);
          }
          if (guard.triggerOn) expect(objectiveIds.has(guard.triggerOn)).toBe(true);
          if (guard.leaveOn) expect(objectiveIds.has(guard.leaveOn)).toBe(true);
        }
      });

      it("maya's voice is lowercase without exclamation marks", () => {
        const lines = [
          level.opening,
          ...level.objectives.flatMap((o) => [o.stake, o.thought, o.done, ...(o.cues ?? []).map((c) => c.thought)]),
        ].filter((t): t is string => !!t);
        for (const line of lines) {
          expect(line, line).not.toMatch(/!/);
          expect(line, line).toBe(line.toLowerCase());
        }
      });

      it("boots a simulation and survives a few idle seconds", () => {
        let s = createSim(level);
        for (let t = 0; t < 3000; t += 16) s = stepSim(s, { move: { x: 0, y: 0 }, interact: false }, 16);
        expect(["playing", "captured"]).toContain(s.status);
      });
    });
  }
});
