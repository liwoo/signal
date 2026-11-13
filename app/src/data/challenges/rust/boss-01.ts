// ── LOCKMASTER in Rust ──
// The 3D duel's three rearm phases (shared spine in lib/adventure/boss-levels.ts),
// with the weapon program realized in Rust. Same expected spec lines.

import type { BossPhaseRealization } from "../realizations";

export const RS_LOCKMASTER_PHASES: Record<string, BossPhaseRealization> = {
  sight: {
    starterCode: [
      "// set each trait, then print the spec line.",
      "fn main() {",
      "    let damage = 0;",
      "    let fire_rate = 0;",
      "    let reach = 0;",
      "    println!(\"DMG {} RATE {} RANGE {}\", damage, fire_rate, reach);",
      "}",
    ].join("\n"),
  },
  charge: {
    hint: "rate += 90; inside the loop. four passes make 360.",
    starterCode: [
      "fn main() {",
      "    let mut rate = 0;",
      "    for _ in 0..4 {",
      "        // add 90 to rate each capacitor",
      "    }",
      "    let damage = 16;",
      "    let reach = 7;",
      "    println!(\"DMG {} RATE {} RANGE {}\", damage, rate, reach);",
      "}",
    ].join("\n"),
  },
  combo: {
    hint: "loop with for m in mods, and add each to total.",
    starterCode: [
      "// combo sums every module's charge into one total.",
      "fn combo(mods: &[i32]) -> i32 {",
      "    let mut total = 0;",
      "    // add each mod to total",
      "    total",
      "}",
      "",
      "fn main() {",
      "    let damage = combo(&[8, 7, 7]);",
      "    println!(\"DMG {} RATE {} RANGE {}\", damage, 260, 8);",
      "}",
    ].join("\n"),
  },
};
