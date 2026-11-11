// Boss 3 (KIRA · ALLEGIANCE) end to end: mark lines, explain, reject, redeem.
//   node test-visual/capture-kira.mjs http://localhost:3123 /tmp/kira [go|python|javascript] [compact]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3123";
const out = process.argv[3] ?? "/tmp/kira";
const lang = process.argv[4] ?? "go";
const compact = process.argv[5] === "compact";

const SUSPECT = { go: [2, 3], python: [3, 4], javascript: [2, 3] };
const FIX = {
  go: `package main

import "fmt"

func transmitSafe(data []byte, ch chan<- []byte) {
	for i := range data {
		data[i] ^= 0xFF
		frame := make([]byte, len(data)-i)
		copy(frame, data[i:])
		ch <- frame
	}
}

func main() {
	fmt.Println("ok")
}
`,
  python: `def transmit_safe(data, ch):
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(bytes(data[i:]))
`,
  javascript: `function transmitSafe(data, ch) {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= 0xff;
    ch.push(data.slice(i));
  }
}
`,
};

const browser = await chromium.launch({ args: ["--headless=new"] });
const page = await browser.newPage(compact ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE[error]:", m.text().slice(0, 300)); });
const shot = (n) => page.screenshot({ path: `${out}/${lang}${compact ? "-m" : ""}-${n}.png` });

await page.goto(`${base}/dev/kira?lang=${lang}${compact ? "&compact=1" : ""}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Decline" }).click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(8000); // Kira, then Reeves on the log
await shot("01-study");

// A wrong mark first, then the right ones.
const lines = page.locator("[data-testid=allegiance-boss] pre button");
await lines.nth(0).click();
await page.getByRole("button", { name: /SUBMIT MARKS/ }).click();
await page.waitForTimeout(400);
await shot("02-wrong-mark");
await lines.nth(0).click();
for (const i of SUSPECT[lang]) await lines.nth(i).click();
await shot("03-marked");
await page.getByRole("button", { name: /SUBMIT MARKS/ }).click();
await page.waitForTimeout(600);
await shot("04-verdict");

await page.locator("#kira-explanation").fill(
  "every frame she sends points at the same bytes, and she keeps flipping those bytes after sending, so nothing already sent stays true. she never makes a copy.",
);
await page.getByRole("button", { name: "REJECT KIRA" }).click();
await page.waitForTimeout(800);
await shot("05-redeem-offer");

await page.getByRole("button", { name: /SHOW HER HOW/ }).click();
await page.waitForTimeout(800);
await page.locator("textarea").first().fill(FIX[lang]);
await shot("06-redeem");
await page.getByRole("button", { name: /TRANSMIT/ }).first().click();
await page.waitForTimeout(lang === "python" ? 15000 : 6000);
await shot("07-redeemed");
await page.waitForTimeout(2500);
await page.waitForTimeout(8000); // twist lines type in
await shot("08-twist");
await page.getByRole("button", { name: /CONTINUE/ }).click();
await page.waitForTimeout(500);
console.log("result:", await page.locator("[data-testid=kira-result]").innerText().catch(() => "(none)"));
await browser.close();
