// ── Adventure levels ──
// Each former cinematic is now a playable beat. Intro levels end at Maya's
// terminal ("relinquish": control passes to the editor). Aftermath levels end
// on a story exit with a chapter card.
//
// Map legend (see types.ts): # wall · . floor · = bars · d locked door ·
// D open doorway · T terminal · k keypad · p panel · b bunk · h hide spot ·
// v vent duct · o vent hatch · s server rack · c maintenance box · x exit ·
// * floor under a ceiling light · m maya spawn · r reeves · L the lockmaster.
// Interactable ids are "<kind>-<n>" in reading order (row-major).

import type { AdventureLevel } from "./types";

/** Hide a book chapter (B) on a floor tile of a shared map. */
function placeBook(map: string[], x: number, y: number): string[] {
  return map.map((row, i) => (i === y ? row.slice(0, x) + "B" + row.slice(x + 1) : row));
}

// ── Sublevel 3 · cell block B ──
// Corridor across the top (guard route), three cells below it. B-09 is Maya's:
// bars + keypad (3,3) + door (5,3), bunk on the left, terminal in the corner.

const CELL_BLOCK = [
  "################",
  "#..............#",
  "#..............#",
  "#==k=d=#=d=#=d=#",
  "#*.....#...#...#",
  "#b..h..#...#...#",
  "#b.....#.*.#.*.#",
  "#.....c#...#...#",
  "#Tm....#...#...#",
  "################",
];

