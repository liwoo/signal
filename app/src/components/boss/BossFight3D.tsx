"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BossFightStage, BossSnapshot, BossStageApi } from "./BossFightStage";
import { CodeEditor } from "@/components/game/CodeEditor";
import { useAudio } from "@/hooks/useAudio";
import { compileGo } from "@/lib/go/playground";
import { bossFightXP } from "@/lib/adventure/boss-sim";
import { calculateLevel } from "@/lib/game/xp";
import type { AdventureLevel, BossFightEvent, BossFightState, BossPhase, WeaponConfig } from "@/lib/adventure/types";

interface BossFight3DProps {
  level: AdventureLevel;
  chapterNumber: number;
  initialXP: number;
  initialLevel: number;
  initialHearts: number;
  soundEnabled: boolean;
  loopsEnabled: boolean;
  vimEnabled: boolean;
  compact?: boolean;
  onSave: (payload: { xp: number; level: number; hearts: number; completedChapter?: number }) => void;
  onVictory: () => void;
  onGameOver: () => void;
  onRetry: () => void;
}

type Screen = "briefing" | "fight" | "victory" | "defeat";

interface Feedback {
  kind: "malfunction" | "miss" | "armed";
  text: string;
}

const MAX_HEARTS = 5;

/** The player writes a complete program; only auto-wrap a bare snippet. */
function wrapSource(code: string): string {
  if (/package\s+main/.test(code)) return code;
  return `package main\n\nimport "fmt"\n\n${code}`;
}

export function BossFight3D({
  level, chapterNumber, initialXP, initialLevel, initialHearts, soundEnabled, loopsEnabled, vimEnabled, compact = false,
  onSave, onVictory, onGameOver, onRetry,
}: BossFight3DProps) {
  const audio = useAudio(soundEnabled, loopsEnabled);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const def = level.boss!;
  const fightHearts = Math.max(MAX_HEARTS, initialHearts);

  const [screen, setScreen] = useState<Screen>("briefing");
  const [fightKey, setFightKey] = useState(0);
  const [snap, setSnap] = useState<BossSnapshot | null>(null);
  const [codingPhase, setCodingPhase] = useState<BossPhase | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [xpAward, setXpAward] = useState<ReturnType<typeof bossFightXP> | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const apiRef = useRef<BossStageApi | null>(null);
  const stateRef = useRef<BossFightState | null>(null);
  const savedRef = useRef(false);

  // Keep loops matched to the mute toggle.
  useEffect(() => {
    if (screen === "fight") {
      audioRef.current.setLoopVolume("boss-loop", loopsEnabled ? 0.5 : 0);
    }
  }, [loopsEnabled, screen]);

  const beginFight = useCallback(() => {
    // Music FIRST — synchronous in the click handler for autoplay policy.
    audioRef.current.startLoop("boss-loop", 0.5);
    audioRef.current.startLoop("facility-hum", 0.14);
    audioRef.current.startLoop("tension-drone", 0.12);
    audioRef.current.playSfx("alert-beep", 0.4);
    setScreen("fight");
  }, []);

  const handleEvent = useCallback((ev: BossFightEvent, state: BossFightState) => {
    stateRef.current = state;
    const a = audioRef.current;
    switch (ev.type) {
      case "sfx": a.playSfx(ev.name, ev.volume ?? 0.4); break;
      case "enter-cover": {
        const phase = def.phases[ev.phaseIndex];
        if (phase) {
          setCodingPhase(phase);
          setCode(phase.starterCode);
          setFeedback(null);
          a.playSfx("target-lock", 0.3);
        }
        break;
      }
      case "heart-lost":
        a.playSfx("grunt-hit-1", 0.5);
        if (ev.hearts <= 1) a.startLoop("heartbeat-fast", 0.28);
        break;
      case "won": {
        if (!savedRef.current) {
          savedRef.current = true;
          const xp = bossFightXP(state);
          setXpAward(xp);
          const newXP = initialXP + xp.total;
          onSave({ xp: newXP, level: calculateLevel(newXP), hearts: state.hearts, completedChapter: chapterNumber });
          a.stopLoop("heartbeat-fast", 400);
          a.setLoopVolume("boss-loop", 0.3, 800);
          a.playSfx("handshake-confirm", 0.6);
        }
        setTimeout(() => setScreen("victory"), 1400);
        break;
      }
      case "lost": {
        if (!savedRef.current) {
          savedRef.current = true;
          onSave({ xp: initialXP, level: initialLevel, hearts: 0 });
          onGameOver();
          a.stopLoop("heartbeat-fast", 200);
          a.playSfx("game-over-slam", 0.5);
        }
        setTimeout(() => setScreen("defeat"), 1200);
        break;
      }
    }
  }, [def.phases, initialXP, initialLevel, chapterNumber, onSave, onGameOver]);

  const handleSnapshot = useCallback((s: BossSnapshot) => {
    setSnap(s);
    // Clear the editor overlay once we're back fighting.
    if (s.status === "fighting") setCodingPhase((p) => (p ? null : p));
  }, []);

  const submit = useCallback(async () => {
    if (!codingPhase || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await compileGo(wrapSource(code));
      if (res.errors === "__OFFLINE__") {
        setFeedback({ kind: "malfunction", text: "no connection to the compiler. check your network and run it again." });
      } else if (!res.success) {
        const first = res.errors.split("\n").find((l) => l.trim()) ?? "it won't compile.";
        setFeedback({ kind: "malfunction", text: first });
        audioRef.current.playSfx("dread-sting", 0.4);
      } else if (res.output.trim() === codingPhase.expectedOutput.trim()) {
        const weapon: WeaponConfig = codingPhase.weapon;
        apiRef.current?.arm(weapon);
        setFeedback({ kind: "armed", text: codingPhase.armed ?? "weapon online." });
        setCodingPhase(null);
      } else {
        setFeedback({ kind: "miss", text: `the spec reads: ${res.output.trim() || "(nothing)"} — ${codingPhase.hint}` });
        audioRef.current.playSfx("warning-beep", 0.35);
      }
    } finally {
      setBusy(false);
    }
  }, [code, codingPhase, busy]);

  const retry = useCallback(() => {
    savedRef.current = false;
    stateRef.current = null;
    setSnap(null);
    setCodingPhase(null);
    setFeedback(null);
    setXpAward(null);
    audioRef.current.stopLoop("heartbeat-fast", 200);
    audioRef.current.setLoopVolume("boss-loop", 0.5, 400);
    setFightKey((k) => k + 1);
    setScreen("fight");
    onRetry();
  }, [onRetry]);

  // Fallback if WebGL won't start: skip straight to victory so the player isn't stuck.
  if (webglFailed) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--color-background)] p-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-[var(--color-danger)]">3D UNAVAILABLE</p>
        <p className="max-w-md text-sm text-[var(--color-dim)]">this browser can&apos;t run the arena. the lockmaster stands down for now.</p>
        <button onClick={onVictory} className="border border-[var(--color-signal)] px-6 py-2 text-[var(--color-signal)]">CONTINUE</button>
      </div>
    );
  }

  if (screen === "briefing") {
    return <BriefingScreen def={def} compact={compact} onBegin={beginFight} />;
  }

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <BossFightStage
        key={fightKey}
        level={level}
        hearts={fightHearts}
        compact={compact}
        paused={codingPhase !== null || screen !== "fight"}
        onSnapshot={handleSnapshot}
        onEvent={handleEvent}
        apiRef={apiRef}
        onUnsupported={() => setWebglFailed(true)}
      />

      {snap && screen === "fight" && <BossHud snap={snap} name={def.name} />}

      {codingPhase && (
        <CoverEditor
          phase={codingPhase}
          code={code}
          busy={busy}
          feedback={feedback}
          vimEnabled={vimEnabled}
          isMobile={compact}
          onCode={setCode}
          onSubmit={submit}
        />
      )}

      {screen === "victory" && xpAward && (
        <ResultScreen kind="victory" name={def.name} xp={xpAward} onContinue={onVictory} onRetry={retry} />
      )}
      {screen === "defeat" && (
        <ResultScreen kind="defeat" name={def.name} xp={null} onContinue={onVictory} onRetry={retry} />
      )}
    </div>
  );
}

