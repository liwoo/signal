"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { chapter01, chapter01Twist } from "@/data/challenges/chapter-01";
import { chapter02, chapter02Twist } from "@/data/challenges/chapter-02";
import { chapter03, chapter03Twist } from "@/data/challenges/chapter-03";
import { boss01, boss01Config } from "@/data/challenges/boss-01";
import { useGame } from "@/hooks/useGame";
import type { InitialPersistedState, SavePayload } from "@/hooks/useGame";
import { TopBar } from "@/components/game/TopBar";
import { ChatPanel } from "@/components/game/ChatPanel";
import { CodeEditor } from "@/components/game/CodeEditor";
import { MissionPanel } from "@/components/game/MissionPanel";
import { LevelTimer } from "@/components/game/LevelTimer";
import { Interrupt } from "@/components/story/Interrupt";
import { RushBar } from "@/components/story/RushBar";
import { PowerCut } from "@/components/story/PowerCut";
import { TwistReveal } from "@/components/story/TwistReveal";
import { XPBurst } from "@/components/story/XPBurst";
import { StreakLabel } from "@/components/story/StreakLabel";
import { GameOver } from "@/components/story/GameOver";
import { WinModal } from "@/components/game/WinModal";
import { LibraryPanel } from "@/components/game/LibraryPanel";
import { NotesPanel } from "@/components/game/NotesPanel";
import { CinematicScene } from "@/components/story/CinematicScene";
import { MayaAnimation } from "@/components/story/MayaAnimation";
import {
  INTRO_SCENES,
  CHAPTER_01_COMPLETE_SCENES,
  CHAPTER_02_INTRO_SCENES,
  CHAPTER_02_COMPLETE_SCENES,
  CHAPTER_03_INTRO_SCENES,
  CHAPTER_03_COMPLETE_SCENES,
  BOSS_01_INTRO_SCENES,
  BOSS_01_COMPLETE_SCENES,
} from "@/lib/sprites/scenes";
import type { SceneType } from "@/lib/sprites/scene-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import { BossArena } from "@/components/boss/BossArena";
import { BeginnerOverlay } from "@/components/game/BeginnerOverlay";
import { MobileGate } from "@/components/game/MobileGate";
import { AISuggestPanel } from "@/components/game/AISuggestPanel";
import { getBeginnerNotes } from "@/data/beginner-notes";
import { useGameAudio } from "@/hooks/useGameAudio";
import {
  loadPersistedState,
  savePersistedState,
  type PersistedState,
} from "@/lib/storage/persistence";
import type { Challenge, PlayerSettings, BossFightConfig } from "@/types/game";
import type { SceneDefinition } from "@/lib/sprites/scenes";

// ── Cam-feed scene mapping — where Maya actually is per chapter ──

const CAM_FEED_CONFIG: Record<string, { scene: SceneType; animation: CharAnimation; rushAnimation: CharAnimation }> = {
  "chapter-01": { scene: "cell",   animation: "hack",       rushAnimation: "walk-right" },
  "chapter-02": { scene: "cell",   animation: "keypad",     rushAnimation: "walk-right" },
  "chapter-03": { scene: "vent",   animation: "crawl-right", rushAnimation: "crawl-right" },
  "boss-01":    { scene: "boss-arena", animation: "hack",  rushAnimation: "hack" },
};

const DEFAULT_CAM = { scene: "cell" as SceneType, animation: "hack" as CharAnimation, rushAnimation: "walk-right" as CharAnimation };

// ── Chapter Registry ──

interface ChapterConfig {
  challenge: Challenge;
  twist?: { headline: string; lines: string[] };
  introScenes: SceneDefinition[];
  completeScenes: SceneDefinition[];
  introTitle: string;
  introSubtitle: string;
  completeTitle: string;
  completeSubtitle: string;
  // Intro screen content
  tagline: string;
  storyLines: [string, string];
  ctaLabel: string;
  // Boss fight config (only for boss chapters)
  bossFightConfig?: BossFightConfig;
}

