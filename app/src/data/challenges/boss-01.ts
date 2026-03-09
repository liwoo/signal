import type { Challenge, BossFightConfig } from "@/types/game";

// ── Sector grid (used by aim.go) ──
// Normal grid:
//   1=(128,160)  2=(256,160)  3=(384,160)
//   4=(128,320)  5=(256,320)  6=(384,320)
//   7=(128,480)  8=(256,480)  9=(384,480)
//
// Shifted grid (turn 5+): +64 on each axis
//   1=(192,224)  2=(320,224)  3=(448,224)
//   4=(192,384)  5=(320,384)  6=(448,384)
//   7=(192,544)  8=(320,544)  9=(448,544)

export const SECTOR_GRID: Record<number, [number, number]> = {
  1: [128, 160], 2: [256, 160], 3: [384, 160],
  4: [128, 320], 5: [256, 320], 6: [384, 320],
  7: [128, 480], 8: [256, 480], 9: [384, 480],
};

export const SECTOR_GRID_SHIFTED: Record<number, [number, number]> = {
  1: [192, 224], 2: [320, 224], 3: [448, 224],
  4: [192, 384], 5: [320, 384], 6: [448, 384],
  7: [192, 544], 8: [320, 544], 9: [448, 544],
};

// ── Boss-01 challenge metadata ──

export const boss01: Challenge = {
  id: "boss-01",
  act: 1,
  chapter: 3,
  title: "LOCKMASTER",
  location: "SERVER ROOM · SUBLEVEL 3",
  concepts: [
    "program structure",
    "functions",
    "multiple returns",
    "slices",
    "for loops",
    "if/else",
    "fmt.Sprintf",
  ],
  steps: [], // Boss fights don't use the step system
  events: [],
  timer: {
    timeLimitSeconds: 0, // No global timer — per-turn windows instead
    gameOverOnExpiry: false,
  },
  isBoss: true,
  parTimeSeconds: 0,
};

// ── Weapon subsystem tabs ──

export const boss01Config: BossFightConfig = {
  bossName: "LOCKMASTER",
  bossHP: 100,
  defeatXP: 500,
  survivalXP: 200,
  retreatThreshold: 30,
  perHitXP: 50,
  flawlessBonus: 250,
  speedBonus: 150,

  tabs: [
    {
      id: "aim",
      filename: "aim.go",
      label: "AIM",
      functionSignature: "func Aim(sector int) (int, int)",
      starterCode: `func Aim(sector int) (int, int) {
\t// Sectors map to grid positions:
\t//   1=(128,160)  2=(256,160)  3=(384,160)
\t//   4=(128,320)  5=(256,320)  6=(384,320)
\t//   7=(128,480)  8=(256,480)  9=(384,480)
\treturn 0, 0
}`,
    },
    {
      id: "load",
      filename: "load.go",
      label: "LOAD",
      functionSignature: "func Load(threat string) []string",
      starterCode: `func Load(threat string) []string {
\t// Threat types and required ammo:
\t//   "shield"  → 3x "pierce"
\t//   "armor"   → 2x "blast"
\t//   "exposed" → 1x "pulse"
\treturn []string{}
}`,
    },
    {
      id: "fire",
      filename: "fire.go",
      label: "FIRE",
      functionSignature: "func Fire(x, y int, ammo []string) string",
      starterCode: `func Fire(x, y int, ammo []string) string {
\tif x == 0 || y == 0 {
\t\treturn "NO TARGET"
\t}
\tif len(ammo) == 0 {
\t\treturn "NO AMMO"
\t}
\treturn fmt.Sprintf("FIRE %d,%d x%d", x, y, len(ammo))
}`,
    },
  ],

  turns: [
    // ── Turn 1: First Lock (aim) ──
    {
      id: 1,
      telegraph: "LOCKMASTER activating sector 3 lock...",
      hint: "aim at sector 3 — check the grid in the comments",
      activeTab: "aim",
      windowSeconds: 25,
      damage: 20,
      testHarness: `func main() {
\tx, y := Aim(3)
\tfmt.Println(x, y)
}`,
      expectedOutput: "384 160",
      bossCharge: "charge-sector",
      hitEffect: "node-explode",
      missEffect: "emp-hit",
    },

    // ── Turn 2: Shield Array (load) ──
    {
      id: 2,
      telegraph: "LOCKMASTER deploying SHIELD ARRAY — 3 nodes",
      hint: "load piercing rounds to match the shield nodes",
      activeTab: "load",
      windowSeconds: 22,
      damage: 15,
      testHarness: `func main() {
\tammo := Load("shield")
\tfmt.Println(ammo)
}`,
      expectedOutput: "[pierce pierce pierce]",
      bossCharge: "shield-deploy",
      hitEffect: "shield-shatter",
      missEffect: "reflect-blast",
    },

    // ── Turn 3: Exposed Core (aim) ──
    {
      id: 3,
      telegraph: "LOCKMASTER core EXPOSED at sector 7!",
      hint: "aim fast — the core is only exposed for a moment",
      activeTab: "aim",
      windowSeconds: 20,
      damage: 20,
      testHarness: `func main() {
\tx, y := Aim(7)
\tfmt.Println(x, y)
}`,
      expectedOutput: "128 480",
      bossCharge: "core-expose",
      hitEffect: "core-hit",
      missEffect: "counter-attack",
    },

    // ── Turn 4: Full Sequence (fire) ──
    {
      id: 4,
      telegraph: "LOCKMASTER charging EMP BLAST from sector 5",
      hint: "wire it together — aim, load, and fire. return \"HIT\" when coordinates and ammo are valid",
      activeTab: "fire",
      windowSeconds: 18,
      damage: 15,
      testHarness: `func main() {
\tx, y := Aim(5)
\tammo := Load("armor")
\tresult := Fire(x, y, ammo)
\tfmt.Println(result)
}`,
      expectedOutput: "HIT",
      bossCharge: "emp-charge",
      hitEffect: "emp-deflect",
      missEffect: "emp-blast",
    },

    // ── Turn 5: Reroute — grid shifts (aim) ──
    {
      id: 5,
      telegraph: "LOCKMASTER rerouting — sector grid SHIFTED +64",
      hint: "the grid shifted by +64 on each axis — update your Aim function",
      activeTab: "aim",
      windowSeconds: 16,
      damage: 15,
      testHarness: `func main() {
\tx, y := Aim(5)
\tfmt.Println(x, y)
}`,
      expectedOutput: "320 384",
      bossCharge: "reroute",
      hitEffect: "system-glitch",
      missEffect: "terminal-spark",
    },

    // ── Turn 6: Kill Shot (fire) ──
    {
      id: 6,
      telegraph: "LOCKMASTER CRITICAL — all defenses down!",
      hint: "everything together — aim sector 9, load for exposed, fire",
      activeTab: "fire",
      windowSeconds: 14,
      damage: 15,
      testHarness: `func main() {
\tx, y := Aim(9)
\tammo := Load("exposed")
\tresult := Fire(x, y, ammo)
\tfmt.Println(x, y)
\tfmt.Println(ammo)
\tfmt.Println(result)
}`,
      expectedOutput: "448 544\n[pulse]\nHIT",
      bossCharge: "critical",
      hitEffect: "boss-collapse",
      missEffect: "final-strike",
    },
  ],
};
