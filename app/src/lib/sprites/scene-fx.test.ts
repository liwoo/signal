import { describe, it, expect } from "vitest";
import {
  PARALLAX,
  SCENE_FX,
  actorTint,
  depthScale,
  dustMote,
  dutchAngle,
  flashLevel,
  flickerLevel,
  glitchBands,
  glitchLevel,
  hash01,
  parallaxOffset,
  pulseLevel,
  rgbOf,
  shakeOffset,
  strobeLevel,
  swayOffset,
} from "./scene-fx";
import { SCENE_PROJECTION, farBottomFrac } from "./projection";
import type { SceneType } from "./scene-painter";

const SCENES: SceneType[] = ["cell", "corridor", "chase", "vent", "server", "boss-arena"];

describe("scene-fx determinism", () => {
  it("hash01 is stable and in [0,1)", () => {
    const a = hash01(42);
    expect(a).toBe(hash01(42));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(hash01(1)).not.toBe(hash01(2));
  });

  it("dust motes are a pure function of time and stay inside their region", () => {
    const spec = SCENE_FX.cell.dust!;
    const w = 1040;
    const h = 600;
    for (let i = 0; i < spec.count; i++) {
      for (const t of [0, 1234, 55555, 240000]) {
        const a = dustMote(spec, i, t, w, h);
        const b = dustMote(spec, i, t, w, h);
        expect(a).toEqual(b);
        expect(a.y).toBeGreaterThanOrEqual(spec.y0 * h);
        expect(a.y).toBeLessThanOrEqual(spec.y1 * h);
        expect(a.x).toBeGreaterThanOrEqual(spec.x0 * w - spec.wander);
        expect(a.x).toBeLessThanOrEqual(spec.x1 * w + spec.wander);
        expect(a.alpha).toBeGreaterThan(0);
        expect(a.alpha).toBeLessThanOrEqual(spec.alpha);
      }
    }
  });

  it("flicker stays within a usable brightness band and dips sometimes", () => {
    let min = 1;
    let max = 0;
    for (let t = 0; t < 20000; t += 16) {
      const l = flickerLevel(t, SCENE_FX.cell.flicker);
      min = Math.min(min, l);
      max = Math.max(max, l);
    }
    expect(max).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThan(0.9);
    expect(min).toBeLessThan(0.85);
    expect(min).toBeGreaterThan(0.35);
    expect(flickerLevel(500, { depth: 0, seed: 1 })).toBe(1);
  });

  it("strobe peaks once per period and is dark between peaks", () => {
    const spec = SCENE_FX.chase.strobe!;
    expect(strobeLevel(0, spec)).toBeCloseTo(spec.intensity, 5);
    expect(strobeLevel(spec.periodMs, spec)).toBeCloseTo(spec.intensity, 5);
    expect(strobeLevel(spec.periodMs / 2, spec)).toBe(0);
    expect(strobeLevel(spec.periodMs * 0.3, spec)).toBeLessThan(spec.intensity * 0.1);
  });

  it("pulse oscillates between 1-depth and 1", () => {
    let min = 1;
    let max = 0;
    for (let t = 0; t < 4000; t += 10) {
      const l = pulseLevel(t, 1000, 0.4);
      min = Math.min(min, l);
      max = Math.max(max, l);
    }
    expect(min).toBeCloseTo(0.6, 2);
    expect(max).toBeCloseTo(1, 2);
  });
});

