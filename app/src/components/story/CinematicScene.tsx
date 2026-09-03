"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PixiScene } from "./PixiScene";
import { TypeText } from "./TypeText";
import type { SceneDefinition, AudioCue } from "@/lib/sprites/scenes";
import { effectiveDurationMs } from "@/lib/sprites/camera";
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
  const shotDurationMs = effectiveDurationMs(currentScene);
  // In-picture title card visibility, keyed to the shot it belongs to so a
  // new shot never inherits the previous card's state.
  const [cardState, setCardState] = useState<{ index: number; visible: boolean } | null>(null);
  const captionTickRef = useRef(0);
  const cardShowAt = currentScene?.titleCard?.atMs ?? 0;
  const cardVisible =
    !!currentScene?.titleCard &&
    fadePhase === "playing" &&
    (cardState?.index === sceneIndex ? cardState.visible : cardShowAt === 0);

  // Teletype: a soft key click every few characters while the caption types.
  const onCaptionChar = useCallback((index: number, char: string) => {
    if (char === " ") return;
    captionTickRef.current += 1;
    if (captionTickRef.current % 3 !== 0) return;
    const names: SfxName[] = ["keypress-1", "keypress-2", "keypress-3"];
    audio.playSfx(names[index % names.length], 0.05);
  }, [audio]);

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
    names.add("keypress-1");
    names.add("keypress-2");
    names.add("keypress-3");
    audio.preload([...names] as Parameters<typeof audio.preload>[0]);
  }, [audio, scenes]);

  // Title card timers: reveal at atMs, retire after durationMs.
  useEffect(() => {
    captionTickRef.current = 0;
    const card = currentScene?.titleCard;
    if (fadePhase !== "playing" || !card) return;
    const showAt = card.atMs ?? 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (showAt > 0) {
      timers.push(setTimeout(() => setCardState({ index: sceneIndex, visible: true }), showAt));
    }
    if (card.durationMs !== undefined) {
      timers.push(
        setTimeout(() => setCardState({ index: sceneIndex, visible: false }), showAt + card.durationMs),
      );
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [currentScene, fadePhase, sceneIndex]);

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
    }, shotDurationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScene, fadePhase, finish, sceneIndex, scenes.length, shotDurationMs]);

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

        {/* In-picture title card — big display type that tracks in over the frame. */}
        {currentScene.titleCard && (
          <div
            key={`card-${sceneIndex}`}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
            style={{ opacity: cardVisible ? 1 : 0, transition: cardVisible ? "none" : "opacity 500ms ease" }}
            aria-hidden={!cardVisible}
          >
            {cardVisible && (
              <>
                <div
                  className="cinematic-card font-[family-name:var(--font-display)] font-black leading-none tracking-[0.3em]"
                  style={{
                    fontSize: "clamp(22px, 4.8vw, 58px)",
                    color: "var(--color-signal)",
                    textShadow:
                      "0 0 18px color-mix(in srgb, var(--color-signal) 60%, transparent), 0 0 64px color-mix(in srgb, var(--color-signal) 35%, transparent)",
                  }}
                >
                  {currentScene.titleCard.text}
                </div>
                <div
                  className="cinematic-card-rule mt-3 h-px w-[38%]"
                  style={{ background: "color-mix(in srgb, var(--color-signal) 55%, transparent)" }}
                />
                {currentScene.titleCard.sub && (
                  <div
                    className="cinematic-card-sub mt-3 text-[8px] tracking-[0.5em] sm:text-[11px]"
                    style={{ color: "color-mix(in srgb, var(--color-foreground) 80%, transparent)" }}
                  >
                    {currentScene.titleCard.sub}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Letterbox — solid opaque bars top and bottom (≈1.95:1 picture).
            All chrome rides on the bars so it never overlaps the picture. */}
        <header
          className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-2 sm:px-6"
          style={{ minHeight: "9%", background: "var(--color-background)" }}
        >
          {/* The header title yields to an in-picture title card when a shot has one. */}
          <div className="min-w-0 cinematic-title-in" style={{ visibility: currentScene.titleCard ? "hidden" : "visible" }}>
            {title && (
              <h1
                className="font-[family-name:var(--font-display)] text-lg font-black leading-none tracking-[0.24em] sm:text-2xl lg:text-3xl"
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
                className="mt-1 text-[7px] tracking-[0.38em] sm:text-[9px]"
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
              className="mt-1 flex items-center justify-end gap-2 text-[6px] tracking-[0.32em] sm:text-[7px]"
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

        <div
          className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 px-4 py-2 sm:px-6"
          style={{ minHeight: "9%", background: "var(--color-background)" }}
        >
          <div key={sceneIndex} className="cinematic-caption-in min-w-0 max-w-[78%]">
            <div
              className="mb-1 text-[6px] tracking-[0.32em] sm:text-[7px]"
              style={{ color: "color-mix(in srgb, var(--color-signal) 65%, transparent)" }}
            >
              SIGNAL LOG // {String(sceneIndex + 1).padStart(2, "0")}
            </div>
            {currentScene.caption && (
              <TypeText
                text={currentScene.caption}
                speed={28}
                onChar={onCaptionChar}
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
                      animationDuration: `${shotDurationMs}ms`,
                    }}
                  />
                )}
              </div>
            ))}
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
