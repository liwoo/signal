// Teacher console + class join flow in a real browser, against a faked Supabase:
// a signed-in session is planted in localStorage and every REST/RPC call is
// answered from fixtures, so the real pages and data paths render end to end.
//
//   NEXT_PUBLIC_SUPABASE_URL=https://fakeproj.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3177
//   node test-visual/capture-classroom.mjs http://localhost:3177 <outdir>
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3177";
const out = process.argv[3] ?? "/tmp/classroom";
const SUPABASE = "https://fakeproj.supabase.co";
const STORAGE_KEY = "sb-fakeproj-auth-token";

const NOW = Date.now();
const ago = (mins) => new Date(NOW - mins * 60_000).toISOString();
const H = 60;
const D = 24 * H;

const TEACHER = { id: "t-1", email: "ms.okafor@lincoln.edu", user_metadata: { full_name: "Ms Okafor" } };
const STUDENT = { id: "s-new", email: "jordan@lincoln.edu", user_metadata: { full_name: "Jordan Lee" } };

function session(user) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(NOW / 1000) + 3600;
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", aud: "authenticated" })}.sig`;
  return {
    access_token: jwt,
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { aud: "authenticated", role: "authenticated", app_metadata: { provider: "google" }, created_at: ago(30 * D), ...user },
  };
}

const CLASSES = [
  { id: "c-1", teacher_id: TEACHER.id, name: "Period 3 · Intro to CS", join_code: "K7QM4P", joining_open: true, created_at: ago(14 * D) },
  { id: "c-2", teacher_id: TEACHER.id, name: "After-school code club", join_code: "R2XW9H", joining_open: false, created_at: ago(40 * D) },
];

const progress = (lang, chapters) => ({ [lang]: { version: 1, currentAct: 1, currentChapter: chapters.length + 1, completedChapters: chapters, bossesDefeated: [], kiraVerdict: null, storyBranch: null, checkpointData: { chapter: 1, energy: 100, jeopardyCarryover: [] } } });
const state = (lang, byLanguage, xp, zen = 0) => ({
  progress: { version: 2, byLanguage },
  stats: { xp, level: 1 + Math.floor(xp / 300), hearts: 3 },
  settings: { language: lang },
  library: { entries: Array.from({ length: zen }, (_, i) => ({ id: `z${i}`, principle: "", learned: i % 3 !== 0, jolt: "", suggestion: "", stepId: "x", bonusXP: 5 })) },
});
const ev = (kind, mins, chapter, step, data = {}, language = "go") => ({ kind, language, chapter_id: chapter, step_id: step, data, created_at: ago(mins) });
const fails = (n, startMins, chapter, step, language = "go") =>
  Array.from({ length: n }, (_, i) => ev("submit", startMins + i * 3, chapter, step, { success: false, attempt: n - i }, language));

const STUDENTS = [
  { id: "s-1", name: "Amara Okonkwo", email: "amara@lincoln.edu", joined: 13 * D, state: state("go", progress("go", [1, 2, 3, 4]), 1460, 9), events: [ev("step_complete", 12, "chapter-04", "chapter-04:guardmap", { xp: 120 }), ev("submit", 13, "chapter-04", "chapter-04:guardmap", { success: true, attempt: 2 }), ev("chapter_start", 40, "chapter-04", null), ...Array.from({ length: 10 }, (_, i) => ev("submit", (i + 1) * D * 0.9 + 60, "chapter-03", "chapter-03:sumfunc", { success: i % 2 === 0, attempt: 1 }))] },
  { id: "s-2", name: "Diego Ramírez", email: "diego.r@lincoln.edu", joined: 13 * D, state: state("go", progress("go", [1, 2]), 610, 5), events: [...fails(7, 4, "chapter-03", "chapter-03:sumfunc"), ev("hint", 26, "chapter-03", "chapter-03:sumfunc", { level: 2 }), ev("hint", 28, "chapter-03", "chapter-03:sumfunc", { level: 1 }), ev("step_complete", 50, "chapter-03", "chapter-03:scaffold", { xp: 60 })] },
  { id: "s-3", name: "Priya Natarajan", email: "priya.n@lincoln.edu", joined: 12 * D, state: state("python", progress("python", [1, 2, 3, 4]), 1320, 8), events: [ev("chapter_complete", 2 * H, "boss-01", null, {}, "python"), ...Array.from({ length: 14 }, (_, i) => ev("submit", (i + 1) * 13 * H, "chapter-03", "chapter-03:validate", { success: true, attempt: 1 }, "python"))] },
  { id: "s-4", name: "Sam Whitfield", email: "sam.w@lincoln.edu", joined: 12 * D, state: state("go", progress("go", [1]), 240, 2), events: [ev("submit", 9 * D, "chapter-02", "chapter-02:loop", { success: false, attempt: 1 }), ev("chapter_start", 9 * D + 20, "chapter-02", null)] },
  { id: "s-5", name: "Lena Fischer", email: "lena.f@lincoln.edu", joined: 11 * D, state: null, events: [] },
  { id: "s-6", name: "Kwame Asante", email: "kwame@lincoln.edu", joined: 11 * D, state: state("javascript", progress("javascript", [1, 2]), 520, 4), events: [ev("submit", 35, "chapter-03", "chapter-03:scaffold", { success: false, attempt: 1 }, "javascript"), ev("step_complete", 3 * H, "chapter-02", "chapter-02:classify", { xp: 90 }, "javascript"), ev("submit", D + 60, "chapter-02", "chapter-02:loop", { success: true, attempt: 1 }, "javascript")] },
  { id: "s-7", name: "Hana Sato", email: "hana.sato@lincoln.edu", joined: 10 * D, state: state("go", progress("go", [1, 2, 3, 4, 5, 6]), 2480, 14), events: [ev("chapter_complete", 5 * H, "chapter-04.2", "chapter-04.2:relayheader", { xp: 200 })] },
  { id: "s-8", name: "Tomás Silva", email: "tomas@lincoln.edu", joined: 2 * D, state: state("go", progress("go", []), 80, 0), events: [ev("submit", 20, "chapter-01", "chapter-01:scaffold", { success: false, attempt: 3 }), ...fails(2, 22, "chapter-01", "chapter-01:scaffold"), ev("chapter_start", 40, "chapter-01", null)] },
];

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

