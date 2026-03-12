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
  drawScreenShatter,
  drawDodgeStreak,
  drawDefeatSequence,
  generateDefeatExplosions,
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
  attackDodged: boolean; // Maya ducked this shot
  attackTargetX: number; // randomized per-attack (0-1 normalized)
  attackTargetY: number;
  hitBeamProgress: number;
  explosionProgress: number;
  missProgress: number;
  shakeIntensity: number;
  telegraphProgress: number;
  heartsLost: number; // mirror of React state for RAF access
  hitImpacts: { x: number; y: number; index: number }[]; // shatter points (persist)
  hitFlash: number; // 0-1 white flash on fresh hit (decays fast)
  hitRecoilTime: number; // seconds since last hit (drives recoil spring)
  dodgeFlash: number; // 0-1 screen disorientation on dodge (decays)
  dodgeStreakProgress: number; // 0-1 near-miss projectile streak animation
  dodgeTime: number; // seconds since dodge started (drives spring physics)
  dodgeDirection: number; // -1 or 1 — which way Maya dives
  dodgeIntensity: number; // magnitude multiplier (randomized per dodge)
  dodgeTargetX: number; // where the dodged shot was aimed
  dodgeTargetY: number;
  totalAttacks: number; // how many attacks fired so far (affects dodge chance)
  // Maya voice callouts
  lastCalloutMs: number; // performance.now() of last hurry-up/keep-coding callout
  // Victory defeat sequence
  victoryTime: number; // seconds since victory started (-1 = inactive)
  victoryExplosions: { x: number; y: number; delay: number; size: number }[];
  victoryFade: number; // 0-1 fade to black
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
    attackDodged: false,
    attackTargetX: 0.3,
    attackTargetY: 0.6,
    hitBeamProgress: -1,
    explosionProgress: -1,
    missProgress: -1,
    shakeIntensity: 0,
    telegraphProgress: 0,
    heartsLost: 0,
    hitImpacts: [],
    hitFlash: 0,
    hitRecoilTime: -1,
    dodgeFlash: 0,
    dodgeStreakProgress: -1,
    dodgeTime: -1,
    dodgeDirection: 1,
    dodgeIntensity: 1,
    dodgeTargetX: 0.5,
    dodgeTargetY: 0.5,
    totalAttacks: 0,
    lastCalloutMs: 0,
    victoryTime: -1,
    victoryExplosions: [],
    victoryFade: 0,
  };
}

// Dodge chance decreases as fight progresses — early attacks are more survivable
// First 2 attacks: 60% dodge, then 45%, 30%, 20% floor
function shouldDodge(totalAttacks: number): boolean {
  const chance = totalAttacks < 2 ? 0.6 : totalAttacks < 4 ? 0.45 : totalAttacks < 6 ? 0.3 : 0.2;
  return Math.random() < chance;
}

// Semi-randomized attack interval (8-14 seconds) — gives player time to code between hits
function nextAttackInterval(): number {
  return 8000 + Math.random() * 6000;
}

