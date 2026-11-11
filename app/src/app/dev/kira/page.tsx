"use client";

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { AllegianceBoss, type AllegianceResult } from "@/components/boss/allegiance/AllegianceBoss";
import { LanguageProvider } from "@/components/game/LanguageContext";
import type { LanguageId } from "@/types/game";

// Development-only: /dev/kira?lang=python → the Act III judgment boss without
// game state or sign-in. The result is shown when the twist finishes.

function Preview() {
  const params = useSearchParams();
  const language = (params.get("lang") as LanguageId | null) ?? "go";
  const compact = params.get("compact") === "1";
  const [result, setResult] = useState<AllegianceResult | null>(null);
  const [run, setRun] = useState(0);
  if (result) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 text-[var(--color-foreground)]">
        <pre className="text-[13px]" data-testid="kira-result">{JSON.stringify(result, null, 2)}</pre>
        <button type="button" className="border border-[var(--color-dim)] px-4 py-2 text-[11px] tracking-[3px] bg-transparent" onClick={() => { setResult(null); setRun((n) => n + 1); }}>
          AGAIN
        </button>
      </div>
    );
  }
  return (
    <LanguageProvider language={language}>
      <AllegianceBoss key={run} language={language} compact={compact} soundEnabled={false} loopsEnabled={false} vimEnabled={false} onFinish={setResult} />
    </LanguageProvider>
  );
}

export default function KiraPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
