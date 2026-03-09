"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { BossFightConfig } from "@/types/game";
import { useBossFight, type BossSavePayload } from "@/hooks/useBossFight";
import { useAudio } from "@/hooks/useAudio";
import { BossHUD } from "./BossHUD";
import { BossComms } from "./BossComms";
import { CodeEditor } from "@/components/game/CodeEditor";
import { paintBossFPS } from "@/lib/sprites/scene-painter";
import { paintBossFrames, type BossAnimation } from "@/lib/sprites/boss-painter";
import {
  drawTargetingGrid,
  drawAmmoRack,
  drawChargeBar,
  drawFiringBeam,
  drawExplosion,
  drawBossProjectile,
  drawImpactFlash,
  drawMissEffect,
  drawTelegraphWarning,
  drawWeaponStatus,
  drawBloodSplatters,
  getShakeOffset,
} from "@/lib/sprites/weapon-painter";

interface BossArenaProps {
  config: BossFightConfig;
  chapterNumber: number;
  initialXP: number;
  initialLevel: number;
  initialHearts: number;
  soundEnabled?: boolean;
  vimEnabled?: boolean;
  onSave?: (payload: BossSavePayload) => void;
  onVictory: () => void;
  onGameOver: () => void;
  onRetry: () => void;
}

// ── Animation state tracked outside React for 60fps performance ──

interface AnimState {
  weaponProgress: number;
  bossAttackActive: boolean;
  bossAttackProgress: number;
  lastBossAttackMs: number;
  nextAttackIntervalMs: number;
  bossAttackLanded: boolean; // whether this attack already triggered damage
  attackTargetX: number; // randomized per-attack (0-1 normalized)
  attackTargetY: number;
  hitBeamProgress: number;
  explosionProgress: number;
  missProgress: number;
  shakeIntensity: number;
  telegraphProgress: number;
  heartsLost: number; // mirror of React state for RAF access
}

function randomAttackTarget(): { x: number; y: number } {
  // Random position biased away from center (more dramatic at edges/corners)
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.15 + Math.random() * 0.3;
  return {
    x: 0.5 + Math.cos(angle) * dist,
    y: 0.5 + Math.sin(angle) * dist,
  };
}

function createAnimState(): AnimState {
  return {
    weaponProgress: 0,
    bossAttackActive: false,
    bossAttackProgress: 0,
    lastBossAttackMs: 0,
    nextAttackIntervalMs: nextAttackInterval(),
    bossAttackLanded: false,
    attackTargetX: 0.3,
    attackTargetY: 0.6,
    hitBeamProgress: -1,
    explosionProgress: -1,
    missProgress: -1,
    shakeIntensity: 0,
    telegraphProgress: 0,
    heartsLost: 0,
  };
}

// Semi-randomized attack interval (8-14 seconds) — gives player time to code between hits
function nextAttackInterval(): number {
  return 8000 + Math.random() * 6000;
}

