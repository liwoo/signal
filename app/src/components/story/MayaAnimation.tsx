"use client";

import { useRef, useEffect, useCallback } from "react";
import { paintScene } from "@/lib/sprites/scene-painter";
import { paintMayaFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";

interface MayaAnimationProps {
  animation?: CharAnimation;
  location?: string;
  className?: string;
}

const CAM_W = 220;
const CAM_H = 140;
// Scene painted larger for framing headroom
const SCENE_W = 460;
const SCENE_H = 340;
// Camera offset into the scene (crops to CAM_W x CAM_H viewport)
const CAM_X = 110;
const CAM_Y = 30;
const CHAR_SCALE = 2;
// Terminal screen flicker interval
const FLICKER_INTERVAL = 2800;
const FLICKER_DURATION = 120;

/**
 * Lightweight cam-feed of Maya — static Canvas 2D paint with CSS terminal flicker.
 * No PixiJS overhead. Renders inline (not fixed).
 */
export function MayaAnimation({
  animation = "hack",
  location = "SUBLEVEL 3",
  className = "",
}: MayaAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flickerRef = useRef<number>(0);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // Paint scene background
    const bg = paintScene("cell", SCENE_W, SCENE_H);

    // Paint Maya
    const frames = paintMayaFrames(animation, CHAR_SCALE);
    const mayaFrame = frames[0];

    // Maya position in scene coords
    const mayaX = animation === "hack" ? 250 : 210;
    const mayaFeetY = SCENE_H * 0.50 + 55;

    // Draw scene cropped by camera
    ctx.clearRect(0, 0, CAM_W, CAM_H);
    ctx.drawImage(bg, CAM_X, CAM_Y, CAM_W, CAM_H, 0, 0, CAM_W, CAM_H);

    // Draw Maya relative to camera
    const drawX = mayaX - CAM_X - mayaFrame.width / 2;
    const drawY = mayaFeetY - CAM_Y - mayaFrame.height;
    ctx.drawImage(mayaFrame, drawX, drawY);
  }, [animation]);

  // Initial paint
  useEffect(() => {
    paint();
  }, [paint]);

  // Terminal flicker effect — brief brightness flash at random intervals
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let timeout: ReturnType<typeof setTimeout>;

    function scheduleFlicker() {
      const jitter = Math.random() * 1200;
      timeout = setTimeout(() => {
        // Flash: brief white overlay then repaint
        const ctx = canvas!.getContext("2d")!;
        ctx.fillStyle = "rgba(110,255,160,0.08)";
        ctx.fillRect(0, 0, CAM_W, CAM_H);

        // Horizontal tear — shift a strip sideways briefly
        const tearY = Math.floor(Math.random() * CAM_H);
        const tearH = 2 + Math.floor(Math.random() * 4);
        const strip = ctx.getImageData(0, tearY, CAM_W, tearH);
        const shift = Math.random() > 0.5 ? 2 : -2;
        ctx.putImageData(strip, shift, tearY);

        // Restore after flicker duration
        setTimeout(() => {
          paint();
        }, FLICKER_DURATION);

        scheduleFlicker();
      }, FLICKER_INTERVAL + jitter);
    }

    scheduleFlicker();
    flickerRef.current = 0;
    return () => clearTimeout(timeout);
  }, [paint]);

  return (
    <div className={`shrink-0 ${className}`}>
      <div
        className="border overflow-hidden"
        style={{
          borderColor: "rgba(110,255,160,.08)",
          background: "rgba(4,8,16,.95)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-2 py-0.5"
          style={{ borderBottom: "1px solid rgba(110,255,160,.06)" }}
        >
          <div
            className="text-[6px] tracking-[2px]"
            style={{ color: "rgba(110,255,160,.25)" }}
          >
            CAM-FEED · {location}
          </div>
          <div
            className="text-[5px] tracking-[2px] cursor-blink"
            style={{ color: "rgba(255,64,64,.4)" }}
          >
            REC
          </div>
        </div>

        {/* Canvas with CRT overlay */}
        <div className="relative" style={{ width: CAM_W, height: CAM_H }}>
          <canvas
            ref={canvasRef}
            width={CAM_W}
            height={CAM_H}
            style={{ display: "block", width: CAM_W, height: CAM_H }}
          />
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,.15) 1px, rgba(0,0,0,.15) 2px)",
              mixBlendMode: "multiply",
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,.6) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
