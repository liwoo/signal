// ── Language registry ──
// Resolve a LanguageService by id. Consumers never import lib/go/* (or any
// other language) directly — they ask the registry.

import type { LanguageId } from "@/types/game";
import { LANGUAGE_IDS } from "@/types/game";
import type { LanguageService } from "./types";
import { goService } from "./go";
import { javascriptService } from "./javascript";
import { pythonService } from "./python";

const SERVICES: Record<LanguageId, LanguageService> = {
  go: goService,
  python: pythonService,
  javascript: javascriptService,
};

export function getLanguageService(id: LanguageId | undefined): LanguageService {
  return SERVICES[id ?? "go"] ?? goService;
}

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === "string" && (LANGUAGE_IDS as readonly string[]).includes(value);
}

export interface LanguageOption {
  id: LanguageId;
  label: string;
  /** One-line pitch for the picker. */
  blurb: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "go", label: "GO", blurb: "compiled, strict, fast. the original route." },
  { id: "python", label: "PYTHON", blurb: "readable and everywhere. no braces, just indentation." },
  { id: "javascript", label: "JAVASCRIPT", blurb: "the language of the web. runs right here in your browser." },
];
