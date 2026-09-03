"use client";

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { CinematicScene } from "@/components/story/CinematicScene";
import * as scenes from "@/lib/sprites/scenes";
import type { SceneDefinition } from "@/lib/sprites/scenes";

// Development-only cinematic preview. Plays any exported sequence from
// scenes.ts without touching game state, so shots can be authored and
// screenshot without playing through a chapter:
//   /dev/cinematic?seq=CHAPTER_01_COMPLETE_SCENES&title=CHAPTER%201%20COMPLETE

const SEQUENCES = Object.fromEntries(
  Object.entries(scenes).filter(([, v]) => Array.isArray(v)),
) as Record<string, SceneDefinition[]>;

function CinematicPreview() {
  const params = useSearchParams();
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (process.env.NODE_ENV === "production") notFound();

  const seqName = params.get("seq") ?? "INTRO_SCENES";
  const sequence = SEQUENCES[seqName];
  const title = params.get("title") ?? seqName.replace(/_SCENES$/, "").replace(/_/g, " ");
  const subtitle = params.get("subtitle") ?? "PREVIEW";

  if (!sequence) {
    return (
      <div className="min-h-dvh p-8 text-xs" style={{ color: "var(--color-foreground)" }}>
        <div className="mb-4 tracking-[3px]" style={{ color: "var(--color-danger)" }}>
          UNKNOWN SEQUENCE: {seqName}
        </div>
        <ul>
          {Object.keys(SEQUENCES).map((name) => (
            <li key={name}>
              <a href={`/dev/cinematic?seq=${name}`} style={{ color: "var(--color-signal)" }}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (playing) {
    return (
      <CinematicScene
        key={run}
        scenes={sequence}
        title={title}
        subtitle={subtitle}
        onComplete={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 text-xs" style={{ color: "var(--color-foreground)" }}>
      <div className="tracking-[4px]" style={{ color: "var(--color-dim)" }}>
        CINEMATIC PREVIEW · {seqName} · {sequence.length} SHOTS
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
        PLAY SEQUENCE
      </button>
      <div className="flex flex-wrap justify-center gap-3 max-w-[720px]">
        {Object.keys(SEQUENCES).map((name) => (
          <a
            key={name}
            href={`/dev/cinematic?seq=${name}`}
            className="text-[9px] tracking-[2px]"
            style={{ color: name === seqName ? "var(--color-signal)" : "var(--color-dim)" }}
          >
            {name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CinematicPreviewPage() {
  return (
    <Suspense fallback={null}>
      <CinematicPreview />
    </Suspense>
  );
}
