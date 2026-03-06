"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Challenge, ChallengeStep, TimedEvent, JeopardyEvent } from "@/types/game";
import type { ChatMsg } from "@/components/game/ChatPanel";
import { callMayaEngine } from "@/lib/ai/engine";
import { createEventScheduler } from "@/lib/game/events";
import { calculateTotalXP, calculateSpeedXP, calculateLevel } from "@/lib/game/xp";
import {
  createJeopardyState,
  applyJeopardyEvent,
  scrambleCode,
  type JeopardyState,
} from "@/lib/game/jeopardy";
import { INITIAL_HEARTS, loseHeart, buyHeart, canBuyHeart, HEART_COST_XP } from "@/lib/game/hearts";
import { analyzeZen, buildZenMessage, calculateMissedXP } from "@/lib/game/zen";

interface Particle {
  id: number;
  amount: number;
}

interface Streak {
  id: number;
  text: string;
}

interface TwistData {
  headline: string;
  lines: string[];
}

export interface GameState {
  phase: "intro" | "playing" | "twist" | "win" | "gameover";
  messages: ChatMsg[];
  code: string;
  chatInput: string;
  busy: boolean;
  xp: number;
  level: number;
  attempts: number;
  inRush: boolean;
  rushLabel: string;
  rushSeconds: number;
  powerCut: boolean;
  interrupt: { who: string; text: string } | null;
  twist: TwistData | null;
  particles: Particle[];
  streaks: Streak[];
  tab: "code" | "mission";
  // Timer
  timerStartMs: number;
  timerLimitSeconds: number;
  timerBonusSeconds: number;
  timerGameOver: boolean;
  timerStopped: boolean;
  // Jeopardy
  jeopardy: JeopardyState;
  // Steps
  currentStepIndex: number;
  totalSteps: number;
  currentStep: ChallengeStep;
  // Hearts
  hearts: number;
  canBuyHeart: boolean;
  heartCostXP: number;
}

export interface GameActions {
  startGame: () => void;
  sendChat: () => void;
  submitCode: () => void;
  setChatInput: (v: string) => void;
  setCode: (v: string) => void;
  setTab: (t: "code" | "mission") => void;
  dismissInterrupt: () => void;
  dismissRush: () => void;
  dismissTwist: () => void;
  removeParticle: (id: number) => void;
  removeStreak: (id: number) => void;
  retryFromCheckpoint: () => void;
  handleTimerExpire: () => void;
  purchaseHeart: () => void;
  addXP: (amount: number) => void;
  onMayaTypingStart: () => void;
  onMayaTypingEnd: () => void;
}

