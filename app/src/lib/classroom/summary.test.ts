import { describe, expect, it } from "vitest";
import { DEFAULTS, DEFAULT_PLAYER_PROGRESS, type PersistedState } from "@/lib/storage/persistence";
import { CLASSROOM_CHAPTERS, classroomChaptersFor } from "@/data/classroom";
import {
  ACTIVITY_DAYS,
  STUCK_FAILS,
  describeLocation,
  formatAgo,
  formatLocation,
  titleCase,
  rosterToCsv,
  summarizeClass,
  summarizeStudent,
} from "./summary";
import type { ProgressEvent, RosterRow } from "@/types/classroom";
import type { LanguageId } from "@/types/game";

const NOW = Date.parse("2026-10-26T12:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

function state(opts: { language?: LanguageId; completed?: Partial<Record<LanguageId, number[]>>; xp?: number } = {}): PersistedState {
  const byLanguage: PersistedState["progress"]["byLanguage"] = {};
  for (const [lang, chapters] of Object.entries(opts.completed ?? {})) {
    byLanguage[lang as LanguageId] = { ...DEFAULT_PLAYER_PROGRESS, completedChapters: chapters! };
  }
  return {
    ...DEFAULTS,
    progress: { version: 2, byLanguage },
    stats: { ...DEFAULTS.stats, xp: opts.xp ?? 0 },
    settings: { ...DEFAULTS.settings, language: opts.language ?? "go" },
  };
}

function ev(kind: ProgressEvent["kind"], msAgo: number, extra: Partial<ProgressEvent> = {}): ProgressEvent {
  return {
    kind,
    language: "go",
    chapterId: "chapter-02",
    stepId: "chapter-02:loop",
    data: {},
    createdAt: iso(msAgo),
    ...extra,
  };
}

const fail = (msAgo: number, extra: Partial<ProgressEvent> = {}) => ev("submit", msAgo, { data: { success: false }, ...extra });

function row(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    profile: { id: "s1", displayName: "Ada Lovelace", email: "ada@school.org", avatarUrl: null },
    joinedAt: iso(10 * DAY),
    state: null,
    stateUpdatedAt: null,
    events: [],
    ...overrides,
  };
}

