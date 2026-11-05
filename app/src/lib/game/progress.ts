/**
 * Pure chapter-progress bookkeeping: what a save does to a language's
 * PlayerProgress, where a returning player resumes, and which chapters count
 * as cleared. No React, no storage — GameRouter feeds these the persisted slice.
 */

import type { ChapterResume, PlayerProgress } from "@/types/game";

/** The two facts about a chapter progress needs: its Challenge id and number. */
export interface ChapterRef {
  id: string;
  chapter: number;
}

/** The progress side of a save, emitted by useGame / the boss fight / the intro beat. */
export interface ProgressSave {
  /** The chapter (Challenge id) being played. */
  chapterId?: string;
  /** Set when the chapter was just cleared (its Challenge.chapter number). */
  completedChapter?: number;
  /** Set when a step was cleared mid-chapter: resume at `stepIndex` with this code. */
  checkpoint?: { stepIndex: number; code: string };
  /** Set when the chapter's intro beat has been played through. */
  introDone?: boolean;
}

/**
 * Apply one save to a language's progress. A cleared chapter is recorded and
 * its checkpoint dropped; a cleared step moves the chapter checkpoint forward
 * (never backward — replaying an earlier step after a retry keeps the furthest
 * point reached); finishing the intro beat marks it so it isn't forced again.
 */
export function applyProgressSave(progress: PlayerProgress, save: ProgressSave): PlayerProgress {
  if (save.completedChapter !== undefined) {
    const n = save.completedChapter;
    return {
      ...progress,
      completedChapters: progress.completedChapters.includes(n)
        ? progress.completedChapters
        : [...progress.completedChapters, n],
      currentChapter: n + 1,
      resume: null,
    };
  }

  if (!save.chapterId) return progress;
  const existing = progress.resume?.chapterId === save.chapterId ? progress.resume : null;

  if (save.checkpoint) {
    if (existing && existing.stepIndex > save.checkpoint.stepIndex) return progress;
    const resume: ChapterResume = {
      chapterId: save.chapterId,
      stepIndex: save.checkpoint.stepIndex,
      // A step can only be cleared once the intro beat is behind the player.
      introDone: true,
      code: save.checkpoint.code,
    };
    return { ...progress, resume };
  }

  if (save.introDone) {
    if (existing?.introDone) return progress;
    const resume: ChapterResume = existing
      ? { ...existing, introDone: true }
      : { chapterId: save.chapterId, stepIndex: 0, introDone: true };
    return { ...progress, resume };
  }

  return progress;
}

/**
 * The checkpoint to resume `chapterId` from, or null for a fresh start. The
 * step index is clamped to the chapter's real steps so stale saves (content
 * changed under them) can't point past the end.
 */
export function resumeFor(progress: PlayerProgress, chapterId: string, stepCount: number): ChapterResume | null {
  const r = progress.resume;
  if (!r || r.chapterId !== chapterId) return null;
  const last = Math.max(0, stepCount - 1);
  const stepIndex = Number.isFinite(r.stepIndex) ? Math.min(Math.max(0, Math.floor(r.stepIndex)), last) : 0;
  return { ...r, stepIndex };
}

/**
 * Which chapter to open on load: the one with a live checkpoint, else the
 * first chapter not yet cleared. A player who has cleared everything starts
 * over at the first chapter.
 */
export function resumeChapterIndex(chapters: ChapterRef[], progress: PlayerProgress): number {
  if (progress.resume) {
    const at = chapters.findIndex((c) => c.id === progress.resume!.chapterId);
    if (at >= 0) return at;
  }
  const done = new Set(progress.completedChapters);
  const next = chapters.findIndex((c) => !done.has(c.chapter));
  return next >= 0 ? next : 0;
}

/** The Challenge ids of every cleared chapter, in play order. */
export function completedChapterIdsFor(chapters: ChapterRef[], progress: PlayerProgress): string[] {
  const done = new Set(progress.completedChapters);
  return chapters.filter((c) => done.has(c.chapter)).map((c) => c.id);
}
