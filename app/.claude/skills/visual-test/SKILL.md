---
name: visual-test
description: How to visually validate scenes, characters, and animations using the Playwright screenshot pipeline
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Visual Validation in SIGNAL

Every sprite art change MUST be verified through the Playwright screenshot pipeline. This is the visual equivalent of a unit test — it catches proportion errors, missing props, broken animations, and rendering regressions.

## Pipeline Overview

```
test-visual/
├── render-scene.html    # HTML with labeled canvases
├── render-scene.ts      # Renders scenes + characters into canvases
├── visual.spec.ts       # Playwright test — opens page, waits, screenshots
└── screenshot.png       # Output — inspect this after every run
```

**Run:** `npx playwright test test-visual/visual.spec.ts`
**Output:** `test-visual/screenshot.png`

The test uses Vite to serve `render-scene.html`, which imports from `src/lib/sprites/*` directly. The page sets `document.title = "RENDERED"` when done — Playwright waits for this signal.

## What Gets Rendered

The screenshot currently includes:

| Canvas | Size | What it shows |
|---|---|---|
| `cell` | 640x420 | Cell B-09 background only |
| `corridor` | 640x420 | Corridor background only |
| `chase` | 640x420 | Chase (alarm corridor) background only |
| `server` | 640x420 | Server room background only |
| `composite` | 640x420 | Maya + Guard standing in cell scene with debug floor line |
| `maya` | 160x256 | Maya idle frame 0, standalone |
| `guard` | 160x256 | Guard idle frame 0, standalone |
| `maya-walk` | 960x256 | Maya walk-right, all 8 frames in strip |
| `guard-walk` | 960x256 | Guard walk-right, all 8 frames in strip |

## Adding a New Visual Test

### New scene type

1. Add a canvas to `render-scene.html`:
```html
<div>
  <div class="label">NEW SCENE (640x420)</div>
  <canvas id="new-scene" width="640" height="420"></canvas>
</div>
```

2. Add the render call in `render-scene.ts`:
```typescript
// Inside the scene loop — add the type to the array:
for (const type of ["cell", "corridor", "chase", "server", "new-scene"] as const) {
```

### New character or animation state

Add a frame strip canvas (width = frames x 120, height = 256):

```html
<div>
  <div class="label">MAYA RUN CYCLE (8 frames)</div>
  <canvas id="maya-run" width="960" height="256"></canvas>
</div>
```

```typescript
try {
  const frames = paintMayaFrames("run-right", 3);
  const canvas = document.getElementById("maya-run") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080e16";
  ctx.fillRect(0, 0, 960, 256);
  frames.forEach((f, i) => {
    ctx.drawImage(f, i * 120, 0);
    ctx.fillStyle = "#6effa0";
    ctx.font = "9px monospace";
    ctx.fillText(`F${i}`, i * 120 + 2, 250);
  });
} catch (e) {
  console.error("Error painting maya run:", e);
}
```

### Composite grounding test

When adding characters to a new scene, always render a composite with a debug floor line:

```typescript
const bg = paintScene("new-scene", W, H);
const mayaFrames = paintMayaFrames("idle", 3);

const ctx = compCanvas.getContext("2d")!;
ctx.drawImage(bg, 0, 0);

// Debug floor line
const floorY = Math.floor(H * 0.50); // match scene's wallBotY ratio
ctx.strokeStyle = "rgba(110,255,160,0.3)";
ctx.setLineDash([4, 4]);
ctx.beginPath();
ctx.moveTo(0, floorY);
ctx.lineTo(W, floorY);
ctx.stroke();
ctx.setLineDash([]);

// Character with feet anchored at floor + offset
const feetY = floorY + 60;
const mf = mayaFrames[0];
ctx.drawImage(mf, charX - mf.width / 2, feetY - mf.height);
```

## Validation Checklist

After every `npx playwright test test-visual/visual.spec.ts`, open `test-visual/screenshot.png` and verify:

### Scenes
- [ ] All scene canvases render (no blank/black canvases)
- [ ] Layer order correct: infrastructure > ceiling > wall > floor > props > lighting
- [ ] Props visible and not lost in background colors
- [ ] Lighting effects present (light cones, glow, rays)
- [ ] No color banding or harsh gradients

### Character Proportions (composite)
- [ ] Characters grounded on floor — feet at floor line, not floating
- [ ] Character height reasonable relative to props (locker ~= character height, table = waist-high)
- [ ] Head-to-body ratio natural (~1:4 for pixel art)
- [ ] Arms and legs visible, not clipped

### Walk Cycle (frame strips)
- [ ] All 8 frames render distinctly — no duplicate poses
- [ ] Visible body bob: frames 1,5 (Down) lower than frames 3,7 (Up)
- [ ] Legs alternate: right forward in frames 0-3, left forward in frames 4-7
- [ ] Arms counter-rotate to legs
- [ ] Passing frames (2,6) show trailing knee lift
- [ ] No limbs "popping" — transitions between adjacent frames should be smooth

### Guard
- [ ] Red visor glowing
- [ ] Bulkier than Maya (wider shoulders, armor plates)
- [ ] Walk cycle matches Maya's quality

## Integration with Level Development

When authoring a new chapter that introduces a new scene or character state:

1. **Before coding the scene definition in `scenes.ts`**: paint the background and verify via screenshot
2. **Before wiring into PixiScene**: composite-test the character at the intended floor position
3. **Before shipping**: walk-cycle strip must show natural motion for any walking actors

Reference the `sprite-art` skill for painting conventions (palette, layer order, prop sizing, walk cycle poses).

## Troubleshooting

**Blank canvas:** Check the console output in the test — errors are logged with `console.error`. Usually a missing export or wrong function signature.

**"No tests found":** The spec file is `visual.spec.ts`, not `screenshot.spec.ts`.

**Props disappear at game resolution:** The visual test paints at 640x420 but in-game scenes are 1040x600 (viewport + padding). Props using fixed pixel sizes will be undersized at larger resolution. Always use proportional sizing (`ch * multiplier`).

**Character floating in-game but grounded in test:** Scene coordinates differ. The visual test is direct pixel placement. In PixiScene, `actor.y` is in scene coordinates (1040x600), and the sprite anchor is at feet `(0.5, 1)`. Double-check `scenes.ts` actor positions against the scene's floor `wallBotY` ratio.
