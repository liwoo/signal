"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { BossFightConfig, BossCombatPhase } from "@/types/game";
import {
  createBossCombatState,
  getCurrentTurn,
  startTelegraph,
  startPlayerWindow,
  updateTabCode,
  buildSource,
  checkOutput,
  resolveTurnHit,
  resolveTurnMiss,
  advanceAfterResult,
  calculateBossXP,
  isFightOver,
  type BossCombatState,
  type BossXPBreakdown,
  type TurnResult,
} from "@/lib/game/boss-combat";
import { loseHeart } from "@/lib/game/hearts";
import { calculateLevel } from "@/lib/game/xp";
import { compileGo } from "@/lib/go/playground";
import {
  trackBossStart,
  trackBossTurnResult,
  trackBossVictory,
  trackBossDefeat,
  trackBossRetry,
} from "@/lib/analytics";

// ── Maya comms messages ──

export interface BossMessage {
  id: number;
  from: "MAYA" | "SYS";
  text: string;
}

// Maya intro (typed before the fight begins — gives narrative context)
const MAYA_INTRO: string[] = [
  "i just got in... i can see the lockmaster's core from here.",
  "the weapon system's split into two packages. aim.go, load.go, fire.go are in package weapon — but the malware mangled them. types are wrong, braces missing, variables renamed...",
  "i need you to debug the weapon files while i keep us alive. then write the combo function in main.go to chain the final kill shot.",
  "the lockmaster will shoot back. every hit takes me down. fix the code fast.",
];

// Per-turn Maya callouts (keyed by turn index)
const MAYA_TELEGRAPH: Record<number, string> = {
  0: "aim.go first. the malware broke the parameter type and the switch variable. fix it so sector 3 resolves to coordinates.",
  1: "load.go now. there's a type error and a wrong variable name in the append loop. the compiler will tell you where.",
  2: "fire.go next. missing closing brace, wrong operator, and it returns the wrong string. fix all three.",
  3: "all three files should work now. this turn wires them together — aim, load, fire. the output has to match exactly.",
  4: "it rerouted the whole grid. every coordinate in aim.go just shifted +64 on both axes. update them all.",
  5: "last shot. write the Combo function in main.go — it takes variadic strings and joins them with \" | \". check the comments for the signature.",
};

const MAYA_HIT: string[] = [
  "direct hit. keep going.",
  "that hurt it. don't stop.",
  "nice shot. stay focused.",
  "it's taking damage. keep the pressure on.",
  "clean hit. you're doing this.",
  "that's it. one more.",
];

// Turn-specific malfunction hints — keyed by activeTab so the player knows exactly what to fix
// Turn-specific malfunction (compile error) hints — escalate on retry
const MAYA_MALFUNCTION_BY_TURN: Record<number, string[]> = {
  1: [
    "aim.go won't compile. \"in\" isn't a type — change it to \"int\". and the switch says \"s\" but the parameter is called \"sector\".",
    "still broken. three things: change \"in\" to \"int\" in the parameter, change \"s\" to \"sector\" in the switch, and add a closing \"}\" at the bottom.",
  ],
  2: [
    "load.go won't compile. \"sting\" isn't a type — change it to \"string\". and the append uses \"ammo\" but the variable is called \"ammoType\".",
    "two fixes: the parameter type is \"sting\" (needs to be \"string\") and line with append says \"ammo\" — change that to \"ammoType\".",
  ],
  3: [
    "fire.go won't compile. the first if block is missing its closing \"}\" before the second if.",
    "add \"}\" after the NoTarget return to close the first if. then change \"&&\" to \"||\" — reject if either coordinate is zero.",
  ],
  4: [
    "something still won't compile. all three files need to be clean — check the error to see which file has the bug.",
    "the error line number tells you which file. go back and fix the compile error there first.",
  ],
  5: [
    "aim.go won't compile. if you changed the syntax, double-check your return statements and commas.",
    "make sure every case still has \"return x, y\" format with two integers separated by a comma.",
  ],
  6: [
    "main.go won't compile. you need to write the Combo function — check the comments for the signature.",
    "Combo takes variadic strings (shots ...string) and returns strings.Join(shots, \" | \").",
  ],
};

