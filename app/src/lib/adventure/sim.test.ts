import { describe, it, expect } from "vitest";
import { createSim, stepSim, interactPrompt, interactionProgress, currentObjective, CAPTURE_HOLD_MS, RELINQUISH_MS, EXIT_MS } from "./sim";
import type { AdventureLevel, SimInput, SimState } from "./types";

const IDLE: SimInput = { move: { x: 0, y: 0 }, interact: false };

function run(state: SimState, ms: number, input: SimInput = IDLE, step = 16): SimState {
  let s = state;
  for (let t = 0; t < ms; t += step) s = stepSim(s, input, step);
  return s;
}

function runUntil(state: SimState, pred: (s: SimState) => boolean, maxMs = 30000, input: SimInput = IDLE): SimState {
  let s = state;
  for (let t = 0; t < maxMs && !pred(s); t += 16) s = stepSim(s, input, 16);
  return s;
}

const LEVEL: AdventureLevel = {
  id: "test",
  title: "TEST",
  subtitle: "T",
  location: "L",
  theme: "cell",
  map: [
    "###########",
    "#.........#",
    "#.........#",
    "#m...h...T#",
    "#.........#",
    "#...d.....#",
    "#.....k...#",
    "###########",
  ],
  guards: [
    { id: "g", route: [{ x: 9, y: 1, face: "left", waitMs: 99999 }, { x: 8, y: 1 }], range: 6, halfAngle: 0.7 },
  ],
  objectives: [
    { id: "a", stake: "a", kind: "reach", target: "hide-1", checkpoint: true, done: "reached" },
    { id: "b", stake: "b", kind: "interact", target: "terminal-1", verb: "WAKE", durationMs: 500, unlocks: ["door-1"],
      cues: [{ atMs: 200, sfx: "terminal-beep", thought: "cue" }] },
  ],
  ending: "relinquish",
};

describe("createSim", () => {
  it("places maya at the spawn centre and guards on their first stop", () => {
    const s = createSim(LEVEL);
    expect(s.maya).toMatchObject({ x: 1.5, y: 3.5, anim: "idle" });
    expect(s.guards[0]).toMatchObject({ x: 9.5, y: 1.5, active: true, gone: false });
    expect(s.guards[0].angle).toBeCloseTo(Math.PI);
    expect(s.events.map((e) => e.type)).toContain("objective");
  });
});

describe("movement", () => {
  it("moves with direct input and stops at walls", () => {
    let s = createSim(LEVEL);
    s = run(s, 500, { move: { x: -1, y: 0 }, interact: false });
    expect(s.maya.x).toBeGreaterThan(1.2);
    expect(s.maya.x).toBeLessThan(1.5);
    s = run(s, 1000, { move: { x: 1, y: 0 }, interact: false });
    expect(s.maya.x).toBeGreaterThan(3);
    expect(s.maya.moving).toBe(true);
    expect(s.maya.anim).toBe("walk-right");
  });

  it("walks a clicked path and arrives on the target tile", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 1.5 } }, 16);
    expect(s.maya.path).not.toBeNull();
    s = runUntil(s, (st) => st.maya.path === null, 6000);
    expect(Math.floor(s.maya.x)).toBe(5);
    expect(Math.floor(s.maya.y)).toBe(1);
  });

  it("ignores clicks on solid tiles", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 0.5, y: 0.5 } }, 16);
    expect(s.maya.path).toBeNull();
  });
});

