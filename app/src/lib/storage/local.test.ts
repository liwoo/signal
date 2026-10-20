import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGameDraft, loadGameDraft, saveGameDraft } from "./local";
import type { GameDraft } from "@/types/game";

// A minimal in-memory localStorage so the draft helpers have something to write
// to under the default node test environment.
function installMemoryStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

function draft(overrides: Partial<GameDraft> = {}): GameDraft {
  return {
    version: 1,
    challengeId: "chapter-03",
    language: "go",
    stepId: "chapter-03:validate",
    stepIndex: 2,
    code: "package main",
    attempts: 1,
    updatedAt: 123,
    ...overrides,
  };
}

describe("game draft storage", () => {
  beforeEach(() => installMemoryStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips a saved draft", () => {
    const d = draft();
    saveGameDraft(d);
    expect(loadGameDraft("chapter-03", "go")).toEqual(d);
  });

  it("returns null when nothing is saved", () => {
    expect(loadGameDraft("chapter-03", "go")).toBeNull();
  });

  it("keeps drafts for the same chapter isolated per language", () => {
    saveGameDraft(draft({ language: "go", code: "package main" }));
    saveGameDraft(draft({ language: "javascript", code: "const x = 1" }));

    expect(loadGameDraft("chapter-03", "go")?.code).toBe("package main");
    expect(loadGameDraft("chapter-03", "javascript")?.code).toBe("const x = 1");
    // A language the player never touched has no draft to resume.
    expect(loadGameDraft("chapter-03", "python")).toBeNull();
  });

  it("clears only the targeted language's draft", () => {
    saveGameDraft(draft({ language: "go" }));
    saveGameDraft(draft({ language: "javascript" }));

    clearGameDraft("chapter-03", "go");

    expect(loadGameDraft("chapter-03", "go")).toBeNull();
    expect(loadGameDraft("chapter-03", "javascript")).not.toBeNull();
  });
});