describe("camera body", () => {
  it("sway is small and continuous", () => {
    for (let t = 0; t < 30000; t += 100) {
      const s = swayOffset(t);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(3.7);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(2.3);
      expect(Math.abs(s.rot)).toBeLessThanOrEqual(0.003);
    }
  });

  it("shake is zero outside its window and decays inside it", () => {
    const shakes = [{ atMs: 1000, durationMs: 500, intensity: 8 }];
    expect(shakeOffset(0, shakes)).toEqual({ x: 0, y: 0, rot: 0 });
    expect(shakeOffset(1600, shakes)).toEqual({ x: 0, y: 0, rot: 0 });
    expect(shakeOffset(1000, undefined)).toEqual({ x: 0, y: 0, rot: 0 });
    let early = 0;
    let late = 0;
    for (let t = 1000; t < 1100; t += 4) early = Math.max(early, Math.abs(shakeOffset(t, shakes).x));
    for (let t = 1400; t < 1500; t += 4) late = Math.max(late, Math.abs(shakeOffset(t, shakes).x));
    expect(early).toBeGreaterThan(late);
    expect(early).toBeLessThanOrEqual(8);
  });

  it("dutch eases in and holds", () => {
    expect(dutchAngle(0, 0.03)).toBe(0);
    expect(dutchAngle(350, 0.03)).toBeGreaterThan(0);
    expect(dutchAngle(350, 0.03)).toBeLessThan(0.03);
    expect(dutchAngle(700, 0.03)).toBeCloseTo(0.03, 6);
    expect(dutchAngle(5000, 0.03)).toBeCloseTo(0.03, 6);
    expect(dutchAngle(5000, undefined)).toBe(0);
  });

  it("flash reports the brightest active flash and its colour", () => {
    const flashes = [
      { atMs: 100, durationMs: 400, color: "#ff0000", intensity: 0.3 },
      { atMs: 200, durationMs: 400, color: "#00ff00", intensity: 0.6 },
    ];
    expect(flashLevel(50, flashes).level).toBe(0);
    expect(flashLevel(100, flashes)).toEqual({ level: 0.3, color: "#ff0000" });
    expect(flashLevel(200, flashes).color).toBe("#00ff00");
    expect(flashLevel(200, flashes).level).toBeCloseTo(0.6, 6);
    expect(flashLevel(700, flashes).level).toBe(0);
  });

  it("glitch envelope and bands are deterministic and bounded", () => {
    const glitches = [{ atMs: 0, durationMs: 300 }];
    expect(glitchLevel(0, glitches)).toBe(1);
    expect(glitchLevel(150, glitches)).toBeCloseTo(0.75, 6);
    expect(glitchLevel(301, glitches)).toBe(0);
    expect(glitchLevel(100, undefined)).toBe(0);
    const bands = glitchBands(120, 1, 400);
    expect(bands).toEqual(glitchBands(120, 1, 400));
    expect(bands.length).toBeGreaterThanOrEqual(2);
    for (const b of bands) {
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(400);
      expect(Math.abs(b.dx)).toBeLessThanOrEqual(28);
    }
    expect(glitchBands(120, 0, 400)).toEqual([]);
  });
});

describe("parallax + depth", () => {
  it("fore plane leads the camera, back plane lags it", () => {
    expect(PARALLAX.back).toBeLessThan(1);
    expect(PARALLAX.fore).toBeGreaterThan(1);
    expect(parallaxOffset(1, 700, 520)).toBe(0);
    expect(parallaxOffset(PARALLAX.back, 700, 520)).toBeGreaterThan(0);
    expect(parallaxOffset(PARALLAX.fore, 700, 520)).toBeLessThan(0);
    expect(parallaxOffset(PARALLAX.back, 520, 520)).toBe(0);
  });

  it("actors grow as they walk toward the camera in every scene", () => {
    for (const type of SCENES) {
      const h = 600;
      const far = farBottomFrac(SCENE_PROJECTION[type]) * h;
      expect(depthScale(type, far - 50, h)).toBeCloseTo(depthScale(type, far, h), 6);
      expect(depthScale(type, far, h)).toBeLessThan(depthScale(type, (far + h) / 2, h));
      expect(depthScale(type, (far + h) / 2, h)).toBeLessThan(depthScale(type, h, h));
      expect(depthScale(type, h + 100, h)).toBeCloseTo(depthScale(type, h, h), 6);
    }
  });

  it("every scene declares fx with one key flicker and a rim colour", () => {
    for (const type of SCENES) {
      const fx = SCENE_FX[type];
      expect(fx.flicker.depth).toBeGreaterThanOrEqual(0);
      expect(fx.flicker.depth).toBeLessThanOrEqual(1);
      expect(fx.rim.startsWith("#")).toBe(true);
      expect(fx.rays.length).toBeGreaterThanOrEqual(1);
    }
    expect(SCENE_FX.chase.strobe).toBeDefined();
  });
});

describe("actor lighting", () => {
  const key = { x: 300, y: 100, color: "#dce6f5", radius: 700, intensity: 0.5 };

  it("is brighter near the key than far from it", () => {
    const near = actorTint(300, 150, key);
    const far = actorTint(3000, 150, key);
    expect(near >> 16).toBeGreaterThan(far >> 16);
    expect(far >> 16).toBeGreaterThanOrEqual(Math.floor(255 * 0.6));
  });

  it("boosts toward the wash colour under a strobe", () => {
    const plain = actorTint(300, 150, key);
    const red = actorTint(300, 150, key, { color: "#ff4848", level: 1 });
    expect(red >> 16).toBeGreaterThanOrEqual(plain >> 16);
    expect(red & 0xff).toBeLessThanOrEqual(plain & 0xff);
  });

  it("parses palette colours", () => {
    expect(rgbOf("#6effa0")).toEqual([110, 255, 160]);
    expect(rgbOf("#fff")).toEqual([255, 255, 255]);
    expect(rgbOf("rgba(1, 2, 3, 0.5)")).toEqual([1, 2, 3]);
  });
});
