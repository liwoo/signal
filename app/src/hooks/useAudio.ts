"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
// Sound enabled is passed in via parameter — no direct storage import.

// ── Sound Registry ──

const SFX = {
  // Terminal / chat
  "terminal-beep": "/audio/sfx/terminal-beep.ogg",
  "message-receive": "/audio/sfx/message-receive.ogg",
  "maya-message": "/audio/sfx/maya-message.ogg",
  "code-submit": "/audio/sfx/code-submit.ogg",
  "handshake-confirm": "/audio/sfx/handshake-confirm.ogg",

  // Alerts
  "warning-beep": "/audio/sfx/warning-beep.ogg",
  "alert-beep": "/audio/sfx/alert-beep.ogg",
  "rush-warning": "/audio/sfx/rush-warning.ogg",
  "dread-sting": "/audio/sfx/dread-sting.ogg",

  // Footsteps
  "footstep-metal-1": "/audio/sfx/footstep-metal-1.ogg",
  "footstep-metal-2": "/audio/sfx/footstep-metal-2.ogg",
  "footstep-metal-3": "/audio/sfx/footstep-metal-3.ogg",
  "footstep-metal-4": "/audio/sfx/footstep-metal-4.ogg",
  "footstep-boots-1": "/audio/sfx/footstep-boots-1.ogg",
  "footstep-boots-2": "/audio/sfx/footstep-boots-2.ogg",

  // Environment
  "door-slide": "/audio/sfx/door-slide.ogg",
  "machinery": "/audio/sfx/machinery.ogg",
  "knock-1": "/audio/sfx/knock-1.ogg",
  "knock-2": "/audio/sfx/knock-2.ogg",
  "knock-heavy": "/audio/sfx/knock-heavy.ogg",
  "keypad-beep": "/audio/sfx/keypad-beep.ogg",

  // Game state
  "captured-impact": "/audio/sfx/captured-impact.ogg",
  "game-over-slam": "/audio/sfx/game-over-slam.ogg",

  // Typing
  "maya-typing": "/audio/sfx/maya-typing.ogg",
  "keypress-1": "/audio/sfx/keypress-1.ogg",
  "keypress-2": "/audio/sfx/keypress-2.ogg",
  "keypress-3": "/audio/sfx/keypress-3.ogg",

  // Human grunts (Maya)
  "grunt-hit-1": "/audio/sfx/grunt-hit-1.ogg",
  "grunt-hit-2": "/audio/sfx/grunt-hit-2.ogg",
  "grunt-hit-3": "/audio/sfx/grunt-hit-3.ogg",
  "grunt-dodge-1": "/audio/sfx/grunt-dodge-1.ogg",
  "grunt-dodge-2": "/audio/sfx/grunt-dodge-2.ogg",

  // Maya voice callouts (boss fight)
  "hurry-up": "/audio/sfx/hurry-up.wav",
  "keep-coding": "/audio/sfx/keep-coding.wav",
  "taking-fire": "/audio/sfx/taking-fire.wav",
  "hit": "/audio/sfx/hit.wav",
  "we-did-it": "/audio/sfx/we-did-it.wav",
  "next-one": "/audio/sfx/next-one.wav",
  "dying": "/audio/sfx/dying.wav",

  // Boss fight weapon
  "weapon-charge": "/audio/sfx/weapon-charge.ogg",
  "laser-fire": "/audio/sfx/laser-fire.ogg",
  "explosion-small": "/audio/sfx/explosion-small.ogg",
  "shield-break": "/audio/sfx/shield-break.ogg",
  "target-lock": "/audio/sfx/target-lock.ogg",
  "hit-confirm": "/audio/sfx/hit-confirm.ogg",
  "boss-hit": "/audio/sfx/boss-hit.ogg",
  "countdown-tick": "/audio/sfx/countdown-tick.ogg",
} as const;

const AMBIENCE = {
  "cell-ambient": "/audio/ambience/cell-ambient.mp3",
  "corridor-ambient": "/audio/ambience/corridor-ambient.mp3",
  "facility-hum": "/audio/ambience/facility-hum.ogg",
  "dark-drone-1": "/audio/ambience/dark-drone-1.mp3",
  "dark-drone-2": "/audio/ambience/dark-drone-2.mp3",
  "alarm-loop": "/audio/sfx/alarm-loop.ogg",
  "siren-loop": "/audio/sfx/siren-loop.ogg",
  "tension-drone": "/audio/ambience/tension-drone.ogg",
  "heartbeat-fast": "/audio/sfx/heartbeat-fast.ogg",
  "heartbeat-slow": "/audio/sfx/heartbeat-slow.ogg",
} as const;

const MUSIC = {
  "gameplay-loop": "/audio/music/gameplay-loop.mp3",
  "boss-loop": "/audio/music/boss-loop.mp3",
} as const;

export type SfxName = keyof typeof SFX;
export type AmbienceName = keyof typeof AMBIENCE;
export type MusicName = keyof typeof MUSIC;

// ── Hook ──