const CHAPTERS: ChapterConfig[] = [
  {
    challenge: chapter01,
    twist: chapter01Twist,
    introScenes: INTRO_SCENES,
    completeScenes: CHAPTER_01_COMPLETE_SCENES,
    introTitle: "SIGNAL",
    introSubtitle: "FIRST CONTACT",
    completeTitle: "CHAPTER 1 COMPLETE",
    completeSubtitle: "HANDSHAKE ESTABLISHED",
    tagline: "▸ ENCRYPTED SIGNAL · ACT I",
    storyLines: [
      "maya chen. missing 72hrs. she's alive — hacked a terminal in sublevel 3.",
      "she needs a Go programmer. write the code. get her out.",
    ],
    ctaLabel: "CONNECT TO MAYA",
  },
  {
    challenge: chapter02,
    twist: chapter02Twist,
    introScenes: CHAPTER_02_INTRO_SCENES,
    completeScenes: CHAPTER_02_COMPLETE_SCENES,
    introTitle: "CHAPTER 2",
    introSubtitle: "DOOR CODE",
    completeTitle: "CHAPTER 2 COMPLETE",
    completeSubtitle: "KEYPAD CRACKED",
    tagline: "▸ SUBLEVEL 3 · CELL B-09",
    storyLines: [
      "the keypad on maya's cell door cycles codes 1-10. she needs them classified.",
      "for loops. switch statements. crack the sequence. open the door.",
    ],
    ctaLabel: "START CHAPTER",
  },
  {
    challenge: chapter03,
    twist: chapter03Twist,
    introScenes: CHAPTER_03_INTRO_SCENES,
    completeScenes: CHAPTER_03_COMPLETE_SCENES,
    introTitle: "CHAPTER 3",
    introSubtitle: "SHAFT CODES",
    completeTitle: "CHAPTER 3 COMPLETE",
    completeSubtitle: "JUNCTION CLEARED",
    tagline: "▸ VENTILATION SHAFT · SUBLEVEL 3",
    storyLines: [
      "the ventilation shaft connects to cell B-10. each junction has a code panel.",
      "functions. variadic parameters. multiple returns. compute the codes. open the gates.",
    ],
    ctaLabel: "START CHAPTER",
  },
  {
    challenge: boss01,
    bossFightConfig: boss01Config,
    introScenes: BOSS_01_INTRO_SCENES,
    completeScenes: BOSS_01_COMPLETE_SCENES,
    introTitle: "BOSS FIGHT",
    introSubtitle: "LOCKMASTER",
    completeTitle: "BOSS DEFEATED",
    completeSubtitle: "LOCKMASTER DOWN",
    tagline: "▸ SERVER ROOM · SUBLEVEL 3",
    storyLines: [
      "the server room door runs a lockmaster AI. it generates codes and you must predict the next.",
      "everything you've learned — functions, loops, logic. 90 seconds. prove you're ready.",
    ],
    ctaLabel: "FACE THE LOCKMASTER",
  },
];

export default function Home() {
  return (
    <MobileGate>
      <GameRouter />
    </MobileGate>
  );
}

