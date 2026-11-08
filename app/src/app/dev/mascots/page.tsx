"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { LanguageMascot } from "@/components/ui/LanguageMascot";
import { LanguagePicker } from "@/components/game/LanguagePicker";
import { LanguageProvider } from "@/components/game/LanguageContext";
import { TopBar } from "@/components/game/TopBar";
import { LANGUAGE_OPTIONS } from "@/lib/lang/registry";
import type { LanguageId } from "@/types/game";

// Development-only: /dev/mascots → every language mascot at HUD, picker and
// hero sizes, plus the intro-screen picker and the HUD badge they appear in
// (the real /play sits behind sign-in).

export default function MascotsPreview() {
  const [language, setLanguage] = useState<LanguageId>("python");
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LanguageProvider language={language}>
      <div className="min-h-dvh flex flex-col" style={{ background: "var(--color-background)" }}>
        <TopBar xp={120} xpMax={300} level={2} inRush={false} busy={false} hearts={3} />
        <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
          <div className="w-full max-w-[440px]">
            <LanguagePicker language={language} highlight={false} onChange={setLanguage} />
          </div>
          {[16, 40, 96].map((size) => (
            <div key={size} className="flex items-end gap-10">
              {LANGUAGE_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex flex-col items-center gap-2">
                  <LanguageMascot language={opt.id} size={size} />
                  <span className="text-[10px] tracking-[2px]" style={{ color: opt.accent }}>
                    {opt.label} · {size}px
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </LanguageProvider>
  );
}