export function BossArena({
  config,
  chapterNumber,
  initialXP,
  initialLevel,
  initialHearts,
  soundEnabled = true,
  vimEnabled = false,
  onSave,
  onVictory,
  onGameOver,
  onRetry,
}: BossArenaProps) {
  const [state, actions] = useBossFight(
    config,
    chapterNumber,
    initialXP,
    initialLevel,
    initialHearts,
    onSave
  );

  const [showIntro, setShowIntro] = useState(false);
  const [selectedTab, setSelectedTab] = useState(config.tabs[0]?.id ?? "aim");
  const audio = useAudio(soundEnabled);

  // Auto-switch to active tab when turn changes
  useEffect(() => {
    setSelectedTab(state.activeTab);
  }, [state.activeTab]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const animRef = useRef(createAnimState());
  const prevPhaseRef = useRef(state.phase);
  const prevOutcomeRef = useRef(state.lastOutcome);
  const bossAttackHitRef = useRef(actions.bossAttackHit);
  bossAttackHitRef.current = actions.bossAttackHit;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // ── Boss audio ──
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    prevPhaseRef.current = curr;

    if (prev === curr) return;

    if (prev === "ready" && curr === "telegraph") {
      audio.preload([
        "warning-beep", "alert-beep", "dread-sting",
        "captured-impact", "game-over-slam", "handshake-confirm",
        "heartbeat-fast", "code-submit",
        "weapon-charge", "laser-fire", "explosion-small",
        "boss-hit", "target-lock", "hit-confirm", "countdown-tick",
      ]);
      audio.playSfx("alert-beep", 0.4);
    }

    // Start/maintain boss music whenever in active combat
    if (curr === "telegraph" || curr === "player_window") {
      audio.startLoop("boss-loop", 0.2, 1500);
      audio.startLoop("facility-hum", 0.1, 1500);
      audio.startLoop("tension-drone", 0.08, 2000);
    }

    if (curr === "telegraph" && prev !== "ready") {
      audio.playSfx("warning-beep", 0.35);
      audio.playSfx("weapon-charge", 0.25);
      animRef.current.telegraphProgress = 0;
    }

    if (curr === "player_window") {
      audio.playSfx("target-lock", 0.3);
      // Use performance.now() to match RAF timestamp scale
      animRef.current.lastBossAttackMs = performance.now();
      animRef.current.weaponProgress = 0;
    }

    if (curr === "victory" || curr === "boss_retreats") {
      audio.playSfx("handshake-confirm", 0.6);
      audio.stopLoop("heartbeat-fast", 1500);
      audio.stopLoop("tension-drone", 1500);
      audio.setLoopVolume("boss-loop", 0.04, 3000);
    }

    if (curr === "gameover") {
      audio.playSfx("captured-impact", 0.6);
      setTimeout(() => audio.playSfx("game-over-slam", 0.5), 300);
      audio.stopAllLoops(2000);
    }
  }, [state.phase, audio]);

  // ── Hit/miss audio + trigger visual effects ──
  useEffect(() => {
    const prev = prevOutcomeRef.current;
    const curr = state.lastOutcome;
    prevOutcomeRef.current = curr;
    if (prev === curr || !curr) return;

    if (curr === "hit") {
      audio.playSfx("laser-fire", 0.5);
      setTimeout(() => audio.playSfx("explosion-small", 0.4), 400);
      setTimeout(() => audio.playSfx("hit-confirm", 0.3), 600);
      animRef.current.hitBeamProgress = 0;
      animRef.current.explosionProgress = -1;
      if (state.bossHP <= 30) {
        audio.startLoop("heartbeat-fast", 0.25, 800);
        audio.setLoopVolume("boss-loop", 0.25, 500);
        audio.setLoopVolume("tension-drone", 0.15, 500);
      }
    } else {
      audio.playSfx("dread-sting", 0.45);
      setTimeout(() => audio.playSfx("boss-hit", 0.35), 500);
      animRef.current.missProgress = 0;
      animRef.current.shakeIntensity = 1;
    }
  }, [state.lastOutcome, state.bossHP, audio]);

  // Hearts dropping — increase tension audio
  useEffect(() => {
    if (state.hearts <= 1 && state.hearts > 0) {
      audio.startLoop("heartbeat-fast", 0.3, 500);
      audio.setLoopVolume("boss-loop", 0.28, 500);
    }
  }, [state.hearts, audio]);

  useEffect(() => {
    return () => { audio.stopAllLoops(500); };
  }, [audio]);

  // ── Full-screen canvas render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const W = canvas.width;
    const H = canvas.height;

    const bg = paintBossFPS(W, H);
    const vpX = W * 0.5;
    const vpY = H * 0.38;

    // Pre-paint boss frames for current state
    let bossAnim: BossAnimation = "idle";
    if (state.phase === "telegraph") bossAnim = "charge";
    else if (state.lastOutcome === "hit") bossAnim = "hit-react";
    else if (state.lastOutcome === "miss" || state.lastOutcome === "malfunction" || state.lastOutcome === "timeout") bossAnim = "attack";
    else if (state.bossHP <= 30 && state.bossHP > 0) bossAnim = "low-hp";
    else if (state.phase === "victory") bossAnim = "defeat";

    const bossFrames = paintBossFrames(bossAnim, 3, state.bossHP);

    let frame = 0;
    let lastFrameTime = 0;
    const FRAME_MS = 180;
    const anim = animRef.current;

    const draw = (time: number) => {
      const dt = time - lastFrameTime;
      if (dt > FRAME_MS) {
        frame = (frame + 1) % bossFrames.length;
        lastFrameTime = time;
      }

      // Advance animation timers
      const dtSec = dt / 1000 || 0.016;
      anim.weaponProgress = (anim.weaponProgress + dtSec * 0.5) % 1;
      anim.telegraphProgress = (anim.telegraphProgress + dtSec * 0.3) % 1;

      if (anim.hitBeamProgress >= 0 && anim.hitBeamProgress < 1) {
        anim.hitBeamProgress = Math.min(1, anim.hitBeamProgress + dtSec * 1.2);
        if (anim.hitBeamProgress > 0.35 && anim.explosionProgress < 0) {
          anim.explosionProgress = 0;
        }
      }
      if (anim.explosionProgress >= 0 && anim.explosionProgress < 1) {
        anim.explosionProgress = Math.min(1, anim.explosionProgress + dtSec * 1.5);
      }
      if (anim.missProgress >= 0 && anim.missProgress < 1) {
        anim.missProgress = Math.min(1, anim.missProgress + dtSec * 1.8);
      }
      if (anim.shakeIntensity > 0) {
        anim.shakeIntensity = Math.max(0, anim.shakeIntensity - dtSec * 3);
      }

      // Boss periodic attacks during player_window (semi-randomized)
      if (state.phase === "player_window" && !anim.bossAttackActive) {
        if (time - anim.lastBossAttackMs > anim.nextAttackIntervalMs) {
          anim.bossAttackActive = true;
          anim.bossAttackProgress = 0;
          anim.bossAttackLanded = false;
          anim.lastBossAttackMs = time;
          anim.nextAttackIntervalMs = nextAttackInterval();
          // Randomize where this projectile hits
          const target = randomAttackTarget();
          anim.attackTargetX = target.x;
          anim.attackTargetY = target.y;
        }
      }
      if (anim.bossAttackActive) {
        anim.bossAttackProgress += dtSec * 1.4;
        if (anim.bossAttackProgress > 0.8 && anim.shakeIntensity < 0.3) {
          anim.shakeIntensity = 0.5;
        }
        // Projectile lands — deal damage to Maya
        if (anim.bossAttackProgress > 0.85 && !anim.bossAttackLanded) {
          anim.bossAttackLanded = true;
          anim.heartsLost += 1; // immediate update for RAF-driven blood rendering
          anim.shakeIntensity = Math.min(1, anim.shakeIntensity + 0.6);
          bossAttackHitRef.current();
          audioRef.current.playSfx("boss-hit", 0.45);
          audioRef.current.playSfx("explosion-small", 0.3);
        }
        if (anim.bossAttackProgress >= 1) {
          anim.bossAttackActive = false;
          anim.bossAttackProgress = 0;
        }
      }

      // ── Draw ──
      const shake = getShakeOffset(anim.shakeIntensity);
      ctx.save();
      ctx.translate(shake.x, shake.y);

      // Background
      ctx.drawImage(bg, 0, 0);

      // Boss at vanishing point (scaled up for FPS feel)
      const bf = bossFrames[frame % bossFrames.length];
      ctx.drawImage(bf, vpX - bf.width / 2, vpY - bf.height * 0.6);

      // ── Phase-specific overlays ──

      // Telegraph: pulsing red warning
      if (state.phase === "telegraph") {
        drawTelegraphWarning(ctx, W, H, anim.telegraphProgress);
      }

      // Player window: weapon effects + timer
      if (state.phase === "player_window") {
        // Active weapon overlay
        const tab = state.activeTab;
        if (tab === "aim") {
          // Extract sector number from telegraph
          const sectorMatch = state.currentTelegraph.match(/sector\s+(\d)/i);
          const activeSector = sectorMatch ? parseInt(sectorMatch[1]) : 5;
          drawTargetingGrid(ctx, W, H, activeSector, anim.weaponProgress);
        } else if (tab === "load") {
          const threatMatch = state.currentTelegraph.match(/shield|armor|exposed/i);
          const threat = threatMatch ? threatMatch[0].toLowerCase() : "shield";
          drawAmmoRack(ctx, W, H, threat, anim.weaponProgress);
        } else if (tab === "fire") {
          drawChargeBar(ctx, W, H, anim.weaponProgress);
        }

        // Weapon status
        drawWeaponStatus(ctx, W, H, tab, state.phase);

        // Boss periodic projectile
        if (anim.bossAttackActive) {
          drawBossProjectile(ctx, W, H, vpX, vpY, anim.bossAttackProgress, anim.attackTargetX, anim.attackTargetY);
          if (anim.bossAttackProgress > 0.85) {
            drawImpactFlash(ctx, W, H, 1 - (anim.bossAttackProgress - 0.85) / 0.15);
          }
        }
      }

      // Hit: firing beam + explosion
      if (state.lastOutcome === "hit") {
        if (anim.hitBeamProgress >= 0) {
          drawFiringBeam(ctx, W, H, W * 0.15, H * 0.7, vpX, vpY, anim.hitBeamProgress);
        }
        if (anim.explosionProgress >= 0) {
          drawExplosion(ctx, vpX, vpY, 80, anim.explosionProgress);
        }
        ctx.globalAlpha = Math.max(0, 0.12 - anim.hitBeamProgress * 0.12);
        ctx.fillStyle = "#ffaa00";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Miss: sparks + red flash
      if (state.lastOutcome === "miss" || state.lastOutcome === "malfunction" || state.lastOutcome === "timeout") {
        if (anim.missProgress >= 0) {
          drawMissEffect(ctx, W, H, W * 0.15, H * 0.7, anim.missProgress);
          drawBossProjectile(ctx, W, H, vpX, vpY, anim.missProgress);
          if (anim.missProgress > 0.7) {
            drawImpactFlash(ctx, W, H, 1 - (anim.missProgress - 0.7) / 0.3);
          }
        }
      }

      // Blood splatters on camera lens (accumulate with damage) — use anim.heartsLost
      // (React state would be stale inside RAF closure)
      if (anim.heartsLost > 0) {
        drawBloodSplatters(ctx, W, H, anim.heartsLost, 5);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state.phase, state.lastOutcome, state.bossHP, state.activeTab,
      state.currentTelegraph]);

  // ── Auto-advance after result display ──
  useEffect(() => {
    if (state.lastOutcome && (state.phase === "hit" || state.phase === "miss")) {
      const timer = setTimeout(() => {
        // Reset anim effects before next turn
        animRef.current = createAnimState();
        actions.nextTurn();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.lastOutcome, state.phase, actions]);

  // ── Handle terminal phases ──
  useEffect(() => {
    if (state.phase === "victory" || state.phase === "boss_retreats") {
      const timer = setTimeout(onVictory, 4000);
      return () => clearTimeout(timer);
    }
    if (state.phase === "gameover") {
      const timer = setTimeout(onGameOver, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, onVictory, onGameOver]);

  // ── Canvas sizing ──
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 });
  useEffect(() => {
    const resize = () => {
      // Use 16:9 aspect, max out at viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Internal resolution — paint at this, CSS scales to viewport
      const w = Math.min(1280, vw);
      const h = Math.min(720, vh);
      setCanvasSize({ w, h });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Ready screen / Intro briefing ──
  if (state.phase === "ready") {
    if (showIntro) {
      // Maya is typing her intro — show briefing with comms
      return (
        <div
          className="h-dvh flex flex-col items-center justify-center"
          style={{ background: "#0a0408" }}
        >
          <div
            className="font-[family-name:var(--font-display)] text-[20px] tracking-[4px] font-bold mb-6"
            style={{ color: "#ff6e6e", textShadow: "0 0 16px rgba(255,64,64,.2)" }}
          >
            {config.bossName}
          </div>
          <div
            style={{
              width: "clamp(320px, 50%, 500px)",
              background: "rgba(8,4,8,0.9)",
              border: "1px solid #201010",
            }}
          >
            <div className="px-3 py-1.5" style={{ borderBottom: "1px solid #201010" }}>
              <span className="text-[7px] tracking-[2px]" style={{ color: "#ff6e6e" }}>
                INCOMING TRANSMISSION
              </span>
            </div>
            <BossComms messages={state.messages} />
          </div>
          <div className="mt-4 text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
            standby...
          </div>
        </div>
      );
    }

    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ background: "#0a0408" }}
      >
        <div className="text-center">
          <div
            className="font-[family-name:var(--font-display)] text-[36px] tracking-[6px] font-bold mb-3"
            style={{ color: "#ff6e6e", textShadow: "0 0 20px rgba(255,64,64,.3)" }}
          >
            {config.bossName}
          </div>
          <div className="text-[9px] tracking-[3px] mb-6" style={{ color: "var(--color-dim)" }}>
            {config.turns.length} TURNS · {config.bossHP} HP · WEAPON SYSTEMS ONLINE
          </div>
          <button
            onClick={() => {
              setShowIntro(true);
              actions.startFight();
            }}
            className="bg-transparent px-8 py-3 cursor-pointer font-[family-name:var(--font-display)] text-[11px] tracking-[4px] transition-colors"
            style={{ color: "#ff6e6e", border: "2px solid #ff4040" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ff4040";
              e.currentTarget.style.color = "#0a0408";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#ff6e6e";
            }}
          >
            ENGAGE
          </button>
        </div>
      </div>
    );
  }

  // ── Victory overlay ──
  if (state.phase === "victory" || state.phase === "boss_retreats") {
    return (
      <div className="h-dvh flex items-center justify-center" style={{ background: "#0a0408" }}>
        <div className="text-center">
          <div
            className="font-[family-name:var(--font-display)] text-[28px] tracking-[6px] font-bold mb-2"
            style={{
              color: state.phase === "victory" ? "#ffaa00" : "#ff6e6e",
              textShadow: `0 0 20px ${state.phase === "victory" ? "rgba(255,170,0,.3)" : "rgba(255,64,64,.3)"}`,
            }}
          >
            {state.phase === "victory" ? "BOSS DEFEATED" : "BOSS RETREATS"}
          </div>
          <div className="text-[9px] tracking-[2px] mb-4" style={{ color: "var(--color-dim)" }}>
            {state.phase === "victory" ? "lockmaster systems offline" : "lockmaster damaged — retreating to sublevel 2"}
          </div>
          {state.xpBreakdown && (
            <div className="text-left inline-block" style={{ minWidth: 200 }}>
              {([
                ["HITS", `+${state.xpBreakdown.hitXP} XP`],
                [state.phase === "victory" ? "DEFEAT BONUS" : "SURVIVAL", `+${state.xpBreakdown.defeatBonus} XP`],
                ...(state.xpBreakdown.flawlessBonus > 0 ? [["FLAWLESS", `+${state.xpBreakdown.flawlessBonus} XP`]] : []),
                ...(state.xpBreakdown.speedBonus > 0 ? [["SPEED BONUS", `+${state.xpBreakdown.speedBonus} XP`]] : []),
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex justify-between py-0.5">
                  <span className="text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>{label}</span>
                  <span className="text-[9px] tracking-[1px]" style={{ color: "#ffaa00" }}>{val}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 mt-1" style={{ borderTop: "1px solid #201010" }}>
                <span className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)]" style={{ color: "#ff6e6e" }}>TOTAL</span>
                <span className="text-[11px] font-bold font-[family-name:var(--font-display)]" style={{ color: "#ffaa00" }}>+{state.xpBreakdown.total} XP</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Game over ──
  if (state.phase === "gameover") {
    return (
      <div className="h-dvh flex items-center justify-center" style={{ background: "#0a0408" }}>
        <div className="text-center">
          <div
            className="font-[family-name:var(--font-display)] text-[28px] tracking-[6px] font-bold mb-2"
            style={{ color: "var(--color-danger)", textShadow: "0 0 20px rgba(255,64,64,.4)" }}
          >
            SYSTEM FAILURE
          </div>
          <div className="text-[9px] tracking-[2px] mb-6" style={{ color: "var(--color-dim)" }}>
            weapon systems offline — lockmaster countermeasures overwhelmed maya
          </div>
          <button
            onClick={() => { actions.retryFight(); onRetry(); }}
            className="bg-transparent px-6 py-2.5 cursor-pointer font-[family-name:var(--font-display)] text-[10px] tracking-[3px] transition-colors"
            style={{ color: "#ff6e6e", border: "1px solid rgba(255,64,64,.3)" }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN COMBAT: Full-screen canvas with overlay panels ──
  return (
    <div
      className="h-dvh w-full relative overflow-hidden"
      style={{ background: "#0a0408" }}
      data-boss="true"
    >
      {/* Full-screen combat canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover" }}
      />

      {/* ── HUD overlay (top) ── */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <BossHUD
          bossName={config.bossName}
          bossHP={state.bossHP}
          maxHP={config.bossHP}
          hearts={state.hearts}
          xp={state.xp}
          level={state.level}
          turnIndex={state.turnIndex}
          turnTotal={state.turnTotal}
        />
      </div>

      {/* ── Maya comms overlay (bottom-left) ── */}
      <div
        className="absolute bottom-0 left-0 z-10"
        style={{
          width: "clamp(280px, 35%, 420px)",
          maxHeight: "45%",
        }}
      >
        <BossComms messages={state.messages} />

        {/* Telegraph inline in comms area */}
        {(state.phase === "telegraph" || state.phase === "player_window") && state.currentTelegraph && (
          <div
            className="px-3 py-2"
            style={{
              background: "rgba(255,40,40,0.06)",
              borderTop: "1px solid rgba(255,64,64,0.15)",
              borderRight: "1px solid rgba(255,64,64,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[6px] tracking-[2px]" style={{ color: "#ff6e6e" }}>⚡ TELEGRAPH</span>
            </div>
            <div
              className="text-[9px] leading-[1.4] font-[family-name:var(--font-display)]"
              style={{ color: "#ffaa00" }}
            >
              {state.currentTelegraph}
            </div>
            <div className="text-[8px] leading-[1.3] mt-0.5" style={{ color: "var(--color-dim)" }}>
              {state.currentHint}
            </div>
          </div>
        )}
      </div>

      {/* ── Result feedback overlay (center) ── */}
      {state.lastOutcome && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="px-8 py-4"
            style={{
              background: state.lastOutcome === "hit" ? "rgba(255,170,0,0.12)" : "rgba(255,40,40,0.12)",
              border: `2px solid ${state.lastOutcome === "hit" ? "rgba(255,170,0,0.4)" : "rgba(255,64,64,0.4)"}`,
            }}
          >
            <span
              className="text-[18px] tracking-[6px] font-[family-name:var(--font-display)] font-bold"
              style={{
                color: state.lastOutcome === "hit" ? "#ffaa00" : "#ff4040",
                textShadow: `0 0 16px ${state.lastOutcome === "hit" ? "rgba(255,170,0,.5)" : "rgba(255,64,64,.5)"}`,
              }}
            >
              {state.lastFeedback}
            </span>
          </div>
        </div>
      )}

      {/* ── Terminal overlay (bottom-right) ── */}
      <div
        className="absolute bottom-0 right-0 z-10 flex flex-col"
        style={{
          width: "clamp(340px, 42%, 520px)",
          height: "clamp(220px, 42%, 340px)",
          background: "rgba(8,4,8,0.92)",
          borderTop: "1px solid #201010",
          borderLeft: "1px solid #201010",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Tab bar for weapon files */}
        <div
          className="flex items-center shrink-0"
          style={{ background: "#0a0408", borderBottom: "1px solid #201010" }}
        >
          {config.tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className="bg-transparent text-[8px] tracking-[2px] px-3.5 py-1.5 cursor-pointer transition-colors"
              style={{
                color: selectedTab === tab.id
                  ? tab.id === state.activeTab ? "#ffaa00" : "#ff6e6e"
                  : "var(--color-dim)",
                borderBottom: selectedTab === tab.id
                  ? `2px solid ${tab.id === state.activeTab ? "#ffaa00" : "#ff6e6e"}`
                  : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reuse the proven CodeEditor component */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            code={state.tabCode[selectedTab] ?? ""}
            onCodeChange={(code) => actions.setTabCode(selectedTab, code)}
            onSubmit={actions.execute}
            busy={state.busy}
            attempts={0}
            inRush={false}
            baseXP={0}
            rushBonus={0}
            vimEnabled={vimEnabled}
          />
        </div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <div
          className="absolute w-full h-px"
          style={{
            background: "linear-gradient(transparent, rgba(255,64,64,.05), transparent)",
            animation: "scanline 4s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