// ── Briefing / ENGAGE ──
function BriefingScreen({ def, compact, onBegin }: { def: AdventureLevel["boss"]; compact: boolean; onBegin: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[var(--color-background)] p-6 text-center">
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] text-[var(--color-danger)]">BOSS FIGHT</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-foreground)]">{def?.name}</h1>
      </div>
      <div className="max-w-md space-y-3 text-left text-sm text-[var(--color-dim)]">
        <p><span className="text-[var(--color-signal)]">move</span> — WASD / arrows, or tap the floor.</p>
        <p><span className="text-[var(--color-signal)]">fire</span> — automatic when you have a clear line on the core. stay in the open to deal damage.</p>
        <p><span className="text-[var(--color-signal)]">cover</span> — duck into a lit pad to go safe and recode your weapon.</p>
        <p><span className="text-[var(--color-danger)]">danger</span> — its shots take a heart. move before they land.</p>
      </div>
      <button
        onClick={onBegin}
        className="border border-[var(--color-danger)] px-8 py-3 font-[family-name:var(--font-display)] tracking-[0.2em] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-background)]"
      >
        ENGAGE
      </button>
      {compact && <p className="text-xs text-[var(--color-dim)]">drag to look · pinch-less: use the zoom wheel</p>}
    </div>
  );
}

