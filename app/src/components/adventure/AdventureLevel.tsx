"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdventureScene } from "./AdventureScene";
import type { AdventureApi, AdventureSnapshot } from "./AdventureScene";
import { AdventureHUD } from "./AdventureHUD";
import { CinematicScene } from "@/components/story/CinematicScene";
import { useAudio } from "@/hooks/useAudio";
import type { SfxName, AmbienceName, MusicName } from "@/hooks/useAudio";
import type { AdventureLevel as AdventureLevelDef, SimEvent, SimState } from "@/lib/adventure/types";
import type { SceneDefinition } from "@/lib/sprites/scenes";
import { bookChapterForLevel } from "@/data/book";
import type { BookChapter } from "@/data/book";

interface AdventureLevelProps {
  level: AdventureLevelDef;
  onComplete: () => void;
  soundEnabled?: boolean;
  /** Background loops (ambience). Off = SFX only. */
  loopsEnabled?: boolean;
  compact?: boolean;
  /** Shown instead of the 3D stage when WebGL can't start. */
  fallbackScenes?: SceneDefinition[];
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

const TITLE_MS = 2600;
const FADE_MS = 700;
const FOOTSTEP_MS = 300;
const CRAWL_STEP_MS = 420;
const FOOTSTEPS: SfxName[] = ["footstep-metal-1", "footstep-metal-2", "footstep-metal-3", "footstep-metal-4"];

/**
 * A playable story beat: the 3D stage + HUD + audio. The player steers Maya;
 * when the level ends (she sits at her terminal, or the beat resolves) the
 * frame fades and `onComplete` hands control on.
 */
export function AdventureLevel({
  level,
  onComplete,
  soundEnabled = true,
  loopsEnabled = true,
  compact = false,
  fallbackScenes,
  fallbackTitle,
  fallbackSubtitle,
}: AdventureLevelProps) {
  const audio = useAudio(soundEnabled, loopsEnabled);
  const apiRef = useRef<AdventureApi | null>(null);
  const [snapshot, setSnapshot] = useState<AdventureSnapshot | null>(null);
  const [flash, setFlash] = useState<{ color: string; id: number } | null>(null);
  const flashIdRef = useRef(0);
  const [showTitle, setShowTitle] = useState(true);
  const [fade, setFade] = useState<"in" | "on" | "out">("in");
  const [unsupported, setUnsupported] = useState(false);
  const [foundBook, setFoundBook] = useState<BookChapter | null>(null);
  const completedRef = useRef(false);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    audio.stopAllLoops(600);
    setFade("out");
    finishTimerRef.current = setTimeout(onComplete, FADE_MS);
  }, [audio, onComplete]);

  // Preload the cue sounds this level can fire + start its ambience bed.
  useEffect(() => {
    const names = new Set<SfxName>([
      "captured-impact", "alert-beep", "dread-sting", "door-slide", "maya-typing", "keypad-beep",
      "handshake-confirm", "terminal-beep", "message-receive", ...FOOTSTEPS,
    ]);
    for (const o of level.objectives) {
      if (o.sfx) names.add(o.sfx as SfxName);
      for (const c of o.cues ?? []) if (c.sfx) names.add(c.sfx as SfxName);
    }
    audio.preload([...names]);
    for (const loop of level.ambience ?? []) audio.startLoop(loop as AmbienceName | MusicName, 0.1, 1800);
    if (level.alarm) audio.startLoop("alarm-loop", 0.14, 800);
    const fadeTimer = setTimeout(() => setFade("on"), 60);
    const titleTimer = setTimeout(() => setShowTitle(false), TITLE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(titleTimer);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      audio.stopAllLoops(400);
    };
    // Mount-only: the level is fixed for the life of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Footsteps while Maya moves; slower, softer in the vents.
  const moving = !!snapshot && snapshot.moving && snapshot.status === "playing";
  const crawling = !!snapshot?.crawling;
  useEffect(() => {
    if (!moving) return;
    let i = 0;
    const tick = () => audio.playSfx(FOOTSTEPS[i++ % FOOTSTEPS.length], crawling ? 0.09 : 0.18);
    tick();
    const timer = setInterval(tick, crawling ? CRAWL_STEP_MS : FOOTSTEP_MS);
    return () => clearInterval(timer);
  }, [moving, crawling, audio]);

  const onEvent = useCallback((event: SimEvent, state: SimState) => {
    switch (event.type) {
      case "sfx":
        audio.playSfx(event.name as SfxName, event.volume ?? 0.4);
        break;
      case "spotted":
        audio.playSfx("alert-beep", 0.35);
        break;
      case "captured":
        audio.playSfx("dread-sting", 0.5);
        break;
      case "alarm":
        if (event.on) audio.startLoop("alarm-loop", 0.14, 600);
        else audio.stopLoop("alarm-loop", 800);
        break;
      case "flash":
        flashIdRef.current += 1;
        setFlash({ color: event.color, id: flashIdRef.current });
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlash(null), 520);
        break;
      case "voice":
        audio.playSfx("message-receive", 0.3);
        break;
      case "book":
        audio.playSfx("handshake-confirm", 0.35);
        setFoundBook(bookChapterForLevel(state.level.id));
        break;
      case "ending":
        audio.playSfx(state.level.ending === "relinquish" ? "handshake-confirm" : "message-receive", 0.45);
        break;
      case "ended":
        finish();
        break;
      default:
        break;
    }
  }, [audio, finish]);

  const onSnapshot = useCallback((snap: AdventureSnapshot) => setSnapshot(snap), []);
  const onUnsupported = useCallback(() => setUnsupported(true), []);

  // The beat can't be skipped — it ends when Maya reaches her terminal. Enter /
  // Space only dismisses a found chapter card; everything else is the stage's.
  useEffect(() => {
    if (!foundBook) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") setFoundBook(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [foundBook]);

  if (unsupported && fallbackScenes) {
    return (
      <CinematicScene
        scenes={fallbackScenes}
        title={fallbackTitle ?? level.title}
        subtitle={fallbackSubtitle ?? level.subtitle}
        soundEnabled={soundEnabled}
        loopsEnabled={loopsEnabled}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-hidden transition-opacity duration-700"
      style={{ background: "var(--color-background)", opacity: fade === "on" ? 1 : 0 }}
      role="application"
      aria-label={`${level.title} — playable scene`}
    >
      <AdventureScene
        level={level}
        onSnapshot={onSnapshot}
        onEvent={onEvent}
        apiRef={apiRef}
        onUnsupported={onUnsupported}
        paused={foundBook !== null}
        compact={compact}
        className="absolute inset-0"
      />
      <AdventureHUD
        level={level}
        snapshot={snapshot}
        flash={flash}
        showTitle={showTitle}
        foundBook={foundBook}
        onKeepBook={() => setFoundBook(null)}
        compact={compact}
        onInteract={() => apiRef.current?.interact()}
        onRotate={(delta) => apiRef.current?.rotate(delta)}
      />
    </div>
  );
}
