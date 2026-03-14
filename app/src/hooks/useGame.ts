"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Challenge, ChallengeStep, TimedEvent, JeopardyEvent } from "@/types/game";
import type { ChatMsg } from "@/components/game/ChatPanel";
import { callMayaEngine, callMayaEngineAsync } from "@/lib/ai/engine";
import { createEventScheduler } from "@/lib/game/events";
import { calculateTotalXP, calculateSpeedXP, calculateLevel } from "@/lib/game/xp";
import {
  createJeopardyState,
  applyJeopardyEvent,
  scrambleCode,
  type JeopardyState,
} from "@/lib/game/jeopardy";
import { INITIAL_HEARTS, loseHeart, buyHeart, canBuyHeart, HEART_COST_XP } from "@/lib/game/hearts";
import { analyzeZen, buildZenMessage, calculateMissedXP, ZEN_RULES } from "@/lib/game/zen";
import {
  createLibraryState,
  recordZenResults,
  getMissedTips,
  getMasteredRuleIds,
  type LibraryState,
} from "@/lib/game/library";
import { isMainTimerExpired } from "@/lib/game/timer";
import {
  TOKEN_GRANT_CHAPTER_03,
  useToken,
  canUseAI,
  getAISuggestions,
  type AISuggestion,
} from "@/lib/game/ai-tokens";
import {
  EXPLAIN_COST_XP,
  createPauseState,
  isPaused,
  shouldQueueEvent,
  startPause as pureStartPause,
  markTypingDone,
  resume as pureResume,
  requestExplain as pureRequestExplain,
  resetExplainForNewStep,
  splitMayaMessage,
  type PauseState,
} from "@/lib/game/pause";
import {
  trackCodeSubmit,
  trackStepComplete,
  trackChapterComplete,
  trackGameOver,
  trackZenBonus,
  trackHeartBuy,
  trackChatAsk,
  trackChatExplain,
} from "@/lib/analytics";
import { logChatMessage } from "@/lib/supabase/chat-log";

export interface InitialPersistedState {
  xp: number;
  level: number;
  hearts: number;
  library: LibraryState;
}

export interface SavePayload {
  xp: number;
  level: number;
  hearts: number;
  library: LibraryState;
  completedChapter?: number;
}

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
  tab: "code" | "mission" | "library" | "notes";
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
  // Pause
  gamePaused: boolean;
  waitingForContinue: boolean;
  explainUsed: boolean;
  // Library
  library: LibraryState;
  // AI Tokens
  aiTokens: number;
  aiSuggestOpen: boolean;
  aiSuggestions: AISuggestion[];
}

export interface GameActions {
  startGame: () => void;
  sendChat: () => void;
  submitCode: () => void;
  setChatInput: (v: string) => void;
  setCode: (v: string) => void;
  setTab: (t: "code" | "mission" | "library" | "notes") => void;
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
  resumeFromPause: () => void;
  requestExplain: () => void;
  openAISuggest: () => void;
  closeAISuggest: () => void;
  useAISuggestion: (suggestion: AISuggestion) => void;
}

