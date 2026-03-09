"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PixiScene } from "./PixiScene";
import { TypeText } from "./TypeText";
import type { SceneDefinition, AudioCue } from "@/lib/sprites/scenes";
import { useAudio } from "@/hooks/useAudio";
import type { SfxName, AmbienceName, MusicName } from "@/hooks/useAudio";

interface CinematicSceneProps {
  scenes: SceneDefinition[];
  title?: string;
  subtitle?: string;
  onComplete: () => void;
  skipLabel?: string;
}

/**
 * Full-screen cinematic with PixiJS 2D animation of Maya.
 * Cycles through scene definitions with typed captions.
 */
export function CinematicScene({
  scenes,
  title,
  subtitle,
  onComplete,
  skipLabel = "PRESS ANY KEY TO SKIP",
}: CinematicSceneProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [fadePhase, setFadePhase] = useState<"in" | "playing" | "out">("in");
  const [captionKey, setCaptionKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const cueTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useAudio();

  const currentScene = scenes[sceneIndex] ?? scenes[0];

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    // Clear pending audio cues
    for (const t of cueTimersRef.current) clearTimeout(t);
    cueTimersRef.current = [];
    audio.stopAllLoops(800);
    setFadePhase("out");
    setTimeout(onComplete, 600);
  }, [onComplete, audio]);

  // Preload all sounds for this scene set on mount
  useEffect(() => {
    const names = new Set<string>();
    for (const scene of scenes) {
      if (!scene.audio) continue;
      for (const cue of scene.audio) {
        if (cue.sound) names.add(cue.sound);
      }
    }
    if (names.size > 0) {
      audio.preload([...names] as Parameters<typeof audio.preload>[0]);
    }
  }, [scenes, audio]);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadePhase("playing"), 100);
    return () => clearTimeout(t);
  }, []);

  // Advance scenes on timer
  useEffect(() => {
    if (fadePhase !== "playing") return;

    timerRef.current = setTimeout(() => {
      if (sceneIndex < scenes.length - 1) {
        setSceneIndex((i) => i + 1);
        setCaptionKey((k) => k + 1);
      } else {
        finish();
      }
    }, currentScene.durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sceneIndex, fadePhase, currentScene.durationMs, scenes.length, finish]);

  // Fire audio cues for current scene
  useEffect(() => {
    if (fadePhase !== "playing") return;
    const cues = currentScene.audio;
    if (!cues || cues.length === 0) return;

    // Clear any cues from previous scene
    for (const t of cueTimersRef.current) clearTimeout(t);
    cueTimersRef.current = [];

    const fireCue = (cue: AudioCue) => {
      if (completedRef.current) return;
      switch (cue.action) {
        case "sfx":
          if (cue.sound) audio.playSfx(cue.sound as SfxName, cue.volume ?? 0.4);
          break;
        case "loop-start":
          if (cue.sound)
            audio.startLoop(
              cue.sound as AmbienceName | MusicName,
              cue.volume ?? 0.2,
              cue.fadeMs ?? 1500
            );
          break;
        case "loop-stop":
          if (cue.sound) audio.stopLoop(cue.sound as AmbienceName | MusicName, cue.fadeMs ?? 1500);
          break;
        case "loop-volume":
          if (cue.sound) audio.setLoopVolume(cue.sound as AmbienceName | MusicName, cue.volume ?? 0.2, cue.fadeMs ?? 500);
          break;
        case "footsteps":
          audio.playFootsteps(cue.count ?? 4, cue.intervalMs ?? 480, cue.volume ?? 0.3, cue.variant ?? "metal");
          break;
      }
    };

    for (const cue of cues) {
      if (cue.atMs <= 0) {
        fireCue(cue);
      } else {
        const t = setTimeout(() => fireCue(cue), cue.atMs);
        cueTimersRef.current.push(t);
      }
    }

    return () => {
      for (const t of cueTimersRef.current) clearTimeout(t);
      cueTimersRef.current = [];
    };
  }, [sceneIndex, fadePhase, currentScene, audio]);

  // Skip on keypress
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      finish();
    };
    const t = setTimeout(() => {
      window.addEventListener("keydown", handler, { once: true });
    }, 800);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", handler);
    };
  }, [finish]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-opacity duration-700"
      style={{
        background: "#020406",
        opacity: fadePhase === "in" ? 0 : fadePhase === "out" ? 0 : 1,
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,80,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,80,.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      {/* Title */}
      {title && (
        <div
          className="absolute top-[10%] text-center opacity-0"
          style={{ animation: "intro-in .8s ease .3s forwards" }}
        >
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[6px] leading-none glow-pulse"
            style={{
              fontSize: "clamp(28px, 6vw, 48px)",
              color: "var(--color-signal)",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className="text-[9px] tracking-[5px] mt-2"
              style={{ color: "var(--color-dim)" }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* PixiJS Scene — the main event */}
      <div className="relative">
        <div
          className="border overflow-hidden"
          style={{
            borderColor: "rgba(110,255,160,.1)",
            background: "#020406",
          }}
        >
          {/* Location header */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              background: "rgba(4,8,16,.95)",
              borderBottom: "1px solid rgba(110,255,160,.06)",
            }}
          >
            <div
              className="text-[7px] tracking-[3px]"
              style={{ color: "var(--color-dim)" }}
            >
              {`> ${currentScene.location}`}
            </div>
            <div
              className="text-[6px] tracking-[2px] cursor-blink"
              style={{ color: "rgba(255,64,64,.5)" }}
            >
              REC
            </div>
          </div>

          <PixiScene
            scene={currentScene}
            width={640}
            height={400}
            crtEffect
          />

          {/* Progress bar */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              background: "rgba(4,8,16,.95)",
              borderTop: "1px solid rgba(110,255,160,.06)",
            }}
          >
            {scenes.map((_, i) => (
              <div
                key={i}
                className="h-px transition-all duration-500"
                style={{
                  width: i === sceneIndex ? "24px" : "8px",
                  background:
                    i <= sceneIndex
                      ? "var(--color-signal)"
                      : "rgba(110,255,160,.15)",
                  opacity: i === sceneIndex ? 1 : 0.4,
                }}
              />
            ))}
            <div
              className="ml-auto text-[6px] tracking-[2px]"
              style={{ color: "rgba(110,255,160,.2)" }}
            >
              {sceneIndex + 1}/{scenes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="mt-5 h-8 flex items-center justify-center">
        {currentScene.caption && (
          <TypeText
            key={captionKey}
            text={currentScene.caption}
            speed={30}
            className="text-[11px] leading-[1.8]"
          />
        )}
      </div>

      {/* Skip prompt */}
      <div
        className="absolute bottom-8 text-[7px] tracking-[3px] opacity-0"
        style={{
          color: "rgba(110,255,160,.2)",
          animation: "intro-in 1s ease 2s forwards",
        }}
      >
        {skipLabel}
      </div>
    </div>
  );
}