function GameRouter() {
  const [persisted, setPersisted] = useState<PersistedState | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);

  // Load persisted state from IndexedDB on mount
  useEffect(() => {
    loadPersistedState().then((state) => {
      setPersisted(state);
      // Resume from last completed chapter
      const completedCount = state.progress.completedChapters.length;
      if (completedCount > 0 && completedCount < CHAPTERS.length) {
        setChapterIndex(completedCount);
      }
    });
  }, []);

  const handleSave = useCallback((payload: SavePayload) => {
    setPersisted((prev) => {
      if (!prev) return prev;
      const updated: PersistedState = {
        ...prev,
        stats: { ...prev.stats, xp: payload.xp, level: payload.level, hearts: payload.hearts },
        library: payload.library,
        progress: payload.completedChapter
          ? {
              ...prev.progress,
              completedChapters: prev.progress.completedChapters.includes(payload.completedChapter)
                ? prev.progress.completedChapters
                : [...prev.progress.completedChapters, payload.completedChapter],
              currentChapter: payload.completedChapter + 1,
            }
          : prev.progress,
      };
      savePersistedState(updated);
      return updated;
    });
  }, []);

  const handleSaveSettings = useCallback((partial: Partial<PlayerSettings>) => {
    setPersisted((prev) => {
      if (!prev) return prev;
      const updated: PersistedState = {
        ...prev,
        settings: { ...prev.settings, ...partial },
      };
      savePersistedState({ settings: updated.settings });
      return updated;
    });
  }, []);

  const advanceChapter = useCallback(() => {
    setChapterIndex((i) => Math.min(i + 1, CHAPTERS.length - 1));
  }, []);

  // Show loading state while persistence loads
  if (!persisted) {
    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ background: "var(--color-background)" }}
      >
        <div className="text-[var(--color-dim)] text-[9px] tracking-[3px]">
          LOADING<span className="cursor-blink">...</span>
        </div>
      </div>
    );
  }

  const config = CHAPTERS[chapterIndex];
  const initialState: InitialPersistedState = {
    xp: persisted.stats.xp,
    level: persisted.stats.level,
    hearts: persisted.stats.hearts,
    library: persisted.library,
  };

  return (
    <GameScreen
      key={config.challenge.id}
      config={config}
      hasNextChapter={chapterIndex < CHAPTERS.length - 1}
      onNextChapter={advanceChapter}
      initialState={initialState}
      onSave={handleSave}
      onSaveSettings={handleSaveSettings}
      settings={persisted.settings}
      completedChapterIds={CHAPTERS.slice(0, chapterIndex).map((c) => c.challenge.id)}
    />
  );
}

interface GameScreenProps {
  config: ChapterConfig;
  hasNextChapter: boolean;
  onNextChapter: () => void;
  initialState: InitialPersistedState;
  onSave: (payload: SavePayload) => void;
  onSaveSettings: (settings: Partial<PlayerSettings>) => void;
  completedChapterIds: string[];
  settings: PlayerSettings;
}