describe("objectives", () => {
  it("completes a reach objective, sets the checkpoint and starts the next", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.objectiveIndex === 1, 6000);
    expect(s.objectiveIndex).toBe(1);
    expect(s.completed.has("a")).toBe(true);
    expect(s.thought).toBe("reached");
    expect(s.checkpoint.objectiveIndex).toBe(0);
  });

  it("walks to an interactable, acts on it, fires cues, unlocks doors and relinquishes", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.objectiveIndex === 1, 6000);
    s = stepSim(s, { ...IDLE, interactWith: "terminal-1" }, 16);
    expect(s.maya.pendingInteract).toBe("terminal-1");
    s = runUntil(s, (st) => st.interaction !== null, 6000);
    expect(interactPrompt(s)).toBeNull();
    expect(s.maya.anim).toBe("hack");
    s = run(s, 250);
    expect(interactionProgress(s)).toBeGreaterThan(0.3);
    expect(s.thought).toBe("cue");
    s = runUntil(s, (st) => st.status === "ending", 2000);
    expect(s.openDoors.has("door-1")).toBe(true);
    expect(s.maya.anim).toBe("hack");
    s = run(s, RELINQUISH_MS + 50);
    expect(s.status).toBe("ended");
  });

  it("shows the prompt only when adjacent and starts on the interact key", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.objectiveIndex === 1, 6000);
    expect(interactPrompt(s)).toBeNull();
    s = stepSim(s, { ...IDLE, moveTo: { x: 8.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.maya.path === null, 6000);
    expect(interactPrompt(s)).toBe("WAKE");
    s = stepSim(s, { ...IDLE, interact: true }, 16);
    expect(s.interaction?.id).toBe("terminal-1");
  });

  it("hold objectives need time spent on the tile", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      guards: [],
      objectives: [{ id: "h", stake: "h", kind: "hold", target: "hide-1", durationMs: 600 }],
      ending: "exit",
    };
    let s = createSim(level);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.maya.path === null, 6000);
    expect(s.status).toBe("playing");
    s = run(s, 700);
    expect(s.status).toBe("ending");
    s = run(s, EXIT_MS + 50);
    expect(s.status).toBe("ended");
  });

  it("cues marked after:interact wait for the interaction to begin", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      guards: [],
      objectives: [{
        id: "listen", stake: "l", kind: "interact", target: "terminal-1", verb: "LISTEN", durationMs: 1000,
        cues: [
          { atMs: 100, thought: "early" },
          { atMs: 100, after: "interact", voice: { from: "reeves", text: "late" } },
        ],
      }],
    };
    let s = createSim(level);
    s = run(s, 1500);
    expect(s.thought).toBe("early");
    s = stepSim(s, { ...IDLE, interactWith: "terminal-1" }, 16);
    s = runUntil(s, (st) => st.interaction !== null, 8000);
    expect(s.thought).toBe("early");
    s = run(s, 200);
    expect(s.thought).toBe("reeves: late");
  });

  it("gives a hint when poking something off-objective", () => {
    let s = createSim(LEVEL);
    s = stepSim(s, { ...IDLE, moveTo: { x: 4.5, y: 4.5 } }, 16);
    s = runUntil(s, (st) => st.maya.path === null, 6000);
    s = stepSim(s, { ...IDLE, interactWith: "door-1" }, 16);
    expect(s.thought).toBe("locked. not this way.");
  });
});