export function useGame(
  challenge: Challenge,
  twistData: TwistData
): [GameState, GameActions] {
  const [phase, setPhase] = useState<GameState["phase"]>("intro");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [tab, setTab] = useState<"code" | "mission">("code");

  // Step tracking
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = challenge.steps[stepIndex];
  const [code, setCode] = useState(currentStep.starterCode ?? "");

  const [inRush, setInRush] = useState(false);
  const [rushLabel, setRushLabel] = useState("");
  const [rushSeconds, setRushSeconds] = useState(0);
  const [powerCut, setPowerCut] = useState(false);
  const [interrupt, setInterrupt] = useState<{ who: string; text: string } | null>(null);
  const [twist, setTwist] = useState<TwistData | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);

  // Hearts
  const [hearts, setHearts] = useState(INITIAL_HEARTS);

  // Timer state
  const [timerStartMs, setTimerStartMs] = useState(0);
  const [timerBonusSeconds, setTimerBonusSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(true);

  // Maya typing → timer pause
  const pauseStartRef = useRef<number>(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jeopardy state
  const [jeopardy, setJeopardy] = useState<JeopardyState>(createJeopardyState);

  // Scramble interval ref
  const scrambleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Two schedulers: one for level-wide events, one for step-scoped events
  const levelSchedulerRef = useRef(createEventScheduler());
  const stepSchedulerRef = useRef(createEventScheduler());
  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);

  const addMsg = useCallback(
    (from: string, text: string, type: ChatMsg["type"], animated = false) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + Math.random()),
          from,
          text,
          type,
          animated,
        },
      ]);
    },
    []
  );

  const spawnXP = useCallback((amount: number) => {
    const id = Date.now();
    setParticles((p) => [...p, { id, amount }]);
  }, []);

  const showStreak = useCallback((text: string) => {
    const id = Date.now();
    setStreaks((s) => [...s, { id, text }]);
  }, []);

  // Apply a jeopardy event
  const fireJeopardy = useCallback(
    (event: JeopardyEvent) => {
      setJeopardy((prev) => {
        const result = applyJeopardyEvent(prev, event, Date.now());
        if (result.message) {
          addMsg("SYS", `▸ ${result.message}`, "dim");
        }
        return result.jeopardy;
      });
    },
    [addMsg]
  );

  // Handle scramble effect
  useEffect(() => {
    if (jeopardy.scrambleActive && !scrambleRef.current) {
      scrambleRef.current = setInterval(() => {
        setCode((prev) => scrambleCode(prev, jeopardy.scrambleCount));
        addMsg("SYS", "▸ signal corrupted · fix the damage", "dim");
      }, jeopardy.scrambleIntervalMs);
    }
    if (!jeopardy.scrambleActive && scrambleRef.current) {
      clearInterval(scrambleRef.current);
      scrambleRef.current = null;
    }
    return () => {
      if (scrambleRef.current) {
        clearInterval(scrambleRef.current);
        scrambleRef.current = null;
      }
    };
  }, [jeopardy.scrambleActive, jeopardy.scrambleIntervalMs, jeopardy.scrambleCount, addMsg]);

  // Chat lock expiry
  useEffect(() => {
    if (!jeopardy.chatLocked) return;
    const remaining = jeopardy.chatLockUntilMs - Date.now();
    if (remaining <= 0) {
      setJeopardy((prev) => ({ ...prev, chatLocked: false }));
      return;
    }
    const timer = setTimeout(() => {
      setJeopardy((prev) => ({ ...prev, chatLocked: false }));
      addMsg("SYS", "▸ maya back online", "dim");
    }, remaining);
    return () => clearTimeout(timer);
  }, [jeopardy.chatLocked, jeopardy.chatLockUntilMs, addMsg]);

  const handleEvent = useCallback(
    (event: TimedEvent) => {
      // Don't fire game events while Maya is typing (game is paused)
      if (pauseStartRef.current > 0) return;

      if (event.type === "story") {
        setInterrupt({ who: "MAYA", text: event.message });
        addMsg("MAYA", event.message, "maya", true);
      } else if (event.type === "system") {
        setInterrupt({ who: "SYSTEM", text: event.message });
        addMsg("SYS", event.message, "sys", true);
      } else if (event.type === "rush") {
        // Find the rush config for the current step, or fall back to null
        const step = challenge.steps[stepIndex];
        if (step?.rushMode) {
          setInRush(true);
          setRushLabel(step.rushMode.label);
          setRushSeconds(step.rushMode.durationSeconds);
        }
      } else if (event.type === "powercut") {
        setPowerCut(true);
      }
    },
    [addMsg, challenge.steps, stepIndex]
  );

  // Clean up schedulers and resume timer on unmount
  useEffect(() => {
    const levelSched = levelSchedulerRef.current;
    const stepSched = stepSchedulerRef.current;
    return () => {
      levelSched.stop();
      stepSched.stop();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Start step-scoped events when step changes
  const startStepEvents = useCallback(
    (step: ChallengeStep) => {
      stepSchedulerRef.current.stop();
      stepSchedulerRef.current = createEventScheduler();
      stepStartTimeRef.current = Date.now();
      if (step.events.length > 0) {
        stepSchedulerRef.current.start(step.events, handleEvent);
      }
    },
    [handleEvent]
  );

  // Level timer expired
  const handleTimerExpire = useCallback(() => {
    levelSchedulerRef.current.stop();
    stepSchedulerRef.current.stop();
    if (resumeTimerRef.current) { clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
    pauseStartRef.current = 0;
    if (challenge.timer.gameOverOnExpiry) {
      setHearts((h) => loseHeart(h));
      setPhase("gameover");
      setTimerStopped(true);
    } else {
      fireJeopardy("energy_drain");
      addMsg("SYS", "▸ TIME EXPIRED · jeopardy active", "dim");
    }
  }, [challenge.timer.gameOverOnExpiry, fireJeopardy, addMsg]);

  // Rush expired
  const handleRushExpire = useCallback(() => {
    setInRush(false);
    const step = challenge.steps[stepIndex];
    if (step?.rushMode) {
      fireJeopardy(step.rushMode.onExpiry);
    }
  }, [challenge.steps, stepIndex, fireJeopardy]);

  const startGame = useCallback(() => {
    setPhase("playing");
    const now = Date.now();
    startTimeRef.current = now;
    setTimerStartMs(now);
    setTimerStopped(false);

    addMsg("SYS", "▸ SIGNAL LOCKED · LOCAL", "dim");

    // Intro from the first step's bank
    const firstStep = challenge.steps[0];
    const { reply } = callMayaEngine(
      firstStep.id,
      "i got your signal. i'm here.",
      false,
      true,
      false,
      0
    );
    addMsg("MAYA", reply, "maya", true);

    // Start level-wide events
    if (challenge.events.length > 0) {
      levelSchedulerRef.current.start(challenge.events, handleEvent);
    }

    // Start first step's events
    startStepEvents(firstStep);
  }, [challenge, addMsg, handleEvent, startStepEvents]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || busy) return;
    if (jeopardy.chatLocked) {
      addMsg("SYS", "▸ chat locked · guard nearby", "dim");
      return;
    }
    const msg = chatInput.trim();
    setChatInput("");
    addMsg("YOU", msg, "you");

    const { reply } = callMayaEngine(
      currentStep.id,
      msg,
      false,
      false,
      inRush,
      attempts
    );
    addMsg("MAYA", reply, "maya", true);
  }, [chatInput, busy, currentStep, inRush, attempts, jeopardy.chatLocked, addMsg]);

  const submitCode = useCallback(() => {
    if (!code.trim() || busy) return;
    const isFirst = attempts === 0;
    const wasRush = inRush;
    setAttempts((a) => a + 1);
    setBusy(true);
    addMsg("YOU", `[ transmitting · ${currentStep.title} · attempt ${attempts + 1} ]`, "dim");

    const { reply, isComplete } = callMayaEngine(
      currentStep.id,
      code,
      true,
      false,
      inRush,
      attempts
    );

    addMsg("MAYA", reply, isComplete ? "win" : "maya", true);

    if (isComplete) {
      // Stop step-scoped events/rush
      stepSchedulerRef.current.stop();
      if (wasRush) {
        setInRush(false);
        // Grant bonus time from rush
        if (currentStep.rushMode) {
          setTimerBonusSeconds((prev) => prev + currentStep.rushMode!.bonusTimeSeconds);
        }
      }

      // Award XP for this step
      const elapsed = (Date.now() - stepStartTimeRef.current) / 1000;
      const speedBonus = calculateSpeedXP(
        currentStep.xp.base,
        elapsed,
        currentStep.xp.parTimeSeconds
      );
      const earned = calculateTotalXP(
        currentStep.xp.base,
        isFirst,
        speedBonus,
        1
      );

      // Go Zen analysis — Maya's memory jolt
      const zenResult = analyzeZen(currentStep.id, code);
      const totalEarned = earned + zenResult.bonusXP;

      spawnXP(totalEarned);
      setXp((prev) => {
        const next = prev + totalEarned;
        const newLevel = calculateLevel(next);
        if (newLevel > level) {
          setLevel(newLevel);
          setTimeout(() => showStreak("LEVEL UP!"), 700);
        }
        return next;
      });

      if (isFirst && wasRush) showStreak("SPEED RUN!");
      else if (isFirst) showStreak("FIRST TRY!");

      // Deliver Maya's zen message after a short delay
      const missedXP = calculateMissedXP(currentStep.id, zenResult);
      const zenMsg = buildZenMessage(zenResult, missedXP);
      if (zenMsg) {
        if (zenResult.bonusXP > 0) {
          setTimeout(() => showStreak("ZEN"), 500);
        }
        setTimeout(() => {
          addMsg("MAYA", zenMsg, "maya", true);
        }, 1800);
      }

      // Check if there are more steps
      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < challenge.steps.length) {
        // Advance to next step
        const nextStep = challenge.steps[nextStepIndex];
        showStreak(`STEP ${nextStepIndex + 1}/${challenge.steps.length}`);

        const stepDelay = zenMsg ? 4000 : 1200;
        setTimeout(() => {
          setStepIndex(nextStepIndex);
          setAttempts(0);
          setBusy(false);

          // Use next step's starter code, or carry forward current code
          if (nextStep.starterCode !== null) {
            setCode(nextStep.starterCode);
          }
          // else code carries forward

          // Send the next step's intro
          const { reply: introReply } = callMayaEngine(
            nextStep.id,
            "next step",
            false,
            true,
            false,
            0
          );
          addMsg("SYS", `▸ STEP ${nextStepIndex + 1}/${challenge.steps.length} · ${nextStep.title}`, "dim");
          addMsg("MAYA", introReply, "maya", true);

          // Start next step's events
          startStepEvents(nextStep);
        }, stepDelay);
      } else {
        // All steps complete — chapter done
        showStreak("CHAPTER CLEAR!");
        levelSchedulerRef.current.stop();
        setTimerStopped(true);

        const twistDelay = zenMsg ? 4500 : 1400;
        setTimeout(() => {
          setTwist(twistData);
          setPhase("twist");
          setBusy(false);
        }, twistDelay);
      }
      return;
    }

    setBusy(false);
  }, [
    code,
    busy,
    attempts,
    inRush,
    currentStep,
    stepIndex,
    challenge,
    level,
    twistData,
    addMsg,
    spawnXP,
    showStreak,
    startStepEvents,
  ]);

  const dismissTwist = useCallback(() => {
    setTwist(null);
    setPhase("win");
  }, []);

  const purchaseHeart = useCallback(() => {
    const result = buyHeart(hearts, xp);
    if (result) {
      setHearts(result.hearts);
      setXp(result.xp);
    }
  }, [hearts, xp]);

  const addXP = useCallback((amount: number) => {
    setXp((prev) => prev + amount);
  }, []);

  const RESUME_DELAY_MS = 7000;

  const onMayaTypingStart = useCallback(() => {
    // Pause the timer when Maya starts typing
    if (timerStopped || pauseStartRef.current > 0) return;
    // Clear any pending resume
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    pauseStartRef.current = Date.now();
    setTimerStopped(true);
  }, [timerStopped]);

  const onMayaTypingEnd = useCallback(() => {
    // Resume timer 7s after Maya finishes typing
    if (pauseStartRef.current === 0) return;
    // Clear any existing resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      const pausedMs = Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
      resumeTimerRef.current = null;
      // Compensate for paused time by adding bonus seconds
      setTimerBonusSeconds((prev) => prev + pausedMs / 1000);
      setTimerStopped(false);
    }, RESUME_DELAY_MS);
  }, []);

  const retryFromCheckpoint = useCallback(() => {
    setPhase("intro");
    setMessages([]);
    setStepIndex(0);
    setCode(challenge.steps[0].starterCode ?? "");
    setChatInput("");
    setBusy(false);
    setAttempts(0);
    setTab("code");
    setInRush(false);
    setPowerCut(false);
    setInterrupt(null);
    setTwist(null);
    setParticles([]);
    setStreaks([]);
    setTimerBonusSeconds(0);
    setTimerStopped(true);

    setJeopardy((prev) => {
      const carried = createJeopardyState();
      for (const effect of prev.activeEffects) {
        if (effect === "guard_entered" || effect === "power_reduced" || effect === "signal_scramble") {
          carried.activeEffects.push(effect);
        }
      }
      if (prev.editorNarrow) carried.editorNarrow = true;
      if (prev.lineNumbersHidden) carried.lineNumbersHidden = true;
      if (prev.scrambleActive) {
        carried.scrambleActive = true;
        carried.scrambleIntervalMs = prev.scrambleIntervalMs * 2;
      }
      return carried;
    });
  }, [challenge.steps]);

  const state: GameState = {
    phase,
    messages,
    code,
    chatInput,
    busy,
    xp,
    level,
    attempts,
    inRush,
    rushLabel,
    rushSeconds,
    powerCut,
    interrupt,
    twist,
    particles,
    streaks,
    tab,
    timerStartMs,
    timerLimitSeconds: challenge.timer.timeLimitSeconds,
    timerBonusSeconds,
    timerGameOver: challenge.timer.gameOverOnExpiry,
    timerStopped,
    jeopardy,
    currentStepIndex: stepIndex,
    totalSteps: challenge.steps.length,
    currentStep,
    hearts,
    canBuyHeart: canBuyHeart(hearts, xp),
    heartCostXP: HEART_COST_XP,
  };

  const actions: GameActions = {
    startGame,
    sendChat,
    submitCode,
    setChatInput,
    setCode,
    setTab,
    dismissInterrupt: () => setInterrupt(null),
    dismissRush: handleRushExpire,
    dismissTwist,
    removeParticle: (id) =>
      setParticles((p) => p.filter((x) => x.id !== id)),
    removeStreak: (id) =>
      setStreaks((s) => s.filter((x) => x.id !== id)),
    retryFromCheckpoint,
    handleTimerExpire,
    purchaseHeart,
    addXP,
    onMayaTypingStart,
    onMayaTypingEnd,
  };

  return [state, actions];
}