function GameScreen({ config, hasNextChapter, onNextChapter, initialState, onSave, onSaveSettings, settings, completedChapterIds }: GameScreenProps) {
  const { challenge, twist, introScenes, completeScenes } = config;
  const [state, actions] = useGame(challenge, twist ?? null, initialState, onSave);
  const audio = useGameAudio(state, settings.soundEnabled);
  const [showCinematic, setShowCinematic] = useState(false);
  const [showWinCinematic, setShowWinCinematic] = useState(false);
  const [showBeginner, setShowBeginner] = useState(false);
  const [showBossArena, setShowBossArena] = useState(false);
  const [bossVictory, setBossVictory] = useState(false);
  const beginnerNotes = getBeginnerNotes(challenge.id);

  // Resizable split
  const [chatWidth, setChatWidth] = useState(settings.chatWidthPercent || 42);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(25, Math.min(65, pct));
      setChatWidth(clamped);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Persist
      setChatWidth((w) => {
        onSaveSettings({ chatWidthPercent: Math.round(w) });
        return w;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onSaveSettings]);

  if (state.phase === "intro" && !showCinematic && !showBeginner && !showBossArena) {
    return <IntroScreen
      config={config}
      onStart={() => {
        audio.startLoop("dark-drone-1", 0.08, 5000);
        setShowCinematic(true);
      }}
    />;
  }

  if (showCinematic) {
    return (
      <CinematicScene
        scenes={introScenes}
        title={config.introTitle}
        subtitle={config.introSubtitle}
        onComplete={() => {
          setShowCinematic(false);
          if (settings.beginnerMode && beginnerNotes) {
            setShowBeginner(true);
          } else if (config.bossFightConfig) {
            setShowBossArena(true);
          } else {
            actions.startGame();
          }
        }}
      />
    );
  }

  if (showBeginner && beginnerNotes) {
    return (
      <BeginnerOverlay
        notes={beginnerNotes}
        onReady={() => {
          setShowBeginner(false);
          if (config.bossFightConfig) {
            setShowBossArena(true);
          } else {
            actions.startGame();
          }
        }}
        onDisable={() => {
          onSaveSettings({ beginnerMode: false });
          setShowBeginner(false);
          if (config.bossFightConfig) {
            setShowBossArena(true);
          } else {
            actions.startGame();
          }
        }}
        onHotspotXP={actions.addXP}
      />
    );
  }

  // ── Boss Arena ──
  if (showBossArena && config.bossFightConfig) {
    return (
      <BossArena
        config={config.bossFightConfig}
        chapterNumber={challenge.chapter}
        initialXP={initialState.xp}
        initialLevel={initialState.level}
        initialHearts={initialState.hearts}
        soundEnabled={settings.soundEnabled}
        vimEnabled={settings.vimModeEnabled}
        onSave={(payload) => {
          onSave({
            xp: payload.xp,
            level: payload.level,
            hearts: payload.hearts,
            library: initialState.library,
            completedChapter: payload.completedChapter,
          });
        }}
        onVictory={() => {
          setShowBossArena(false);
          setBossVictory(true);
        }}
        onGameOver={() => {
          // Game over handled internally by BossArena (retry button)
        }}
        onRetry={() => {
          // Retry handled internally by BossArena
        }}
      />
    );
  }

  // ── Boss Victory Path ──
  if (bossVictory) {
    if (!showWinCinematic) {
      return (
        <CinematicScene
          scenes={completeScenes}
          title={config.completeTitle}
          subtitle={config.completeSubtitle}
          onComplete={() => setShowWinCinematic(true)}
        />
      );
    }
    return (
      <WinModal
        xp={initialState.xp}
        level={initialState.level}
        library={initialState.library}
        title={config.completeTitle}
        subtitle={config.completeSubtitle}
        completedChapter={challenge.id}
        onRetry={() => {
          setBossVictory(false);
          setShowWinCinematic(false);
          setShowBossArena(true);
        }}
        onContinue={hasNextChapter ? onNextChapter : () => {}}
      />
    );
  }

  if (state.phase === "gameover") {
    return (
      <GameOver
        onRetry={actions.retryFromCheckpoint}
        onBuyHeart={actions.purchaseHeart}
        hearts={state.hearts}
        canBuyHeart={state.canBuyHeart}
        heartCostXP={state.heartCostXP}
      />
    );
  }

  if (state.phase === "win") {
    if (!showWinCinematic) {
      return (
        <CinematicScene
          scenes={completeScenes}
          title={config.completeTitle}
          subtitle={config.completeSubtitle}
          onComplete={() => setShowWinCinematic(true)}
        />
      );
    }
    return (
      <WinModal
        xp={state.xp}
        level={state.level}
        library={state.library}
        title={config.completeTitle}
        subtitle={config.completeSubtitle}
        completedChapter={challenge.id}
        onRetry={() => {
          setShowWinCinematic(false);
          actions.retryFromCheckpoint();
        }}
        onContinue={hasNextChapter ? onNextChapter : () => {}}
      />
    );
  }

  return (
    <>
      {/* Overlay layers */}
      {state.particles.map((p) => (
        <XPBurst
          key={p.id}
          amount={p.amount}
          onDone={() => actions.removeParticle(p.id)}
        />
      ))}
      {state.streaks.map((s) => (
        <StreakLabel
          key={s.id}
          text={s.text}
          onDone={() => actions.removeStreak(s.id)}
        />
      ))}
      {state.interrupt && (
        <Interrupt
          who={state.interrupt.who}
          text={state.interrupt.text}
          onDone={actions.dismissInterrupt}
        />
      )}
      {state.powerCut && <PowerCut onDone={() => {}} />}
      {state.twist && (
        <TwistReveal
          headline={state.twist.headline}
          lines={state.twist.lines}
          onDone={actions.dismissTwist}
        />
      )}
      {state.inRush && (
        <RushBar
          seconds={state.rushSeconds}
          label={state.rushLabel}
          onExpire={actions.dismissRush}
        />
      )}

      {/* Scanline */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div
          className="absolute w-full h-px"
          style={{
            background: "linear-gradient(transparent, rgba(110,255,160,.07), transparent)",
            animation: "scanline 7s linear infinite",
          }}
        />
      </div>

      {/* Main layout */}
      <div
        className="h-dvh flex flex-col transition-colors duration-1000"
        style={{
          background: "var(--color-background)",
          paddingBottom: state.inRush ? 58 : 0,
        }}
      >
        <TopBar
          xp={state.xp}
          xpMax={300}
          level={state.level}
          inRush={state.inRush}
          busy={state.busy}
          hearts={state.hearts}
          timerSlot={
            state.timerStartMs > 0 && (
              <LevelTimer
                startTimeMs={state.timerStartMs}
                timeLimitSeconds={state.timerLimitSeconds}
                bonusSeconds={state.timerBonusSeconds}
                gameOverOnExpiry={state.timerGameOver}
                onExpire={actions.handleTimerExpire}
                stopped={state.timerStopped}
              />
            )
          }
        />

        <div ref={containerRef} className="flex-1 flex overflow-hidden">
          {/* Left: Chat */}
          <div
            className="min-w-0 flex flex-col"
            style={{
              width: `${state.jeopardy.editorNarrow ? Math.max(chatWidth, 55) : chatWidth}%`,
              opacity: state.jeopardy.chatLocked ? 0.5 : 1,
              transition: state.jeopardy.editorNarrow ? "width 500ms" : undefined,
            }}
          >
            <ChatPanel
              messages={state.messages}
              busy={state.busy}
              chatInput={state.chatInput}
              onChatChange={actions.setChatInput}
              onSend={actions.sendChat}
              challengeTitle={`${challenge.title} · ${state.currentStep.title}`}
              challengeConcepts={challenge.concepts.join(" · ")}
              location={challenge.location}
              onMayaTypingStart={actions.onMayaTypingStart}
              onMayaTypingEnd={actions.onMayaTypingEnd}
              waitingForContinue={state.waitingForContinue}
              explainUsed={state.explainUsed}
              onContinue={actions.resumeFromPause}
              onExplain={actions.requestExplain}
            />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={handleDragStart}
            className="shrink-0 cursor-col-resize group flex items-center justify-center"
            style={{
              width: "5px",
              background: state.inRush ? "#2a1a0a" : "var(--color-border)",
            }}
          >
            <div
              className="w-px h-8 transition-colors group-hover:h-12"
              style={{ background: "rgba(110,255,160,.2)" }}
            />
          </div>

          {/* Right: Editor / Mission */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div
              className="flex shrink-0"
              style={{
                background: "#04090f",
                borderBottom: "1px solid #0a1820",
              }}
            >
              {([["code", "< CODE />"], ["mission", "MISSION"], ["library", "LIBRARY"], ["notes", "NOTES"]] as const).map(
                ([t, label]) => (
                  <button
                    key={t}
                    onClick={() => actions.setTab(t)}
                    className="bg-transparent text-[8px] tracking-[2px] px-3.5 py-2 cursor-pointer
                               transition-colors"
                    style={{
                      color:
                        state.tab === t
                          ? "var(--color-signal)"
                          : "var(--color-dim)",
                      borderBottom:
                        state.tab === t
                          ? "2px solid var(--color-signal)"
                          : "2px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                )
              )}
              {/* Step progress */}
              {state.totalSteps > 1 && (
                <div className="ml-auto flex items-center gap-1 pr-2">
                  {challenge.steps.map((step, i) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-1"
                    >
                      <span
                        className="text-[7px] tracking-[1px] px-1 py-0.5"
                        style={{
                          color:
                            i < state.currentStepIndex
                              ? "var(--color-signal)"
                              : i === state.currentStepIndex
                                ? "var(--color-alert)"
                                : "#0a3040",
                          border: `1px solid ${
                            i < state.currentStepIndex
                              ? "rgba(110,255,160,.2)"
                              : i === state.currentStepIndex
                                ? "rgba(255,159,28,.3)"
                                : "#0a1820"
                          }`,
                          background:
                            i < state.currentStepIndex
                              ? "rgba(110,255,160,.05)"
                              : i === state.currentStepIndex
                                ? "rgba(255,159,28,.05)"
                                : "transparent",
                        }}
                      >
                        {i < state.currentStepIndex ? "✓" : i + 1} {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Jeopardy indicators */}
              {state.jeopardy.activeEffects.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 pr-3">
                  {state.jeopardy.activeEffects.map((effect, i) => (
                    <span
                      key={i}
                      className="text-[7px] tracking-[1px] px-1 py-0.5"
                      style={{
                        color: "var(--color-danger)",
                        border: "1px solid rgba(255,64,64,.2)",
                        background: "rgba(255,64,64,.05)",
                      }}
                    >
                      {effect.replace("_", " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tab content */}
            {state.tab === "code" && (
              <div className="relative flex-1 min-h-0 flex flex-col">
                {/* AI Suggest overlay */}
                {state.aiSuggestOpen && state.aiSuggestions.length > 0 && (
                  <AISuggestPanel
                    suggestions={state.aiSuggestions}
                    tokens={state.aiTokens}
                    onUseSuggestion={actions.useAISuggestion}
                    onClose={actions.closeAISuggest}
                  />
                )}
                <CodeEditor
                  code={state.code}
                  onCodeChange={actions.setCode}
                  onSubmit={actions.submitCode}
                  busy={state.busy}
                  disabled={state.gamePaused}
                  attempts={state.attempts}
                  inRush={state.inRush}
                  baseXP={state.currentStep.xp.base}
                  rushBonus={state.currentStep.rushMode ? state.currentStep.xp.base : 0}
                  vimEnabled={settings.vimModeEnabled}
                  onVimToggle={(enabled) => onSaveSettings({ vimModeEnabled: enabled })}
                  camFeed={(() => {
                    const cam = CAM_FEED_CONFIG[challenge.id] ?? DEFAULT_CAM;
                    return (
                      <MayaAnimation
                        scene={cam.scene}
                        animation={state.inRush ? cam.rushAnimation : cam.animation}
                        location={challenge.location}
                      />
                    );
                  })()}
                  aiButton={state.aiTokens > 0 && state.aiSuggestions.length > 0 ? (
                    <button
                      onClick={actions.openAISuggest}
                      className="ai-glow bg-transparent text-[7px] tracking-[2px] px-2.5 py-1 cursor-pointer font-[family-name:var(--font-display)]"
                      style={{
                        color: "var(--color-info)",
                        border: "1px solid rgba(122,184,216,.3)",
                        textShadow: "0 0 8px rgba(122,184,216,.5)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(122,184,216,.1)";
                        e.currentTarget.style.borderColor = "rgba(122,184,216,.6)";
                        e.currentTarget.style.animation = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(122,184,216,.3)";
                        e.currentTarget.style.animation = "";
                      }}
                    >
                      ◆ AI · {state.aiTokens}
                    </button>
                  ) : undefined}
                />
              </div>
            )}
            {state.tab === "mission" && (
              <MissionPanel
                challenge={challenge}
                currentStep={state.currentStep}
                currentStepIndex={state.currentStepIndex}
                totalSteps={state.totalSteps}
              />
            )}
            {state.tab === "library" && (
              <LibraryPanel library={state.library} />
            )}
            {state.tab === "notes" && (
              <NotesPanel
                currentChapterId={challenge.id}
                completedChapterIds={completedChapterIds}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function IntroScreen({ config, onStart }: {
  config: ChapterConfig;
  onStart: () => void;
}) {
  const { challenge, tagline, introTitle, introSubtitle, storyLines, ctaLabel } = config;

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-5"
      style={{
        background: "var(--color-background)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 110%, rgba(0,60,20,.2) 0%, transparent 65%)",
      }}
    >
      {/* Grid overlay */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,80,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,80,.25) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Scanline */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
        <div
          className="absolute w-full h-0.5"
          style={{
            background: "linear-gradient(transparent, rgba(110,255,160,.12), transparent)",
            animation: "scanline 5s linear infinite",
          }}
        />
      </div>

      <div className="max-w-[480px] w-full relative">
        {/* Title */}
        <div
          className="text-center mb-7"
          style={{ animation: "intro-in .7s ease forwards" }}
        >
          <div className="text-[#0a4a2a] text-[9px] tracking-[6px] mb-3.5">
            {tagline}
          </div>
          <div
            className="font-[family-name:var(--font-display)] font-black text-[var(--color-signal)] tracking-[6px] leading-none glow-pulse"
            style={{ fontSize: "clamp(36px, 10vw, 72px)" }}
          >
            {introTitle}
          </div>
          <div className="text-[#1a6a3a] text-[9px] tracking-[5px] mt-1.5">
            {introSubtitle}
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex gap-1.5 mb-4 opacity-0"
          style={{ animation: "intro-in .7s ease .2s forwards" }}
        >
          {[
            [String(challenge.steps.length), challenge.steps.length === 1 ? "STEP" : "STEPS"],
            [String(challenge.steps.reduce((s, st) => s + st.xp.base, 0)), "BASE XP"],
            [challenge.timer.gameOverOnExpiry ? "TIMED" : "OPEN", "EVENTS"],
            ["GO", "LANGUAGE"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="flex-1 border border-[#0a2a1a] py-2.5 text-center"
              style={{ background: "rgba(0,255,80,.015)" }}
            >
              <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-base font-bold">
                {v}
              </div>
              <div className="text-[#0a4a2a] text-[7px] tracking-[2px] mt-0.5">
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* Story */}
        <div
          className="border border-[#0a2a1a] border-l-[3px] border-l-[#2a8a5a] p-3.5 mb-3.5 opacity-0"
          style={{
            background: "rgba(0,255,80,.015)",
            animation: "intro-in .7s ease .4s forwards",
          }}
        >
          <div className="text-[#1a6a4a] text-[8px] tracking-[3px] mb-2">
            ▸ SIGNAL INTERCEPTED · 02:14:07
          </div>
          <p className="text-[#3a7a5a] text-xs leading-[1.8]">
            {storyLines[0]}
          </p>
          <p className="text-[var(--color-signal)] text-xs leading-[1.8] mt-1.5">
            {storyLines[1]}
          </p>
        </div>

        {/* CTA */}
        <div
          className="opacity-0"
          style={{ animation: "intro-in .7s ease .9s forwards" }}
        >
          <button
            onClick={onStart}
            className="w-full py-3.5 bg-transparent border-2 border-[var(--color-signal)]
                       text-[var(--color-signal)] font-[family-name:var(--font-display)]
                       text-xs tracking-[6px] cursor-pointer
                       hover:bg-[var(--color-signal)] hover:text-[var(--color-background)]
                       transition-colors"
          >
            {ctaLabel}
          </button>
          <div className="text-center mt-2 text-[#0a3a2a] text-[8px] tracking-[2px]">
            ⚡ FIRST TRY BONUS · SPEED BONUS · PLOT TWISTS{" "}
            <span className="cursor-blink">█</span>
          </div>
        </div>
      </div>
    </div>
  );
}