export function useAudio(soundEnabled = true) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  // Loops use HTML Audio elements (reliable for long audio)
  const loopEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const enabledRef = useRef(true);

  // Lazily create AudioContext (must be after user gesture)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Load + decode a sound file (cached)
  const loadBuffer = useCallback(
    async (url: string): Promise<AudioBuffer | null> => {
      const cached = bufferCache.current.get(url);
      if (cached) return cached;
      try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        const ctx = getCtx();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        bufferCache.current.set(url, audioBuf);
        return audioBuf;
      } catch {
        return null;
      }
    },
    [getCtx]
  );

  // Sync with external setting
  useEffect(() => {
    enabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Play a one-shot SFX
  const playSfx = useCallback(
    async (name: SfxName, volume = 0.5) => {
      if (!enabledRef.current) return;
      const url = SFX[name];
      const buffer = await loadBuffer(url);
      if (!buffer) return;
      const ctx = getCtx();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(ctx.destination);
      source.start();
    },
    [loadBuffer, getCtx]
  );

  // Play a sequence of footsteps with interval
  // variant: "metal" (Maya on grate) or "boots" (guard on concrete)
  const playFootsteps = useCallback(
    async (count: number, intervalMs = 600, volume = 0.4, variant: "metal" | "boots" = "metal") => {
      if (!enabledRef.current) return;
      const steps: SfxName[] = variant === "boots"
        ? ["footstep-boots-1", "footstep-boots-2"]
        : ["footstep-metal-1", "footstep-metal-2", "footstep-metal-3", "footstep-metal-4"];
      // Preload all
      await Promise.all(steps.map((s) => loadBuffer(SFX[s])));
      for (let i = 0; i < count; i++) {
        const step = steps[i % steps.length];
        setTimeout(() => playSfx(step, volume), i * intervalMs);
      }
    },
    [loadBuffer, playSfx]
  );

  // Start a looping sound (ambience or music) — uses HTML Audio for reliability.
  // SYNCHRONOUS — el.play() must happen in the same call stack as user gesture
  // or browsers (especially Safari) reject it as non-user-initiated.
  // If a loop with this name already exists (even mid-fade-out), it's replaced.
  const startLoop = useCallback(
    (
      name: AmbienceName | MusicName,
      volume = 0.3,
      _fadeInMs = 2000
    ) => {
      if (!enabledRef.current) return;

      // Kill any existing element (may be mid-fade-out from stopAllLoops)
      const existing = loopEls.current.get(name);
      if (existing) {
        existing.pause();
        loopEls.current.delete(name);
      }

      const url = name in AMBIENCE
        ? AMBIENCE[name as AmbienceName]
        : MUSIC[name as MusicName];

      if (!url) {
        console.warn(`[AUDIO] no URL for loop "${name}"`);
        return;
      }

      const el = new Audio(url);
      el.loop = true;
      el.volume = volume;

      // Log load errors so "Invalid URI" is traceable
      el.addEventListener("error", () => {
        console.error(`[AUDIO] load error for "${name}" (${url}):`, el.error?.message);
      });

      loopEls.current.set(name, el);

      // Fire-and-forget — play() returns a promise, handle errors without await
      // so the call stays synchronous within the user gesture stack frame.
      el.play().catch((e) => {
        console.warn(`[AUDIO] loop play failed for "${name}" (${url}):`, e);
        loopEls.current.delete(name);
      });
    },
    []
  );

  // Stop a looping sound with fade out
  const stopLoop = useCallback(
    (name: AmbienceName | MusicName, fadeOutMs = 1500) => {
      const el = loopEls.current.get(name);
      if (!el) return;

      const startVol = el.volume;
      const steps = 20;
      const stepMs = fadeOutMs / steps;
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => {
          el.volume = Math.max(0, startVol * (1 - i / steps));
        }, stepMs * i);
      }
      setTimeout(() => {
        el.pause();
        loopEls.current.delete(name);
      }, fadeOutMs);
    },
    []
  );

  // Stop all loops
  const stopAllLoops = useCallback(
    (fadeOutMs = 1000) => {
      for (const name of loopEls.current.keys()) {
        stopLoop(name as AmbienceName | MusicName, fadeOutMs);
      }
    },
    [stopLoop]
  );

  // Set volume on active loop
  const setLoopVolume = useCallback(
    (name: AmbienceName | MusicName, volume: number, rampMs = 500) => {
      const el = loopEls.current.get(name);
      if (!el) return;
      const startVol = el.volume;
      const steps = 15;
      const stepMs = rampMs / steps;
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => {
          const e = loopEls.current.get(name);
          if (e) e.volume = Math.max(0, Math.min(1, startVol + (volume - startVol) * (i / steps)));
        }, stepMs * i);
      }
    },
    []
  );

  // Preload sounds into buffer cache (no playback)
  // Call during scene transitions or level load to avoid first-play delay
  const preload = useCallback(
    async (names: (SfxName | AmbienceName | MusicName)[]) => {
      const urls = names.map((name) => {
        if (name in SFX) return SFX[name as SfxName];
        if (name in AMBIENCE) return AMBIENCE[name as AmbienceName];
        if (name in MUSIC) return MUSIC[name as MusicName];
        return null;
      });
      await Promise.all(
        urls.filter(Boolean).map((url) => loadBuffer(url!))
      );
    },
    [loadBuffer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all HTML Audio loops
      for (const el of loopEls.current.values()) {
        el.pause();
      }
      loopEls.current.clear();
      // Close Web Audio context (used for SFX)
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return useMemo(() => ({
    playSfx,
    playFootsteps,
    startLoop,
    stopLoop,
    stopAllLoops,
    setLoopVolume,
    preload,
  }), [playSfx, playFootsteps, startLoop, stopLoop, stopAllLoops, setLoopVolume, preload]);
}
