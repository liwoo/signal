// Run against next dev: node test-visual/capture-cinematic.mjs [base] [output]
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://localhost:3131';
const out = process.argv[3] ?? '../.context/cinematic';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push(e.message));
async function start(seq, shot = 0) {
  await page.goto(`${base}/dev/cinematic?seq=${seq}&shot=${shot}`);
  if (await page.getByRole('button', { name: 'Decline', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Decline', exact: true }).click();
  }
  await page.getByRole('button', { name: 'PLAY SEQUENCE' }).click();
  await page.getByRole('button', { name: 'NEXT SHOT' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('button[disabled]'));
  await page.locator('[data-cinematic-renderer="three"] canvas').waitFor();
}
await start('PROLOGUE_SCENES');
await page.waitForTimeout(1700);
await page.screenshot({ path: `${out}/01-lab.png` });
await start('PROLOGUE_SCENES', 2);
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/02-breach.png` });
await start('PROLOGUE_SCENES', 3);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/03-pursuit.png` });
await start('PROLOGUE_SCENES', 5);
await page.waitForTimeout(550);
await page.screenshot({ path: `${out}/04-cell.png` });
// Full playback completes and leaves no lingering canvas/context in the preview.
await start('PROLOGUE_SCENES', 6);
await page.getByRole('button', { name: 'PLAY SEQUENCE' }).waitFor({ timeout: 12000 });
assert.equal(await page.locator('canvas').count(), 0);
// WebGL context loss must recover to an actual Canvas 2D scene.
await start('INTRO_SCENES');
await page.evaluate(() => {
  const canvas = document.querySelector('[data-cinematic-renderer="three"] canvas');
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
});
await page.locator('canvas[aria-label="Story scene"]').waitFor();
assert.equal(await page.locator('[data-cinematic-renderer="three"]').count(), 0);
await page.screenshot({ path: `${out}/05-fallback.png` });
// Mobile and reduced-motion still show the film and retain touch controls.
await page.setViewportSize({ width: 390, height: 844 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await start('PROLOGUE_SCENES', 2);
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/06-mobile.png` });
await page.getByRole('button', { name: 'NEXT SHOT' }).click();
await page.waitForTimeout(350);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(350);
await page.getByRole('button', { name: 'NEXT SHOT' }).focus();
assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'NEXT SHOT →');
await page.keyboard.press('Enter');
// All remaining sets (including the actual Lockmaster reveal) render in 3D.
await page.setViewportSize({ width: 1440, height: 900 });
for (const [seq, shot, name] of [
  ['PROLOGUE_SCENES', 4, 'transit'],
  ['CHAPTER_02_INTRO_SCENES', 0, 'corridor'],
  ['CHAPTER_03_COMPLETE_SCENES', 0, 'vent'],
  ['CHAPTER_04_INTRO_SCENES', 0, 'server'],
  ['BOSS_01_INTRO_SCENES', 6, 'lockmaster'],
]) {
  await start(seq, shot);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}.png` });
}
// A browser that cannot create WebGL at all still plays and completes the film.
const unsupported = await browser.newPage();
unsupported.on('pageerror', e => errors.push(e.message));
await unsupported.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type.startsWith('webgl')) return null;
    return original.call(this, type, ...args);
  };
});
await unsupported.goto(`${base}/dev/cinematic?seq=PROLOGUE_SCENES&shot=6`);
await unsupported.getByRole('button', { name: 'PLAY SEQUENCE' }).click();
await unsupported.locator('canvas[aria-label="Story scene"]').waitFor();
await unsupported.getByRole('button', { name: 'PLAY SEQUENCE' }).waitFor({ timeout: 12000 });
await unsupported.close();
assert.deepEqual(errors, []);
console.log('PASS: all eight 3D sets, completion, cleanup, context-loss/unsupported fallbacks, mobile, reduced motion and keyboard.');
await browser.close();
