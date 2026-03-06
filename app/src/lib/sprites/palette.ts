// ── Color palette for scene painting ──
// Dramatically brighter for visual impact. Inspired by high-quality pixel art.

export const C = {
  // Backgrounds / structure — MUCH brighter for visible environments
  void: "#080c14",
  floorDark: "#1a2840",
  floorMid: "#243454",
  floorLight: "#2e4268",
  floorAccent: "#3a5278",
  wallDark: "#1e3050",
  wallMid: "#2a4268",
  wallLight: "#365480",
  wallHighlight: "#426898",
  ceilingDark: "#141e30",
  ceilingMid: "#1a2840",

  // Metals / pipes — visible metallic sheen
  metalDark: "#2a3e58",
  metalMid: "#3e5878",
  metalLight: "#567898",
  metalHighlight: "#6e90b0",

  // Signal green
  signalDim: "#1a6a3a",
  signalMid: "#30aa60",
  signalBright: "#6effa0",
  signalGlow: "rgba(110,255,160,0.2)",
  signalGlowStrong: "rgba(110,255,160,0.4)",

  // Terminal / screen cyan
  termDim: "#105878",
  termMid: "#00a0dd",
  termBright: "#00d4ff",
  termGlow: "rgba(0,212,255,0.15)",

  // Danger red / alarm
  dangerDim: "#5a1818",
  dangerMid: "#dd2828",
  dangerBright: "#ff4848",
  dangerGlow: "rgba(255,64,64,0.2)",

  // Alert amber
  alertDim: "#4a3010",
  alertMid: "#dd9018",
  alertBright: "#ffb030",

  // Warm tones (wood, fabric, organic)
  woodDark: "#3a2a18",
  woodMid: "#5a4428",
  woodLight: "#7a6038",
  woodHighlight: "#9a7848",

  // Concrete / stone tones
  concreteDark: "#282830",
  concreteMid: "#3a3a44",
  concreteLight: "#505060",
  concreteHighlight: "#686878",

  // Character - Maya (warm natural skin, dark hair, green hoodie accents)
  skinDark: "#8a6850",
  skinMid: "#b08868",
  skinLight: "#c8a080",
  hairDark: "#101418",
  hairMid: "#202830",
  hairHighlight: "#384858",
  hoodieDark: "#1a4830",
  hoodieMid: "#266840",
  hoodieLight: "#348850",
  hoodieAccent: "#48d080",
  pantsDark: "#1a2438",
  pantsMid: "#243448",
  bootsDark: "#141c28",

  // Character - Guard (dark tactical armor + red accents)
  guardDark: "#1a1420",
  guardMid: "#302838",
  guardLight: "#484050",
  guardAccent: "#c83838",
  guardVisor: "#ff4848",
  guardArmor: "#241e2a",
} as const;