export const CHAPTER_01_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-01-intro",
  title: "SIGNAL",
  subtitle: "FIRST CONTACT",
  location: "SUBLEVEL 3 · CELL B-09",
  theme: "cell",
  map: placeBook(CELL_BLOCK, 2, 5),
  ambience: ["dark-drone-1", "facility-hum"],
  opening: "72 hours missing. no contact. sublevel 3. no windows.",
  guards: [
    {
      id: "patrol",
      route: [
        { x: 1, y: 2, waitMs: 1200 },
        { x: 4, y: 2, face: "down", waitMs: 2400 },
        { x: 9, y: 2, face: "down", waitMs: 1400 },
        { x: 14, y: 2, waitMs: 1000 },
      ],
      speed: 1.6,
      range: 5.5,
    },
  ],
  objectives: [
    {
      id: "power",
      stake: "the terminal is dead. find something in this cell that still has power.",
      kind: "interact",
      target: "crate-1",
      verb: "PRY OPEN PANEL",
      durationMs: 1400,
      thought: "one dead terminal in the corner. and a maintenance box that still hums.",
      done: "live wires. i can run power to the terminal.",
      sfx: "machinery",
      cues: [{ atMs: 2600, sfx: "door-slide" }],
    },
    {
      id: "chapter",
      stake: "something is folded into the mattress. whoever was here before left it for you.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1300,
      thought: "paper. folded small, pushed into the mattress seam.",
      done: "a book chapter, torn out and folded small. 'go: a field manual' — chapter one. someone was in this cell before me.",
    },
    {
      id: "wake",
      stake: "wake the terminal while the patrol is looking the other way. it's her one shot at the outside.",
      kind: "interact",
      target: "terminal-1",
      verb: "WAKE TERMINAL",
      durationMs: 1600,
      checkpoint: true,
      thought: "they check the cells every hour. it's been fifty minutes.",
      done: "it's alive. one shot at the outside. send it.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
};

export const CHAPTER_01_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-01-complete",
  title: "CHAPTER 1 COMPLETE",
  subtitle: "HANDSHAKE ESTABLISHED",
  location: "SUBLEVEL 3 · CELL B-09",
  theme: "cell",
  map: [
    "################",
    "#..............#",
    "#..............#",
    "#==k=d=#=d=#=d=#",
    "#*.....#...#...#",
    "#b..h..#...#...#",
    "#b.....#.*.#.*.#",
    "#.....c#...#...#",
    "#Tm....#...#...#",
    "################",
  ],
  ambience: ["cell-ambient"],
  guards: [
    {
      id: "runner",
      triggerOn: "kill",
      route: [
        { x: 14, y: 2, waitMs: 0 },
        { x: 5, y: 2, face: "down", waitMs: 3000 },
        { x: 14, y: 2, waitMs: 99999 },
      ],
      loop: "cycle",
      speed: 2.4,
      range: 6,
    },
  ],
  objectives: [
    {
      id: "confirm",
      stake: "the handshake landed. read the reply — she's not alone anymore.",
      kind: "interact",
      target: "terminal-1",
      verb: "READ REPLY",
      durationMs: 1200,
      thought: "handshake confirmed.",
      cues: [
        { atMs: 0, after: "interact", sfx: "handshake-confirm", flash: "signal", shake: 2 },
        { atMs: 700, after: "interact", sfx: "message-receive" },
      ],
      done: "someone's out there. and someone in here heard the terminal wake up.",
    },
    {
      id: "kill",
      stake: "a guard heard the terminal. kill the screen before he reaches the bars.",
      kind: "interact",
      target: "terminal-1",
      verb: "KILL SCREEN",
      durationMs: 400,
      checkpoint: true,
      thought: "boots. coming this way.",
      cues: [
        { atMs: 0, sfx: "warning-beep" },
        { atMs: 300, sfx: "dread-sting" },
      ],
    },
    {
      id: "hide",
      stake: "hide behind the bunk. hold your breath until he moves on.",
      kind: "hold",
      target: "hide-1",
      durationMs: 7200,
      thought: "don't breathe.",
      cues: [
        { atMs: 3600, sfx: "knock-heavy", shake: 7, flash: "warm" },
        { atMs: 4400, sfx: "knock-2", shake: 3 },
        { atMs: 5200, sfx: "dread-sting" },
      ],
      done: "he's walking away.",
    },
    {
      id: "keypad",
      stake: "the door has a keypad. that's the next problem.",
      kind: "interact",
      target: "keypad-1",
      verb: "INSPECT KEYPAD",
      durationMs: 1100,
      thought: "the door. there's a keypad on it.",
      cues: [{ atMs: 500, after: "interact", sfx: "keypad-beep" }],
      done: "ten codes, in order. next: the code.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 1 COMPLETE", sub: "NEXT · DOOR CODE" },
};

export const CHAPTER_02_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-02-intro",
  title: "CHAPTER 2",
  subtitle: "DOOR CODE",
  location: "SUBLEVEL 3 · CELL B-09 · DOOR",
  theme: "cell",
  map: placeBook(CELL_BLOCK, 2, 4),
  ambience: ["cell-ambient", "facility-hum"],
  opening: "one door out. one keypad on it.",
  guards: [
    {
      id: "patrol",
      route: [
        { x: 1, y: 2, waitMs: 800 },
        { x: 5, y: 2, face: "down", waitMs: 2600 },
        { x: 12, y: 2, face: "down", waitMs: 1200 },
        { x: 14, y: 2, waitMs: 600 },
      ],
      speed: 1.6,
      range: 6,
    },
  ],
  objectives: [
    {
      id: "keypad",
      stake: "one door out, one keypad on it. see what it wants.",
      kind: "interact",
      target: "keypad-1",
      verb: "TRY A CODE",
      durationMs: 2300,
      thought: "it wants a sequence. let's see.",
      cues: [
        { atMs: 300, after: "interact", sfx: "keypad-beep" },
        { atMs: 600, after: "interact", sfx: "keypad-beep" },
        { atMs: 900, after: "interact", sfx: "keypad-beep" },
        { atMs: 1300, after: "interact", sfx: "warning-beep" },
        { atMs: 1700, after: "interact", sfx: "keypad-beep" },
        { atMs: 2000, after: "interact", sfx: "keypad-beep" },
        { atMs: 2250, after: "interact", sfx: "warning-beep" },
      ],
      done: "tried three. tried seven. wrong pattern. it wants ten codes, in order.",
    },
    {
      id: "chapter",
      stake: "there's more paper taped inside the light housing. the next chapter — loops and branches.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1300,
      thought: "the light housing. something taped inside it.",
      done: "chapter two. same handwriting in the margins. whoever hid these was learning exactly what i need.",
    },
    {
      id: "terminal",
      stake: "she needs the pattern worked out. get back to the terminal — you can crack it from outside.",
      kind: "interact",
      target: "terminal-1",
      verb: "OPEN THE LINE",
      durationMs: 1300,
      checkpoint: true,
      thought: "patrol sweeps the block every hour. move.",
      done: "she needs the pattern. she needs you.",
      sfx: "message-receive",
    },
  ],
  ending: "relinquish",
};

