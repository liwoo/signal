import { describe, it, expect } from "vitest";
import { getCameraPos, effectiveDurationMs } from "./camera";
import type { CameraKeyframe, SceneDefinition } from "./scenes";
import {
  INTRO_SCENES,
  CHAPTER_01_COMPLETE_SCENES,
  CHAPTER_02_INTRO_SCENES,
  CHAPTER_02_COMPLETE_SCENES,
  CHAPTER_03_INTRO_SCENES,
  CHAPTER_03_COMPLETE_SCENES,
  BOSS_01_INTRO_SCENES,
  BOSS_01_COMPLETE_SCENES,
} from "./scenes";

const SCENE_W = 1040;
const SCENE_H = 600;

describe("getCameraPos", () => {
  it("returns the single keyframe verbatim with default zoom", () => {
    const kf: CameraKeyframe[] = [{ x: 500, y: 300, time: 0 }];
    expect(getCameraPos(kf, 0)).toEqual({ x: 500, y: 300, zoom: 1 });
    expect(getCameraPos(kf, 9999)).toEqual({ x: 500, y: 300, zoom: 1 });
  });

  it("honours an explicit zoom on a single keyframe", () => {
    const kf: CameraKeyframe[] = [{ x: 500, y: 300, zoom: 1.4, time: 0 }];
    expect(getCameraPos(kf, 0).zoom).toBe(1.4);
  });

  it("clamps to the first keyframe before its time and the last after", () => {
    const kf: CameraKeyframe[] = [
      { x: 400, y: 300, zoom: 1, time: 0 },
      { x: 600, y: 300, zoom: 1.2, time: 2000 },
    ];
    expect(getCameraPos(kf, -100)).toMatchObject({ x: 400, zoom: 1 });
    expect(getCameraPos(kf, 5000)).toMatchObject({ x: 600, zoom: 1.2 });
  });

  it("eases between two keyframes (monotonic, endpoints exact)", () => {
    const kf: CameraKeyframe[] = [
      { x: 400, y: 300, zoom: 1, time: 0 },
      { x: 600, y: 300, zoom: 1.5, time: 1000 },
    ];
    const mid = getCameraPos(kf, 500);
    // easeInOutCubic(0.5) === 0.5, so the midpoint is the linear midpoint.
    expect(mid.x).toBeCloseTo(500, 5);
    expect(mid.zoom).toBeCloseTo(1.25, 5);
    // Quarter point is eased toward the start (x < linear 450).
    expect(getCameraPos(kf, 250).x).toBeLessThan(450);
  });

  it("interpolates the centered point, not an offset", () => {
    // Distinct start/end so a bug that treated x as an offset would show up.
    const kf: CameraKeyframe[] = [
      { x: 300, y: 200, time: 0 },
      { x: 700, y: 400, time: 1000 },
    ];
    expect(getCameraPos(kf, 500)).toMatchObject({ x: 500, y: 300 });
  });
});

describe("effectiveDurationMs", () => {
  const base: SceneDefinition = {
    background: "cell",
    actors: [],
    camera: [{ x: 500, y: 300, time: 0 }],
    durationMs: 5000,
    location: "TEST",
  };

  it("returns durationMs verbatim for timed (default) shots", () => {
    expect(effectiveDurationMs(base)).toBe(5000);
    expect(effectiveDurationMs({ ...base, advance: "timed" })).toBe(5000);
  });

  it("ends on-action at max(actorEnd, captionEnd) + settle", () => {
    const scene: SceneDefinition = {
      ...base,
      advance: "on-action",
      caption: undefined,
      actors: [
        {
          type: "maya",
          x: 0,
          y: 0,
          animation: "walk-right",
          path: [
            { x: 100, y: 0, duration: 1000 },
            { x: 200, y: 0, duration: 1200 },
          ],
        },
      ],
    };
    // actorEnd 2200, no caption → 2200 + 600 = 2800
    expect(effectiveDurationMs(scene)).toBe(2800);
  });

  it("uses caption typing time when it dominates", () => {
    const scene: SceneDefinition = {
      ...base,
      advance: "on-action",
      caption: "x".repeat(50), // 50 * 28 = 1400ms
    };
    expect(effectiveDurationMs(scene)).toBe(1400 + 600);
  });

  it("never exceeds durationMs (hard ceiling)", () => {
    const scene: SceneDefinition = {
      ...base,
      durationMs: 1500,
      advance: "on-action",
      caption: "x".repeat(100), // would want 2800 + 600
    };
    expect(effectiveDurationMs(scene)).toBe(1500);
  });
});

describe("re-authored current-level camera data", () => {
  const sequences: Record<string, SceneDefinition[]> = {
    INTRO_SCENES,
    CHAPTER_01_COMPLETE_SCENES,
    CHAPTER_02_INTRO_SCENES,
    CHAPTER_02_COMPLETE_SCENES,
    CHAPTER_03_INTRO_SCENES,
    CHAPTER_03_COMPLETE_SCENES,
    BOSS_01_INTRO_SCENES,
    BOSS_01_COMPLETE_SCENES,
  };

  for (const [name, seq] of Object.entries(sequences)) {
    describe(name, () => {
      it("every shot has at least one camera keyframe", () => {
        for (const shot of seq) expect(shot.camera.length).toBeGreaterThan(0);
      });

      it("all keyframes are centered inside the scene bounds", () => {
        for (const shot of seq) {
          for (const kf of shot.camera) {
            expect(kf.x).toBeGreaterThanOrEqual(0);
            expect(kf.x).toBeLessThanOrEqual(SCENE_W);
            expect(kf.y).toBeGreaterThanOrEqual(0);
            expect(kf.y).toBeLessThanOrEqual(SCENE_H);
          }
        }
      });

      it("keyframe times are non-decreasing", () => {
        for (const shot of seq) {
          for (let i = 1; i < shot.camera.length; i++) {
            expect(shot.camera[i].time).toBeGreaterThanOrEqual(shot.camera[i - 1].time);
          }
        }
      });

      it("uses a medium/insert (zoom >= 1.25) in at least one shot", () => {
        const hasMedium = seq.some((shot) =>
          shot.camera.some((kf) => (kf.zoom ?? 1) >= 1.25),
        );
        expect(hasMedium).toBe(true);
      });
    });
  }
});
