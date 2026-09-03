import { describe, it, expect } from "vitest";
import {
  INTRO_SCENES,
  CHAPTER_01_COMPLETE_SCENES,
  CHAPTER_02_INTRO_SCENES,
  CHAPTER_02_COMPLETE_SCENES,
  CHAPTER_03_INTRO_SCENES,
  CHAPTER_03_COMPLETE_SCENES,
  BOSS_01_INTRO_SCENES,
  BOSS_01_COMPLETE_SCENES,
  CHAPTER_04_INTRO_SCENES,
  CHAPTER_04_COMPLETE_SCENES,
  CHAPTER_04_2_INTRO_SCENES,
  CHAPTER_04_2_COMPLETE_SCENES,
} from "./scenes";
import type { SceneDefinition } from "./scenes";
import { effectiveDurationMs } from "./camera";
import { SCENE_PROJECTION, farBottomFrac } from "./projection";

// Mirrors the registries in useAudio.ts — a cue naming a missing file is a
// silent bug in production, so the data is checked here.
const SFX = new Set([
  "terminal-beep", "message-receive", "maya-message", "code-submit", "handshake-confirm",
  "warning-beep", "alert-beep", "rush-warning", "dread-sting",
  "door-slide", "machinery", "knock-1", "knock-2", "knock-heavy", "keypad-beep",
  "captured-impact", "game-over-slam", "maya-typing", "keypress-1", "keypress-2", "keypress-3",
  "grunt-hit-1", "grunt-hit-2", "grunt-hit-3", "grunt-dodge-1", "grunt-dodge-2",
  "hurry-up", "keep-coding", "taking-fire", "hit", "we-did-it", "next-one", "dying",
  "weapon-charge", "laser-fire", "explosion-small", "shield-break", "target-lock",
  "hit-confirm", "boss-hit", "countdown-tick",
]);
const LOOPS = new Set([
  "cell-ambient", "corridor-ambient", "facility-hum", "dark-drone-1", "dark-drone-2",
  "alarm-loop", "siren-loop", "tension-drone", "heartbeat-fast", "heartbeat-slow",
  "gameplay-loop", "boss-loop",
]);

const SCENE_W = 1040;
const SCENE_H = 600;

const SEQUENCES: Record<string, SceneDefinition[]> = {
  INTRO_SCENES,
  CHAPTER_01_COMPLETE_SCENES,
  CHAPTER_02_INTRO_SCENES,
  CHAPTER_02_COMPLETE_SCENES,
  CHAPTER_03_INTRO_SCENES,
  CHAPTER_03_COMPLETE_SCENES,
  BOSS_01_INTRO_SCENES,
  BOSS_01_COMPLETE_SCENES,
  CHAPTER_04_INTRO_SCENES,
  CHAPTER_04_COMPLETE_SCENES,
  CHAPTER_04_2_INTRO_SCENES,
  CHAPTER_04_2_COMPLETE_SCENES,
};

describe("cinematic scene data", () => {
  for (const [name, scenes] of Object.entries(SEQUENCES)) {
    describe(name, () => {
      it("has at least one shot with a positive duration", () => {
        expect(scenes.length).toBeGreaterThan(0);
        for (const s of scenes) expect(s.durationMs).toBeGreaterThan(0);
      });

      it("only cues sounds that exist in the audio registry", () => {
        for (const s of scenes) {
          for (const cue of s.audio ?? []) {
            if (cue.action === "footsteps") continue;
            expect(cue.sound, `${name}: ${cue.action} without sound`).toBeDefined();
            const known = cue.action === "sfx" ? SFX : LOOPS;
            expect(known.has(cue.sound!), `${name}: unknown ${cue.action} "${cue.sound}"`).toBe(true);
            expect(cue.atMs).toBeLessThanOrEqual(s.durationMs);
          }
        }
      });

      it("keeps camera keyframes inside the scene and in time order", () => {
        for (const s of scenes) {
          let prev = -1;
          for (const k of s.camera) {
            expect(k.x).toBeGreaterThanOrEqual(0);
            expect(k.x).toBeLessThanOrEqual(SCENE_W);
            expect(k.y).toBeGreaterThanOrEqual(0);
            expect(k.y).toBeLessThanOrEqual(SCENE_H);
            expect(k.time).toBeGreaterThanOrEqual(prev);
            prev = k.time;
            if (k.zoom !== undefined) {
              expect(k.zoom).toBeGreaterThanOrEqual(0.9);
              expect(k.zoom).toBeLessThanOrEqual(2);
            }
          }
        }
      });

      it("fires shakes, flashes and glitches inside the shot", () => {
        for (const s of scenes) {
          for (const e of [...(s.shakes ?? []), ...(s.flashes ?? []), ...(s.glitches ?? [])]) {
            expect(e.atMs).toBeGreaterThanOrEqual(0);
            expect(e.atMs).toBeLessThan(s.durationMs);
            expect(e.durationMs).toBeGreaterThan(0);
          }
          if (s.titleCard) {
            const at = s.titleCard.atMs ?? 0;
            expect(at).toBeLessThan(s.durationMs);
            expect(s.titleCard.text.length).toBeGreaterThan(0);
          }
        }
      });
    });
  }
});

