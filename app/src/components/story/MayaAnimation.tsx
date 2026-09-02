"use client";

import { useRef, useEffect, useCallback } from "react";
import { paintScene } from "@/lib/sprites/scene-painter";
import type { SceneType } from "@/lib/sprites/scene-painter";
import { paintMayaFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";

interface MayaAnimationProps {
  animation?: CharAnimation;
  scene?: SceneType;
  location?: string;
  className?: string;
}

const CAM_W = 220;
const CAM_H = 140;
// Scene painted larger for framing headroom
const SCENE_W = 460;
const SCENE_H = 340;
const CHAR_SCALE_DEFAULT = 2;
// Terminal screen flicker interval
const FLICKER_INTERVAL = 2800;
const FLICKER_DURATION = 120;

// Per-scene character placement. The camera then centers on Maya (see paint),
// so the framing stays correct even as scene compositions change.
// Focal x's track each scene's vanishing point (see scene-painter projections):
//   cell 0.42 · corridor 0.50 · chase 0.58 · vent 0.50 · server 0.38
interface SceneLayout {
  mayaX: number;      // scene px — where Maya stands (the focal action point)
  mayaFeetY: number;  // scene px — floor line under her feet
  charScale: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getLayout(scene: SceneType, animation: CharAnimation): SceneLayout {
  switch (scene) {
    case "cell":
      // hack/idle → at the wall terminal (VP); keypad → over at the door.
      return {
        mayaX: animation === "keypad" ? SCENE_W * 0.74 : SCENE_W * 0.42,
        mayaFeetY: SCENE_H * 0.74,
        charScale: CHAR_SCALE_DEFAULT,
      };
    case "vent":
      // Crawl pose is compact — bigger scale, low in the shaft.
      return { mayaX: SCENE_W * 0.5, mayaFeetY: SCENE_H * 0.7, charScale: 3 };
    case "server":
      return { mayaX: SCENE_W * 0.4, mayaFeetY: SCENE_H * 0.74, charScale: CHAR_SCALE_DEFAULT };
    case "boss-arena":
      return { mayaX: SCENE_W * 0.46, mayaFeetY: SCENE_H * 0.72, charScale: CHAR_SCALE_DEFAULT };
    case "corridor":
      return { mayaX: SCENE_W * 0.5, mayaFeetY: SCENE_H * 0.72, charScale: CHAR_SCALE_DEFAULT };
    case "chase":
      return { mayaX: SCENE_W * 0.58, mayaFeetY: SCENE_H * 0.72, charScale: CHAR_SCALE_DEFAULT };
  }
}

/**
 * Lightweight cam-feed of Maya — static Canvas 2D paint with CSS terminal flicker.
 * No PixiJS overhead. Renders inline (not fixed).
 */
export function MayaAnimation({
  animation = "hack",
  scene = "cell",
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
    const bg = paintScene(scene, SCENE_W, SCENE_H);

    // Paint Maya with scene-appropriate placement
    const layout = getLayout(scene, animation);
    const frames = paintMayaFrames(animation, layout.charScale);
    const mayaFrame = frames[0];

    // Camera centers on Maya so she's always framed head-to-shin, whatever the
    // scene composition, with the focal prop behind her.
    const camX = clamp(layout.mayaX - CAM_W / 2, 0, SCENE_W - CAM_W);
    const camY = clamp(layout.mayaFeetY - CAM_H * 0.82, 0, SCENE_H - CAM_H);

    // Draw scene cropped by camera
    ctx.clearRect(0, 0, CAM_W, CAM_H);
    ctx.drawImage(bg, camX, camY, CAM_W, CAM_H, 0, 0, CAM_W, CAM_H);

    // Draw Maya relative to camera
    const drawX = layout.mayaX - camX - mayaFrame.width / 2;
    const drawY = layout.mayaFeetY - camY - mayaFrame.height;
    ctx.drawImage(mayaFrame, drawX, drawY);
  }, [animation, scene]);

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
