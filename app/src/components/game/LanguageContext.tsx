"use client";

// The language the player is learning, for components deep in the tree that
// render code (chat markdown, notes, debriefs) without threading a prop.

import { createContext, useContext } from "react";
import type { LanguageId } from "@/types/game";
import { getLanguageService } from "@/lib/lang/registry";
import type { LanguageService } from "@/lib/lang/types";

const LanguageContext = createContext<LanguageId>("go");

export function LanguageProvider({ language, children }: { language: LanguageId; children: React.ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageId {
  return useContext(LanguageContext);
}

export function useLanguageService(): LanguageService {
  return getLanguageService(useContext(LanguageContext));
}
