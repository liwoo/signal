"use client";

import { useRef, useCallback, useEffect } from "react";
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
  const loopNodes = useRef<Map<string, { source: AudioBufferSourceNode; gain: GainNode }>>(new Map());
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

  // Start a looping sound (ambience or music)
  const startLoop = useCallback(
    async (
      name: AmbienceName | MusicName,
      volume = 0.3,
      fadeInMs = 2000
    ) => {
      if (!enabledRef.current) return;
      // Don't restart if already playing
      if (loopNodes.current.has(name)) return;

      const url = name in AMBIENCE
        ? AMBIENCE[name as AmbienceName]
        : MUSIC[name as MusicName];

      const buffer = await loadBuffer(url);
      if (!buffer) return;

      const ctx = getCtx();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(ctx.destination);
      source.start();

      // Fade in
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeInMs / 1000);

      loopNodes.current.set(name, { source, gain });
    },
    [loadBuffer, getCtx]
  );

  // Stop a looping sound with fade out
  const stopLoop = useCallback(
    (name: AmbienceName | MusicName, fadeOutMs = 1500) => {
      const node = loopNodes.current.get(name);
      if (!node) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      const { source, gain } = node;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutMs / 1000);
      setTimeout(() => {
        try { source.stop(); } catch { /* already stopped */ }
        loopNodes.current.delete(name);
      }, fadeOutMs);
    },
    []
  );

  // Stop all loops
  const stopAllLoops = useCallback(
    (fadeOutMs = 1000) => {
      for (const name of loopNodes.current.keys()) {
        stopLoop(name as AmbienceName | MusicName, fadeOutMs);
      }
    },
    [stopLoop]
  );

  // Set volume on active loop
  const setLoopVolume = useCallback(
    (name: AmbienceName | MusicName, volume: number, rampMs = 500) => {
      const node = loopNodes.current.get(name);
      if (!node) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      node.gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + rampMs / 1000);
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
      for (const { source } of loopNodes.current.values()) {
        try { source.stop(); } catch { /* */ }
      }
      loopNodes.current.clear();
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return {
    playSfx,
    playFootsteps,
    startLoop,
    stopLoop,
    stopAllLoops,
    setLoopVolume,
    preload,
  };
}