export function useGame(
  challenge: Challenge,
  twistData: TwistData | null,
  initial?: InitialPersistedState,
  onSave?: (payload: SavePayload) => void
): [GameState, GameActions] {
  const [phase, setPhase] = useState<GameState["phase"]>("intro");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [xp, setXp] = useState(initial?.xp ?? 0);
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [attempts, setAttempts] = useState(0);
  const [tab, setTab] = useState<"code" | "mission" | "library" | "notes">("code");
  const [library, setLibrary] = useState<LibraryState>(
    () => initial?.library ?? createLibraryState()
  );
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Step tracking
  const [stepIndex, setStepIndex] = useState(0);
  const EMPTY_STEP: ChallengeStep = {
    id: "", title: "", brief: "", starterCode: "", expectedBehavior: "",
    hints: [], rushMode: null, xp: { base: 0, firstTryBonus: 0, parTimeSeconds: 0 }, events: [],
  };
  const currentStep = challenge.steps[stepIndex] ?? EMPTY_STEP;
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
  const [hearts, setHearts] = useState(initial?.hearts ?? INITIAL_HEARTS);

  // AI Tokens
  const [aiTokens, setAiTokens] = useState(0);
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const aiIntroShownRef = useRef(false);

  // Timer state
  const [timerStartMs, setTimerStartMs] = useState(0);
  const [timerBonusSeconds, setTimerBonusSeconds] = useState(0);
  const [timerStopped, setTimerStopped] = useState(true);

  // Refs for values needed in timer/rush callbacks to avoid stale closures
  const heartsRef = useRef(hearts);
  heartsRef.current = hearts;
  const xpRef = useRef(xp);
  xpRef.current = xp;
  const levelRef = useRef(level);
  levelRef.current = level;
  const inRushRef = useRef(inRush);
  inRushRef.current = inRush;

  // Maya typing → timer pause (mutable ref for synchronous reads)
  const pauseRef = useRef<PauseState>(createPauseState());
  const queuedEventsRef = useRef<TimedEvent[]>([]);

  // Pending message chunks for paced delivery (continue between each)
  const pendingMsgRef = useRef<Array<{
    from: string;
    text: string | null;
    type: ChatMsg["type"];
    animated: boolean;
    onShow?: () => void;
  }>>([]);

  // React state mirrors for rendering
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [explainUsed, setExplainUsed] = useState(false);

  // Jeopardy state
  const [jeopardy, setJeopardy] = useState<JeopardyState>(createJeopardyState);

  // Scramble interval ref
  const scrambleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Two schedulers: one for level-wide events, one for step-scoped events
  const levelSchedulerRef = useRef(createEventScheduler());
  const stepSchedulerRef = useRef(createEventScheduler());
  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);

  const msgIdCounter = useRef(0);

  const addMsg = useCallback(
    (from: string, text: string, type: ChatMsg["type"], animated = false) => {
      const id = `msg-${++msgIdCounter.current}`;
      setMessages((prev) => [
        ...prev,
        { id, from, text, type, animated },
      ]);
    },
    []
  );

  const idCounter = useRef(0);

  const spawnXP = useCallback((amount: number) => {
    const id = ++idCounter.current;
    setParticles((p) => [...p, { id, amount }]);
  }, []);

  const showStreak = useCallback((text: string) => {
    const id = ++idCounter.current;
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

  // Sync ref → React state helper
  const syncPauseState = useCallback((ps: PauseState) => {
    pauseRef.current = ps;
    setWaitingForContinue(ps.waitingForContinue);
    setExplainUsed(ps.explainUsed);
  }, []);

  // Add a Maya message split into paragraph chunks for paced delivery
  const addMayaChunked = useCallback(
    (from: string, text: string, type: ChatMsg["type"]) => {
      const chunks = splitMayaMessage(text);
      if (chunks.length === 0) return;
      addMsg(from, chunks[0], type, true);
      for (let i = 1; i < chunks.length; i++) {
        pendingMsgRef.current.push({ from, text: chunks[i], type, animated: true });
      }
    },
    [addMsg]
  );

  const handleEvent = useCallback(
    (event: TimedEvent) => {
      // Queue events while game is paused (Maya typing + continue wait)
      if (shouldQueueEvent(pauseRef.current)) {
        queuedEventsRef.current.push(event);
        return;
      }

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

  // Clean up schedulers on unmount
  useEffect(() => {
    const levelSched = levelSchedulerRef.current;
    const stepSched = stepSchedulerRef.current;
    return () => {
      levelSched.stop();
      stepSched.stop();
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
    // If rush is active, let the rush timer control the game — don't trigger game over yet.
    // handleRushExpire will check isMainTimerExpired when the rush ends.
    if (inRushRef.current) return;

    levelSchedulerRef.current.stop();
    stepSchedulerRef.current.stop();
    pauseRef.current = createPauseState();
    queuedEventsRef.current.length = 0;
    pendingMsgRef.current.length = 0;
    setWaitingForContinue(false);
    setExplainUsed(false);
    if (challenge.timer.gameOverOnExpiry) {
      const newHearts = loseHeart(heartsRef.current);
      setHearts(newHearts);
      setPhase("gameover");
      setTimerStopped(true);
      trackGameOver(challenge.id, "timer_expired");
      onSaveRef.current?.({ xp: xpRef.current, level: levelRef.current, hearts: newHearts, library: libraryRef.current });
    } else {
      fireJeopardy("energy_drain");
      addMsg("SYS", "▸ TIME EXPIRED · jeopardy active", "dim");
    }
  }, [challenge.timer.gameOverOnExpiry, fireJeopardy, addMsg]);

  // Rush expired — check if main timer still has time
  const handleRushExpire = useCallback(() => {
    setInRush(false);
    // Sync the ref immediately so handleTimerExpire doesn't early-return
    inRushRef.current = false;
    const step = challenge.steps[stepIndex];
    if (step?.rushMode) {
      fireJeopardy(step.rushMode.onExpiry);
    }
    // Check if main timer has already expired while rush was running
    if (startTimeRef.current > 0 &&
        isMainTimerExpired(startTimeRef.current, Date.now(), challenge.timer.timeLimitSeconds, timerBonusSeconds)) {
      handleTimerExpire();
    }
  }, [challenge.steps, challenge.timer.timeLimitSeconds, stepIndex, timerBonusSeconds, fireJeopardy, handleTimerExpire]);

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
    addMayaChunked("MAYA", reply, "maya");

    // Grant AI tokens for chapter 03 (first time discovering the feature)
    if (challenge.id === "chapter-03" && !aiIntroShownRef.current) {
      aiIntroShownRef.current = true;
      setAiTokens(TOKEN_GRANT_CHAPTER_03);
      pendingMsgRef.current.push({
        from: "MAYA",
        text: "...wait. there's something else on this terminal.\n\na model. some kind of code assistant. it needs tokens to activate — i found " + TOKEN_GRANT_CHAPTER_03 + ". use them wisely.\n\npress the AI button if you want suggestions. each one costs a token.",
        type: "maya",
        animated: true,
      });
    }

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
    trackChatAsk(challenge.id, currentStep.id, msg);

    const { reply } = callMayaEngine(
      currentStep.id,
      msg,
      false,
      false,
      inRush,
      attempts
    );
    addMayaChunked("MAYA", reply, "maya");
    logChatMessage({
      step_id: currentStep.id,
      kind: "chat",
      user_message: msg,
      maya_reply: reply,
      is_complete: false,
      attempt: attempts,
    });
  }, [chatInput, busy, currentStep, inRush, attempts, jeopardy.chatLocked, addMsg, addMayaChunked]);

  const submitCode = useCallback(async () => {
    if (!code.trim() || busy) return;
    const isFirst = attempts === 0;
    const wasRush = inRush;
    setAttempts((a) => a + 1);
    setBusy(true);
    addMsg("YOU", `[ transmitting · ${currentStep.title} · attempt ${attempts + 1} ]`, "dim");
    trackCodeSubmit(challenge.id, stepIndex, attempts + 1, false); // success updated below if complete

    const { reply, isComplete } = await callMayaEngineAsync(
      currentStep.id,
      code,
      true,
      false,
      inRush,
      attempts,
      currentStep.testHarness || currentStep.expectedOutput
        ? { testHarness: currentStep.testHarness, expectedOutput: currentStep.expectedOutput }
        : undefined
    );

    logChatMessage({
      step_id: currentStep.id,
      kind: "code",
      user_message: code,
      maya_reply: reply,
      is_complete: isComplete,
      attempt: attempts + 1,
    });

    if (isComplete) {
      // Stop step-scoped events/rush
      stepSchedulerRef.current.stop();
      if (wasRush) {
        setInRush(false);
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
      const masteredIds = getMasteredRuleIds(libraryRef.current);
      const zenResult = analyzeZen(currentStep.id, code, masteredIds);
      const totalEarned = earned + zenResult.bonusXP;

      // Record zen results in library — only rules relevant to the player's code
      const stepRules = ZEN_RULES[currentStep.id] || [];
      const relevantRules = stepRules.filter(
        (r) => !r.isRelevant || r.isRelevant(code)
      );
      setLibrary((prev) =>
        recordZenResults(
          prev,
          currentStep.id,
          relevantRules.map((r) => ({
            id: r.id,
            principle: r.principle,
            jolt: r.jolt,
            suggestion: r.getSuggestion ? r.getSuggestion(code) : r.suggestion,
            bonusXP: r.bonusXP,
            passed: r.check(code),
          }))
        )
      );

      trackCodeSubmit(challenge.id, stepIndex, attempts + 1, true);
      trackStepComplete(challenge.id, stepIndex, currentStep.id, totalEarned);
      if (zenResult.bonusXP > 0) {
        trackZenBonus(challenge.id, currentStep.id, zenResult.bonusXP, zenResult.jolts.length);
      }

      spawnXP(totalEarned);
      setXp((prev) => {
        const next = prev + totalEarned;
        const newLevel = calculateLevel(next);
        if (newLevel > level) {
          setLevel(newLevel);
          showStreak("LEVEL UP!");
        }
        return next;
      });

      if (isFirst && wasRush) showStreak("SPEED RUN!");
      else if (isFirst) showStreak("FIRST TRY!");

      // Chunked delivery: completion reply → zen → next step intro
      // Each chunk pauses for "continue" — no more setTimeout timing hacks
      addMayaChunked("MAYA", reply, "win");

      // Queue zen message chunks
      const missedXP = calculateMissedXP(currentStep.id, zenResult, code);
      const zenMsg = buildZenMessage(zenResult, missedXP);
      if (zenMsg) {
        const zenChunks = splitMayaMessage(zenMsg);
        for (let i = 0; i < zenChunks.length; i++) {
          pendingMsgRef.current.push({
            from: "MAYA",
            text: zenChunks[i],
            type: "maya",
            animated: true,
            onShow: i === 0 && zenResult.bonusXP > 0 ? () => showStreak("ZEN") : undefined,
          });
        }
      }

      // Queue step advance or chapter complete
      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < challenge.steps.length) {
        const nextStep = challenge.steps[nextStepIndex];
        const { reply: introReply } = callMayaEngine(
          nextStep.id, "next step", false, true, false, 0
        );
        // Queue step header (non-animated, triggers state transition)
        pendingMsgRef.current.push({
          from: "SYS",
          text: `▸ STEP ${nextStepIndex + 1}/${challenge.steps.length} · ${nextStep.title}`,
          type: "dim",
          animated: false,
          onShow: () => {
            setStepIndex(nextStepIndex);
            setAttempts(0);
            syncPauseState(resetExplainForNewStep(pauseRef.current));
            if (nextStep.starterCode !== null) setCode(nextStep.starterCode);
            startStepEvents(nextStep);
            showStreak(`STEP ${nextStepIndex + 1}/${challenge.steps.length}`);
            // Persist mid-chapter state
            onSaveRef.current?.({
              xp: xp + totalEarned,
              level: calculateLevel(xp + totalEarned),
              hearts,
              library: libraryRef.current,
            });
          },
        });
        // Queue intro message chunks
        for (const chunk of splitMayaMessage(introReply)) {
          pendingMsgRef.current.push({ from: "MAYA", text: chunk, type: "maya", animated: true });
        }
      } else {
        // All steps complete — chapter done
        showStreak("CHAPTER CLEAR!");
        trackChapterComplete(challenge.id, challenge.chapter, totalEarned, Date.now() - startTimeRef.current);

        // Queue missed zen tips reinforcement before chapter-complete transition
        // Compute from current library + this step's results (setLibrary hasn't flushed yet)
        const updatedLib = recordZenResults(
          libraryRef.current,
          currentStep.id,
          stepRules.map((r) => ({
            id: r.id, principle: r.principle, jolt: r.jolt,
            suggestion: r.suggestion, bonusXP: r.bonusXP, passed: r.check(code),
          }))
        );
        // Only show missed tips from THIS chapter's steps, not all time
        const chapterPrefix = challenge.id + ":";
        const missed = getMissedTips(updatedLib).filter(
          (m) => m.stepId.startsWith(chapterPrefix)
        );
        if (missed.length > 0) {
          const reinforceHeader = `▸ ZEN LIBRARY · ${missed.length} MISSED`;
          pendingMsgRef.current.push({
            from: "SYS", text: reinforceHeader, type: "dim", animated: false,
          });
          const reinforceLines = missed.map(
            (m) => `**${m.principle}** — ${m.suggestion}`
          ).join("\n\n");
          for (const chunk of splitMayaMessage(reinforceLines)) {
            pendingMsgRef.current.push({
              from: "MAYA", text: chunk, type: "maya", animated: true,
            });
          }
        }

        pendingMsgRef.current.push({
          from: "SYS",
          text: null,
          type: "dim",
          animated: false,
          onShow: () => {
            levelSchedulerRef.current.stop();
            setTimerStopped(true);
            if (twistData) {
              setTwist(twistData);
              setPhase("twist");
            } else {
              setPhase("win");
            }
            syncPauseState(createPauseState());
            // Persist state — chapter complete
            onSaveRef.current?.({
              xp: xp + totalEarned,
              level: calculateLevel(xp + totalEarned),
              hearts,
              library: updatedLib,
              completedChapter: challenge.chapter,
            });
          },
        });
      }

      setBusy(false);
      return;
    }

    addMayaChunked("MAYA", reply, "maya");
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
    addMayaChunked,
    spawnXP,
    showStreak,
    startStepEvents,
    syncPauseState,
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
      trackHeartBuy(result.hearts, HEART_COST_XP);
    }
  }, [hearts, xp]);

  const addXP = useCallback((amount: number) => {
    setXp((prev) => prev + amount);
  }, []);

  const onMayaTypingStart = useCallback(() => {
    const result = pureStartPause(pauseRef.current, Date.now(), timerStopped);
    if (!result) return;
    syncPauseState(result);
    setTimerStopped(true);
  }, [timerStopped, syncPauseState]);

  const onMayaTypingEnd = useCallback(() => {
    const result = markTypingDone(pauseRef.current);
    if (!result) return;
    syncPauseState(result);
  }, [syncPauseState]);

  const flushQueuedEvents = useCallback(() => {
    const queued = queuedEventsRef.current.splice(0);
    for (const event of queued) {
      handleEvent(event);
    }
  }, [handleEvent]);

  const resumeFromPause = useCallback(() => {
    // Drain pending message chunks before actually resuming the timer
    if (pendingMsgRef.current.length > 0) {
      syncPauseState({ ...pauseRef.current, waitingForContinue: false });
      while (pendingMsgRef.current.length > 0) {
        const next = pendingMsgRef.current.shift()!;
        if (next.onShow) next.onShow();
        if (!next.text) continue; // action-only entry
        addMsg(next.from, next.text, next.type, next.animated);
        if (next.animated) return; // new pause cycle will start from TypeText callbacks
        // Non-animated: add it and keep draining
      }
      // All remaining items were non-animated — fall through to actual resume
    }

    const result = pureResume(pauseRef.current, Date.now());
    if (!result) return;
    syncPauseState(result.state);
    setTimerBonusSeconds((prev) => prev + result.bonusSeconds);
    setTimerStopped(false);
    flushQueuedEvents();
  }, [syncPauseState, flushQueuedEvents, addMsg]);

  const requestExplain = useCallback(() => {
    const result = pureRequestExplain(pauseRef.current, xp);
    if (!result) return;
    syncPauseState(result.state);
    setXp(result.newXP);
    trackChatExplain(challenge.id, currentStep.id);

    addMsg("YOU", "explain again", "you");
    const { reply } = callMayaEngine(
      currentStep.id,
      "explain again",
      false,
      false,
      inRush,
      attempts
    );
    addMayaChunked("MAYA", reply, "maya");
    // Maya will type again → onMayaTypingStart/End cycle repeats
  }, [xp, currentStep, inRush, attempts, addMsg, addMayaChunked, syncPauseState]);

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
    syncPauseState(createPauseState());
    pendingMsgRef.current.length = 0;

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
    gamePaused: isPaused(pauseRef.current),
    waitingForContinue,
    explainUsed,
    library,
    aiTokens,
    aiSuggestOpen,
    aiSuggestions: getAISuggestions(currentStep.id),
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
    resumeFromPause,
    requestExplain,
    openAISuggest: () => {
      if (canUseAI(aiTokens)) setAiSuggestOpen(true);
    },
    closeAISuggest: () => setAiSuggestOpen(false),
    useAISuggestion: (suggestion: AISuggestion) => {
      const newTokens = useToken(aiTokens);
      if (newTokens === null) return;
      setAiTokens(newTokens);
      // Insert snippet at cursor (append to code)
      setCode((prev) => {
        // If code ends with newline, insert directly; otherwise add newline first
        const separator = prev.endsWith("\n") ? "" : "\n";
        return prev + separator + suggestion.code + "\n";
      });
      setAiSuggestOpen(false);
      addMsg("SYS", `AI ASSIST · ${suggestion.label} · ${newTokens} tokens remaining`, "dim");
    },
  };

  return [state, actions];
}
