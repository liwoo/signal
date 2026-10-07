// ── Boss-fight arenas ──
// Physical 3D duels. Unlike the stealth levels in levels.ts these carry a `boss`
// def and are driven by boss-sim.ts, not the stealth stepper — so they are NOT
// part of ALL_LEVELS (they'd fail the stealth-level validators). They are
// consumed directly by the boss-fight screen and previewed at /dev/boss.

import type { AdventureLevel } from "./types";

// Server room: Maya (m) faces the wall-mounted LOCKMASTER (L) across an open
// floor. Server racks (s) break line of sight; lit cover pads (h) are where she
// ducks to recode her weapon.
const LOCKMASTER_MAP = [
  "###############",
  "#......*......#",
  "#.h.........h.#",
  "#....s...s....#",
  "#.............#",
  "#......m......#",
  "#.............#",
  "#....s...s....#",
  "#.h.........h.#",
  "#......*......#",
  "#......L......#",
  "###############",
];

export const LOCKMASTER_ARENA: AdventureLevel = {
  id: "boss-01-fight",
  title: "LOCKMASTER",
  subtitle: "WEAPON SYSTEMS",
  location: "SERVER ROOM · SUBLEVEL 3",
  theme: "boss",
  map: LOCKMASTER_MAP,
  guards: [],
  objectives: [],
  ending: "relinquish",
  ambience: ["facility-hum", "tension-drone"],
  opening: "it sees her. the core's awake. her weapon isn't.",
  boss: {
    name: "LOCKMASTER",
    hp: 100,
    anchor: "lockmaster-1",
    attackMinMs: 3200,
    attackMaxMs: 5200,
    telegraphMs: 1100,
    projectileSpeed: 7,
    blastRadius: 1.25,
    defeatXP: 500,
    perPhaseXP: 120,
    flawlessBonus: 300,
    phases: [
      {
        id: "sight",
        floor: 60,
        stake: "a cold weapon is useless. give it damage, a fire rate, and a reach.",
        brief: "set the three traits, then print: DMG <damage> RATE <fireRate> RANGE <range>",
        hint: "damage 12, fire rate 500, range 6.",
        armed: "online. it's weak, but it fires.",
        expectedOutput: "DMG 12 RATE 500 RANGE 6",
        weapon: { damage: 12, fireRateMs: 500, range: 6 },
        starterCode: [
          "package main",
          "",
          "import \"fmt\"",
          "",
          "func main() {",
          "\t// set each trait, then print the spec line.",
          "\tdamage := 0",
          "\tfireRate := 0",
          "\treach := 0",
          "\tfmt.Println(\"DMG\", damage, \"RATE\", fireRate, \"RANGE\", reach)",
          "}",
        ].join("\n"),
      },
      {
        id: "charge",
        floor: 25,
        stake: "it's shrugging off single shots. overclock the fire rate so the weapon cycles faster.",
        brief: "loop the 4 capacitors, adding 90 to the rate each pass, then print the spec.",
        hint: "rate += 90 inside the loop. four passes make 360.",
        armed: "faster now. keep on it.",
        onGate: "it hardened. single shots aren't landing. recode — faster.",
        expectedOutput: "DMG 16 RATE 360 RANGE 7",
        weapon: { damage: 16, fireRateMs: 360, range: 7 },
        starterCode: [
          "package main",
          "",
          "import \"fmt\"",
          "",
          "func main() {",
          "\trate := 0",
          "\tfor i := 0; i < 4; i++ {",
          "\t\t// add 90 to rate each capacitor",
          "\t}",
          "\tdamage := 16",
          "\treach := 7",
          "\tfmt.Println(\"DMG\", damage, \"RATE\", rate, \"RANGE\", reach)",
          "}",
        ].join("\n"),
      },
      {
        id: "combo",
        floor: 0,
        stake: "last stand. sum the three modules into one overload shot and end it.",
        brief: "finish combo() so it adds every module, then fire the total.",
        hint: "range over mods, add each to total.",
        armed: "overload armed. put it down.",
        onGate: "last layer. it's channelling everything into one lock. wire the combo.",
        expectedOutput: "DMG 22 RATE 260 RANGE 8",
        weapon: { damage: 22, fireRateMs: 260, range: 8 },
        starterCode: [
          "package main",
          "",
          "import \"fmt\"",
          "",
          "// combo sums every module's charge into one total.",
          "func combo(mods ...int) int {",
          "\ttotal := 0",
          "\t// add each mod to total",
          "\treturn total",
          "}",
          "",
          "func main() {",
          "\tdamage := combo(8, 7, 7)",
          "\tfmt.Println(\"DMG\", damage, \"RATE\", 260, \"RANGE\", 8)",
          "}",
        ].join("\n"),
      },
    ],
  },
};

export const BOSS_ARENAS: AdventureLevel[] = [LOCKMASTER_ARENA];
export const bossArenaById = new Map(BOSS_ARENAS.map((l) => [l.id, l]));