// ── HUD overlay ──
function BossHud({ snap, name }: { snap: BossSnapshot; name: string }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        {/* Hearts */}
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-xs text-[var(--color-dim)]">MAYA</span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <span
                key={i}
                className="inline-block h-3 w-3"
                style={{ background: i < snap.hearts ? "var(--color-danger)" : "var(--color-surface)", border: "1px solid var(--color-danger)" }}
              />
            ))}
          </div>
        </div>
        {/* Boss HP */}
        <div className="flex-1 max-w-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] text-xs text-[var(--color-danger)]">{name}</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-dim)]">
              PHASE {Math.min(snap.phaseIndex + 1, snap.phaseCount)}/{snap.phaseCount}
            </span>
          </div>
          <div className="h-2 w-full" style={{ background: "var(--color-surface)", border: "1px solid var(--color-danger)" }}>
            <div className="h-full transition-[width] duration-200" style={{ width: `${snap.hpFraction * 100}%`, background: "var(--color-danger)" }} />
          </div>
        </div>
      </div>

      {/* Telegraph warning border */}
      {snap.telegraph > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "none", border: `${2 + snap.telegraph * 6}px solid var(--color-alert)`, opacity: 0.25 + snap.telegraph * 0.5 }}
        />
      )}

      {/* Weapon status / Maya thought */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3">
        {!snap.armed && snap.status === "fighting" && (
          <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-[var(--color-signal)] animate-pulse">
            WEAPON OFFLINE — REACH COVER TO RECODE
          </p>
        )}
        {snap.armed && !snap.canFire && snap.status === "fighting" && (
          <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-dim)]">no line on the core — get into the open</p>
        )}
        {snap.thought && (
          <p className="max-w-lg text-center font-[family-name:var(--font-mono)] text-sm text-[var(--color-foreground)]">{snap.thought}</p>
        )}
      </div>
    </>
  );
}

// ── Cover coding overlay ──
function CoverEditor({
  phase, code, busy, feedback, vimEnabled, isMobile, onCode, onSubmit,
}: {
  phase: BossPhase; code: string; busy: boolean; feedback: Feedback | null; vimEnabled: boolean; isMobile: boolean;
  onCode: (c: string) => void; onSubmit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col border border-[var(--color-signal)] bg-[var(--color-background)]">
        <div className="border-b border-[var(--color-surface)] p-3">
          <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-[var(--color-signal)]">WEAPON SYSTEMS · COVER</p>
          <p className="mt-1 text-sm text-[var(--color-signal)]">WHY — {phase.stake}</p>
          <p className="mt-0.5 text-xs text-[var(--color-dim)]">{phase.brief}</p>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor
            code={code}
            onCodeChange={onCode}
            onSubmit={onSubmit}
            busy={busy}
            attempts={0}
            inRush={false}
            baseXP={0}
            rushBonus={0}
            vimEnabled={vimEnabled}
            isMobile={isMobile}
          />
        </div>
        {feedback && (
          <div
            className="border-t border-[var(--color-surface)] p-3 text-sm"
            style={{ color: feedback.kind === "armed" ? "var(--color-signal)" : feedback.kind === "malfunction" ? "var(--color-danger)" : "var(--color-alert)" }}
          >
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Victory / Defeat ──
function ResultScreen({
  kind, name, xp, onContinue, onRetry,
}: {
  kind: "victory" | "defeat"; name: string; xp: ReturnType<typeof bossFightXP> | null;
  onContinue: () => void; onRetry: () => void;
}) {
  const victory = kind === "victory";
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/85 p-6 text-center">
      <h1
        className="font-[family-name:var(--font-display)] text-4xl tracking-[0.2em]"
        style={{ color: victory ? "var(--color-signal)" : "var(--color-danger)" }}
      >
        {victory ? "LOCKMASTER DOWN" : "CAPTURED"}
      </h1>
      {victory && xp ? (
        <div className="space-y-1 font-[family-name:var(--font-mono)] text-sm text-[var(--color-dim)]">
          <p>phases armed <span className="text-[var(--color-foreground)]">+{xp.phaseXP}</span></p>
          <p>defeat <span className="text-[var(--color-foreground)]">+{xp.defeatBonus}</span></p>
          {xp.flawlessBonus > 0 && <p>flawless <span className="text-[var(--color-foreground)]">+{xp.flawlessBonus}</span></p>}
          <p className="pt-1 text-base text-[var(--color-signal)]">TOTAL +{xp.total} XP</p>
        </div>
      ) : (
        <p className="max-w-md text-sm text-[var(--color-dim)]">{name} overloaded her. the room goes dark.</p>
      )}
      <div className="flex gap-3">
        {victory ? (
          <button onClick={onContinue} className="border border-[var(--color-signal)] px-8 py-3 font-[family-name:var(--font-display)] tracking-[0.2em] text-[var(--color-signal)] hover:bg-[var(--color-signal)] hover:text-[var(--color-background)]">
            CONTINUE
          </button>
        ) : (
          <button onClick={onRetry} className="border border-[var(--color-danger)] px-8 py-3 font-[family-name:var(--font-display)] tracking-[0.2em] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-background)]">
            TRY AGAIN
          </button>
        )}
      </div>
    </div>
  );
}
