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
// The hide spot (h) is the shadow behind the bunk.

const CELL_BLOCK = [
  "################",
  "#..............#",
  "#..............#",
  "#==k=d=#=d=#=d=#",
  "#*.....#...#...#",
  "#b.....#...#...#",
  "#bh....#.*.#.*.#",
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
  // The player's first patrol, so it's a fair one: he starts at the far end of
  // the corridor looking away, holds there while the player finds their feet,
  // and Maya hears him (and says what to do) before he takes a step. The first
  // sighting is forgiving — time to step back out of his light.
  onramp: {
    alertScale: 2,
    spotted: "his light is on me. back out of it — now.",
    tip: "his lit cone is what he sees · the shadow behind the bunk hides you",
  },
  guards: [
    {
      id: "patrol",
      route: [
        { x: 14, y: 2, face: "right", waitMs: 1400 },
        { x: 9, y: 2, face: "down", waitMs: 1400 },
        { x: 4, y: 2, face: "down", waitMs: 2400 },
        { x: 1, y: 2, waitMs: 1200 },
      ],
      speed: 1.6,
      range: 5.5,
      delayMs: 9000,
      warning: {
        leadMs: 3000,
        thought: "boots in the corridor. a guard. stay out of his light — or get down behind the bunk.",
        sfx: "footstep-boots-1",
      },
    },
  ],
  objectives: [
    {
      id: "power",
      stake: "the terminal is dead. find something in this cell that still has power.",
      kind: "interact",
      target: "crate-1",
      verb: "PRY OPEN THE BOX",
      durationMs: 1400,
      thought: "one dead terminal in the corner. and a maintenance box that still hums.",
      done: "live wires. i can run power to the terminal.",
      sfx: "machinery",
      cues: [{ atMs: 2600, sfx: "door-slide" }],
    },
    {
      id: "chapter",
      stake: "something is tucked down beside the bunk. whoever was here before left it for you.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1300,
      thought: "paper. folded small, pushed down between the bunk and the floor.",
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
  // The hide spot (h) is tucked against the bunk's far side — the "behind the
  // bunk" the hide objective names — not out on the open floor.
  map: CELL_BLOCK,
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
  map: placeBook(EAST_WING, 4, 1), // right beside her bunk, where the stake says it is
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

// ════════════════════════════════════════════════════════════════════
// ACT III · DEEPER IN
// From here the pages are Kira's — loose sheets in a sharper hand, left
// exactly where Maya is about to need them (boss 3's are Reeves' again).
// Kira speaks in capitals on the line; Maya stays lowercase.
// ════════════════════════════════════════════════════════════════════

// ── Server room · archive ──
// Anteroom (left) → rack hall with a patrol (racks in rows 2 and 4, open
// aisles above and below, a rack shadow on the middle aisle) → the archive
// (right): four archive racks, the page clipped beside the last one, the
// archive terminal in the corner.

const ARCHIVE = [
  "#########################",
  "#....#...........#......#",
  "#.m..#.s.s.s.s.s.#.s.s..#",
  "#....D....*....h.D......#",
  "#..*.#.s.s.s.s.s.#.s.s..#",
  "#....#...........#....T.#",
  "#########################",
];

export const CHAPTER_07_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-07-intro",
  title: "CHAPTER 7",
  subtitle: "FILE TREE",
  location: "SERVER ROOM · ARCHIVE",
  theme: "server",
  map: placeBook(ARCHIVE, 22, 4),
  ambience: ["facility-hum", "dark-drone-1"],
  opening: "the server room. somewhere in these racks is my thesis.",
  guards: [
    {
      id: "aisle",
      delayMs: 4200,
      warning: { thought: "boots in the rack hall. wait for him to turn.", leadMs: 2200 },
      route: [
        { x: 16, y: 1, face: "down", waitMs: 1600 },
        { x: 6, y: 1, waitMs: 500 },
        { x: 6, y: 5, face: "up", waitMs: 1600 },
        { x: 16, y: 5, waitMs: 500 },
      ],
      loop: "cycle",
      speed: 1.5,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "aisle",
      stake: "the archive is at the back of the server room. cross the rack hall without being seen.",
      kind: "reach",
      target: "hide-1",
      checkpoint: true,
      thought: "rack shadows. stay between them.",
      cues: [
        { atMs: 3600, sfx: "message-receive", voice: { from: "unregistered channel", text: "Archive, last rack. I left you something. Read it before you log in." } },
      ],
      done: "an unregistered channel. someone is watching me move.",
    },
    {
      id: "chapter",
      stake: "a page is clipped inside the last archive rack. take it before the terminal.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      checkpoint: true,
      thought: "paper clipped to the rack frame.",
      done: "chapter seven. not reeves' hand. someone knew i'd come here.",
    },
    {
      id: "terminal",
      stake: "count every file in the archive from its terminal — the thesis is on one of these servers.",
      kind: "interact",
      target: "terminal-1",
      verb: "OPEN THE ARCHIVE",
      durationMs: 1500,
      checkpoint: true,
      thought: "folders inside folders inside folders.",
      done: "the tree goes deep. some branches are corrupted.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
};

export const CHAPTER_07_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-07-complete",
  title: "CHAPTER 7 COMPLETE",
  subtitle: "THESIS LOCATED",
  location: "SERVER ROOM · ARCHIVE",
  theme: "server",
  map: [
    "#########################",
    "#....#...........#......#",
    "#....#.s.s.s.s.s.#.s.s..#",
    "#x...D....*....h.D......#",
    "#..*.#.s.s.s.s.s.#.s.s..#",
    "#....#...........#...mT.#",
    "#########################",
  ],
  ambience: ["facility-hum"],
  guards: [
    {
      id: "aisle",
      route: [
        { x: 6, y: 5, face: "up", waitMs: 1800 },
        { x: 16, y: 5, waitMs: 500 },
        { x: 16, y: 1, face: "down", waitMs: 1800 },
        { x: 6, y: 1, waitMs: 500 },
      ],
      loop: "cycle",
      speed: 1.4,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "located",
      stake: "the scan found the thesis. mark where it lives before anything else moves.",
      kind: "interact",
      target: "terminal-1",
      verb: "MARK THE THESIS",
      durationMs: 2600,
      thought: "gamma. thesis_v2.",
      cues: [
        { atMs: 0, sfx: "handshake-confirm", flash: "signal" },
        { atMs: 300, after: "interact", voice: { from: "kira", text: "Found it. Now look at the vault. GHOST isn't hiding evidence. He's erasing it." } },
        { atMs: 1700, after: "interact", voice: { from: "kira", text: "Your thesis won't survive in there. We copy it out tonight." } },
      ],
      done: "'we.' she said we.",
    },
    {
      id: "plant",
      stake: "the archive is wired to the alarm grid. the grid runs on the power plant — get there.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "the cage is alarmed. the alarm needs power.",
      done: "the power plant. two corridors over.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 7 COMPLETE", sub: "NEXT · CIRCUIT CUT" },
};

// ── Power plant · circuit array ──
// One humming hall: four breaker cabinets on the walls (north, west, east,
// south), transformer blocks for cover, the breaker console in the middle.
// Breaker four is the east cabinet; Kira's page is taped behind it.

const CIRCUIT_ARRAY = [
  "#####################",
  "#.........p.........#",
  "#..s.............s..#",
  "#...*...s...s...*...#",
  "#p.......T.........p#",
  "#...*...s.h.s...*...#",
  "#..s.............s..#",
  "#m........p.........#",
  "#####################",
];

export const CHAPTER_08_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-08-intro",
  title: "CHAPTER 8",
  subtitle: "CIRCUIT CUT",
  location: "POWER PLANT · CIRCUIT ARRAY",
  theme: "vent",
  map: placeBook(CIRCUIT_ARRAY, 19, 5),
  ambience: ["facility-hum", "dark-drone-2"],
  opening: "the power plant. four breakers feed the alarm grid. one of them has my name on it.",
  guards: [
    {
      id: "engineer",
      delayMs: 3800,
      warning: { thought: "an engineer on his rounds. keep the transformers between us.", leadMs: 2200 },
      route: [
        { x: 15, y: 2, face: "down", waitMs: 1400 },
        { x: 15, y: 6, waitMs: 500 },
        { x: 5, y: 6, face: "up", waitMs: 1400 },
        { x: 5, y: 2, waitMs: 500 },
      ],
      loop: "cycle",
      speed: 1.4,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "chapter",
      stake: "kira's page is taped behind breaker four — the east cabinet. get it while the engineer is turned away.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      checkpoint: true,
      thought: "north, south, east, west. paper behind the east one.",
      cues: [
        { atMs: 1200, sfx: "machinery", shake: 1.5 },
        { atMs: 2600, voice: { from: "kira", text: "Breaker four. Behind it. You'll want that before you touch anything." } },
      ],
      done: "chapter eight. her hand again. she knew i'd be at the breakers before i did.",
    },
    {
      id: "console",
      stake: "cut one breaker at a time and the grid seals the building. the console can drop all four at once.",
      kind: "interact",
      target: "terminal-1",
      verb: "WAKE BREAKER CONSOLE",
      durationMs: 1500,
      checkpoint: true,
      thought: "four hands. one moment.",
      done: "four circuits. one power cycle. the console does the rest.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
  handoff: "CONTROL → BREAKER CONSOLE",
};

export const CHAPTER_08_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-08-complete",
  title: "CHAPTER 8 COMPLETE",
  subtitle: "GRID BLIND",
  location: "POWER PLANT · CIRCUIT ARRAY",
  theme: "vent",
  // The grid is dark: no ceiling lights, only the console and the cabinets' status lamps.
  map: [
    "#####################",
    "#x........p.........#",
    "#..s.............s..#",
    "#.......s...s.......#",
    "#p.......Tm........p#",
    "#.......s.h.s.......#",
    "#..s.............s..#",
    "#.........p.........#",
    "#####################",
  ],
  lights: [
    { x: 9, y: 4, color: "term", intensity: 10 },
    { x: 10, y: 1, color: "danger", intensity: 4, range: 3 },
    { x: 1, y: 4, color: "danger", intensity: 4, range: 3 },
    { x: 19, y: 4, color: "danger", intensity: 4, range: 3 },
    { x: 10, y: 7, color: "danger", intensity: 4, range: 3 },
  ],
  ambience: ["dark-drone-2"],
  guards: [
    {
      id: "engineer",
      route: [
        { x: 15, y: 6, face: "up", waitMs: 2200 },
        { x: 15, y: 2, waitMs: 600 },
        { x: 5, y: 2, face: "down", waitMs: 2200 },
        { x: 5, y: 6, waitMs: 600 },
      ],
      loop: "cycle",
      speed: 1.1,
      range: 3.5,
    },
  ],
  objectives: [
    {
      id: "file",
      stake: "the grid is blind and kira has sent a file. open it — carefully.",
      kind: "interact",
      target: "terminal-1",
      verb: "QUARANTINE THE FILE",
      durationMs: 2800,
      thought: "all four down. the alarm grid is blind.",
      cues: [
        { atMs: 0, sfx: "handshake-confirm", flash: "signal", shake: 2 },
        { atMs: 200, after: "interact", sfx: "message-receive", voice: { from: "kira", text: "Grid's blind. You're welcome. Sending you something." } },
        { atMs: 1300, after: "interact", sfx: "warning-beep", thought: "the key for the thesis. and a zero-day stapled to it." },
        { atMs: 2200, after: "interact", voice: { from: "reeves", text: "a gift and a trap, priced as one. that is how she negotiates." } },
      ],
      done: "file quarantined. key extracted. remember this.",
    },
    {
      id: "comms",
      stake: "the thesis is copied and the grid will heal. the comms array is the way out — go now.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "she sent the key. and a gun aimed at my terminal. in the same file.",
      done: "the comms array. one floor up.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 8 COMPLETE", sub: "NEXT · CHANNEL OF ESCAPE" },
};

// ── Server room · comms array ──
// Stair landing (left) → patrolled hall with a shadow in the middle → the
// array room (right): the antenna housing, the page beneath it, the comms
// terminal in the corner.

const COMMS_ARRAY = [
  "#######################",
  "#....#....*.....#.s.s.#",
  "#.m..D..........D.....#",
  "#....#.....h....#.ss..#",
  "#..*.#..........#.ss..#",
  "#....#....*.....#....T#",
  "#######################",
];

export const CHAPTER_09_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-09-intro",
  title: "CHAPTER 9",
  subtitle: "CHANNEL OF ESCAPE",
  location: "SERVER ROOM · COMMS ARRAY",
  theme: "comms",
  map: placeBook(COMMS_ARRAY, 20, 4),
  ambience: ["facility-hum", "tension-drone"],
  opening: "the grid is blind. now i need a way out of the district before it heals.",
  guards: [
    {
      id: "hall",
      delayMs: 3600,
      warning: { thought: "a patrol in the hall. the grid is blind. he isn't.", leadMs: 2200 },
      route: [
        { x: 14, y: 1, face: "down", waitMs: 1500 },
        { x: 7, y: 1, waitMs: 400 },
        { x: 7, y: 5, face: "up", waitMs: 1500 },
        { x: 14, y: 5, waitMs: 400 },
      ],
      loop: "cycle",
      speed: 1.5,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "cross",
      stake: "the comms array is across the hall. get to the shadow in the middle while the patrol is turned.",
      kind: "reach",
      target: "hide-1",
      checkpoint: true,
      thought: "the array is past the hall.",
      done: "half way.",
    },
    {
      id: "chapter",
      stake: "there's paper under the antenna housing. kira's again. take it before the terminal.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      checkpoint: true,
      thought: "under the housing. of course it is.",
      done: "chapter nine. she's teaching me to listen on her frequencies.",
    },
    {
      id: "array",
      stake: "call every extraction team at once and go with whoever answers first.",
      kind: "interact",
      target: "terminal-1",
      verb: "POWER THE ARRAY",
      durationMs: 1600,
      checkpoint: true,
      thought: "three teams. three frequencies. all of them hers.",
      cues: [
        { atMs: 300, after: "interact", voice: { from: "kira", text: "Alpha, Bravo, Charlie. Take whoever answers. Don't wait on a dead line." } },
        { atMs: 1200, after: "interact", voice: { from: "reeves", text: "burn them unread, maya." } },
      ],
      done: "i can't afford to burn anything.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
  handoff: "CONTROL → COMMS ARRAY",
};

export const CHAPTER_09_COMPLETE_LEVEL: AdventureLevel = {
  id: "chapter-09-complete",
  title: "CHAPTER 9 COMPLETE",
  subtitle: "BRAVO CONFIRMS",
  location: "SERVER ROOM · COMMS ARRAY",
  theme: "comms",
  map: [
    "#######################",
    "#....#....*.....#.s.s.#",
    "#x...D..........D.....#",
    "#....#.....h....#.ss..#",
    "#..*.#..........#.ss..#",
    "#....#....*.....#...mT#",
    "#######################",
  ],
  ambience: ["facility-hum"],
  guards: [
    {
      id: "hall",
      route: [
        { x: 7, y: 5, face: "up", waitMs: 1700 },
        { x: 14, y: 5, waitMs: 400 },
        { x: 14, y: 1, face: "down", waitMs: 1700 },
        { x: 7, y: 1, waitMs: 400 },
      ],
      loop: "cycle",
      speed: 1.4,
      range: 4.5,
    },
  ],
  objectives: [
    {
      id: "bravo",
      stake: "a team answered first. take the call.",
      kind: "interact",
      target: "terminal-1",
      verb: "TAKE THE CALL",
      durationMs: 2800,
      thought: "first contact.",
      cues: [
        { atMs: 0, sfx: "handshake-confirm", flash: "term" },
        { atMs: 200, after: "interact", voice: { from: "bravo", text: "bravo. dock four, forty minutes, one passenger." } },
        { atMs: 1300, after: "interact", sfx: "message-receive", voice: { from: "kira", text: "Bravo's frequency is open air. Your thesis won't survive the trip uncoded. Use my encoder." } },
        { atMs: 2400, after: "interact", sfx: "dread-sting", thought: "six lines. reads clean. almost too clean." },
      ],
      done: "six lines. i can read six lines.",
    },
    {
      id: "dock",
      stake: "bravo holds dock 4 for forty minutes. reeves is at the dock relay — get there before a line of kira's encoder runs.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "every gift of hers has carried a blade so far.",
      done: "the dock relay.",
    },
  ],
  ending: "exit",
  endCard: { text: "CHAPTER 9 COMPLETE", sub: "NEXT · KIRA · ALLEGIANCE" },
};

// ── Dock relay · Kira's channel ──
// Near-dark relay room above dock 4. The dock walkway beyond the bars,
// Reeves waiting by the relay racks, the relay console in the far corner
// under a single amber channel lamp. No patrol on the way in.

const DOCK_RELAY = [
  "#####################",
  "#...................#",
  "#===================#",
  "#m...........r......#",
  "#...................#",
  "#..s.s.........s.T..#",
  "#####################",
];

export const BOSS_03_INTRO_LEVEL: AdventureLevel = {
  id: "boss-03-intro",
  title: "BOSS",
  subtitle: "KIRA · ALLEGIANCE",
  location: "DOCK RELAY · KIRA'S CHANNEL",
  theme: "boss",
  map: placeBook(DOCK_RELAY, 14, 3), // at her side — folded into her coat
  lights: [
    { x: 17, y: 4, color: "alert", intensity: 9, range: 4 },
    { x: 13, y: 4, color: "cool", intensity: 6, range: 4 },
    { x: 4, y: 3, color: "cool", intensity: 4, range: 4 },
  ],
  ambience: ["dark-drone-1"],
  opening: "dock 4 is below us. bravo is holding. reeves is already here.",
  guards: [],
  objectives: [
    {
      id: "reeves",
      stake: "reeves ran kira's encoder through the dock relay. hear what came back.",
      kind: "interact",
      target: "npc-1",
      verb: "LISTEN",
      durationMs: 3200,
      pose: "idle",
      thought: "she's been at the relay for an hour.",
      cues: [
        { atMs: 300, after: "interact", voice: { from: "reeves", text: "the receiver log came back wrong. wrong in a way only three people in this building could see." } },
        { atMs: 1900, after: "interact", voice: { from: "reeves", text: "she wrote it to be read. so read it." } },
      ],
      done: "her code. my verdict.",
    },
    {
      id: "chapter",
      stake: "reeves has pages folded into her coat. she wrote them for tonight.",
      kind: "interact",
      target: "book-1",
      verb: "TAKE THE PAGES",
      durationMs: 1200,
      thought: "her hand again. not kira's.",
      done: "reeves' pages. read before you run.",
    },
    {
      id: "relay",
      stake: "decide what kira is before her code touches the thesis. the relay console has her six lines.",
      kind: "interact",
      target: "terminal-1",
      verb: "OPEN KIRA'S CHANNEL",
      durationMs: 1600,
      thought: "one amber light. one open line.",
      cues: [
        { atMs: 400, after: "interact", sfx: "message-receive", voice: { from: "kira", text: "Take your time, Maya. I'm patient. Bravo isn't." } },
      ],
      done: "six lines. one verdict.",
      sfx: "terminal-beep",
    },
  ],
  ending: "relinquish",
  handoff: "CONTROL → THE VERDICT",
};

export const BOSS_03_COMPLETE_LEVEL: AdventureLevel = {
  id: "boss-03-complete",
  title: "VERDICT GIVEN",
  subtitle: "KIRA · ALLEGIANCE",
  location: "DOCK RELAY · KIRA'S CHANNEL",
  theme: "boss",
  // Verdict-neutral: plays the same after TRUST and REJECT.
  map: [
    "#####################",
    "#...................#",
    "#===================#",
    "#x...........r......#",
    "#...................#",
    "#..s.s.........s.Tm.#",
    "#####################",
  ],
  lights: [
    { x: 17, y: 4, color: "alert", intensity: 6, range: 4 },
    { x: 13, y: 4, color: "cool", intensity: 6, range: 4 },
    { x: 2, y: 3, color: "cool", intensity: 5, range: 4 },
  ],
  ambience: ["dark-drone-1", "heartbeat-slow"],
  guards: [
    {
      // One distant sweep on the dock walkway, beyond the bars.
      id: "walkway",
      route: [
        { x: 18, y: 1, face: "left", waitMs: 2400 },
        { x: 2, y: 1, face: "right", waitMs: 2400 },
      ],
      speed: 1.2,
      range: 2.5,
      halfAngle: 0.45,
    },
  ],
  objectives: [
    {
      id: "after",
      stake: "the verdict is sent. reeves is waiting.",
      kind: "interact",
      target: "npc-1",
      verb: "TALK",
      durationMs: 2600,
      pose: "idle",
      thought: "it's done. whatever she is, we know now.",
      cues: [
        { atMs: 300, after: "interact", voice: { from: "reeves", text: "you read it. that is more than most would have done." } },
        { atMs: 1500, after: "interact", voice: { from: "reeves", text: "the exit corridor runs under the dock. bravo will not hold forever." } },
      ],
      done: "whatever comes next, i chose it with my eyes open.",
    },
    {
      id: "exit",
      stake: "bravo is holding at dock 4. reach the exit corridor.",
      kind: "reach",
      target: "exit-1",
      checkpoint: true,
      thought: "keep low under the walkway.",
      done: "the exit corridor.",
    },
  ],
  ending: "exit",
  endCard: { text: "ACT III COMPLETE", sub: "NEXT · SENSOR SWEEP" },
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
  CHAPTER_07_INTRO_LEVEL,
  CHAPTER_07_COMPLETE_LEVEL,
  CHAPTER_08_INTRO_LEVEL,
  CHAPTER_08_COMPLETE_LEVEL,
  CHAPTER_09_INTRO_LEVEL,
  CHAPTER_09_COMPLETE_LEVEL,
  BOSS_03_INTRO_LEVEL,
  BOSS_03_COMPLETE_LEVEL,
];

export function levelById(id: string): AdventureLevel | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}
