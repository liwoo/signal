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
    "fmt.Printf",
    "variadic functions",
    "strings.Join",
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
// The malware corrupted each file with realistic bugs:
// - aim.go:  switch cases have wrong types, missing return, broken syntax
// - load.go: slice syntax mangled, loop broken, wrong variable names
// - fire.go: missing closing brace, wrong format verb, broken condition

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
      // Corrupted: "in" instead of "int", missing sector 3 case,
      // switch on wrong variable, missing closing brace
      starterCode: `// WEAPON TARGETING SYSTEM
// Sectors map to grid coordinates:
//   1=(128,160)  2=(256,160)  3=(384,160)
//   4=(128,320)  5=(256,320)  6=(384,320)
//   7=(128,480)  8=(256,480)  9=(384,480)

func Aim(sector in) (int, int) {
\tswitch s {
\tcase 1:
\t\treturn 128, 160
\tcase 2:
\t\treturn 256, 160
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
\treturn 0, 0`,
    },
    {
      id: "load",
      filename: "load.go",
      label: "LOAD",
      functionSignature: "func Load(threat string) []string",
      // Corrupted: "sting" instead of "string", broken slice literal,
      // wrong loop syntax, variable name mismatch
      starterCode: `// AMMO LOADING SYSTEM
// Threat types:
//   "shield"  -> 3x "pierce"
//   "armor"   -> 2x "blast"
//   "exposed" -> 1x "pulse"

func Load(threat sting) []string {
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
}`,
    },
    {
      id: "fire",
      filename: "fire.go",
      label: "FIRE",
      functionSignature: "func Fire(x, y int, ammo []string) string",
      // Corrupted: const Hit="FIRE" (should be "HIT"), && instead of ||,
      // missing closing brace on first if block
      starterCode: `// WEAPON FIRE CONTROL

const (
\tHit      = "FIRE"
\tNoTarget = "NO TARGET"
\tNoAmmo   = "NO AMMO"
)

func Fire(x, y int, ammo []string) string {
\tif x == 0 && y == 0 {
\t\treturn NoTarget

\tif len(ammo) == 0 {
\t\treturn NoAmmo
\t}
\treturn Hit
}`,
    },
    {
      id: "main",
      filename: "main.go",
      label: "COMBO",
      functionSignature: "func Combo(shots ...string) string",
      // Empty — player writes from scratch using tutorial knowledge
      starterCode: `// COMBO SYSTEM
// Chain multiple shots into one devastating barrage.
//
// Write a function called Combo that:
//   - takes any number of strings (variadic: ...string)
//   - returns them joined with " | "
//
// Example: Combo("HIT", "HIT") returns "HIT | HIT"
// Hint: strings.Join(slice, separator)`,
    },
  ],

  turns: [
    // ── Turn 1: Fix aim.go — wrong type + switch variable + missing case 3 + missing brace ──
    // Bugs: "in" → "int", "s" → "sector", add case 3, add closing "}"
    {
      id: 1,
      telegraph: "LOCKMASTER activating sector 3 lock...",
      hint: "aim.go won't compile — check the parameter type, the switch variable name, and the missing case",
      activeTab: "aim",
      windowSeconds: 25,
      damage: 15,
      testHarness: `func main() {
\tx, y := Aim(3)
\tfmt.Printf("AIM %d %d\\n", x, y)
}`,
      expectedOutput: "AIM 384 160",
      bossCharge: "charge-sector",
      hitEffect: "node-explode",
      missEffect: "emp-hit",
    },

    // ── Turn 2: Fix load.go — wrong type + wrong variable name ──
    // Bugs: "sting" → "string", "ammo" → "ammoType"
    {
      id: 2,
      telegraph: "LOCKMASTER deploying SHIELD ARRAY — 3 nodes",
      hint: "load.go has a broken type and a wrong variable name in the append loop",
      activeTab: "load",
      windowSeconds: 22,
      damage: 15,
      testHarness: `func main() {
\tammo := Load("shield")
\tfor _, a := range ammo {
\t\tfmt.Println(a)
\t}
}`,
      expectedOutput: "pierce\npierce\npierce",
      bossCharge: "shield-deploy",
      hitEffect: "shield-shatter",
      missEffect: "reflect-blast",
    },

    // ── Turn 3: Fix fire.go — missing brace, wrong operator, wrong return ──
    // Bugs: missing "}" after NO TARGET, "&&" → "||", "FIRE" → "HIT"
    {
      id: 3,
      telegraph: "LOCKMASTER charging EMP BLAST!",
      hint: "fire.go is mangled — missing brace, wrong operator, and it returns the wrong string",
      activeTab: "fire",
      windowSeconds: 22,
      damage: 15,
      testHarness: `func main() {
\tresult := Fire(256, 320, []string{"blast", "blast"})
\tfmt.Println(result)
}`,
      expectedOutput: "HIT",
      bossCharge: "emp-charge",
      hitEffect: "emp-deflect",
      missEffect: "emp-blast",
    },

    // ── Turn 4: Wire all three — printf the full attack sequence ──
    // All 3 weapon files should be fixed now. Print AIM + LOAD + result.
    {
      id: 4,
      telegraph: "LOCKMASTER core EXPOSED at sector 5!",
      hint: "all files should work now — this turn wires them together. the output must match exactly.",
      activeTab: "fire",
      windowSeconds: 20,
      damage: 20,
      testHarness: `func main() {
\tx, y := Aim(5)
\tammo := Load("armor")
\tresult := Fire(x, y, ammo)
\tfmt.Printf("AIM %d %d\\n", x, y)
\tfmt.Printf("LOAD %d\\n", len(ammo))
\tfmt.Println(result)
}`,
      expectedOutput: "AIM 256 320\nLOAD 2\nHIT",
      bossCharge: "core-expose",
      hitEffect: "core-hit",
      missEffect: "counter-attack",
    },

    // ── Turn 5: Grid shift — update aim.go coordinates (+64 each axis) ──
    {
      id: 5,
      telegraph: "LOCKMASTER rerouting — sector grid SHIFTED +64 on each axis!",
      hint: "the grid shifted +64 on both axes — update every coordinate in aim.go",
      activeTab: "aim",
      windowSeconds: 16,
      damage: 15,
      testHarness: `func main() {
\tx, y := Aim(5)
\tfmt.Printf("AIM %d %d\\n", x, y)
}`,
      expectedOutput: "AIM 320 384",
      bossCharge: "reroute",
      hitEffect: "system-glitch",
      missEffect: "terminal-spark",
    },

    // ── Turn 6: Kill shot — fix Combo variadic + chain 3 shots ──
    // Fix main.go: "sting" → "string", " + " → " | "
    // All 4 files must be correct for the final barrage
    {
      id: 6,
      telegraph: "LOCKMASTER CRITICAL — all defenses down!",
      hint: "fix Combo in main.go — wrong type and wrong separator. then fire three shots at once.",
      activeTab: "main",
      windowSeconds: 18,
      damage: 20,
      testHarness: `func main() {
\tx1, y1 := Aim(7)
\tx2, y2 := Aim(5)
\tx3, y3 := Aim(9)
\ts1 := Fire(x1, y1, Load("exposed"))
\ts2 := Fire(x2, y2, Load("exposed"))
\ts3 := Fire(x3, y3, Load("exposed"))
\tfmt.Println(Combo(s1, s2, s3))
}`,
      expectedOutput: "HIT | HIT | HIT",
      bossCharge: "critical",
      hitEffect: "boss-collapse",
      missEffect: "final-strike",
    },
  ],
};
