// Dev probe: prints sim + camera state over time while scripting input.
//   node test-visual/probe-adventure.mjs boss-01-intro
import { chromium } from "@playwright/test";
const levelId = process.argv[2] ?? "boss-01-intro";
const out = process.argv[3] ?? null;
let shotN = 0;
const browser = await chromium.launch({ args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
await page.goto(`http://localhost:3131/dev/adventure?level=${levelId}&autoplay=1&sound=0`, { waitUntil: "networkidle" });
const read = () => page.evaluate(() => {
  const a = window.__adventure; if (!a) return null;
  const s = a.sim;
  return { t: Math.round(s.time), status: s.status, obj: s.objectiveIndex, maya: [s.maya.x.toFixed(2), s.maya.y.toFixed(2)], anim: s.maya.anim, path: s.maya.path?.length ?? null, inter: !!s.interaction, alert: s.alert.toFixed(2), cam: Object.fromEntries(Object.entries(a.cam).map(([k, v]) => [k, +v.toFixed(2)])) };
});
const steps = [
  ["wait", 3300], ["down", "d"], ["wait", 600], ["up", "d"], ["down", "w"], ["wait", 500], ["up", "w"], ["wait", 400],
  ["down", "q"], ["wait", 500], ["up", "q"], ["wait", 300], ["click", [700, 430]], ["wait", 1600], ["wait", 3000],
];
for (const [kind, arg] of steps) {
  if (kind === "wait") await page.waitForTimeout(arg);
  else if (kind === "down") await page.keyboard.down(arg);
  else if (kind === "up") await page.keyboard.up(arg);
  else if (kind === "click") await page.mouse.click(arg[0], arg[1]);
  console.log(kind, JSON.stringify(arg), JSON.stringify(await read()));
  if (out && kind === "wait") await page.screenshot({ path: `${out}/${levelId}-probe-${String(shotN++).padStart(2, "0")}.png` });
}
await browser.close();