export const CHAPTER_02_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-02-complete",
  title: "CHAPTER 2 COMPLETE",
  subtitle: "KEYPAD CRACKED",
  location: "SUBLEVEL 3 · CORRIDOR B",
  theme: "corridor",
  map: [
    "###o############",
    "#.....hd.......#",
    "#......d.......#",
    "#==k=d=#=d=#=d=#",
    "#*.....#...#...#",
    "#b..h..#...#...#",
    "#b.....#.*.#.*.#",
    "#.....c#...#...#",
    "#T..m..#...#...#",
    "################",
  ],
  ambience: ["corridor-ambient"],
  guards: [
    {
      id: "sentry",
      route: [
        { x: 1, y: 2, face: "right", waitMs: 3200 },
        { x: 1, y: 1, face: "left", waitMs: 2600 },
      ],
      speed: 1,
      range: 7,
    },
  ],
  objectives: [
    {
      id: "sequence",
      stake: "all ten codes classified. punch the sequence in and the lock turns green.",
      kind: "interact",
      target: "keypad-1",
      verb: "ENTER SEQUENCE",
      durationMs: 1800,
      unlocks: ["door-3"],
      thought: "ten codes. in order. go.",
      cues: [
        { atMs: 200, after: "interact", sfx: "keypad-beep" },
        { atMs: 500, after: "interact", sfx: "keypad-beep" },
        { atMs: 800, after: "interact", sfx: "keypad-beep" },
        { atMs: 1100, after: "interact", sfx: "keypad-beep" },
        { atMs: 1500, after: "interact", sfx: "handshake-confirm", flash: "signal" },
      ],
      done: "the lock turns green.",
    },
    {
      id: "knock",
      stake: "someone's knocking from b-10 — and they know her name. get to b-10's side of the corridor.",
      kind: "reach",
      target: "door-1",
      checkpoint: true,
      thought: "then — knocking. from the next cell.",
      cues: [
        { atMs: 0, sfx: "knock-1" },
        { atMs: 700, sfx: "knock-2" },
        { atMs: 1600, voice: { from: "b-10", text: "maya? maya chen?" } },
      ],
      done: "the corridor to b-10 is sealed. she needs another way.",
    },
    {
      id: "vent",
      stake: "the corridor is sealed. the ventilation shaft isn't. get to the hatch.",
      kind: "reach",
      target: "hatch-1",
      thought: "the shaft. tight. dark. the only way to b-10.",
      sfx: "machinery",
      done: "the only way to b-10.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 2 COMPLETE", sub: "NEXT · SHAFT CODES" },
};

// ── Sublevel 3 · corridor B + ventilation shaft ──

const SHAFT_CORRIDOR = [
  "################",
  "#vvvvvvvvvvvvvp#",
  "#v##############",
  "#v#............#",
  "#o#..*....*....#",
  "#.......#......#",
  "#..m....#..c...#",
  "#....*.....*...#",
  "################",
];

