// ── LOCKMASTER in Python ──
// The 3D duel's three rearm phases (shared spine in lib/adventure/boss-levels.ts),
// with the weapon program realized in Python. Same expected spec lines.

import type { BossPhaseRealization } from "../realizations";

export const PY_LOCKMASTER_PHASES: Record<string, BossPhaseRealization> = {
  sight: {
    starterCode: [
      "# set each trait, then print the spec line.",
      "damage = 0",
      "fire_rate = 0",
      "reach = 0",
      "print(\"DMG\", damage, \"RATE\", fire_rate, \"RANGE\", reach)",
    ].join("\n"),
  },
  charge: {
    starterCode: [
      "rate = 0",
      "for i in range(4):",
      "    pass  # add 90 to rate each capacitor",
      "damage = 16",
      "reach = 7",
      "print(\"DMG\", damage, \"RATE\", rate, \"RANGE\", reach)",
    ].join("\n"),
  },
  combo: {
    hint: "loop over mods with for m in mods, and add each to total.",
    starterCode: [
      "# combo sums every module's charge into one total.",
      "def combo(*mods):",
      "    total = 0",
      "    # add each mod to total",
      "    return total",
      "",
      "",
      "damage = combo(8, 7, 7)",
      "print(\"DMG\", damage, \"RATE\", 260, \"RANGE\", 8)",
    ].join("\n"),
  },
};
