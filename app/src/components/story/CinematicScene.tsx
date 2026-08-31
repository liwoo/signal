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

type FadePhase = "in" | "playing" | "out";

/** Full-screen, continuously rendered story sequence. */
export function CinematicScene({
  scenes,
  title,
  subtitle,
  onComplete,
  skipLabel = "PRESS ANY KEY TO SKIP",
}: CinematicSceneProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [fadePhase, setFadePhase] = useState<FadePhase>("in");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const cueTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useAudio();

  const currentScene = scenes[sceneIndex] ?? scenes[0];

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    for (const timer of cueTimersRef.current) clearTimeout(timer);
    cueTimersRef.current = [];
    audio.stopAllLoops(800);
    setFadePhase("out");
    finishTimerRef.current = setTimeout(onComplete, 650);
  }, [audio, onComplete]);

  useEffect(() => {
    const names = new Set<string>();
    for (const scene of scenes) {
      for (const cue of scene.audio ?? []) {
        if (cue.sound) names.add(cue.sound);
      }
    }
    if (names.size > 0) {
      audio.preload([...names] as Parameters<typeof audio.preload>[0]);
    }
  }, [audio, scenes]);

  useEffect(() => {
    const timer = setTimeout(() => setFadePhase("playing"), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fadePhase !== "playing" || !currentScene) return;

    timerRef.current = setTimeout(() => {
      if (sceneIndex < scenes.length - 1) {
        setSceneIndex((index) => index + 1);
      } else {
        finish();
      }
    }, currentScene.durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScene, fadePhase, finish, sceneIndex, scenes.length]);

  useEffect(() => {
    if (fadePhase !== "playing" || !currentScene) return;
    const cues = currentScene.audio;
    if (!cues || cues.length === 0) return;

    for (const timer of cueTimersRef.current) clearTimeout(timer);
    cueTimersRef.current = [];

    const fireCue = (cue: AudioCue) => {
      if (completedRef.current) return;
      switch (cue.action) {
        case "sfx":
          if (cue.sound) audio.playSfx(cue.sound as SfxName, cue.volume ?? 0.4);
          break;
        case "loop-start":
          if (cue.sound) {
            audio.startLoop(
              cue.sound as AmbienceName | MusicName,
              cue.volume ?? 0.2,
              cue.fadeMs ?? 1500,
            );
          }
          break;
        case "loop-stop":
          if (cue.sound) {
            audio.stopLoop(
              cue.sound as AmbienceName | MusicName,
              cue.fadeMs ?? 1500,
            );
          }
          break;
        case "loop-volume":
          if (cue.sound) {
            audio.setLoopVolume(
              cue.sound as AmbienceName | MusicName,
              cue.volume ?? 0.2,
              cue.fadeMs ?? 500,
            );
          }
          break;
        case "footsteps":
          audio.playFootsteps(
            cue.count ?? 4,
            cue.intervalMs ?? 480,
            cue.volume ?? 0.3,
            cue.variant ?? "metal",
          );
          break;
      }
    };

    for (const cue of cues) {
      if (cue.atMs <= 0) {
        fireCue(cue);
      } else {
        const timer = setTimeout(() => fireCue(cue), cue.atMs);
        cueTimersRef.current.push(timer);
      }
    }

    return () => {
      for (const timer of cueTimersRef.current) clearTimeout(timer);
      cueTimersRef.current = [];
    };
  }, [audio, currentScene, fadePhase, sceneIndex]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      finish();
    };
    const timer = setTimeout(() => window.addEventListener("keydown", handler), 800);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handler);
    };
  }, [finish]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  if (!currentScene) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden transition-opacity duration-700"
      style={{
        background: "var(--color-background)",
        opacity: fadePhase === "playing" ? 1 : 0,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} cinematic` : "Story cinematic"}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-signal) 3%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-signal) 3%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
        }}
      />

      <section
        className="cinematic-stage relative overflow-hidden border"
        style={{
          width: "min(94vw, 1200px, 118dvh)",
          aspectRatio: "16 / 10",
          borderColor: "color-mix(in srgb, var(--color-signal) 18%, transparent)",
          background: "var(--color-background)",
        }}
        aria-live="polite"
      >
        <PixiScene scene={currentScene} width={640} height={400} crtEffect />

        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-background) 76%, transparent) 0%, transparent 28%, transparent 58%, color-mix(in srgb, var(--color-background) 88%, transparent) 100%)",
          }}
        />

        <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-6 p-4 sm:p-6">
          <div className="min-w-0 cinematic-title-in">
            {title && (
              <h1
                className="font-[family-name:var(--font-display)] text-xl font-black leading-none tracking-[0.24em] sm:text-3xl lg:text-4xl"
                style={{
                  color: "var(--color-signal)",
                  textShadow: "0 0 28px color-mix(in srgb, var(--color-signal) 42%, transparent)",
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className="mt-2 text-[7px] tracking-[0.38em] sm:text-[9px]"
                style={{ color: "color-mix(in srgb, var(--color-foreground) 62%, transparent)" }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div
              className="text-[6px] tracking-[0.28em] sm:text-[8px]"
              style={{ color: "color-mix(in srgb, var(--color-foreground) 65%, transparent)" }}
            >
              {currentScene.location}
            </div>
            <div
              className="mt-2 flex items-center justify-end gap-2 text-[6px] tracking-[0.32em] sm:text-[7px]"
              style={{ color: "color-mix(in srgb, var(--color-danger) 72%, transparent)" }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse"
                style={{ background: "var(--color-danger)" }}
              />
              LIVE FEED
            </div>
          </div>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-30 p-4 sm:p-6">
          <div className="flex items-end justify-between gap-6">
            <div key={sceneIndex} className="cinematic-caption-in min-w-0 max-w-[78%]">
              <div
                className="mb-2 text-[6px] tracking-[0.32em] sm:text-[7px]"
                style={{ color: "color-mix(in srgb, var(--color-signal) 65%, transparent)" }}
              >
                SIGNAL LOG // {String(sceneIndex + 1).padStart(2, "0")}
              </div>
              {currentScene.caption && (
                <TypeText
                  text={currentScene.caption}
                  speed={28}
                  className="text-[10px] leading-relaxed sm:text-xs lg:text-sm"
                />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5" aria-label={`Scene ${sceneIndex + 1} of ${scenes.length}`}>
              {scenes.map((scene, index) => (
                <div
                  key={`${scene.location}-${index}`}
                  className="relative h-px w-3 overflow-hidden sm:w-6"
                  style={{ background: "color-mix(in srgb, var(--color-signal) 18%, transparent)" }}
                >
                  {index < sceneIndex && (
                    <div className="absolute inset-0" style={{ background: "var(--color-signal)" }} />
                  )}
                  {index === sceneIndex && (
                    <div
                      key={`progress-${sceneIndex}`}
                      className="cinematic-progress absolute inset-0 origin-left"
                      style={{
                        background: "var(--color-signal)",
                        animationDuration: `${currentScene.durationMs}ms`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div
        className="absolute bottom-3 left-4 hidden text-[6px] tracking-[0.24em] sm:block"
        style={{ color: "color-mix(in srgb, var(--color-foreground) 28%, transparent)" }}
      >
        crafted with ♥ by chienda.com
      </div>

      <button
        type="button"
        className="absolute bottom-3 right-4 border-0 bg-transparent p-2 text-[6px] tracking-[0.28em] transition-colors sm:text-[7px]"
        style={{ color: "color-mix(in srgb, var(--color-foreground) 38%, transparent)" }}
        onClick={finish}
      >
        {skipLabel}
      </button>
    </div>
  );
}
