import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const ctrl = { configured: true, reject: false };
  const client = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return ctrl.reject ? Promise.reject(new Error("offline")) : Promise.resolve({ error: null });
      },
    }),
  };
  return { inserts, ctrl, client };
});

vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => (mocks.ctrl.configured ? mocks.client : null) }));

import { recordActivity, setActivityUser } from "./activity";

beforeEach(() => {
  mocks.inserts.length = 0;
  mocks.ctrl.configured = true;
  mocks.ctrl.reject = false;
  setActivityUser(null);
});

describe("recordActivity", () => {
  it("drops events when nobody is signed in", () => {
    recordActivity({ kind: "submit", language: "go", chapterId: "chapter-01" });
    expect(mocks.inserts).toHaveLength(0);
  });

  it("drops events when Supabase isn't configured", () => {
    setActivityUser("u1");
    mocks.ctrl.configured = false;
    recordActivity({ kind: "submit", language: "go", chapterId: "chapter-01" });
    expect(mocks.inserts).toHaveLength(0);
  });

  it("writes a progress_events row for the signed-in user", () => {
    setActivityUser("u1");
    recordActivity({ kind: "submit", language: "python", chapterId: "chapter-02", stepId: "chapter-02:loop", data: { success: false, attempt: 3 } });
    expect(mocks.inserts).toEqual([
      {
        table: "progress_events",
        row: { user_id: "u1", kind: "submit", language: "python", chapter_id: "chapter-02", step_id: "chapter-02:loop", data: { success: false, attempt: 3 } },
      },
    ]);
  });

  it("defaults step and data, and swallows network failures", async () => {
    setActivityUser("u1");
    mocks.ctrl.reject = true;
    expect(() => recordActivity({ kind: "chapter_start", language: "go", chapterId: "chapter-01" })).not.toThrow();
    expect(mocks.inserts[0].row).toMatchObject({ step_id: null, data: {} });
    await new Promise((r) => setTimeout(r, 0)); // an unhandled rejection would fail the run
  });
});
