import type { Page, Route } from "@playwright/test";
import { expect } from "@playwright/test";
import { SUPABASE_URL } from "./supabase-env";

/**
 * A signed-in player against a faked Supabase. /play requires Google sign-in,
 * so the mobile specs plant a session in localStorage and answer every
 * auth/REST call from memory: the real pages and save paths run end to end,
 * no real account or row is touched.
 *
 * The game save lives in `cloud.state` for the life of the page, so a reload
 * reads back what the game wrote (checkpoint resume is exercised for real).
 */

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export const PLAYER = { id: "mobile-player-1", email: "player@example.test", user_metadata: { full_name: "Mobile Player" } };

const HELLO_WORLD = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}';

/** Chapter 1, step 2 — the intro and the scaffold step already played. */
export function checkpointState(overrides: { code?: string } = {}) {
  return {
    progress: {
      version: 2,
      byLanguage: {
        go: {
          version: 1,
          currentAct: 1,
          currentChapter: 1,
          completedChapters: [],
          bossesDefeated: [],
          kiraVerdict: null,
          storyBranch: null,
          checkpointData: { chapter: 1, energy: 100, jeopardyCarryover: [] },
          resume: { chapterId: "chapter-01", stepIndex: 1, introDone: true, code: overrides.code ?? HELLO_WORLD },
        },
      },
    },
    stats: { xp: 65, level: 1, hearts: 3 },
    library: { entries: [] },
    settings: {
      language: "go",
      languageChosen: true,
      prologueSeen: true,
      pace: "study",
      tourCompleted: true,
      beginnerMode: false,
      soundEnabled: false,
      musicEnabled: false,
      vimModeEnabled: false,
      fontSize: 15,
      tutorialFontScale: 2,
      chatWidthPercent: 40,
    },
    meta: { savedAt: Date.now(), userId: PLAYER.id },
  };
}

function session() {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: PLAYER.id, exp, role: "authenticated", aud: "authenticated" })}.sig`;
  return {
    access_token: jwt,
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { aud: "authenticated", role: "authenticated", app_metadata: { provider: "google" }, created_at: new Date().toISOString(), ...PLAYER },
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

/** Sign the page in and serve its cloud save from `cloud.state`. */
export async function signIn(page: Page, cloud: { state: unknown } = { state: checkpointState() }) {
  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.startsWith("/auth/v1/user")) return json(route, session().user);
    if (path.startsWith("/auth/v1/")) return json(route, {});
    if (path === "/rest/v1/game_state") {
      if (req.method() === "GET") {
        const wantsObject = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
        const row = cloud.state ? { state: cloud.state } : null;
        return wantsObject ? json(route, row) : json(route, row ? [row] : []);
      }
      const body = req.postDataJSON();
      const row = Array.isArray(body) ? body[0] : body;
      if (row?.state) cloud.state = row.state;
      return route.fulfill({ status: 201, body: "" });
    }
    if (req.method() !== "GET") return route.fulfill({ status: 201, body: "" });
    return json(route, []);
  });
  // No live model calls from tests.
  await page.route("**/api/jev", (route) => json(route, { enabled: false }));
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    localStorage.setItem("signal_warmup_completed", "true");
  }, [STORAGE_KEY, JSON.stringify(session())] as const);
}

/**
 * Open /play signed in and get to the player's turn on the CODE tab: past the
 * consent banner, the resume screen, and Maya's narration.
 */
export async function openCodeTab(page: Page) {
  await page.goto("/play");
  // The Next.js dev-tools badge floats over the bottom-left of the screen in dev.
  await page.addStyleTag({ content: "nextjs-portal{display:none !important;}" });
  const decline = page.getByRole("button", { name: "Decline", exact: true });
  if (await decline.isVisible().catch(() => false)) await decline.click();

  await page.getByRole("button", { name: /CONTINUE · STEP/ }).click();

  const panels = page.getByRole("navigation", { name: "Game panels" });
  await panels.waitFor();
  const editor = page.locator("textarea").first();
  const cont = page.getByRole("button", { name: /^continue/i }).first();
  await expect(async () => {
    if (await cont.isVisible().catch(() => false)) await cont.click();
    expect(await editor.isEditable()).toBe(true);
  }).toPass({ timeout: 30_000 });

  await panels.getByRole("button", { name: "CODE", exact: true }).click();
  return { panels, editor };
}
