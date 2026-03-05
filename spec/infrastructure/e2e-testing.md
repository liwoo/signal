# E2E Testing Spec

## Purpose

Validate complete user flows through the game — from first load to chapter completion, across desktop and mobile viewports.

---

## Stack

| Tool | Role |
| --- | --- |
| Playwright | Browser automation, cross-browser testing |
| @playwright/test | Test runner with built-in assertions |

## Viewports

| Name | Width | Height | Device |
| --- | --- | --- | --- |
| Desktop | 1440 | 900 | Chrome |
| Tablet | 768 | 1024 | iPad (Safari WebKit) |
| Mobile | 375 | 812 | iPhone 13 (Safari WebKit) |
| Small Mobile | 320 | 568 | iPhone SE |

## Test Suites

### 1. Onboarding & First Load

- [ ] Game loads and displays intro screen
- [ ] Intro transitions to Chapter 1 on start
- [ ] Maya's first message appears with typing animation
- [ ] HUD shows Level 1, 0 XP, 100 energy

### 2. Editor Interaction

- [ ] Code can be typed into the editor
- [ ] Line numbers display correctly
- [ ] Submit button sends code for evaluation
- [ ] Correct submission shows XP gain animation
- [ ] Wrong submission shows error feedback and energy drain
- [ ] Tab key inserts tab character (not focus change)
- [ ] Mobile: virtual keyboard opens on editor tap
- [ ] Mobile: TAB floating button appears above keyboard

### 3. Chapter Flow (Chapter 1 — Handshake)

- [ ] Chapter brief displayed
- [ ] Correct `fmt.Println` solution passes
- [ ] XP awarded (100 base)
- [ ] First-try bonus applied (+50%)
- [ ] Twist text appears after completion
- [ ] Transition to Chapter 2

### 4. Rush Mode

- [ ] Rush timer appears on story event trigger
- [ ] Timer counts down visually
- [ ] Solving before expiry awards speed bonus XP
- [ ] Timer expiry triggers jeopardy event
- [ ] Jeopardy effects apply (chat dim, editor shrink, etc.)
- [ ] Mobile: timer collapses to 3px strip when keyboard open

### 5. Chat System

- [ ] Messages send and appear in chat panel
- [ ] Maya responds (mocked LLM for E2E)
- [ ] Chapter advance triggers conversation fade
- [ ] Separator `NEW OBJECTIVE` appears
- [ ] Previous messages fade to 5% opacity (desktop)
- [ ] Previous messages hidden entirely (mobile)
- [ ] Chat input stays fixed above keyboard (mobile)

### 6. Energy System

- [ ] Energy bar displays in HUD
- [ ] Wrong submissions drain energy progressively (0, -5, -10, -15)
- [ ] Energy at 30% pulses amber
- [ ] Energy at 15% flashes red, screen dims
- [ ] Energy at 0% triggers chapter fail state
- [ ] Fail state shows retry prompt
- [ ] Retry starts at 30% energy with 50% jeopardy

### 7. Leveling & Unlocks

- [ ] XP accumulates across chapters
- [ ] Level up triggers notification
- [ ] Level 2: syntax highlighting activates (timed)
- [ ] Level 3: Vim mode toggle appears in toolbar
- [ ] Level 5: Black Market accessible via `> market` in chat

### 8. Boss Encounter (Lockmaster — Act I)

- [ ] Boss screen layout loads (timer + cycling code + editor)
- [ ] Cycling code updates every 3 seconds
- [ ] Correct prediction passes
- [ ] Wrong submission removes 10s from timer
- [ ] Timer at 0 triggers loss state
- [ ] Mobile: timer top 30%, editor bottom 70%

### 9. Persistence

- [ ] Complete chapter, refresh page -> resumes at next chapter
- [ ] XP, level, energy persist across refresh
- [ ] Chat messages clear on refresh (sessionStorage)
- [ ] Progress survives browser close and reopen (localStorage)

### 10. PWA

- [ ] Service worker registers
- [ ] Static assets cached
- [ ] App loads offline after first visit (with on-device AI)
- [ ] Manifest loads with correct display mode

### 11. Syntax Highlighting (Timed)

- [ ] Activates at Level 2
- [ ] Colours appear on Go code
- [ ] 5-minute timer counts down in toolbar
- [ ] 10-second warning pulses editor border orange
- [ ] Colours fade to monochrome over 3s on expiry
- [ ] Correct first-try submission adds 2 minutes

### 12. Vim Mode

- [ ] Toggle via `Ctrl+Alt+V` or toolbar button
- [ ] Mode indicator shows `[ NORMAL ]`
- [ ] `i` enters INSERT, `Esc` returns to NORMAL
- [ ] `dd` deletes current line
- [ ] `hjkl` moves cursor in NORMAL mode
- [ ] Disabled by default on mobile

## LLM Mocking

E2E tests mock the LLM layer entirely:

```javascript
// Mock Maya responses for deterministic testing
await page.evaluate(() => {
  window.__SIGNAL_MOCK_LLM__ = true;
  window.__SIGNAL_LLM_RESPONSES__ = {
    default: "the code looks right. keep going.",
    hint: "try using fmt.Println for output.",
    evaluate: { pass: true, feedback: "correct. moving on." }
  };
});
```

## CI

- Run on every PR against `main`
- Parallel execution across 3 browser engines (Chromium, Firefox, WebKit)
- Screenshot capture on failure
- Video recording for flaky test debugging
- Max test duration: 30s per test, 10min total suite