export const CHAPTER_03_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-03-intro",
  title: "CHAPTER 3",
  subtitle: "SHAFT CODES",
  location: "SUBLEVEL 3 · CORRIDOR B",
  theme: "corridor",
  map: placeBook(SHAFT_CORRIDOR, 3, 4),
  ambience: ["corridor-ambient", "facility-hum"],
  opening: "\"maya? maya chen?\" — someone in b-10 knows my name.",
  guards: [
    {
      id: "patrol",
      route: [
        { x: 3, y: 3, waitMs: 900 },
        { x: 13, y: 3, face: "down", waitMs: 1200 },
        { x: 13, y: 7, waitMs: 600 },
        { x: 3, y: 7, face: "up", waitMs: 1200 },
      ],
      loop: "cycle",
      speed: 1.7,
      range: 5.5,
    },
  ],
  objectives: [
    {
      id: "chapter",
      stake: "paper behind the hatch grille — chapter three. functions. take it before you crawl.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      thought: "the grille. there's paper wedged behind it.",
      done: "chapter three, behind the grille. they came this way too.",
    },
    {
      id: "hatch",
      stake: "the corridor to b-10 is sealed. the ventilation shaft isn't. reach the hatch without being seen.",
      kind: "reach",
      target: "hatch-1",
      checkpoint: true,
      thought: "the corridor's sealed. but the shaft isn't.",
      done: "tight. dark. the only way to b-10.",
      sfx: "machinery",
    },
    {
      id: "junction",
      stake: "crawl to the junction. each gate needs a computed code — that's a job for the terminal.",
      kind: "interact",
      target: "panel-1",
      verb: "OPEN JUNCTION PANEL",
      durationMs: 1500,
      checkpoint: true,
      pose: "keypad",
      thought: "crawl. quiet.",
      cues: [{ atMs: 3000, sfx: "machinery" }],
      done: "a junction panel. each gate needs a computed code to pass.",
    },
  ],
  ending: "relinquish",
  handoff: "CONTROL → JUNCTION PANEL",
};

export const CHAPTER_03_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-03-complete",
  title: "CHAPTER 3 COMPLETE",
  subtitle: "JUNCTION CLEARED",
  location: "VENTILATION SHAFT · JUNCTION A",
  theme: "vent",
  map: [
    "#############",
    "#pmvvvvvvvvv#",
    "###########d#",
    "#....*....r.#",
    "#b..........#",
    "#b....*.....#",
    "#T.........h#",
    "#############",
  ],
  ambience: ["dark-drone-2"],
  guards: [],
  objectives: [
    {
      id: "validate",
      stake: "codes validated. open the shaft gate.",
      kind: "interact",
      target: "panel-1",
      verb: "OPEN GATE",
      durationMs: 1400,
      pose: "keypad",
      unlocks: ["door-1"],
      thought: "codes validated.",
      cues: [{ atMs: 600, after: "interact", sfx: "handshake-confirm", flash: "signal" }],
      done: "the shaft gate opens.",
    },
    {
      id: "b10",
      stake: "cell b-10. someone's inside. drop down and find them.",
      kind: "reach",
      target: "npc-1",
      checkpoint: true,
      thought: "cell b-10. someone's inside.",
      cues: [{ atMs: 2000, sfx: "door-slide" }],
    },
    {
      id: "reeves",
      stake: "she knows her name. hear what she knows.",
      kind: "interact",
      target: "npc-1",
      verb: "TALK",
      durationMs: 3000,
      pose: "idle",
      thought: "an older woman. she's been here longer.",
      cues: [
        { atMs: 400, after: "interact", voice: { from: "reeves", text: "maya — i know exactly why they took us." } },
      ],
      done: "dr. reeves. he knows why.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 3 COMPLETE", sub: "NEXT · THE LOCKMASTER" },
};

// ── Sublevel 3 · B-10 → east wing → server room ──

