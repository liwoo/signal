import { describe, expect, it } from "vitest";
import {
  applyProgressSave,
  completedChapterIdsFor,
  resumeChapterIndex,
  resumeFor,
} from "./progress";
import { DEFAULT_PLAYER_PROGRESS } from "@/lib/storage/persistence";
import type { PlayerProgress } from "@/types/game";

const CHAPTERS = [
  { id: "chapter-01", chapter: 1 },
  { id: "chapter-02", chapter: 2 },
  { id: "chapter-03", chapter: 3 },
  { id: "boss-01", chapter: 4 },
];

const fresh: PlayerProgress = DEFAULT_PLAYER_PROGRESS;

describe("applyProgressSave", () => {
  it("checkpoints a cleared mid-chapter step (the Nov 2026 Hello World case)", () => {
    const next = applyProgressSave(fresh, {
      chapterId: "chapter-01",
      checkpoint: { stepIndex: 1, code: 'package main\n\nfunc main() { println("Hello World") }' },
    });
    expect(next.resume).toEqual({
      chapterId: "chapter-01",
      stepIndex: 1,
      introDone: true,
      code: 'package main\n\nfunc main() { println("Hello World") }',
    });
    expect(next.completedChapters).toEqual([]);
    // Pure: the input is untouched.
    expect(fresh.resume).toBeUndefined();
  });

  it("marks the intro beat played without moving the step", () => {
    const next = applyProgressSave(fresh, { chapterId: "chapter-01", introDone: true });
    expect(next.resume).toEqual({ chapterId: "chapter-01", stepIndex: 0, introDone: true });
    // Already marked → same object back (lets callers skip a redundant write).
    expect(applyProgressSave(next, { chapterId: "chapter-01", introDone: true })).toBe(next);
  });

  it("keeps the step when the intro is marked after a checkpoint", () => {
    const atStep2 = applyProgressSave(fresh, { chapterId: "chapter-02", checkpoint: { stepIndex: 2, code: "x" } });
    const next = applyProgressSave(atStep2, { chapterId: "chapter-02", introDone: true });
    expect(next.resume?.stepIndex).toBe(2);
  });

  it("never moves a checkpoint backward (re-clearing step 1 after a retry)", () => {
    const atStep2 = applyProgressSave(fresh, { chapterId: "chapter-02", checkpoint: { stepIndex: 2, code: "late" } });
    const replay = applyProgressSave(atStep2, { chapterId: "chapter-02", checkpoint: { stepIndex: 1, code: "early" } });
    expect(replay.resume).toEqual(atStep2.resume);
  });

  it("a checkpoint in another chapter replaces the old one", () => {
    const a = applyProgressSave(fresh, { chapterId: "chapter-01", checkpoint: { stepIndex: 1, code: "a" } });
    const b = applyProgressSave(a, { chapterId: "chapter-02", checkpoint: { stepIndex: 1, code: "b" } });
    expect(b.resume?.chapterId).toBe("chapter-02");
  });

  it("records a cleared chapter once and drops its checkpoint", () => {
    const mid = applyProgressSave(fresh, { chapterId: "chapter-01", checkpoint: { stepIndex: 1, code: "a" } });
    const done = applyProgressSave(mid, { chapterId: "chapter-01", completedChapter: 1 });
    expect(done.completedChapters).toEqual([1]);
    expect(done.currentChapter).toBe(2);
    expect(done.resume).toBeNull();
    expect(applyProgressSave(done, { completedChapter: 1 }).completedChapters).toEqual([1]);
  });

  it("ignores stats-only saves (timer expiry, restart)", () => {
    expect(applyProgressSave(fresh, {})).toBe(fresh);
  });
});

describe("resumeFor", () => {
  const mid = applyProgressSave(fresh, { chapterId: "chapter-01", checkpoint: { stepIndex: 1, code: "a" } });

  it("returns the checkpoint for its own chapter only", () => {
    expect(resumeFor(mid, "chapter-01", 2)?.stepIndex).toBe(1);
    expect(resumeFor(mid, "chapter-02", 4)).toBeNull();
    expect(resumeFor(fresh, "chapter-01", 2)).toBeNull();
  });

  it("clamps a stale step index into the chapter's real steps", () => {
    const stale: PlayerProgress = { ...fresh, resume: { chapterId: "chapter-01", stepIndex: 9, introDone: true } };
    expect(resumeFor(stale, "chapter-01", 2)?.stepIndex).toBe(1);
    const negative: PlayerProgress = { ...fresh, resume: { chapterId: "chapter-01", stepIndex: -3, introDone: true } };
    expect(resumeFor(negative, "chapter-01", 2)?.stepIndex).toBe(0);
  });
});

describe("resumeChapterIndex", () => {
  it("starts a new player at the first chapter", () => {
    expect(resumeChapterIndex(CHAPTERS, fresh)).toBe(0);
  });

  it("re-opens the chapter that holds a checkpoint", () => {
    const mid = applyProgressSave(fresh, { chapterId: "chapter-01", checkpoint: { stepIndex: 1, code: "a" } });
    expect(resumeChapterIndex(CHAPTERS, mid)).toBe(0);
  });

  it("moves on to the first uncleared chapter", () => {
    expect(resumeChapterIndex(CHAPTERS, { ...fresh, completedChapters: [1] })).toBe(1);
    expect(resumeChapterIndex(CHAPTERS, { ...fresh, completedChapters: [1, 2, 3] })).toBe(3);
  });

  it("goes back to the start once everything is cleared", () => {
    expect(resumeChapterIndex(CHAPTERS, { ...fresh, completedChapters: [1, 2, 3, 4] })).toBe(0);
  });

  it("ignores a checkpoint for a chapter not in this language's list", () => {
    const p: PlayerProgress = { ...fresh, completedChapters: [1], resume: { chapterId: "chapter-99", stepIndex: 1, introDone: true } };
    expect(resumeChapterIndex(CHAPTERS, p)).toBe(1);
  });
});

describe("completedChapterIdsFor", () => {
  it("maps cleared chapter numbers to ids in play order", () => {
    expect(completedChapterIdsFor(CHAPTERS, { ...fresh, completedChapters: [2, 1] })).toEqual(["chapter-01", "chapter-02"]);
    expect(completedChapterIdsFor(CHAPTERS, fresh)).toEqual([]);
  });

  it("still counts every chapter once all are cleared (the cursor wraps to 0, the tracker must not)", () => {
    expect(completedChapterIdsFor(CHAPTERS, { ...fresh, completedChapters: [1, 2, 3, 4] })).toHaveLength(4);
  });
});