const TEACHER_ROW = { id: TEACHER.id, full_name: "Ms. Adaeze Okafor", school: "Lincoln High School", verified: false, created_at: ago(20 * D) };

async function fakeSupabase(page, user, { teacherAccount = null } = {}) {
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const sel = url.searchParams.get("select") ?? "";
    if (p.startsWith("/auth/v1/user")) return json(route, session(user).user);
    if (p.startsWith("/auth/v1/")) return json(route, {});
    if (p === "/rest/v1/profiles" && req.method() !== "GET") return route.fulfill({ status: 201, body: "" });
    if (p === "/rest/v1/progress_events" && req.method() === "POST") return route.fulfill({ status: 201, body: "" });
    if (p === "/rest/v1/teachers") {
      if (req.method() === "POST") {
        const row = { ...TEACHER_ROW, ...JSON.parse(req.postData() ?? "{}") };
        teacherAccount = row; // later loads see the new account
        const wantsObject = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
        return json(route, wantsObject ? row : [row], 201);
      }
      if (url.searchParams.get("id")?.startsWith("in.")) return json(route, [{ id: "t-9", full_name: "Mr. Haddad", school: "Lincoln High School" }]);
      // .maybeSingle() may ask for an object (vnd.pgrst.object) or a plain array.
      const wantsObject = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
      if (wantsObject) {
        return teacherAccount ? json(route, teacherAccount) : route.fulfill({ status: 406, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", details: "The result contains 0 rows", message: "JSON object requested, multiple (or no) rows returned" }) });
      }
      return json(route, teacherAccount ? [teacherAccount] : []);
    }
    if (p === "/rest/v1/classrooms") return json(route, CLASSES);
    if (p === "/rest/v1/classroom_members") {
      if (sel === "classroom_id") return json(route, [...STUDENTS.map(() => ({ classroom_id: "c-1" })), ...Array(5).fill({ classroom_id: "c-2" })]);
      if (sel.startsWith("joined_at")) return json(route, [{ joined_at: ago(30 * D), classrooms: { id: "c-9", name: "Robotics elective", teacher_id: "t-9" } }]);
      return json(route, STUDENTS.map((s) => ({ student_id: s.id, joined_at: ago(s.joined) })));
    }
    if (p === "/rest/v1/profiles") {
      if (url.searchParams.get("id")?.includes("t-9")) return json(route, [{ id: "t-9", display_name: "Mr Haddad" }]);
      return json(route, STUDENTS.map((s) => ({ id: s.id, display_name: s.name, email: s.email, avatar_url: null })));
    }
    if (p === "/rest/v1/game_state") {
      return json(route, STUDENTS.filter((s) => s.state).map((s) => ({ user_id: s.id, state: s.state, updated_at: s.events[0]?.created_at ?? ago(3 * D) })));
    }
    if (p === "/rest/v1/progress_events") {
      return json(route, STUDENTS.flatMap((s) => s.events.map((e) => ({ user_id: s.id, ...e }))).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    if (p === "/rest/v1/rpc/classroom_preview") {
      return json(route, [{ classroom_id: "c-1", name: CLASSES[0].name, teacher_name: "Ms. Adaeze Okafor", teacher_school: "Lincoln High School", joining_open: true, already_member: false, is_teacher: false, caller_is_teacher: false }]);
    }
    if (p === "/rest/v1/rpc/join_classroom") return json(route, "c-1");
    console.log("UNHANDLED", req.method(), p, sel);
    return json(route, []);
  });
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(session(user))]);
}

