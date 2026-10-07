"use client";

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { AdventureLevel } from "@/components/adventure/AdventureLevel";
import { ALL_LEVELS, levelById } from "@/lib/adventure/levels";

// Development-only adventure preview. Plays any level from levels.ts without
// touching game state:  /dev/adventure?level=chapter-01-intro&autoplay=1

function AdventurePreview() {
  const params = useSearchParams();
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(params.get("autoplay") === "1");

  if (process.env.NODE_ENV === "production") notFound();

  const levelId = params.get("level") ?? "chapter-01-intro";
  const level = levelById(levelId);

  if (!level) {
    return (
      <div className="min-h-dvh p-8 text-xs" style={{ color: "var(--color-foreground)" }}>
        <div className="mb-4 tracking-[3px]" style={{ color: "var(--color-danger)" }}>
          UNKNOWN LEVEL: {levelId}
        </div>
        <ul>
          {ALL_LEVELS.map((l) => (
            <li key={l.id}>
              <a href={`/dev/adventure?level=${l.id}`} style={{ color: "var(--color-signal)" }}>
                {l.id}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (playing) {
    return (
      <AdventureLevel
        key={run}
        level={level}
        soundEnabled={params.get("sound") !== "0"}
        loopsEnabled={params.get("music") !== "0"}
        onComplete={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 text-xs" style={{ color: "var(--color-foreground)" }}>
      <div className="tracking-[4px]" style={{ color: "var(--color-dim)" }}>
        ADVENTURE PREVIEW · {level.id} · {level.objectives.length} OBJECTIVES · {level.guards.length} GUARDS
      </div>
      <button
        type="button"
        onClick={() => {
          setRun((r) => r + 1);
          setPlaying(true);
        }}
        className="border-2 bg-transparent px-8 py-3 font-[family-name:var(--font-display)] tracking-[4px]"
        style={{ borderColor: "var(--color-signal)", color: "var(--color-signal)" }}
      >
        PLAY LEVEL
      </button>
      <div className="flex flex-wrap justify-center gap-3 max-w-[720px]">
        {ALL_LEVELS.map((l) => (
          <a
            key={l.id}
            href={`/dev/adventure?level=${l.id}`}
            className="border px-3 py-1 tracking-[2px]"
            style={{
              borderColor: l.id === level.id ? "var(--color-signal)" : "var(--color-border)",
              color: l.id === level.id ? "var(--color-signal)" : "var(--color-dim)",
            }}
          >
            {l.id}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function AdventurePreviewPage() {
  return (
    <Suspense fallback={null}>
      <AdventurePreview />
    </Suspense>
  );
}
