"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "./useAudio";
import type { GameState } from "./useGame";

/**
 * Orchestrates audio based on game state changes.
 * Drop into the page component alongside useGame.
 */
export function useGameAudio(state: GameState, soundEnabled = true) {
  const audio = useAudio(soundEnabled);
  const prevPhase = useRef(state.phase);
  const prevRush = useRef(state.inRush);
  const prevStepIndex = useRef(state.currentStepIndex);
  const prevInterrupt = useRef(state.interrupt);
  const prevMessageCount = useRef(state.messages.length);
  const hasStartedAmbience = useRef(false);
  const firedWarning30 = useRef(false);
  const firedCritical15 = useRef(false);

  // ── Phase transitions ──
  useEffect(() => {
    const prev = prevPhase.current;
    const curr = state.phase;
    prevPhase.current = curr;

    if (prev === curr) return;

    // intro → playing: start ambient + gameplay music, preload gameplay sounds
    if (prev === "intro" && curr === "playing") {
      audio.preload([
        "code-submit", "maya-message", "warning-beep", "alert-beep",
        "dread-sting", "rush-warning", "captured-impact", "game-over-slam",
        "handshake-confirm", "heartbeat-slow", "heartbeat-fast",
        "knock-1", "knock-2", "knock-heavy",
      ]);
      audio.startLoop("cell-ambient", 0.15, 3000);
      audio.startLoop("facility-hum", 0.08, 2000);
      audio.startLoop("gameplay-loop", 0.12, 4000);
      audio.playSfx("terminal-beep", 0.4);
      hasStartedAmbience.current = true;
      firedWarning30.current = false;
      firedCritical15.current = false;
    }

    // playing → gameover: impact + stop music
    if (curr === "gameover") {
      audio.playSfx("captured-impact", 0.6);
      setTimeout(() => audio.playSfx("game-over-slam", 0.5), 300);
      audio.stopAllLoops(2000);
    }

    // playing → twist: success sound + fade music
    if (curr === "twist") {
      audio.playSfx("handshake-confirm", 0.6);
      audio.stopLoop("heartbeat-slow", 1500);
      audio.stopLoop("tension-drone", 2000);
      audio.setLoopVolume("gameplay-loop", 0.04, 2000);
      audio.stopLoop("facility-hum", 2000);
    }

    // twist → win: stop all, play confirmation
    if (curr === "win") {
      audio.stopAllLoops(3000);
    }

    // Back to intro (retry)
    if (curr === "intro") {
      audio.stopAllLoops(1000);
      hasStartedAmbience.current = false;
      firedWarning30.current = false;
      firedCritical15.current = false;
    }
  }, [state.phase, audio]);

  // ── Rush mode — heartbeat + siren + tension ──
  useEffect(() => {
    const prev = prevRush.current;
    prevRush.current = state.inRush;

    if (!prev && state.inRush) {
      // Rush started: dread sting hit, then siren + heartbeat + tension
      audio.playSfx("dread-sting", 0.5);
      audio.startLoop("siren-loop", 0.12, 800);
      audio.startLoop("heartbeat-fast", 0.3, 600);
      audio.startLoop("tension-drone", 0.15, 1200);
      // Intensify music
      audio.setLoopVolume("gameplay-loop", 0.06, 1000);
      // Dim ambient
      audio.setLoopVolume("cell-ambient", 0.05, 1000);
    }

    if (prev && !state.inRush) {
      // Rush ended: stop scary layers
      audio.stopLoop("siren-loop", 1500);
      audio.stopLoop("heartbeat-fast", 2000);
      audio.stopLoop("tension-drone", 2000);
      audio.setLoopVolume("gameplay-loop", 0.12, 1500);
      audio.setLoopVolume("cell-ambient", 0.15, 1500);
    }
  }, [state.inRush, audio]);

  // ── Level timer thresholds: 30s warning, 15s critical ──
  useEffect(() => {
    if (state.phase !== "playing" || state.timerStopped || state.timerStartMs === 0) return;

    const iv = setInterval(() => {
      const elapsed = (Date.now() - state.timerStartMs) / 1000;
      const remaining = Math.max(0, state.timerLimitSeconds + state.timerBonusSeconds - elapsed);

      // 30s remaining — tension builds
      if (remaining <= 30 && !firedWarning30.current) {
        firedWarning30.current = true;
        audio.playSfx("dread-sting", 0.45);
        audio.startLoop("heartbeat-slow", 0.25, 1500);
        audio.startLoop("tension-drone", 0.1, 2000);
        // Darken the music
        audio.setLoopVolume("gameplay-loop", 0.06, 2000);
        audio.setLoopVolume("cell-ambient", 0.06, 2000);
      }

      // 15s remaining — escalate to fast heartbeat
      if (remaining <= 15 && !firedCritical15.current) {
        firedCritical15.current = true;
        audio.playSfx("dread-sting", 0.55);
        // Swap slow heartbeat for fast
        audio.stopLoop("heartbeat-slow", 800);
        audio.startLoop("heartbeat-fast", 0.4, 600);
        // Intensify tension
        audio.setLoopVolume("tension-drone", 0.25, 800);
        audio.startLoop("siren-loop", 0.08, 1000);
      }
    }, 500);

    return () => clearInterval(iv);
  }, [state.phase, state.timerStopped, state.timerStartMs, state.timerLimitSeconds, state.timerBonusSeconds, audio]);

  // ── Step transitions ──
  useEffect(() => {
    const prev = prevStepIndex.current;
    prevStepIndex.current = state.currentStepIndex;

    if (prev !== state.currentStepIndex && state.currentStepIndex > 0) {
      audio.playSfx("code-submit", 0.5);
    }
  }, [state.currentStepIndex, audio]);

  // ── Interrupts (story events like footsteps) ──
  useEffect(() => {
    const prev = prevInterrupt.current;
    prevInterrupt.current = state.interrupt;

    if (!state.interrupt || state.interrupt === prev) return;

    const text = state.interrupt.text.toLowerCase();

    // Footsteps event — guard boots, slow and menacing
    if (text.includes("footstep") || text.includes("outside my door") || text.includes("guard")) {
      audio.playFootsteps(4, 700, 0.5, "boots");
    }

    // Signal degrading
    if (text.includes("signal") && text.includes("drop")) {
      audio.playSfx("warning-beep", 0.4);
    }

    // General story interrupt
    if (state.interrupt.who === "SYSTEM") {
      audio.playSfx("alert-beep", 0.35);
    }
  }, [state.interrupt, audio]);

  // ── New messages ──
  useEffect(() => {
    const prevCount = prevMessageCount.current;
    const currCount = state.messages.length;
    prevMessageCount.current = currCount;

    if (currCount <= prevCount || state.phase !== "playing") return;

    const latest = state.messages[currCount - 1];
    if (!latest) return;

    // Maya message: soft beep
    if (latest.from === "MAYA") {
      audio.playSfx("maya-message", 0.2);
    }

    // Code submission messages
    if (latest.from === "YOU" && latest.text.includes("transmitting")) {
      audio.playSfx("code-submit", 0.4);
    }
  }, [state.messages, state.phase, audio]);

  // ── Power cut → backup power mode ──
  useEffect(() => {
    if (state.powerCut) {
      // Brief alert, then shift to electric buzz ambience
      audio.playSfx("warning-beep", 0.5);
      // Dim everything except facility hum (backup power buzz)
      audio.setLoopVolume("gameplay-loop", 0.03, 800);
      audio.setLoopVolume("cell-ambient", 0.02, 600);
      audio.stopLoop("dark-drone-2", 600);
      // Boost facility hum to sound like backup generators
      audio.setLoopVolume("facility-hum", 0.25, 1200);
      // Add tension drone underneath
      audio.startLoop("tension-drone", 0.06, 2000);
    }
  }, [state.powerCut, audio]);

  return audio;
}