// Turn-specific miss (wrong output) hints — escalate on retry
const MAYA_MISS_BY_TURN: Record<number, string[]> = {
  1: [
    "the test calls Aim(3) but your switch doesn't have case 3. add it — sector 3 is at coordinates 384, 160.",
    "add \"case 3: return 384, 160\" to your switch. the output needs to be exactly \"AIM 384 160\".",
  ],
  2: [
    "the test calls Load(\"shield\") which should return 3 copies of \"pierce\". make sure the append uses \"ammoType\" not \"ammo\".",
    "check two things: the parameter type must be \"string\" (not \"sting\") and the append line must use \"ammoType\" — that's where \"pierce\" is stored.",
  ],
  3: [
    "wrong result. check the const block — Hit is set to \"FIRE\" but it should be \"HIT\".",
    "the const Hit = \"FIRE\" is the malware corruption. change it to Hit = \"HIT\". also make sure && is || and the missing brace is added.",
  ],
  4: [
    "all three files need to work together. check which part is wrong — the output must be exactly three lines: AIM, LOAD count, then HIT.",
    "the test calls Aim(5), Load(\"armor\"), then Fire. output must be \"AIM 256 320\" then \"LOAD 2\" then \"HIT\" — each on its own line.",
  ],
  5: [
    "the grid shifted +64 on both axes. sector 5 was (256,320) — now it's (320,384). update every coordinate in aim.go.",
    "add 64 to every x and every y value in all your switch cases. sector 5 should return 320, 384.",
  ],
  6: [
    "Combo output is wrong. it should join shots with \" | \" — use strings.Join(shots, \" | \").",
    "write: func Combo(shots ...string) string { return strings.Join(shots, \" | \") }. output must be \"HIT | HIT | HIT\".",
  ],
};

const MAYA_MALFUNCTION_FALLBACK = "won't compile. the error line number tells you where the bug is.";
const MAYA_MISS_FALLBACK = "output doesn't match. compare what your code prints to what the test expects.";

const MAYA_TIMEOUT: string[] = [
  "too slow. you ran out of time on that one.",
  "the window closed. be faster next turn.",
];

const MAYA_DODGE: string[] = [
  "whoa — ducked that one. keep coding.",
  "barely missed me. i'm fine, keep going.",
  "close call. don't look up, just type.",
  "i saw it coming. stay focused on the code.",
  "rolled clear. hurry up before the next one.",
];

// ── Public state ──

export interface BossFightState {
  phase: BossCombatPhase;
  bossHP: number;
  turnIndex: number;
  turnTotal: number;
  currentTelegraph: string;
  currentHint: string;
  activeTab: string;
  tabCode: Record<string, string>;
  hearts: number;
  xp: number;
  level: number;
  xpBreakdown: BossXPBreakdown | null;
  lastOutcome: "hit" | "miss" | "malfunction" | "timeout" | null;
  lastFeedback: string;
  busy: boolean;
  turnResults: TurnResult[];
  messages: BossMessage[];
  heartsLost: number;
  waitingForContinue: boolean;
}

export interface BossFightActions {
  startFight: () => void;
  continueIntro: () => void;
  setTabCode: (tabId: string, code: string) => void;
  execute: () => void;
  nextTurn: () => void;
  retryFight: () => void;
  bossAttackHit: () => void;
  bossAttackDodge: () => void;
}

export interface BossSavePayload {
  xp: number;
  level: number;
  hearts: number;
  completedChapter?: number;
}

// ── Timing ──

const TELEGRAPH_DURATION_MS = 3500;

// ── Hook ──

