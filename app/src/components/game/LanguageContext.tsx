"use client";

// The language the player is learning, for components deep in the tree that
// render code (chat markdown, notes, debriefs) without threading a prop.

import { createContext, useContext, useEffect } from "react";
import type { LanguageId } from "@/types/game";
import { getLanguageService } from "@/lib/lang/registry";
import type { LanguageService } from "@/lib/lang/types";

const LanguageContext = createContext<LanguageId>("go");

export function LanguageProvider({ language, children }: { language: LanguageId; children: React.ReactNode }) {
  // Reskin the UI accent to the language being learned (globals.css [data-lang]).
  // Set on <html> so fixed overlays and portals (debrief, modals) theme too.
  useEffect(() => {
    document.documentElement.dataset.lang = language;
    return () => {
      delete document.documentElement.dataset.lang;
    };
  }, [language]);

  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageId {
  return useContext(LanguageContext);
}

export function useLanguageService(): LanguageService {
  return getLanguageService(useContext(LanguageContext));
}
