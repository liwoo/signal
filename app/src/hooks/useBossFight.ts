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

// ── Maya comms messages ──

export interface BossMessage {
  id: number;
  from: "MAYA" | "SYS";
  text: string;
}

// Maya intro (typed before the fight begins — gives narrative context)
const MAYA_INTRO: string[] = [
  "i just got in... i can see the lockmaster's core from here.",
  "i've got the main weapon system online but the firmware's corrupted.",
  "i need you to fix each module — aim, load, fire — while i keep us alive.",
  "the lockmaster will shoot back. every hit takes me down. don't let me die in here.",
];

// Per-turn Maya callouts (keyed by turn index)
const MAYA_TELEGRAPH: Record<number, string> = {
  0: "first up — open aim.go. i need you to map sector 3 to coordinates. the grid reference is in the comments.",
  1: "shield array deploying. switch to load.go — match the threat type to the right ammo. hurry.",
  2: "the core's exposed at sector 7! aim.go — you know the drill. fast.",
  3: "emp blast charging from sector 5. fire.go — wire aim and load together. return \"HIT\" when it's valid.",
  4: "it rerouted! the whole grid shifted +64 on each axis. update aim.go — every coordinate changed.",
  5: "all defenses down. this is the kill shot. aim sector 9, load pulse, fire everything.",
};

const MAYA_HIT: string[] = [
  "direct hit. keep going.",
  "that hurt it. don't stop.",
  "nice shot. stay focused.",
  "it's taking damage. keep the pressure on.",
  "clean hit. you're doing this.",
  "that's it. one more.",
];

const MAYA_MISS: string[] = [
  "missed. check the expected output — what did your code print?",
  "not quite. double-check the function returns.",
  "the output didn't match. slow down and read the hint.",
];

const MAYA_TIMEOUT: string[] = [
  "too slow. you ran out of time on that one.",
  "the window closed. be faster next turn.",
];

const MAYA_MALFUNCTION: string[] = [
  "compile error. check your syntax — missing brackets? wrong types?",
  "your code didn't compile. fix the error and be ready for the next turn.",
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
}

export interface BossFightActions {
  startFight: () => void;
  setTabCode: (tabId: string, code: string) => void;
  execute: () => void;
  nextTurn: () => void;
  retryFight: () => void;
  bossAttackHit: () => void;
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
  const msgIdRef = useRef(0);
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

  // ── Start the fight ──

  const startFight = useCallback(() => {
    // Phase 1: Maya intro typing — gives player context before chaos begins
    MAYA_INTRO.forEach((line, i) => {
      setTimeout(() => addMsg("MAYA", line), i * 1200);
    });

    // Phase 2: After intro, start first telegraph
    const introDelay = MAYA_INTRO.length * 1200 + 800;
    setTimeout(() => {
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
    }, introDelay);
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

    if (compileError && compileError !== "__OFFLINE__") {
      // Compilation error → MALFUNCTION
      const { state: nextState } = resolveTurnMiss(config, state, turn, elapsedMs, "malfunction");
      setCombat(nextState);
      setLastOutcome("malfunction");
      setLastFeedback(`MALFUNCTION — ${compileError.split("\n")[0]}`);
      // No heart loss on malfunction — boss attacks handle damage
      addMsg("SYS", `⚠ COMPILE ERROR`);
      addMsg("MAYA", MAYA_MALFUNCTION[state.turnIndex % MAYA_MALFUNCTION.length]);
      setBusy(false);
      return;
    }

    // Check output
    const isCorrect = output !== "__OFFLINE__" && checkOutput(output, turn.expectedOutput);

    if (isCorrect) {
      const { state: nextState } = resolveTurnHit(config, state, turn, elapsedMs);
      setCombat(nextState);
      setLastOutcome("hit");
      setLastFeedback("DIRECT HIT");
      addMsg("SYS", `▸ HIT — ${turn.damage} DMG`);
      addMsg("MAYA", MAYA_HIT[state.turnIndex % MAYA_HIT.length]);
      setBusy(false);
    } else {
      const { state: nextState } = resolveTurnMiss(config, state, turn, elapsedMs, "miss");
      setCombat(nextState);
      setLastOutcome("miss");
      setLastFeedback(output === "__OFFLINE__" ? "MISS — offline mode" : `MISS — got: ${output.trim().slice(0, 60)}`);
      // No heart loss on miss — boss attacks handle damage
      addMsg("SYS", `✕ MISS`);
      addMsg("MAYA", MAYA_MISS[state.turnIndex % MAYA_MISS.length]);
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
      } else if (advanced.phase === "boss_retreats") {
        addMsg("MAYA", "it's damaged enough — retreating to sublevel 2. we're through.");
      } else if (advanced.phase === "gameover") {
        addMsg("MAYA", "systems overwhelmed. we'll have to try again.");
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

  // ── Retry (after game over) ──

  const retryFight = useCallback(() => {
    setCombat(createBossCombatState(config));
    setLastOutcome(null);
    setLastFeedback("");
    setXpBreakdown(null);
    setMessages([]);
    setHeartsLost(0);
    setHearts(Math.max(5, initialHearts));
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
  };

  const actions: BossFightActions = {
    startFight,
    setTabCode,
    execute,
    nextTurn,
    retryFight,
    bossAttackHit,
  };

  return [state, actions];
}