const EAST_WING = [
  "###################################",
  "#..b..*...#.....*..h........#s.s.s#",
  "#..b......#.................#.....#",
  "#m.....r..d..*........*.....d..*.L#",
  "#.........#.................#.....#",
  "#T...*....#.....*.......h...#s.s.s#",
  "###################################",
];

export const BOSS_01_INTRO_LEVEL: AdventureLevel = {
  id: "boss-01-intro",
  title: "BOSS FIGHT",
  subtitle: "LOCKMASTER",
  location: "SUBLEVEL 3 · CELL B-10",
  theme: "corridor",
  map: placeBook(EAST_WING, 8, 1),
  ambience: ["dark-drone-2", "facility-hum"],
  guards: [
    {
      id: "sweep-1",
      triggerOn: "chapter",
      route: [
        { x: 16, y: 1, face: "down", waitMs: 900 },
        { x: 16, y: 5, face: "up", waitMs: 900 },
      ],
      speed: 1.9,
      range: 5,
    },
    {
      id: "sweep-2",
      triggerOn: "chapter",
      route: [
        { x: 23, y: 5, face: "up", waitMs: 1100 },
        { x: 23, y: 1, face: "down", waitMs: 1100 },
      ],
      speed: 1.7,
      range: 5,
    },
  ],
  objectives: [
    {
      id: "talk",
      stake: "dr. reeves knows why they took her. hear her out.",
      kind: "interact",
      target: "npc-1",
      verb: "LISTEN",
      durationMs: 3400,
      pose: "idle",
      unlocks: ["door-1"],
      thought: "the project. the subjects. why none of them remember.",
      cues: [
        { atMs: 300, after: "interact", voice: { from: "reeves", text: "there's a server room at the end of east wing." } },
        { atMs: 1700, after: "interact", voice: { from: "reeves", text: "the lockmaster controls every door on this level. take it down, and you're out." } },
      ],
      done: "she wrote the manual. she hid the chapters. there's one more in here.",
    },
    {
      id: "chapter",
      stake: "reeves hid chapter four under her bunk — weapon systems. take it before the sirens.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      thought: "under the bunk. she's pointing.",
      done: "chapter four, in b-10. reeves' handwriting. it was her all along — she hid them for whoever they put in her cell next.",
      cues: [{ atMs: 0, after: "interact", voice: { from: "reeves", text: "take it. then run. the sirens are thirty seconds out." } }],
    },
    {
      id: "run",
      stake: "the sirens are up and the guards are sweeping. run. east wing, end of the corridor.",
      kind: "interact",
      target: "door-2",
      verb: "FORCE THE DOOR",
      durationMs: 1400,
      checkpoint: true,
      unlocks: ["door-2"],
      thought: "run.",
      cues: [
        { atMs: 0, alarm: true, sfx: "alert-beep" },
        { atMs: 250, shake: 3 },
        { atMs: 1200, sfx: "dread-sting" },
      ],
      done: "end of the corridor. the server room door.",
    },
    {
      id: "eye",
      stake: "the room is cold. racks on both walls. and at the back — a steel eye. face it.",
      kind: "reach",
      target: "lockmaster-1",
      thought: "the lockmaster.",
      cues: [{ atMs: 0, sfx: "machinery" }],
      done: "it sees her. arms extending. sector grid online. weapon systems hot.",
      sfx: "target-lock",
    },
  ],
  ending: "relinquish",
  handoff: "CONTROL → WEAPON SYSTEMS",
};