const browser = await chromium.launch();

async function newPage(viewport, user, opts = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme: opts.colorScheme ?? "light" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
  if (user) await fakeSupabase(page, user, opts);
  return page;
}

// Signed out: the teacher sign-in.
{
  const page = await newPage({ width: 1280, height: 800 });
  await page.goto(`${base}/teach`, { waitUntil: "networkidle" });
  await page.getByText("Teacher sign in").waitFor();
  await page.screenshot({ path: `${out}/teach-signed-out.png` });
}

// Signed in, no teacher account yet: onboarding.
{
  const page = await newPage({ width: 1280, height: 900 }, TEACHER, { teacherAccount: null });
  await page.goto(`${base}/teach`, { waitUntil: "networkidle" });
  await page.getByText("Create your teacher account").waitFor({ timeout: 20000 });
  await page.getByLabel("School or organization").fill("Lincoln High School");
  await page.getByRole("checkbox").check();
  await page.screenshot({ path: `${out}/teach-onboarding.png` });
  await page.getByRole("button", { name: "Create teacher account" }).click();
  await page.getByText("Diego Ramírez").waitFor({ timeout: 20000 });
  console.log("onboarding → dashboard ok");
}

// Teacher console.
{
  const page = await newPage({ width: 1440, height: 1000 }, TEACHER, { teacherAccount: TEACHER_ROW });
  await page.goto(`${base}/teach`, { waitUntil: "networkidle" });
  await page.getByText("Diego Ramírez").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/teach-dashboard.png`, fullPage: true });

  await page.getByText("Shaft Codes").first().hover();
  await page.screenshot({ path: `${out}/teach-chart-hover.png` });

  await page.getByText("Diego Ramírez").click();
  await page.getByText("Recent activity").waitFor();
  await page.screenshot({ path: `${out}/teach-student-detail.png` });
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: /^Stuck/ }).click();
  await page.screenshot({ path: `${out}/teach-filter-stuck.png` });

  await page.getByRole("button", { name: "Class settings" }).click();
  await page.screenshot({ path: `${out}/teach-menu.png` });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Invite students" }).first().click();
  await page.getByText("Invite link").waitFor();
  await page.screenshot({ path: `${out}/teach-invite.png` });
  await page.getByRole("button", { name: "Show on projector" }).click();
  await page.screenshot({ path: `${out}/teach-project.png` });
}

// Dark mode.
{
  const page = await newPage({ width: 1440, height: 1000 }, TEACHER, { teacherAccount: TEACHER_ROW, colorScheme: "dark" });
  await page.goto(`${base}/teach`, { waitUntil: "networkidle" });
  await page.getByText("Diego Ramírez").waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/teach-dark.png` });
}

// Mobile teacher console.
{
  const page = await newPage({ width: 390, height: 844 }, TEACHER, { teacherAccount: TEACHER_ROW });
  await page.goto(`${base}/teach`, { waitUntil: "networkidle" });
  await page.getByText("Diego Ramírez").waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/teach-mobile.png` });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.screenshot({ path: `${out}/teach-mobile-nav.png` });
  await page.keyboard.press("Escape");
  await page.getByText("Diego Ramírez").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/teach-mobile-roster.png` });
}

// Student join flow.
{
  const signedOut = await newPage({ width: 390, height: 844 });
  await signedOut.goto(`${base}/join/k7qm4p`, { waitUntil: "networkidle" });
  await signedOut.getByText("CLASS CODE K7QM4P").waitFor();
  await signedOut.screenshot({ path: `${out}/join-signed-out.png` });

  const page = await newPage({ width: 390, height: 844 }, STUDENT);
  await page.goto(`${base}/join/K7QM4P`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "JOIN CLASS" }).waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/join-confirm.png`, fullPage: true });
  await page.getByRole("button", { name: "JOIN CLASS" }).click();
  await page.getByText("YOU'RE IN").waitFor();
  await page.screenshot({ path: `${out}/join-done.png`, fullPage: true });

  await page.goto(`${base}/join`, { waitUntil: "networkidle" });
  await page.getByLabel(/6-character code/).waitFor();
  await page.screenshot({ path: `${out}/join-enter-code.png`, fullPage: true });
}

await browser.close();
console.log("done →", out);
