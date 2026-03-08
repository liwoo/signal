"use client";

import { useRef, useEffect } from "react";
import { paintActOneMap, ACT_ONE_NODES } from "@/lib/sprites/map-painter";
import type { MapNode } from "@/lib/sprites/map-painter";

interface GameMapProps {
  /** ID of the chapter just completed (e.g. "chapter-01") */
  completedUpTo: string;
}

export function GameMap({ completedUpTo }: GameMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const target = canvasRef.current;
    if (!target) return;

    // Build nodes with status based on completedUpTo
    const completedIdx = ACT_ONE_NODES.findIndex((n) => n.id === completedUpTo);
    const nodes: MapNode[] = ACT_ONE_NODES.map((n, i) => ({
      ...n,
      status:
        i <= completedIdx ? "complete"
        : i === completedIdx + 1 ? "current"
        : "locked",
    }));

    const source = paintActOneMap(nodes, 2);
    const ctx = target.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(source, 0, 0);
  }, [completedUpTo]);

  return (
    <div className="flex justify-center p-4">
      <canvas
        ref={canvasRef}
        width={960}
        height={400}
        style={{ width: "100%", maxWidth: 560, imageRendering: "pixelated" }}
      />
    </div>
  );
}