export function useBossFight(
  config: BossFightConfig,
  chapterNumber: number,
  initialXP: number,
  initialLevel: number,
  initialHearts: number,
  onSave?: (payload: BossSavePayload) => void
): [BossFightState, BossFightActions] {
  const [combat, setCombat] = useState<BossCombatState>(() => createBossCombatState(config));
  // Boss fight always starts with at least 5 hearts — need to survive multiple boss attacks
  const [hearts, setHearts] = useState(Math.max(5, initialHearts));
  const [xp, setXp] = useState(initialXP);
  const [level, setLevel] = useState(initialLevel);
  const [busy, setBusy] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<BossFightState["lastOutcome"]>(null);
  const [lastFeedback, setLastFeedback] = useState("");
  const [xpBreakdown, setXpBreakdown] = useState<BossXPBreakdown | null>(null);
  const [messages, setMessages] = useState<BossMessage[]>([]);
  // Pending save payload — written in nextTurn, consumed by useEffect
  const [pendingSave, setPendingSave] = useState<BossSavePayload | null>(null);

  const [heartsLost, setHeartsLost] = useState(0);
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const msgIdRef = useRef(0);
  const introIndexRef = useRef(-1);
  const turnRetryRef = useRef(0); // how many malfunction/miss attempts on current turn
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const combatRef = useRef(combat);
  combatRef.current = combat;
  const heartsRef = useRef(hearts);
  heartsRef.current = hearts;

  // ── Add a comms message ──

  const addMsg = useCallback((from: "MAYA" | "SYS", text: string) => {
    const id = ++msgIdRef.current;
    setMessages((prev) => [...prev, { id, from, text }]);
  }, []);

  // ── Persist via useEffect (fixes setState-during-render) ──

  useEffect(() => {
    if (!pendingSave) return;
    onSaveRef.current?.(pendingSave);
    setPendingSave(null);
  }, [pendingSave]);

  // ── Start the fight (show first intro message, wait for continue) ──

  const startFight = useCallback(() => {
    trackBossStart(config.bossName);
    introIndexRef.current = 0;
    addMsg("MAYA", MAYA_INTRO[0]);
    // Brief delay before showing continue button (let player read)
    setTimeout(() => setWaitingForContinue(true), 600);
  }, [addMsg]);

  // ── Continue through intro messages, then start combat ──

  const continueIntro = useCallback(() => {
    setWaitingForContinue(false);
    const nextIndex = introIndexRef.current + 1;
    introIndexRef.current = nextIndex;

    if (nextIndex < MAYA_INTRO.length) {
      // More intro messages — show next, then wait for continue
      addMsg("MAYA", MAYA_INTRO[nextIndex]);
      setTimeout(() => setWaitingForContinue(true), 600);
    } else {
      // Intro complete — start first telegraph
      const state = startTelegraph(combatRef.current);
      setCombat(state);
      addMsg("SYS", "▸ WEAPON SYSTEMS ENGAGED");

      // Maya callout for turn 0
      setTimeout(() => {
        const callout = MAYA_TELEGRAPH[0];
        if (callout) addMsg("MAYA", callout);
      }, 600);

      // After telegraph, open player window
      setTimeout(() => {
        setCombat((prev) => startPlayerWindow(prev, Date.now()));
      }, TELEGRAPH_DURATION_MS);
    }
  }, [addMsg]);

  // ── Update tab code ──

  const setTabCode = useCallback((tabId: string, code: string) => {
    setCombat((prev) => updateTabCode(prev, tabId, code));
  }, []);

  // ── Execute (compile + check) ──

  const execute = useCallback(async () => {
    if (busy) return;
    const state = combatRef.current;
    if (state.phase !== "player_window") return;

    const turn = getCurrentTurn(config, state);
    if (!turn) return;

    setBusy(true);
    setLastOutcome(null);
    setLastFeedback("");

    const elapsedMs = Date.now() - state.turnStartMs;
    const source = buildSource(config, state, turn);

    console.log("[BOSS] ── EXECUTE ──");
    console.log("[BOSS] turn:", turn.id, "activeTab:", turn.activeTab);
    console.log("[BOSS] expected:", JSON.stringify(turn.expectedOutput));
    console.log("[BOSS] source:\n" + source);

    // Try Go Playground compilation
    let output = "";
    let compileError = "";
    try {
      const result = await compileGo(source);
      if (!result.success) {
        compileError = result.errors;
      } else {
        output = result.output;
      }
    } catch {
      compileError = "";
      output = "__OFFLINE__";
    }

    console.log("[BOSS] compileError:", JSON.stringify(compileError));
    console.log("[BOSS] output:", JSON.stringify(output));
    console.log("[BOSS] match:", output.trim() === turn.expectedOutput.trim());

    if (compileError && compileError !== "__OFFLINE__") {
      // Compilation error → stay on same turn, let player fix and retry
      // Parse the first meaningful error from the Go compiler
      const firstError = compileError
        .split("\n")
        .filter((l) => l.includes(": "))
        .map((l) => l.replace(/^\.\/prog\.go:\d+:\d+:\s*/, "").trim())
        .find((l) => l.length > 0) ?? "check the error output";

      // Check if this is a known starter-code corruption or a player-introduced bug
      const isKnownCorruption =
        compileError.includes('"sting"') ||
        compileError.includes('"in"') ||
        compileError.includes("expected declaration") ||
        /\bin\)/.test(compileError);

      const hints = MAYA_MALFUNCTION_BY_TURN[turn.id];
      let msg: string;
      if (isKnownCorruption && hints) {
        msg = hints[Math.min(turnRetryRef.current, hints.length - 1)];
      } else {
        // Player introduced a new bug — show the actual compiler error
        msg = `won't compile: ${firstError}`;
      }
      turnRetryRef.current += 1;
      setLastOutcome("malfunction");
      setLastFeedback(`MALFUNCTION — ${firstError}`);
      trackBossTurnResult(config.bossName, state.turnIndex + 1, "malfunction");
      addMsg("SYS", `⚠ COMPILE ERROR`);
      addMsg("MAYA", msg);
      setBusy(false);
      return;
    }

    // Check output
    const isCorrect = output !== "__OFFLINE__" && checkOutput(output, turn.expectedOutput);

    if (isCorrect) {
      turnRetryRef.current = 0; // reset for next turn
      const { state: nextState } = resolveTurnHit(config, state, turn, elapsedMs);
      setCombat(nextState);
      setLastOutcome("hit");
      setLastFeedback("DIRECT HIT");
      trackBossTurnResult(config.bossName, state.turnIndex + 1, "hit");
      addMsg("SYS", `▸ HIT — ${turn.damage} DMG`);
      addMsg("MAYA", MAYA_HIT[state.turnIndex % MAYA_HIT.length]);
      setBusy(false);
    } else {
      // Wrong output → stay on same turn, let player fix and retry
      const hints = MAYA_MISS_BY_TURN[turn.id];
      const msg = hints
        ? hints[Math.min(turnRetryRef.current, hints.length - 1)]
        : MAYA_MISS_FALLBACK;
      turnRetryRef.current += 1;
      setLastOutcome("miss");
      setLastFeedback(output === "__OFFLINE__" ? "MISS — offline mode" : `MISS — got: ${output.trim().slice(0, 60)}`);
      trackBossTurnResult(config.bossName, state.turnIndex + 1, "miss");
      addMsg("SYS", `✕ MISS`);
      addMsg("MAYA", msg);
      setBusy(false);
    }
  }, [busy, config, addMsg]);

  // ── Advance to next turn (called after result animation) ──

  const nextTurn = useCallback(() => {
    const state = combatRef.current;
    const currentHearts = heartsRef.current;
    const advanced = advanceAfterResult(config, state, currentHearts);
    setCombat(advanced);

    if (isFightOver(config, advanced)) {
      // Calculate final XP
      const breakdown = calculateBossXP(config, advanced);
      setXpBreakdown(breakdown);
      const newXP = xp + breakdown.total;
      const newLevel = calculateLevel(newXP);
      setXp(newXP);
      setLevel(newLevel);

      // Queue the save for useEffect (avoids setState-in-render)
      const isVictory = advanced.phase === "victory" || advanced.phase === "boss_retreats";
      setPendingSave({
        xp: newXP,
        level: newLevel,
        hearts: heartsRef.current,
        completedChapter: isVictory ? chapterNumber : undefined,
      });

      if (advanced.phase === "victory") {
        addMsg("MAYA", "it's down. lockmaster offline. we did it.");
        trackBossVictory(config.bossName, breakdown.total, heartsRef.current < Math.max(5, initialHearts) ? Math.max(5, initialHearts) - heartsRef.current : 0);
      } else if (advanced.phase === "boss_retreats") {
        addMsg("MAYA", "it's damaged enough — retreating to sublevel 2. we're through.");
        trackBossVictory(config.bossName, breakdown.total, Math.max(5, initialHearts) - heartsRef.current);
      } else if (advanced.phase === "gameover") {
        addMsg("MAYA", "systems overwhelmed. we'll have to try again.");
        trackBossDefeat(config.bossName, advanced.turnIndex + 1, Math.max(5, initialHearts) - heartsRef.current);
      }
      return;
    }

    // Start next telegraph
    setLastOutcome(null);
    setLastFeedback("");

    // Maya callout for next turn
    const nextTurnIndex = advanced.turnIndex;
    const callout = MAYA_TELEGRAPH[nextTurnIndex];
    if (callout) {
      setTimeout(() => addMsg("MAYA", callout), 300);
    }

    setTimeout(() => {
      setCombat((prev) => startPlayerWindow(prev, Date.now()));
    }, TELEGRAPH_DURATION_MS);
  }, [config, chapterNumber, xp, addMsg]);

  // ── Boss attack hits Maya (projectile landed) ──

  const bossAttackHit = useCallback(() => {
    const currentH = heartsRef.current;
    if (currentH <= 0) return; // already dead
    const newHearts = loseHeart(currentH);
    setHearts(newHearts);
    setHeartsLost((prev) => prev + 1);

    const hitLines = [
      "took a hit... keep coding, i can handle it.",
      "ugh... that one got through. focus on the weapon.",
      "i'm hit... don't stop. finish the code.",
      "armor's failing... please hurry.",
      "i can't take much more of this...",
    ];
    addMsg("MAYA", hitLines[Math.min(initialHearts - newHearts - 1, hitLines.length - 1)]);

    if (newHearts <= 0) {
      // Maya is dead — game over
      addMsg("SYS", "✕ MAYA DOWN");
      setCombat((prev) => ({ ...prev, phase: "gameover" as BossCombatPhase }));
    }
  }, [addMsg, initialHearts]);

  // ── Boss attack dodged by Maya ──

  const dodgeCountRef = useRef(0);
  const bossAttackDodge = useCallback(() => {
    const idx = dodgeCountRef.current % MAYA_DODGE.length;
    dodgeCountRef.current += 1;
    addMsg("MAYA", MAYA_DODGE[idx]);
    addMsg("SYS", "▸ NEAR MISS");
  }, [addMsg]);

  // ── Retry (after game over) ──

  const retryFight = useCallback(() => {
    trackBossRetry(config.bossName);
    setCombat(createBossCombatState(config));
    setLastOutcome(null);
    setLastFeedback("");
    setXpBreakdown(null);
    setMessages([]);
    setHeartsLost(0);
    setHearts(Math.max(5, initialHearts));
    setWaitingForContinue(false);
    introIndexRef.current = -1;
    dodgeCountRef.current = 0;
    turnRetryRef.current = 0;
  }, [config, initialHearts]);

  // ── Derive public state ──

  const turn = getCurrentTurn(config, combat);

  const state: BossFightState = {
    phase: combat.phase,
    bossHP: combat.bossHP,
    turnIndex: combat.turnIndex,
    turnTotal: config.turns.length,
    currentTelegraph: turn?.telegraph ?? "",
    currentHint: turn?.hint ?? "",
    activeTab: turn?.activeTab ?? config.tabs[0]?.id ?? "",
    tabCode: combat.tabCode,
    hearts,
    xp,
    level,
    xpBreakdown,
    lastOutcome,
    lastFeedback,
    busy,
    turnResults: combat.turnResults,
    messages,
    heartsLost,
    waitingForContinue,
  };

  const actions: BossFightActions = {
    startFight,
    continueIntro,
    setTabCode,
    execute,
    nextTurn,
    retryFight,
    bossAttackHit,
    bossAttackDodge,
  };

  return [state, actions];
}
