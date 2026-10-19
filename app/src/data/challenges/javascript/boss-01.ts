// ── LOCKMASTER in JavaScript ──
// The 3D duel's three rearm phases (shared spine in lib/adventure/boss-levels.ts),
// with the weapon program realized in JavaScript. Same expected spec lines.

import type { BossPhaseRealization } from "../realizations";

export const JS_LOCKMASTER_PHASES: Record<string, BossPhaseRealization> = {
  sight: {
    starterCode: [
      "// set each trait, then print the spec line.",
      "let damage = 0;",
      "let fireRate = 0;",
      "let reach = 0;",
      "console.log(\"DMG\", damage, \"RATE\", fireRate, \"RANGE\", reach);",
    ].join("\n"),
  },
  charge: {
    starterCode: [
      "let rate = 0;",
      "for (let i = 0; i < 4; i++) {",
      "  // add 90 to rate each capacitor",
      "}",
      "const damage = 16;",
      "const reach = 7;",
      "console.log(\"DMG\", damage, \"RATE\", rate, \"RANGE\", reach);",
    ].join("\n"),
  },
  combo: {
    hint: "loop over mods with for...of and add each to total.",
    starterCode: [
      "// combo sums every module's charge into one total.",
      "function combo(...mods) {",
      "  let total = 0;",
      "  // add each mod to total",
      "  return total;",
      "}",
      "",
      "const damage = combo(8, 7, 7);",
      "console.log(\"DMG\", damage, \"RATE\", 260, \"RANGE\", 8);",
    ].join("\n"),
  },
};
