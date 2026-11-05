import type { LevelTheme } from "@/lib/adventure/types";
import type { SceneType } from "./scene-painter";

// Cinematic blocking uses the same one-unit tile grid as the missions. These
// sets are scenery, not playable levels; objectives and saves stay untouched.
export const CINEMATIC_ORIGIN = { x: 12.5, z: 7.5 };

export function cinematicSet(background: SceneType) {
  const theme: LevelTheme = background === "lab" || background === "lab-raid" ? "comms"
    : background === "chase" ? "corridor" : background === "boss-arena" ? "boss" : background;
  const rows = Array.from({ length: 16 }, (_, z) =>
    Array.from({ length: 24 }, (_, x): string => x === 0 || x === 23 || z === 0 || z === 15 ? "#" : "."));
  const put = (x: number, z: number, glyph: string) => { rows[z][x] = glyph; };
  put(12, 8, "m");
  put(19, 0, "d"); put(20, 0, "k");
  for (const x of [4, 12, 20]) for (const z of [3, 11]) put(x, z, "*");
  if (background === "lab" || background === "lab-raid") {
    // Leave a full tile behind the actors' billboards so screens cannot hide
    // Maya's upper body when viewed through the elevated mission camera.
    for (const x of [5, 8, 13]) put(x, 4, "T");
    for (const x of [3, 4, 9, 10]) put(x, 1, "s");
    put(18, 2, "c"); put(19, 2, "c"); put(21, 9, "p");
  } else if (background === "cell") {
    for (let x = 1; x < 23; x++) put(x, 0, x === 19 ? "d" : "=");
    put(11, 3, "T"); put(19, 9, "b"); put(19, 10, "b");
    put(3, 3, "c"); put(3, 12, "p");
  } else if (background === "vent") {
    for (let z = 1; z < 15; z++) for (let x = 1; x < 23; x++) put(x, z, "v");
    put(12, 8, "m"); put(18, 4, "o"); put(5, 11, "o");
  } else if (background === "server" || background === "boss-arena") {
    for (const x of [2, 4, 19, 21]) for (const z of [2, 3, 6, 7, 11, 12]) put(x, z, "s");
    put(12, 2, background === "boss-arena" ? "L" : "T");
    put(10, 2, "p"); put(14, 2, "c");
  } else {
    for (const x of [2, 21]) for (const z of [3, 7, 11]) {
      put(x, z, "c"); put(x, z + 1, "p");
    }
    put(12, 1, "d"); put(13, 1, "k");
  }
  return { theme, map: rows.map((row) => row.join("")) };
}
