"use client";

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { BossFight3D } from "@/components/boss/BossFight3D";
import { BOSS_ARENAS, bossArenaById } from "@/lib/adventure/boss-levels";

// Development-only boss-fight preview. Plays a 3D boss arena without touching
// game state:  /dev/boss?level=boss-01-fight&sound=0

function BossPreview() {
  const params = useSearchParams();
  const [run, setRun] = useState(0);

  if (process.env.NODE_ENV === "production") notFound();

  const levelId = params.get("level") ?? "boss-01-fight";
  const level = bossArenaById.get(levelId);

  if (!level) {
    return (
      <div className="min-h-dvh p-8 text-xs" style={{ color: "var(--color-foreground)" }}>
        <div className="mb-4 tracking-[3px]" style={{ color: "var(--color-danger)" }}>UNKNOWN ARENA: {levelId}</div>
        <ul>
          {BOSS_ARENAS.map((l) => (
            <li key={l.id}><a href={`/dev/boss?level=${l.id}`} style={{ color: "var(--color-signal)" }}>{l.id}</a></li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <BossFight3D
      key={run}
      level={level}
      chapterNumber={4}
      initialXP={0}
      initialLevel={1}
      initialHearts={5}
      soundEnabled={params.get("sound") !== "0"}
      loopsEnabled={params.get("music") !== "0"}
      vimEnabled={false}
      onSave={() => {}}
      onVictory={() => setRun((r) => r + 1)}
      onGameOver={() => {}}
      onRetry={() => {}}
    />
  );
}

export default function BossPreviewPage() {
  return (
    <Suspense fallback={null}>
      <BossPreview />
    </Suspense>
  );
}