export const BOSS_01_COMPLETE_LEVEL: AdventureLevel = {
  id: "boss-01-complete",
  title: "BOSS DEFEATED",
  subtitle: "LOCKMASTER DOWN",
  location: "SERVER ROOM · SUBLEVEL 3",
  theme: "server",
  map: [
    "###################################",
    "#..b..*...#.....*..h........#p.s.s#",
    "#..b......#.................#.....#",
    "#x.....r..d..*........*.....d.m*.L#",
    "#.........#.................#.....#",
    "#T...*....#.....*.......h...#s.s.s#",
    "###################################",
  ],
  ambience: ["facility-hum"],
  guards: [
    {
      id: "straggler",
      route: [
        { x: 12, y: 1, face: "right", waitMs: 2200 },
        { x: 20, y: 1, waitMs: 600 },
        { x: 20, y: 5, face: "left", waitMs: 2200 },
        { x: 12, y: 5, waitMs: 600 },
      ],
      loop: "cycle",
      speed: 1.3,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "controller",
      stake: "the lockmaster is down but the doors are still sealed. align the codes on the lock controller.",
      kind: "interact",
      target: "panel-1",
      verb: "ALIGN CODES",
      durationMs: 1600,
      unlocks: ["door-1", "door-2"],
      thought: "circuits fried. the controller's still live.",
      cues: [{ atMs: 0, sfx: "explosion-small", shake: 4, flash: "danger" }],
      done: "codes aligned. lock disengaging.",
    },
    {
      id: "clear",
      stake: "sublevel 3 is clear. dr. reeves is on sublevel 2 — keep going.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "sublevel 3 — cleared.",
      done: "she has to keep going.",
    },
  ],
  ending: "exit",
  endCard: { text: "BOSS DEFEATED", sub: "NEXT · GUARD ROSTER" },
};

// ── Floors 1-3 · stairwell landing → surveillance corridor → surveillance room ──

const SURVEILLANCE = [
  "#########################",
  "#m.r#.....*.....#..s..s.#",
  "#...d...........D.......#",
  "#...#....h......#.T.*...#",
  "#...#...........#..s..s.#",
  "#...#.......*...#########",
  "#########################",
];