describe("guards and detection", () => {
  it("raises the alert while seen and captures, then resets to the checkpoint", () => {
    let s = createSim(LEVEL);
    // Walk into the sentry's cone along row 1.
    s = stepSim(s, { ...IDLE, moveTo: { x: 6.5, y: 1.5 } }, 16);
    s = runUntil(s, (st) => st.alert > 0, 8000);
    expect(s.guards[0].seesMaya).toBe(true);
    expect(s.events.some((e) => e.type === "spotted") || s.alert > 0).toBe(true);
    s = runUntil(s, (st) => st.status === "captured", 4000);
    expect(s.status).toBe("captured");
    expect(s.captures).toBe(1);
    expect(s.maya.anim).toBe("captured");
    s = run(s, CAPTURE_HOLD_MS + 40);
    expect(s.status).toBe("playing");
    expect(s.maya).toMatchObject({ x: 1.5, y: 3.5 });
    expect(s.alert).toBe(0);
    expect(s.objectiveIndex).toBe(0);
  });

  it("does not see maya on a hide tile", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      guards: [{ id: "g", route: [{ x: 9, y: 3, face: "left", waitMs: 99999 }, { x: 8, y: 3 }], range: 9 }],
    };
    let s = createSim(level);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.maya.path === null, 6000);
    expect(s.maya.hidden).toBe(true);
    // She crossed the cone on the way in; hidden now, the meter drains to zero.
    s = run(s, 3000);
    expect(s.alert).toBe(0);
    expect(s.status).toBe("playing");
  });

  it("guards walk their route and turn to face stops", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      objectives: [{ id: "z", stake: "z", kind: "reach", target: "keypad-1" }],
      guards: [{ id: "g", route: [{ x: 9, y: 1 }, { x: 5, y: 1, face: "down", waitMs: 300 }], speed: 4, waitMs: 0 }],
    };
    let s = createSim(level);
    s = runUntil(s, (st) => !st.guards[0].moving && st.guards[0].x < 6, 5000);
    expect(s.guards[0].x).toBeCloseTo(5.5);
    expect(s.guards[0].angle).toBeCloseTo(Math.PI / 2);
    s = run(s, 1500);
    expect(s.guards[0].x).toBeGreaterThan(6);
  });

  it("triggered guards stay put until their objective completes", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      guards: [{ id: "g", triggerOn: "a", route: [{ x: 9, y: 1 }, { x: 2, y: 1 }], speed: 4 }],
    };
    let s = createSim(level);
    expect(s.guards[0].active).toBe(false);
    s = run(s, 1000);
    expect(s.guards[0].x).toBeCloseTo(9.5);
    s = stepSim(s, { ...IDLE, moveTo: { x: 5.5, y: 3.5 } }, 16);
    s = runUntil(s, (st) => st.objectiveIndex === 1, 6000);
    expect(s.guards[0].active).toBe(true);
    s = run(s, 500);
    expect(s.guards[0].x).toBeLessThan(9);
  });

  it("bumping into a guard captures instantly", () => {
    const level: AdventureLevel = {
      ...LEVEL,
      guards: [{ id: "g", route: [{ x: 3, y: 3, face: "up", waitMs: 99999 }, { x: 4, y: 3 }], range: 0 }],
    };
    let s = createSim(level);
    s = run(s, 1200, { move: { x: 1, y: 0 }, interact: false });
    expect(s.status).toBe("captured");
  });
});

describe("book chapters", () => {
  const level: AdventureLevel = {
    ...LEVEL,
    guards: [],
    map: [
      "###########",
      "#.........#",
      "#.........#",
      "#m..B.....#",
      "#.........#",
      "#.........#",
      "#........T#",
      "###########",
    ],
    objectives: [
      { id: "chapter", stake: "c", kind: "interact", target: "book-1", verb: "TAKE", durationMs: 300 },
      { id: "wake", stake: "w", kind: "interact", target: "terminal-1", verb: "WAKE", durationMs: 300, checkpoint: true },
    ],
  };

  it("taking the book emits a book event and removes it from the world", () => {
    let s = createSim(level);
    expect(s.grid.interactables.get("book-1")?.kind).toBe("book");
    s = stepSim(s, { ...IDLE, interactWith: "book-1" }, 16);
    s = runUntil(s, (st) => st.interaction !== null, 6000);
    let sawBook = false;
    s = runUntil(s, (st) => {
      if (st.events.some((e) => e.type === "book" && e.id === "book-1")) sawBook = true;
      return st.objectiveIndex === 1;
    }, 2000);
    expect(sawBook).toBe(true);
    expect(s.taken.has("book-1")).toBe(true);
  });

  it("poking the book off-objective hints instead of taking it", () => {
    const swapped: AdventureLevel = { ...level, objectives: [level.objectives[1], level.objectives[0]] };
    let s = createSim(swapped);
    s = stepSim(s, { ...IDLE, interactWith: "book-1" }, 16);
    s = runUntil(s, (st) => st.maya.path === null && st.thought !== null && st.thought.startsWith("paper"), 6000);
    expect(s.taken.size).toBe(0);
  });
});

describe("helpers", () => {
  it("exposes the current objective", () => {
    const s = createSim(LEVEL);
    expect(currentObjective(s)?.id).toBe("a");
  });
});