function VictoryXPBreakdown({ xp, isVictory }: { xp: { hitXP: number; defeatBonus: number; flawlessBonus: number; speedBonus: number; total: number }; isVictory: boolean }) {
  return (
    <div className="text-left inline-block" style={{ minWidth: 200 }}>
      {([
        ["HITS", `+${xp.hitXP} XP`],
        [isVictory ? "DEFEAT BONUS" : "SURVIVAL", `+${xp.defeatBonus} XP`],
        ...(xp.flawlessBonus > 0 ? [["FLAWLESS", `+${xp.flawlessBonus} XP`]] : []),
        ...(xp.speedBonus > 0 ? [["SPEED BONUS", `+${xp.speedBonus} XP`]] : []),
      ] as [string, string][]).map(([label, val]) => (
        <div key={label} className="flex justify-between py-0.5">
          <span className="text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>{label}</span>
          <span className="text-[9px] tracking-[1px]" style={{ color: "#ffaa00" }}>{val}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1 mt-1" style={{ borderTop: "1px solid #201010" }}>
        <span className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)]" style={{ color: "#ff6e6e" }}>TOTAL</span>
        <span className="text-[11px] font-bold font-[family-name:var(--font-display)]" style={{ color: "#ffaa00" }}>+{xp.total} XP</span>
      </div>
    </div>
  );
}

const AUTO_CONTINUE_SECONDS = 7;

function BossContinueButton({ onContinue }: { onContinue: () => void }) {
  const [remaining, setRemaining] = useState(AUTO_CONTINUE_SECONDS);
  const firedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      onContinue();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onContinue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !firedRef.current) {
        firedRef.current = true;
        onContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onContinue]);

  return (
    <button
      onClick={() => {
        if (!firedRef.current) {
          firedRef.current = true;
          onContinue();
        }
      }}
      className="mt-4 px-6 py-2 cursor-pointer text-[9px] tracking-[3px] font-[family-name:var(--font-mono)] transition-opacity"
      style={{
        color: "var(--color-signal)",
        border: "1px solid var(--color-signal)",
        background: "transparent",
        opacity: 0.8,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; }}
    >
      continue {remaining}s
      <span className="ml-2" style={{ opacity: 0.4 }}>⏎</span>
    </button>
  );
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
  const bossAttackDodgeRef = useRef(actions.bossAttackDodge);
  bossAttackDodgeRef.current = actions.bossAttackDodge;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // Typing sound when Maya sends a message
  const playMayaSound = useCallback(() => {
    audio.playSfx("maya-message", 0.25);
  }, [audio]);

  // ── Boss audio ──
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    prevPhaseRef.current = curr;

    if (prev === curr) return;

    if (prev === "ready" && curr === "telegraph") {
      audio.playSfx("alert-beep", 0.5);
      // Combat begins — slam music to combat intensity (ramp existing loops)
      audio.setLoopVolume("boss-loop", 0.55, 1200);
      audio.setLoopVolume("tension-drone", 0.25, 1500);
      audio.setLoopVolume("facility-hum", 0.2, 1500);
    }

    if (curr === "telegraph" && prev !== "ready") {
      audio.playSfx("warning-beep", 0.4);
      audio.playSfx("weapon-charge", 0.3);
      animRef.current.telegraphProgress = 0;
    }

    if (curr === "player_window") {
      audio.playSfx("target-lock", 0.35);
      // Use performance.now() to match RAF timestamp scale
      animRef.current.lastBossAttackMs = performance.now();
      animRef.current.weaponProgress = 0;
    }

    if (curr === "victory" || curr === "boss_retreats") {
      audio.stopLoop("heartbeat-fast", 1500);
      audio.stopLoop("tension-drone", 2000);

      if (curr === "victory") {
        // Dramatic defeat sequence audio — timed to match the animation
        audio.playSfx("laser-fire", 0.6);
        audio.playSfx("weapon-charge", 0.5);
        // Chain explosion sounds
        setTimeout(() => audio.playSfx("explosion-small", 0.6), 300);
        setTimeout(() => audio.playSfx("explosion-small", 0.5), 800);
        setTimeout(() => audio.playSfx("boss-hit", 0.55), 500);
        setTimeout(() => audio.playSfx("explosion-small", 0.55), 1500);
        setTimeout(() => audio.playSfx("explosion-small", 0.65), 2200);
        setTimeout(() => audio.playSfx("shield-break", 0.6), 2800);
        // Big final explosion
        setTimeout(() => audio.playSfx("explosion-small", 0.7), 3000);
        // Confirmation after the dust settles
        setTimeout(() => audio.playSfx("handshake-confirm", 0.7), 5000);
        // Maya: "we did it!"
        setTimeout(() => audio.playSfx("we-did-it", 0.7), 5500);
        // Music fades during destruction, then swells back on triumph
        audio.setLoopVolume("boss-loop", 0.7, 800);
        setTimeout(() => audio.setLoopVolume("boss-loop", 0.15, 2000), 3000);
        setTimeout(() => audio.setLoopVolume("boss-loop", 0.5, 2000), 5500);

        // Initialize defeat animation
        animRef.current.victoryTime = 0;
      } else {
        audio.playSfx("handshake-confirm", 0.7);
        audio.setLoopVolume("boss-loop", 0.3, 3000);
      }
    }

    if (curr === "gameover") {
      audio.playSfx("captured-impact", 0.7);
      setTimeout(() => audio.playSfx("game-over-slam", 0.6), 300);
      // Maya: dying cry
      setTimeout(() => audio.playSfx("dying", 0.65), 500);
      audio.stopLoop("heartbeat-fast", 1500);
      audio.stopLoop("tension-drone", 2000);
      // Music drops to ominous undertone
      audio.setLoopVolume("boss-loop", 0.25, 2000);
      audio.setLoopVolume("facility-hum", 0.2, 2000);
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
      // Maya: "next one!" after the hit confirms
      setTimeout(() => audio.playSfx("next-one", 0.6), 900);
      animRef.current.hitBeamProgress = 0;
      animRef.current.explosionProgress = -1;
      if (state.bossHP <= 30) {
        audio.startLoop("heartbeat-fast", 0.35, 800);
        audio.setLoopVolume("boss-loop", 0.65, 500);
        audio.setLoopVolume("tension-drone", 0.3, 500);
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
    if (state.hearts <= 2 && state.hearts > 0) {
      audio.startLoop("heartbeat-fast", 0.4, 500);
      audio.setLoopVolume("boss-loop", 0.7, 500);
      audio.setLoopVolume("tension-drone", 0.35, 500);
    }
  }, [state.hearts, audio]);

  // Stop all loops on unmount only — audio ref is stable (memoized)
  useEffect(() => {
    return () => { audio.stopAllLoops(500); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Maya hurry-up callouts — every 15-25s during player_window
      if (state.phase === "player_window") {
        if (anim.lastCalloutMs === 0) {
          // First frame in player_window — schedule first callout 15-25s from now
          anim.lastCalloutMs = time + 15000 + Math.random() * 10000;
        }
        if (time > anim.lastCalloutMs) {
          // Schedule next callout 15-25s from now
          anim.lastCalloutMs = time + 15000 + Math.random() * 10000;
          const urgeCalls = ["hurry-up", "keep-coding"] as const;
          audioRef.current.playSfx(urgeCalls[Math.floor(Math.random() * 2)], 0.55);
        }
      }

      // Boss periodic attacks during player_window (semi-randomized)
      if (state.phase === "player_window" && !anim.bossAttackActive) {
        if (time - anim.lastBossAttackMs > anim.nextAttackIntervalMs) {
          anim.bossAttackActive = true;
          anim.bossAttackProgress = 0;
          anim.bossAttackLanded = false;
          anim.attackDodged = shouldDodge(anim.totalAttacks);
          anim.totalAttacks += 1;
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
        // Projectile lands
        if (anim.bossAttackProgress > 0.85 && !anim.bossAttackLanded) {
          anim.bossAttackLanded = true;
          if (anim.attackDodged) {
            // Maya dives sideways — violent camera lurch with spring-back
            anim.dodgeFlash = 1;
            anim.dodgeStreakProgress = 0;
            anim.dodgeTargetX = anim.attackTargetX;
            anim.dodgeTargetY = anim.attackTargetY;
            anim.dodgeTime = 0;
            anim.dodgeDirection = anim.attackTargetX < 0.5 ? 1 : -1;
            anim.dodgeIntensity = 0.8 + Math.random() * 0.4; // 0.8-1.2x
            anim.shakeIntensity = 1;
            bossAttackDodgeRef.current();
            audioRef.current.playSfx("warning-beep", 0.35);
            audioRef.current.playSfx("shield-break", 0.2);
            // Maya dodge grunt
            const dodgeGrunts = ["grunt-dodge-1", "grunt-dodge-2"] as const;
            audioRef.current.playSfx(dodgeGrunts[Math.floor(Math.random() * 2)], 0.5);
          } else {
            // Direct hit — screen shatters, violent recoil
            anim.heartsLost += 1;
            anim.shakeIntensity = 1;
            anim.hitFlash = 1;
            anim.hitRecoilTime = 0;
            // Add shatter impact at the projectile's target position
            anim.hitImpacts.push({
              x: W * anim.attackTargetX,
              y: H * anim.attackTargetY,
              index: anim.heartsLost - 1,
            });
            bossAttackHitRef.current();
            audioRef.current.playSfx("boss-hit", 0.5);
            audioRef.current.playSfx("explosion-small", 0.4);
            audioRef.current.playSfx("shield-break", 0.35);
            // Maya pain grunt — slight delay so it lands after the impact
            const hitGrunts = ["grunt-hit-1", "grunt-hit-2", "grunt-hit-3"] as const;
            setTimeout(() => {
              audioRef.current.playSfx(hitGrunts[Math.floor(Math.random() * 3)], 0.55);
            }, 80);
            // Maya voice callout on hit — delayed so it follows the grunt
            const hitCallouts = ["taking-fire", "hit"] as const;
            setTimeout(() => {
              audioRef.current.playSfx(hitCallouts[Math.floor(Math.random() * 2)], 0.65);
            }, 400);
          }
        }
        if (anim.bossAttackProgress >= 1) {
          anim.bossAttackActive = false;
          anim.bossAttackProgress = 0;
        }
      }
      // Decay hit flash (fast — white flash pops then gone)
      if (anim.hitFlash > 0) {
        anim.hitFlash = Math.max(0, anim.hitFlash - dtSec * 5);
      }
      // Advance hit recoil timer
      if (anim.hitRecoilTime >= 0) {
        anim.hitRecoilTime += dtSec;
        if (anim.hitRecoilTime > 1.2) anim.hitRecoilTime = -1;
      }
      // Decay dodge effects
      if (anim.dodgeFlash > 0) {
        anim.dodgeFlash = Math.max(0, anim.dodgeFlash - dtSec * 2.0);
      }
      if (anim.dodgeStreakProgress >= 0 && anim.dodgeStreakProgress < 1) {
        anim.dodgeStreakProgress = Math.min(1, anim.dodgeStreakProgress + dtSec * 2.8);
      }
      // Advance dodge spring timer
      if (anim.dodgeTime >= 0) {
        anim.dodgeTime += dtSec;
        if (anim.dodgeTime > 1.6) anim.dodgeTime = -1; // done after ~1.6s
      }

      // Advance victory defeat sequence timer
      if (anim.victoryTime >= 0) {
        anim.victoryTime += dtSec;
        // Generate explosions on first frame
        if (anim.victoryExplosions.length === 0) {
          const bf = bossFrames[0];
          anim.victoryExplosions = generateDefeatExplosions(vpX, vpY, bf.width, bf.height);
        }
        // Escalating shake during destruction
        if (anim.victoryTime < 3.5) {
          anim.shakeIntensity = Math.min(1.5, 0.3 + anim.victoryTime * 0.35);
        } else if (anim.victoryTime < 5) {
          anim.shakeIntensity = Math.max(0, 1.5 - (anim.victoryTime - 3.5) * 1.0);
        }
      }

      // ── Draw ──
      const shake = getShakeOffset(anim.shakeIntensity);
      ctx.save();

      // Dodge spring physics — damped oscillation like a person lurching sideways
      let dodgeX = 0;
      let dodgeY = 0;
      let dodgeRot = 0;
      if (anim.dodgeTime >= 0) {
        const t = anim.dodgeTime;
        const dir = anim.dodgeDirection;
        const mag = anim.dodgeIntensity;
        // Damped spring: violent initial lurch, oscillates back
        const damping = 3.0;
        const freq = 8.5;
        const envelope = Math.exp(-damping * t);
        // 80-110px lateral lurch + initial snap impulse
        dodgeX = dir * mag * (90 * envelope * Math.sin(freq * t)
          + (t < 0.1 ? 70 * (1 - t / 0.1) : 0));
        // Vertical dip — duck down 25-35px, bob back
        dodgeY = mag * 30 * envelope * Math.abs(Math.sin(freq * t * 0.7));
        // Camera tilts with the dive, ±4-5 degrees
        dodgeRot = dir * mag * 0.075 * envelope * Math.sin(freq * t * 0.9);
      }

      // Hit recoil — violent backward slam, staggers back into position
      let hitX = 0;
      let hitY = 0;
      let hitRot = 0;
      if (anim.hitRecoilTime >= 0) {
        const t = anim.hitRecoilTime;
        const envelope = Math.exp(-4 * t);
        // Slam backward (downward on screen) + random lateral stagger
        hitY = 45 * envelope * Math.sin(6 * t);
        hitX = 20 * envelope * Math.sin(9 * t + 1);
        hitRot = 0.04 * envelope * Math.sin(7 * t);
      }

      // Idle sway — slow, persistent drift like a person breathing/standing
      const swayT = time / 1000; // seconds
      const idleX = Math.sin(swayT * 0.7) * 6 + Math.sin(swayT * 1.3) * 3;
      const idleY = Math.sin(swayT * 0.9 + 1.0) * 3 + Math.cos(swayT * 1.6) * 1.5;
      const idleRot = Math.sin(swayT * 0.5 + 0.5) * 0.006;

      const cx = W / 2;
      const cy = H / 2;
      ctx.translate(cx, cy);
      ctx.rotate(dodgeRot + hitRot + idleRot);
      ctx.translate(
        -cx + shake.x + dodgeX + hitX + idleX,
        -cy + shake.y + dodgeY + hitY + idleY
      );

      // Background
      ctx.drawImage(bg, 0, 0);

      // Boss at vanishing point (scaled up for FPS feel)
      // Hide boss sprite once the white flash peaks in defeat sequence
      const bf = bossFrames[frame % bossFrames.length];
      if (anim.victoryTime < 0 || anim.victoryTime < 3.5) {
        // During defeat, boss shakes violently before disappearing
        let bossShakeX = 0;
        let bossShakeY = 0;
        if (anim.victoryTime >= 0 && anim.victoryTime < 3.5) {
          const intensity = Math.min(1, anim.victoryTime * 0.6);
          bossShakeX = (Math.random() - 0.5) * 20 * intensity;
          bossShakeY = (Math.random() - 0.5) * 12 * intensity;
        }
        ctx.drawImage(bf, vpX - bf.width / 2 + bossShakeX, vpY - bf.height * 0.6 + bossShakeY);
      }

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
          // Only show red impact flash on actual hits, not dodges
          if (anim.bossAttackProgress > 0.85 && !anim.attackDodged) {
            drawImpactFlash(ctx, W, H, 1 - (anim.bossAttackProgress - 0.85) / 0.15);
          }
        }

        // Dodge streak — near-miss projectile whizzing past camera
        if (anim.dodgeStreakProgress >= 0 && anim.dodgeStreakProgress < 1) {
          drawDodgeStreak(ctx, W, H, anim.dodgeStreakProgress, anim.dodgeTargetX, anim.dodgeTargetY);
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

      // Screen shatter — persistent glass cracks from each hit
      if (anim.hitImpacts.length > 0) {
        drawScreenShatter(ctx, W, H, anim.hitImpacts, anim.hitFlash);
      }

      // Dodge disorientation — scan line tearing + color channel split
      if (anim.dodgeFlash > 0) {
        const df = anim.dodgeFlash;
        // Heavy horizontal scan line tearing — thick slices displaced far
        const sliceCount = 10 + Math.floor(df * 14);
        for (let i = 0; i < sliceCount; i++) {
          const sy = Math.floor(Math.random() * H);
          const sh = 3 + Math.floor(Math.random() * 8);
          const dx = (Math.random() - 0.5) * df * 50;
          ctx.drawImage(ctx.canvas, 0, sy, W, sh, dx, sy, W, sh);
        }
        // Cyan/red chromatic aberration flash
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(100,255,240,${df * 0.2})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255,60,60,${df * 0.08})`;
        ctx.fillRect(anim.dodgeDirection * df * 12, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }

      // ── Victory defeat sequence — layered on top of everything ──
      if (anim.victoryTime >= 0) {
        drawDefeatSequence(ctx, W, H, vpX, vpY, anim.victoryTime, anim.victoryExplosions);
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
  // Victory: show FPS defeat animation for 8s, then show XP overlay, then transition
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  useEffect(() => {
    if (state.phase === "victory") {
      // Show XP overlay after defeat animation fades to black (~6.5s)
      const overlayTimer = setTimeout(() => setShowVictoryOverlay(true), 6500);
      // Transition out after player has seen XP breakdown
      const exitTimer = setTimeout(onVictory, 11000);
      return () => { clearTimeout(overlayTimer); clearTimeout(exitTimer); };
    }
    if (state.phase === "boss_retreats") {
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
              width: "clamp(360px, 55%, 600px)",
              background: "rgba(8,4,8,0.9)",
              border: "1px solid #201010",
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #201010" }}>
              <span className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)]" style={{ color: "#ff6e6e" }}>
                INCOMING TRANSMISSION
              </span>
            </div>
            <BossComms messages={state.messages} onNewMessage={playMayaSound} />
          </div>
          {state.waitingForContinue ? (
            <BossContinueButton onContinue={actions.continueIntro} />
          ) : (
            <div className="mt-4 text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
              standby...
            </div>
          )}
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
              // Start boss music FIRST — must happen synchronously in click handler
              // so the browser recognises it as user-gesture-initiated playback.
              audio.startLoop("boss-loop", 0.45);
              audio.startLoop("facility-hum", 0.15);
              audio.startLoop("tension-drone", 0.12);
              // Unlock Web Audio context for one-shot SFX
              audio.playSfx("terminal-beep", 0);

              setShowIntro(true);
              actions.startFight();

              // Preload SFX in background (Web Audio buffers for one-shots)
              audio.preload([
                "warning-beep", "alert-beep", "dread-sting",
                "captured-impact", "game-over-slam", "handshake-confirm",
                "code-submit",
                "weapon-charge", "laser-fire", "explosion-small", "shield-break",
                "boss-hit", "target-lock", "hit-confirm", "countdown-tick",
                "grunt-hit-1", "grunt-hit-2", "grunt-hit-3",
                "grunt-dodge-1", "grunt-dodge-2",
                "hurry-up", "keep-coding", "taking-fire", "hit",
                "we-did-it", "next-one", "dying",
              ]);
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

  // ── Victory overlay (boss_retreats: immediate, victory: after defeat animation) ──
  if (state.phase === "boss_retreats") {
    return (
      <div className="h-dvh flex items-center justify-center" style={{ background: "#0a0408" }}>
        <div className="text-center">
          <div
            className="font-[family-name:var(--font-display)] text-[28px] tracking-[6px] font-bold mb-2"
            style={{ color: "#ff6e6e", textShadow: "0 0 20px rgba(255,64,64,.3)" }}
          >
            BOSS RETREATS
          </div>
          <div className="text-[9px] tracking-[2px] mb-4" style={{ color: "var(--color-dim)" }}>
            lockmaster damaged — retreating to sublevel 2
          </div>
          {state.xpBreakdown && (
            <VictoryXPBreakdown xp={state.xpBreakdown} isVictory={false} />
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
            onClick={() => { setShowIntro(false); actions.retryFight(); onRetry(); }}
            className="bg-transparent px-6 py-2.5 cursor-pointer font-[family-name:var(--font-display)] text-[10px] tracking-[3px] transition-colors"
            style={{ color: "#ff6e6e", border: "1px solid rgba(255,64,64,.3)" }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN COMBAT / VICTORY: Full-screen canvas with overlay panels ──
  const isVictoryPhase = state.phase === "victory";
  return (
    <div
      className="h-dvh w-full relative overflow-hidden"
      style={{ background: "#0a0408" }}
      data-boss="true"
    >
      {/* Full-screen combat canvas — stays during victory for defeat animation */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover" }}
      />

      {/* ── Victory overlay fades in after defeat animation ── */}
      {isVictoryPhase && showVictoryOverlay && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{
            animation: "cinematic-fade-in 1.5s ease-out forwards",
          }}
        >
          <div className="text-center">
            <div
              className="font-[family-name:var(--font-display)] text-[28px] tracking-[6px] font-bold mb-2"
              style={{ color: "#ffaa00", textShadow: "0 0 20px rgba(255,170,0,.3)" }}
            >
              BOSS DEFEATED
            </div>
            <div className="text-[9px] tracking-[2px] mb-4" style={{ color: "var(--color-dim)" }}>
              lockmaster systems offline
            </div>
            {state.xpBreakdown && (
              <VictoryXPBreakdown xp={state.xpBreakdown} isVictory />
            )}
          </div>
        </div>
      )}

      {/* ── HUD overlay (top) — hidden during victory ── */}
      {!isVictoryPhase && <div className="absolute top-0 left-0 right-0 z-10">
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
      </div>}

      {/* ── Combat overlays — hidden during victory defeat animation ── */}
      {!isVictoryPhase && <>
      {/* ── Maya comms overlay (bottom-left) ── */}
      <div
        className="absolute bottom-0 left-0 z-10"
        style={{
          width: "clamp(320px, 40%, 520px)",
          maxHeight: "50%",
        }}
      >
        <BossComms messages={state.messages} onNewMessage={playMayaSound} />

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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)]" style={{ color: "#ff6e6e" }}>⚡ TELEGRAPH</span>
            </div>
            <div
              className="text-[12px] leading-[1.4] font-[family-name:var(--font-display)]"
              style={{ color: "#ffaa00" }}
            >
              {state.currentTelegraph}
            </div>
            <div className="text-[11px] leading-[1.4] mt-1" style={{ color: "var(--color-dim)" }}>
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

      </>}

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