export const CHAPTER_04_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-04-intro",
  title: "CHAPTER 4",
  subtitle: "GUARD ROSTER",
  location: "FLOOR 1-3 · SURVEILLANCE",
  theme: "corridor",
  map: placeBook(SURVEILLANCE, 23, 4),
  ambience: ["corridor-ambient", "facility-hum"],
  opening: "lockmaster down. circuits fried, but the door is open. she found reeves on sublevel 2.",
  guards: [
    {
      id: "corridor",
      route: [
        { x: 5, y: 1, waitMs: 600 },
        { x: 15, y: 1, face: "down", waitMs: 1500 },
        { x: 15, y: 5, waitMs: 500 },
        { x: 5, y: 5, face: "up", waitMs: 1200 },
      ],
      loop: "cycle",
      speed: 1.6,
      range: 5,
    },
    {
      id: "room",
      route: [
        { x: 17, y: 2, face: "down", waitMs: 1400 },
        { x: 23, y: 2, face: "down", waitMs: 1600 },
        { x: 23, y: 3, face: "left", waitMs: 1000 },
        { x: 20, y: 3, waitMs: 400 },
        { x: 20, y: 2, waitMs: 300 },
      ],
      loop: "cycle",
      speed: 1.3,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "photo",
      stake: "reeves photographed the guard schedule before the alarms hit. take it.",
      kind: "interact",
      target: "npc-1",
      verb: "TAKE PHOTOGRAPH",
      durationMs: 1400,
      pose: "idle",
      unlocks: ["door-1"],
      thought: "she has something.",
      cues: [{ atMs: 300, after: "interact", voice: { from: "reeves", text: "five names. four floors. shift windows. find the gap." } }],
      done: "guard schedule. five names, four floors. she needs to find the gap.",
    },
    {
      id: "watch",
      stake: "the surveillance room has a terminal. cross the corridor without being logged.",
      kind: "reach",
      target: "hide-1",
      checkpoint: true,
      thought: "but something else is watching.",
      cues: [
        { atMs: 2500, voice: { from: "ghost", text: "impressive. you beat the lockmaster." }, sfx: "warning-beep" },
        { atMs: 5400, voice: { from: "ghost", text: "you have twelve hours. then the building burns." } },
      ],
      done: "twelve hours.",
    },
    {
      id: "chapter",
      stake: "reeves hid chapter five behind the rack in the surveillance room — maps. get it before the terminal.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      checkpoint: true,
      thought: "behind the rack. she said it would be here.",
      done: "chapter five. maps — keys and values. the roster will make sense now.",
    },
    {
      id: "terminal",
      stake: "find the gap in the roster from the terminal — one floor goes clear in the next window.",
      kind: "interact",
      target: "terminal-1",
      verb: "OPEN THE ROSTER",
      durationMs: 1500,
      checkpoint: true,
      thought: "the terminal. the roster. the gap.",
      done: "five guards. four floors. find the gap.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
};

export const CHAPTER_04_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-04-complete",
  title: "CHAPTER 4 COMPLETE",
  subtitle: "ROSTER DECODED",
  location: "FLOOR 1-3 · SURVEILLANCE",
  theme: "corridor",
  map: [
    "#########################",
    "#..r#.....*.....#..s..s.#",
    "#...D...........D.m.....#",
    "#...#....h......#.T.*...#",
    "#...#...........#..s..s.#",
    "#x..#.......*...#########",
    "#########################",
  ],
  ambience: ["corridor-ambient"],
  guards: [
    {
      id: "corridor",
      route: [
        { x: 15, y: 1, face: "down", waitMs: 1500 },
        { x: 5, y: 1, waitMs: 600 },
        { x: 5, y: 5, face: "up", waitMs: 1200 },
        { x: 15, y: 5, waitMs: 500 },
      ],
      loop: "cycle",
      speed: 1.6,
      range: 5,
    },
  ],
  objectives: [
    {
      id: "decoded",
      stake: "the roster is decoded. floor 4 goes clear for forty minutes. reach the stairwell before the window closes.",
      kind: "reach",
      target: "exit-1",
      thought: "guard schedule decoded. floor 4 is clear.",
      cues: [
        { atMs: 0, sfx: "handshake-confirm", flash: "signal" },
        { atMs: 5000, thought: "but who is ghost? and what burns in twelve hours?" },
      ],
      done: "floor 4. no guards for another forty minutes. enough time.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 4 COMPLETE", sub: "NEXT · CIPHER RELAY" },
};

// ── Floor 2 · comms room ──

const COMMS = [
  "#######################",
  "#m....*......#s.s.s.s.#",
  "#............k........#",
  "#....h.......d....*...#",
  "#..*.........#...T....#",
  "#............#s.s.s.s.#",
  "#######################",
];

export const CHAPTER_04_2_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-04-2-intro",
  title: "CHAPTER 4.2",
  subtitle: "CIPHER RELAY",
  location: "FLOOR 2 · COMMS ROOM",
  theme: "comms",
  map: placeBook(COMMS, 21, 3),
  ambience: ["facility-hum", "tension-drone"],
  opening: "floor 2. the comms room. relay equipment lines the walls — half of it still powered.",
  guards: [
    {
      id: "corridor",
      route: [
        { x: 2, y: 2, waitMs: 800 },
        { x: 11, y: 2, face: "right", waitMs: 1000 },
        { x: 11, y: 5, waitMs: 500 },
        { x: 2, y: 5, face: "up", waitMs: 1000 },
      ],
      loop: "cycle",
      speed: 1.5,
      range: 5,
    },
    {
      id: "sweep",
      route: [
        { x: 21, y: 1, face: "left", waitMs: 6000 },
        { x: 15, y: 1, waitMs: 400 },
        { x: 15, y: 5, waitMs: 400 },
        { x: 21, y: 5, face: "left", waitMs: 6000 },
      ],
      loop: "cycle",
      speed: 1.4,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "bypass",
      stake: "the comms room door is coded. bypass it while the corridor patrol is turned away.",
      kind: "interact",
      target: "keypad-1",
      verb: "BYPASS KEYPAD",
      durationMs: 1600,
      unlocks: ["door-1"],
      thought: "the door's coded. the patrol turns every few seconds.",
      cues: [
        { atMs: 300, after: "interact", sfx: "keypad-beep" },
        { atMs: 700, after: "interact", sfx: "keypad-beep" },
        { atMs: 1100, after: "interact", sfx: "keypad-beep" },
      ],
      done: "the door gives.",
    },
    {
      id: "chapter",
      stake: "the last chapter is inside the relay cabinet — strings and runes. the cipher starts there.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      checkpoint: true,
      thought: "the relay cabinet. paper between the boards.",
      done: "chapter six. the last one she hid. strings, runes, the cipher.",
    },
    {
      id: "relay",
      stake: "ghost's scanners read every plain-text message. build the cipher from the relay console before the next sweep.",
      kind: "interact",
      target: "terminal-1",
      verb: "OPEN RELAY CONSOLE",
      durationMs: 1500,
      checkpoint: true,
      thought: "reeves on the line.",
      cues: [
        { atMs: 300, after: "interact", voice: { from: "reeves", text: "ghost's scanners intercept plain text. reverse each word — they can't parse that." } },
        { atMs: 1200, after: "interact", thought: "the scanners check every thirty seconds." },
      ],
      done: "the cipher has to be ready before the next sweep.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
};

export const CHAPTER_04_2_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-04-2-complete",
  title: "CHAPTER 4.2 COMPLETE",
  subtitle: "RELAY ENCRYPTED",
  location: "FLOOR 2 · SECURE RELAY",
  theme: "comms",
  map: [
    "#######################",
    "#x....*......#s.s.s.s.#",
    "#............k........#",
    "#....h.......D....*...#",
    "#..*.........#..mT....#",
    "#............#s.s.s.s.#",
    "#######################",
  ],
  ambience: ["facility-hum"],
  guards: [
    {
      id: "corridor",
      route: [
        { x: 11, y: 2, face: "right", waitMs: 1000 },
        { x: 2, y: 2, waitMs: 800 },
        { x: 2, y: 5, face: "up", waitMs: 1000 },
        { x: 11, y: 5, waitMs: 500 },
      ],
      loop: "cycle",
      speed: 1.5,
      range: 5,
    },
  ],
  objectives: [
    {
      id: "send",
      stake: "first encoded message through the relay. confirm it went.",
      kind: "interact",
      target: "terminal-1",
      verb: "SEND CIPHER",
      durationMs: 1400,
      thought: "\"evom ot roolf 4 — raelc\"",
      cues: [
        { atMs: 900, after: "interact", sfx: "code-submit", flash: "term" },
        { atMs: 1300, after: "interact", voice: { from: "reeves", text: "decoded on my end. the relay is live." } },
      ],
      done: "encrypted. invisible to ghost's scanners.",
    },
    {
      id: "move",
      stake: "they have a secure channel now. get to the stairwell before the next sweep.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "now they can coordinate. move.",
      done: "floor 4.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 4.2 COMPLETE", sub: "ACT I CONTINUES" },
};

export const ALL_LEVELS: AdventureLevel[] = [
  CHAPTER_01_INTRO_LEVEL,
  CHAPTER_01_COMPLETE_LEVEL,
  CHAPTER_02_INTRO_LEVEL,
  CHAPTER_02_COMPLETE_LEVEL,
  CHAPTER_03_INTRO_LEVEL,
  CHAPTER_03_COMPLETE_LEVEL,
  BOSS_01_INTRO_LEVEL,
  BOSS_01_COMPLETE_LEVEL,
  CHAPTER_04_INTRO_LEVEL,
  CHAPTER_04_COMPLETE_LEVEL,
  CHAPTER_04_2_INTRO_LEVEL,
  CHAPTER_04_2_COMPLETE_LEVEL,
];

export function levelById(id: string): AdventureLevel | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}
