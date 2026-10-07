// Field manual capture: cover, reader spreads, and the phone layout.
//   node test-visual/capture-book.mjs http://localhost:3131 <outdir> chapter-03
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/book";
const chapter = process.argv[4] ?? "chapter-03";
const browser = await chromium.launch({ args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
await page.goto(`${base}/dev/book?chapter=${chapter}&cover=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/book-cover.png` });
await page.goto(`${base}/dev/book?chapter=${chapter}&sound=0`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/book-spread-0.png` });
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/book-spread-1.png` });
// Open a footnote if a hotspot is on the page.
const hot = page.locator(".book-hotspot").first();
if (await hot.count()) { await hot.click(); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/book-spread-1-footnote.png` }); }
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/book-spread-2.png` });
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await phone.goto(`${base}/dev/book?chapter=${chapter}&sound=0`, { waitUntil: "networkidle" });
await phone.waitForTimeout(900);
await phone.screenshot({ path: `${out}/book-phone-0.png` });
await phone.getByRole("button", { name: /TURN THE PAGE/ }).tap();
await phone.waitForTimeout(800);
await phone.getByRole("button", { name: /TURN THE PAGE/ }).tap();
await phone.waitForTimeout(800);
await phone.screenshot({ path: `${out}/book-phone-2.png` });
await browser.close();
