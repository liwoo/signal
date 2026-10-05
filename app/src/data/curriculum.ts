import { chapter01 } from "./challenges/chapter-01";
import { chapter02 } from "./challenges/chapter-02";
import { chapter03 } from "./challenges/chapter-03";
import { chapter04 } from "./challenges/chapter-04";
import { chapter04_2 } from "./challenges/chapter-04.2";

/**
 * One chapter in the game's curriculum. `chapterId` ties it to a built Challenge
 * (for completion tracking); when absent the chapter is planned but not built yet
 * — shown on the roadmap as "SOON" so players can see what's ahead. Bosses are
 * recaps: they carry no new concepts.
 */
export interface CurriculumChapter {
  key: string;
  title: string;
  concepts: string[];
  /** The built Challenge id. Absent = planned / not built yet. */
  chapterId?: string;
  isBoss?: boolean;
}

export interface CurriculumAct {
  /** Roman numeral, e.g. "I". */
  act: string;
  /** Act name, e.g. "FIRST CONTACT". */
  name: string;
  chapters: CurriculumChapter[];
}

// Built chapters pull their concepts straight from the Challenge so the roadmap
// stays in sync with the real content. Planned chapters list the concepts the
// design doc assigns them (docs/design.md §Act Structure & Curriculum Map).
const RAW_ACTS: CurriculumAct[] = [
  {
    act: "I",
    name: "FIRST CONTACT",
    chapters: [
      { key: "ch1", title: chapter01.title, concepts: chapter01.concepts, chapterId: chapter01.id },
      { key: "ch2", title: chapter02.title, concepts: chapter02.concepts, chapterId: chapter02.id },
      { key: "ch3", title: chapter03.title, concepts: chapter03.concepts, chapterId: chapter03.id },
      { key: "boss1", title: "LOCKMASTER", concepts: [], chapterId: "boss-01", isBoss: true },
    ],
  },
  {
    act: "II",
    name: "INSIDE THE MACHINE",
    chapters: [
      { key: "ch4", title: chapter04.title, concepts: chapter04.concepts, chapterId: chapter04.id },
      { key: "ch4b", title: chapter04_2.title, concepts: chapter04_2.concepts, chapterId: chapter04_2.id },
      { key: "ch5", title: "ACCESS STRUCT", concepts: ["Structs", "Methods"] },
      { key: "ch6", title: "LOCK INTERFACE", concepts: ["Interfaces", "Errors"] },
      { key: "boss2", title: "VASIK · TERMINAL 1", concepts: [], isBoss: true },
    ],
  },
  {
    act: "III",
    name: "DEEPER IN",
    chapters: [
      { key: "ch7", title: "FILE TREE", concepts: ["Closures", "Recursion", "Defer"] },
      { key: "ch8", title: "CIRCUIT CUT", concepts: ["Goroutines", "WaitGroups"] },
      { key: "ch9", title: "CHANNEL OF ESCAPE", concepts: ["Channels", "Select", "Timeouts"] },
      { key: "boss3", title: "KIRA · ALLEGIANCE", concepts: [], isBoss: true },
    ],
  },
  {
    act: "IV",
    name: "THE BREACH",
    chapters: [
      { key: "ch10", title: "SENSOR SWEEP", concepts: ["Mutexes", "Atomics"] },
      { key: "ch11", title: "CONTACT RETRIEVAL", concepts: ["HTTP Client", "JSON"] },
      { key: "boss4", title: "VASIK · TERMINAL 2", concepts: [], isBoss: true },
    ],
  },
  {
    act: "V",
    name: "FREEDOM",
    chapters: [
      { key: "ch12", title: "SCOUT NETWORK", concepts: ["Worker Pools", "Context", "Rate Limiting", "Generics"] },
      { key: "boss5", title: "VASIK · TERMINAL 3", concepts: [], isBoss: true },
    ],
  },
  {
    act: "VI",
    name: "THE DEAD DROP",
    chapters: [
      { key: "ch13", title: "FIRST SERVER", concepts: ["HTTP Server", "Handlers"] },
      { key: "ch14", title: "ROUTE MAP", concepts: ["Routing", "URL Params"] },
      { key: "ch15", title: "STATUS BOARD", concepts: ["HTML Templates"] },
      { key: "boss6", title: "GHOST PROXY", concepts: [], isBoss: true },
    ],
  },
  {
    act: "VII",
    name: "THE ARCHIVE",
    chapters: [
      { key: "ch16", title: "QUERY THE VAULT", concepts: ["SQL", "Database"] },
      { key: "ch17", title: "SEARCH TERMINAL", concepts: ["Forms", "Input Validation"] },
      { key: "ch18", title: "EVIDENCE LOCKER", concepts: ["Static Files", "File Server"] },
      { key: "boss7", title: "THE ARCHIVIST", concepts: [], isBoss: true },
    ],
  },
  {
    act: "VIII",
    name: "THE FORTRESS",
    chapters: [
      { key: "ch19", title: "ACCESS LAYER", concepts: ["Middleware"] },
      { key: "ch20", title: "SECURITY CHAIN", concepts: ["Middleware Chains", "Context Values"] },
      { key: "ch21", title: "IDENTITY LOCK", concepts: ["Sessions", "Cookies"] },
      { key: "ch22", title: "VAULT CREDENTIALS", concepts: ["Password Hashing"] },
      { key: "boss8", title: "VASIK · TERMINAL 4", concepts: [], isBoss: true },
    ],
  },
  {
    act: "IX",
    name: "THE BROADCAST",
    chapters: [
      { key: "ch23", title: "LIVE WIRE", concepts: ["Websockets"] },
      { key: "ch24", title: "THE SIGNAL", concepts: ["Full Web App"] },
      { key: "boss9", title: "GHOST · UNMASKED", concepts: [], isBoss: true },
    ],
  },
];

// Dedupe concepts across the whole game: each is listed once, under the chapter
// that first teaches it (case-insensitive).
export const CURRICULUM_ACTS: CurriculumAct[] = (() => {
  const seen = new Set<string>();
  return RAW_ACTS.map((act) => ({
    ...act,
    chapters: act.chapters.map((chapter) => ({
      ...chapter,
      concepts: chapter.concepts.filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    })),
  }));
})();

/** Concepts in built (playable) chapters — the denominator for "learned" %. */
export const PLAYABLE_CONCEPTS = CURRICULUM_ACTS.reduce(
  (sum, act) => sum + act.chapters.reduce((s, c) => s + (c.chapterId ? c.concepts.length : 0), 0),
  0,
);

/** Concepts in planned (not-yet-built) chapters. */
export const PLANNED_CONCEPTS = CURRICULUM_ACTS.reduce(
  (sum, act) => sum + act.chapters.reduce((s, c) => s + (c.chapterId ? 0 : c.concepts.length), 0),
  0,
);