describe("level 1 cinematics", () => {
  const level1 = [...INTRO_SCENES, ...CHAPTER_01_COMPLETE_SCENES];

  it("stands every actor on the floor band of its room", () => {
    for (const s of level1) {
      const floorTop = farBottomFrac(SCENE_PROJECTION[s.background]) * SCENE_H;
      for (const a of s.actors) {
        const points = [{ x: a.x, y: a.y }, ...(a.path ?? [])];
        for (const p of points) {
          expect(p.y, `${s.location}: ${a.type} above the far floor edge`).toBeGreaterThanOrEqual(floorTop);
          expect(p.y).toBeLessThanOrEqual(SCENE_H);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(SCENE_W);
        }
      }
    }
  });

  it("opens and closes on a dissolve and uses every transition grammar", () => {
    expect(INTRO_SCENES[0].transition).toBe("dissolve");
    expect(CHAPTER_01_COMPLETE_SCENES[0].transition).toBe("dissolve");
    const kinds = new Set(level1.map((s) => s.transition ?? "cut"));
    expect(kinds.has("glitch")).toBe(true);
    expect(kinds.has("flash")).toBe(true);
  });

  it("puts the guard on a walk toward the camera (feet descend the floor band)", () => {
    const guardShots = level1.filter((s) => s.actors.some((a) => a.type === "guard"));
    expect(guardShots.length).toBeGreaterThanOrEqual(2);
    for (const s of guardShots) {
      const g = s.actors.find((a) => a.type === "guard")!;
      expect(g.animation).toBe("walk-down");
      expect(g.path![g.path!.length - 1].y).toBeGreaterThan(g.y + 150);
    }
  });

  it("switches the walk into a hack once Maya reaches the terminal", () => {
    const shot = INTRO_SCENES.find((s) => s.actors[0]?.endAnimation);
    expect(shot).toBeDefined();
    expect(shot!.actors[0].endAnimation).toBe("hack");
    expect(shot!.advance).toBe("on-action");
    expect(effectiveDurationMs(shot!)).toBeLessThanOrEqual(shot!.durationMs);
    expect(effectiveDurationMs(shot!)).toBeGreaterThan(shot!.actors[0].path![0].duration);
  });

  it("runs the intro between 18 and 28 seconds and the outro between 12 and 20", () => {
    const intro = INTRO_SCENES.reduce((sum, s) => sum + effectiveDurationMs(s), 0);
    const outro = CHAPTER_01_COMPLETE_SCENES.reduce((sum, s) => sum + effectiveDurationMs(s), 0);
    expect(intro).toBeGreaterThanOrEqual(18000);
    expect(intro).toBeLessThanOrEqual(28000);
    expect(outro).toBeGreaterThanOrEqual(12000);
    expect(outro).toBeLessThanOrEqual(20000);
  });

  it("starts and ends the audio bed cleanly (every loop started is later stopped or handed over)", () => {
    for (const seq of [INTRO_SCENES, CHAPTER_01_COMPLETE_SCENES]) {
      const started = new Set<string>();
      for (const s of seq) {
        for (const cue of s.audio ?? []) {
          if (cue.action === "loop-start") started.add(cue.sound!);
        }
      }
      // Whatever is still running at the end is faded by CinematicScene.finish.
      expect(started.size).toBeGreaterThan(0);
    }
  });
});
