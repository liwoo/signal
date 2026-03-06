"use client";

import { useState } from "react";
import { chapter01, chapter01Twist } from "@/data/challenges/chapter-01";
import { useGame } from "@/hooks/useGame";
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
import { CinematicScene } from "@/components/story/CinematicScene";
import { MayaAnimation } from "@/components/story/MayaAnimation";
import { INTRO_SCENES, CHAPTER_01_COMPLETE_SCENES } from "@/lib/sprites/scenes";
import { BeginnerOverlay } from "@/components/game/BeginnerOverlay";
import { MobileGate } from "@/components/game/MobileGate";
import { getBeginnerNotes } from "@/data/beginner-notes";
import { loadSettings, saveSettings } from "@/lib/storage/local";
import { useGameAudio } from "@/hooks/useGameAudio";

export default function Home() {
  return (
    <MobileGate>
      <GameScreen />
    </MobileGate>
  );
}

function GameScreen() {
  const [state, actions] = useGame(chapter01, chapter01Twist);
  const audio = useGameAudio(state);
  const [showCinematic, setShowCinematic] = useState(false);
  const [showWinCinematic, setShowWinCinematic] = useState(false);
  const [showBeginner, setShowBeginner] = useState(false);
  const beginnerNotes = getBeginnerNotes(chapter01.id);

  if (state.phase === "intro" && !showCinematic && !showBeginner) {
    return <IntroScreen onStart={() => {
      // Pre-warm audio on user gesture (browser requires interaction)
      audio.startLoop("dark-drone-1", 0.08, 5000);
      setShowCinematic(true);
    }} />;
  }

  if (showCinematic) {
    return (
      <CinematicScene
        scenes={INTRO_SCENES}
        title="SIGNAL"
        subtitle="FIRST CONTACT"
        onComplete={() => {
          setShowCinematic(false);
          const settings = loadSettings();
          if (settings.beginnerMode && beginnerNotes) {
            setShowBeginner(true);
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
          actions.startGame();
        }}
        onDisable={() => {
          const settings = loadSettings();
          saveSettings({ ...settings, beginnerMode: false });
          setShowBeginner(false);
          actions.startGame();
        }}
        onHotspotXP={actions.addXP}
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
          scenes={CHAPTER_01_COMPLETE_SCENES}
          title="CHAPTER 1 COMPLETE"
          subtitle="HANDSHAKE ESTABLISHED"
          onComplete={() => setShowWinCinematic(true)}
        />
      );
    }
    return (
      <WinModal
        xp={state.xp}
        level={state.level}
        library={state.library}
        onRetry={() => {
          setShowWinCinematic(false);
          actions.retryFromCheckpoint();
        }}
        onContinue={() => {
          // TODO: navigate to next chapter when available
        }}
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

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chat */}
          <div
            className="min-w-0 flex flex-col transition-all duration-500"
            style={{
              width: state.jeopardy.editorNarrow ? "58%" : "42%",
              borderRight: `1px solid ${state.inRush ? "#2a1a0a" : "var(--color-border)"}`,
              opacity: state.jeopardy.chatLocked ? 0.5 : 1,
            }}
          >
            <ChatPanel
              messages={state.messages}
              busy={state.busy}
              chatInput={state.chatInput}
              onChatChange={actions.setChatInput}
              onSend={actions.sendChat}
              challengeTitle={`${chapter01.title} · ${state.currentStep.title}`}
              challengeConcepts={chapter01.concepts.join(" · ")}
              location={chapter01.location}
              onMayaTypingStart={actions.onMayaTypingStart}
              onMayaTypingEnd={actions.onMayaTypingEnd}
              waitingForContinue={state.waitingForContinue}
              explainUsed={state.explainUsed}
              onContinue={actions.resumeFromPause}
              onExplain={actions.requestExplain}
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
              {([["code", "< CODE />"], ["mission", "MISSION"], ["library", "LIBRARY"]] as const).map(
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
                  {chapter01.steps.map((step, i) => (
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
              <CodeEditor
                code={state.code}
                onCodeChange={actions.setCode}
                onSubmit={actions.submitCode}
                busy={state.busy}
                attempts={state.attempts}
                inRush={state.inRush}
                baseXP={state.currentStep.xp.base}
                rushBonus={state.currentStep.rushMode ? state.currentStep.xp.base : 0}
                camFeed={
                  <MayaAnimation
                    animation={state.inRush ? "walk-right" : "hack"}
                    location={chapter01.location}
                  />
                }
              />
            )}
            {state.tab === "mission" && (
              <MissionPanel
                challenge={chapter01}
                currentStep={state.currentStep}
                currentStepIndex={state.currentStepIndex}
                totalSteps={state.totalSteps}
              />
            )}
            {state.tab === "library" && (
              <LibraryPanel library={state.library} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
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
            ▸ ENCRYPTED SIGNAL · ACT I
          </div>
          <div
            className="font-[family-name:var(--font-display)] font-black text-[var(--color-signal)] tracking-[6px] leading-none glow-pulse"
            style={{ fontSize: "clamp(52px, 13vw, 88px)" }}
          >
            SIGNAL
          </div>
          <div className="text-[#1a6a3a] text-[9px] tracking-[5px] mt-1.5">
            FIRST CONTACT
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex gap-1.5 mb-4 opacity-0"
          style={{ animation: "intro-in .7s ease .2s forwards" }}
        >
          {[
            ["1", "CHALLENGE"],
            ["100", "BASE XP"],
            ["TIMED", "EVENTS"],
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
            maya chen. missing 72hrs. she&apos;s alive — hacked a terminal in
            sublevel 3.
          </p>
          <p className="text-[var(--color-signal)] text-xs leading-[1.8] mt-1.5">
            she needs a Go programmer. write the code. get her out.
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
            CONNECT TO MAYA
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