describe("summarizeStudent", () => {
  it("marks a student who joined but never played as not started", () => {
    const s = summarizeStudent(row(), NOW);
    expect(s.status).toBe("not_started");
    expect(s.progress.completedChapterIds).toEqual([]);
    expect(s.lastActiveAt).toBeNull();
    expect(s.nowOn).toBeNull();
  });

  it("maps saved chapter numbers to chapter ids in play order", () => {
    const s = summarizeStudent(row({ state: state({ completed: { go: [2, 1, 3] } }), stateUpdatedAt: iso(HOUR) }), NOW);
    expect(s.progress.completedChapterIds).toEqual(["chapter-01", "chapter-02", "chapter-03"]);
    expect(s.progress.availableCount).toBe(CLASSROOM_CHAPTERS.length);
    expect(s.status).toBe("active");
  });

  it("reports progress in the student's current language and lists the others", () => {
    const s = summarizeStudent(
      row({ state: state({ language: "python", completed: { python: [1], go: [1, 2] } }), stateUpdatedAt: iso(HOUR) }),
      NOW,
    );
    expect(s.language).toBe("python");
    expect(s.progress.completedChapterIds).toEqual(["chapter-01"]);
    expect(s.progress.availableCount).toBe(classroomChaptersFor("python").length);
    expect(s.otherLanguages).toEqual([{ language: "go", completedChapterIds: ["chapter-01", "chapter-02"], availableCount: CLASSROOM_CHAPTERS.length }]);
  });

  it("flags stuck after repeated failures on the same step", () => {
    const events = Array.from({ length: STUCK_FAILS }, (_, i) => fail((i + 1) * 60_000));
    const s = summarizeStudent(row({ state: state({ completed: { go: [1] } }), events }), NOW);
    expect(s.failsOnCurrentStep).toBe(STUCK_FAILS);
    expect(s.status).toBe("stuck");
    expect(s.nowOn).toEqual({ chapterId: "chapter-02", stepId: "chapter-02:loop", language: "go" });
  });

  it("only counts failures since the step was last cleared", () => {
    const events = [
      fail(1 * 60_000),
      fail(2 * 60_000),
      ev("step_complete", 3 * 60_000),
      fail(4 * 60_000),
      fail(5 * 60_000),
      fail(6 * 60_000),
      fail(7 * 60_000),
    ];
    expect(summarizeStudent(row({ events }), NOW).failsOnCurrentStep).toBe(2);
  });

  it("ignores failures on other steps and hints in between", () => {
    const events = [
      fail(1 * 60_000),
      ev("hint", 2 * 60_000),
      fail(3 * 60_000, { stepId: "chapter-02:scaffold" }),
      fail(4 * 60_000),
    ];
    expect(summarizeStudent(row({ events }), NOW).failsOnCurrentStep).toBe(2);
  });

  it("has no current-step failures right after a clear", () => {
    const events = [ev("step_complete", 60_000), fail(2 * 60_000), fail(3 * 60_000)];
    expect(summarizeStudent(row({ events }), NOW).failsOnCurrentStep).toBe(0);
  });

  it("marks the location as cleared when the latest activity finished a chapter", () => {
    const s = summarizeStudent(row({ events: [ev("chapter_complete", HOUR), ev("step_complete", HOUR + 1)] }), NOW);
    expect(s.nowOn).toMatchObject({ chapterId: "chapter-02", cleared: true });
  });

  it("goes idle after a week without activity, even if they were stuck", () => {
    const events = Array.from({ length: STUCK_FAILS }, (_, i) => fail(8 * DAY + i * 60_000));
    expect(summarizeStudent(row({ events }), NOW).status).toBe("idle");
  });

  it("is finished once every available chapter is cleared", () => {
    const all = classroomChaptersFor("python").map((c) => c.number);
    const s = summarizeStudent(row({ state: state({ language: "python", completed: { python: all } }), stateUpdatedAt: iso(30 * DAY) }), NOW);
    expect(s.status).toBe("finished");
  });

  it("takes the newest of save time and activity as last active", () => {
    expect(summarizeStudent(row({ stateUpdatedAt: iso(2 * HOUR), events: [ev("hint", HOUR)] }), NOW).lastActiveAt).toBe(iso(HOUR));
    expect(summarizeStudent(row({ stateUpdatedAt: iso(HOUR), events: [ev("hint", 2 * HOUR)] }), NOW).lastActiveAt).toBe(iso(HOUR));
  });

  it("tallies practice stats and buckets activity by day", () => {
    const events = [
      ev("submit", HOUR, { data: { success: true } }),
      fail(2 * HOUR),
      ev("hint", 2 * DAY + HOUR),
      ev("game_over", 3 * DAY + HOUR),
      fail(40 * DAY),
    ];
    const s = summarizeStudent(row({ events }), NOW);
    expect(s.submissions).toBe(3);
    expect(s.successfulSubmissions).toBe(1);
    expect(s.hintsUsed).toBe(1);
    expect(s.gameOvers).toBe(1);
    expect(s.dailyActivity).toHaveLength(ACTIVITY_DAYS);
    expect(s.dailyActivity[ACTIVITY_DAYS - 1]).toBe(2);
    expect(s.dailyActivity[ACTIVITY_DAYS - 3]).toBe(1);
    expect(s.dailyActivity[ACTIVITY_DAYS - 4]).toBe(1);
    expect(s.dailyActivity.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("counts zen idioms from the library", () => {
    const st = state();
    st.library = {
      entries: [
        { id: "a", principle: "", learned: true, jolt: "", suggestion: "", stepId: "x", bonusXP: 5 },
        { id: "b", principle: "", learned: false, jolt: "", suggestion: "", stepId: "x", bonusXP: 5 },
      ],
    };
    const s = summarizeStudent(row({ state: st }), NOW);
    expect([s.zenLearned, s.zenSeen]).toEqual([1, 2]);
  });

  it("falls back to the email prefix when there's no display name", () => {
    const s = summarizeStudent(row({ profile: { id: "s1", displayName: "", email: "kid42@school.org", avatarUrl: null } }), NOW);
    expect(s.name).toBe("kid42");
  });

  it("tolerates junk in the saved state", () => {
    expect(() => summarizeStudent(row({ state: "garbage" }), NOW)).not.toThrow();
    expect(summarizeStudent(row({ state: { progress: 7 } }), NOW).progress.completedChapterIds).toEqual([]);
  });
});

describe("summarizeClass", () => {
  it("aggregates counts and the chapter funnel", () => {
    const students = [
      summarizeStudent(row({ profile: { id: "a", displayName: "A", email: null, avatarUrl: null }, state: state({ completed: { go: [1, 2] } }), events: [fail(HOUR, { chapterId: "chapter-03", stepId: "chapter-03:scaffold" })] }), NOW),
      summarizeStudent(row({ profile: { id: "b", displayName: "B", email: null, avatarUrl: null }, state: state({ completed: { go: [1] } }), events: [fail(HOUR)] }), NOW),
      summarizeStudent(row({ profile: { id: "c", displayName: "C", email: null, avatarUrl: null } }), NOW),
    ];
    const c = summarizeClass(students, NOW);
    expect(c.studentCount).toBe(3);
    expect(c.activeThisWeek).toBe(2);
    expect(c.notStarted).toBe(1);
    expect(c.avgChaptersCompleted).toBe(1);
    const byId = Object.fromEntries(c.funnel.map((f) => [f.chapterId, f]));
    expect(byId["chapter-01"]).toMatchObject({ completed: 2, inProgress: 0 });
    expect(byId["chapter-02"]).toMatchObject({ completed: 1, inProgress: 1 });
    expect(byId["chapter-03"]).toMatchObject({ completed: 0, inProgress: 1 });
    expect(c.funnel.map((f) => f.chapterId)).toEqual(CLASSROOM_CHAPTERS.map((ch) => ch.id));
  });

  it("handles an empty class", () => {
    expect(summarizeClass([], NOW)).toMatchObject({ studentCount: 0, avgChaptersCompleted: 0 });
  });
});

describe("display helpers", () => {
  it("describes where a student is", () => {
    expect(describeLocation(null)).toBe("—");
    expect(describeLocation({ chapterId: "chapter-02", stepId: "chapter-02:loop", language: "go" })).toMatch(/^door code · step \d\/\d$/);
    expect(describeLocation({ chapterId: "chapter-02", stepId: null, language: "go" })).toBe("door code");
    expect(describeLocation({ chapterId: "chapter-99", stepId: null, language: "go" })).toBe("chapter-99");
    expect(describeLocation({ chapterId: "chapter-02", stepId: "chapter-02:classify", language: "go", cleared: true })).toBe("cleared door code");
  });

  it("formats locations for the teacher console", () => {
    expect(formatLocation(null)).toBeNull();
    expect(formatLocation({ chapterId: "chapter-02", stepId: "chapter-02:loop", language: "go" })).toMatch(/^Door Code · Step \d of \d$/);
    expect(formatLocation({ chapterId: "chapter-02", stepId: null, language: "go" })).toBe("Started Door Code");
    expect(formatLocation({ chapterId: "chapter-02", stepId: "chapter-02:classify", language: "go", cleared: true })).toBe("Finished Door Code");
    expect(titleCase("CIPHER RELAY")).toBe("Cipher Relay");
  });

  it("formats relative times", () => {
    expect(formatAgo(null, NOW)).toBe("never");
    expect(formatAgo(iso(10_000), NOW)).toBe("just now");
    expect(formatAgo(iso(5 * 60_000), NOW)).toBe("5m ago");
    expect(formatAgo(iso(3 * HOUR), NOW)).toBe("3h ago");
    expect(formatAgo(iso(2 * DAY), NOW)).toBe("2d ago");
    expect(formatAgo(iso(90 * DAY), NOW)).toBe("3mo ago");
  });

  it("exports a CSV with one column per chapter and escaped cells", () => {
    const s = summarizeStudent(
      row({ profile: { id: "s1", displayName: 'Lee, "Sam"', email: "sam@x.org", avatarUrl: null }, state: state({ completed: { go: [1] } }) }),
      NOW,
    );
    const [header, line] = rosterToCsv([s]).split("\n");
    expect(header.split(",")).toEqual(expect.arrayContaining(["name", "status", "chapter-01", "boss-01"]));
    expect(line.startsWith('"Lee, ""Sam""",sam@x.org,')).toBe(true);
    const cols = header.split(",");
    const cells = line.replace(/^"[^"]*(""[^"]*)*",/, "x,").split(",");
    expect(cells[cols.indexOf("chapter-01")]).toBe("1");
    expect(cells[cols.indexOf("chapter-02")]).toBe("0");
  });
});
