"use client";

import { useMemo } from "react";
import { PixiScene } from "./PixiScene";
import type { SceneDefinition } from "@/lib/sprites/scenes";
import type { CharAnimation } from "@/lib/sprites/character-painter";

interface MayaAnimationProps {
  animation?: CharAnimation;
  location?: string;
  className?: string;
}

/**
 * Bottom-left freeze-frame of Maya during gameplay.
 * Small PixiJS canvas showing her current state with CRT effect.
 */
export function MayaAnimation({
  animation = "hack",
  location = "SUBLEVEL 3",
  className = "",
}: MayaAnimationProps) {
  const scene: SceneDefinition = useMemo(
    () => ({
      background: "cell" as const,
      actors: [
        {
          type: "maya" as const,
          x: animation === "hack" ? 340 : 280,
          y: 230,
          animation,
        },
      ],
      camera: [{ x: 100, y: 50, time: 0 }],
      durationMs: Infinity,
      location,
    }),
    [animation, location],
  );

  return (
    <div
      className={`fixed bottom-0 right-0 z-40 pointer-events-none ${className}`}
    >
      <div
        className="m-3 border overflow-hidden"
        style={{
          borderColor: "rgba(110,255,160,.1)",
          background: "rgba(4,8,16,.92)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ borderBottom: "1px solid rgba(110,255,160,.06)" }}
        >
          <div
            className="text-[6px] tracking-[2px]"
            style={{ color: "rgba(110,255,160,.25)" }}
          >
            CAM-FEED
          </div>
          <div
            className="text-[5px] tracking-[2px] cursor-blink"
            style={{ color: "rgba(255,64,64,.4)" }}
          >
            REC
          </div>
        </div>

        <PixiScene scene={scene} width={220} height={150} crtEffect />
      </div>
    </div>
  );
}
