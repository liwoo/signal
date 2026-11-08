# Test vs Transmit, Pace, and the Chapter Takeaway

From the Nov 2026 visual-UX recommendations ("help the player feel competent
sooner"). Guiding rule from the product owner: **one idea per screen** — no
extra panels on the main views.

## 1. Coding loop — TEST and TRANSMIT TO MAYA

Two stable buttons under the editor. Labels never change with rush or XP.

| | TEST | TRANSMIT TO MAYA |
|---|---|---|
| Shortcut | ⌘/Ctrl + ⏎ | ⇧ + ⌘/Ctrl + ⏎ |
| Runs the same grading pipeline | yes | yes |
| Counts as an attempt (TRIES) | no | yes |
| Affects the first-try bonus | no ("first try" = first transmission) | yes |
| Maya sees it / chat message | no | yes |
| Clears the step / XP / save | no | yes, when every check passes |
| Clock | keeps running — time is the only cost of testing | keeps running |
| Jev zen judging | no | yes |

After either run, one panel under the editor shows the **mission checks**:

1. **Runs without errors** — local diagnostics + compile/runtime.
2. **Uses …** — the step's `requiredCode` (anti-hardcoding). Judged
   statically, so it's reported even when the code doesn't compile.
3. **Output matches exactly** / **Passes the terminal's test run** (harness
   steps) / **Does what the step asks** (pattern-graded steps).

Then exactly one thing to fix: the expected-vs-actual line with the differing
segment highlighted and a one-line note (`missing "- " before "SUBLEVEL"`),
or the compile error, or the missing required code. The panel dims and says
EDITED SINCE THIS RUN once the code changes. A passing TEST fills the
TRANSMIT button.

The same check labels appear as **DONE WHEN** in SEE LEVEL OBJECTIVES, with
the expected output when the player's own program prints it (not for hidden
harness runs).

Code: `src/lib/game/checks.ts` (pure diff + checks), `callMayaEngineAsync`
returns `report`, `useGame.testCode`, `CodeEditor` panel.

## 2. First session — one choice per screen

Only when `settings.languageChosen` is false:

1. **Hook** — the chapter intro with the loop strip (EXPLORE → WRITE CODE →
   SEE IT WORK) instead of stats; no language picker yet.
2. **Start with what you know** — language to learn + "I already code in"
   → one bridge line (`print("hi") → fmt.Println("hi")`). "Nothing yet"
   turns on guided mode (warm-up + tour).
3. **Choose your pace** — Study or Thriller; one tap starts the story.

Instruction (guided mode) and pressure (pace) are separate choices.

**Study pace**: no countdown (HUD shows STUDY · NO CLOCK), no rush moments,
no time rewards, so no timer game-over. Story events still play. Boss fights
are unchanged. **Thriller** is the existing timed escape. Switch on any
chapter intro (the PACE tile).

## 3. Chapter takeaway

After the zen debrief, regular chapters show `ChapterTakeaway` instead of the
tabbed summary modal:

1. **A pattern you can reuse** — headline of what the player did, the key
   block lifted from *their own* final code (`extractSnippet`), why it
   matters, where it shows up outside the game, and ↓ DOWNLOAD PROJECT (a
   zip with their code, the step's shipped package, go.mod / package.json,
   and a README with the run command).
2. **Quick check (optional)** — one changed-input question; answering it
   moves "used it in a new situation" from NOT CHECKED YET to SHOWN, beside
   "applied it in the mission".

CONTINUE THE ESCAPE is the loudest control on both. Content lives in
`src/data/takeaways.ts`; `takeaway.test.ts` requires one per realized
chapter, and that every reference solution's final step yields a snippet.

## Not done (needs a product decision)

- **Guest first mission** — `/play` requires Google sign-in (#28). Letting
  chapter 1 run signed-out needs a local-save → cloud merge on sign-in.
- **Transfer results aren't persisted** — the quick check is per visit.
