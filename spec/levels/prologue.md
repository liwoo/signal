# Prologue — How She Got Here

The opening film. Plays once, between **CONNECT TO MAYA** on the Chapter 1 intro screen and the playable cell beat (`chapter-01-intro`). Replayable from the Chapter 1 intro screen ("▶ REPLAY THE PROLOGUE").

## Why

Playtests (Oct 2026) showed non-coders don't understand what's at stake or why they're coding. The prologue's job is to make the hook clear in under 30 seconds, before the first keystroke:

1. **Who she is.** Maya Chen, 22, a brilliant cryptographer.
2. **Why they took her.** Her thesis is encryption no computer can break. They left the laptop and took *her*, because the key is in her head.
3. **The stakes.** Once they have the key, they don't need her.
4. **Your role.** One dead terminal, one open line, and it just reached you.

## Shots (`PROLOGUE_SCENES`, `src/lib/sprites/scenes.ts`)

| # | Room | Beat | Caption |
|---|------|------|---------|
| 1 | `lab` | 72 HOURS EARLIER. Rain, lightning, Maya at her desk lit by her screens | maya chen. 22. the best cryptographer of her year. |
| 2 | `lab` | Close on her face. Build goes green, then the lights stutter and die | her thesis: encryption no computer on earth can break. |
| 3 | `lab-raid` | Out of the black, the door is kicked in: two guards in silhouette, red beacon | 23:52. the power died. they didn't knock. |
| 4 | `lab-raid` | She runs out from behind the desk, a guard cuts her off. White-out | they left the laptop. they took her. |
| 5 | `chase` | Hauled down an unknown facility corridor | no ransom. no witnesses. no trace. |
| 6 | `cell` | Door slam. 72 HOURS LATER. She's slumped on the floor | once they have the key, they don't need her. |
| 7 | `cell` | The terminal flickers awake. SIGNAL INCOMING / YOU ARE HER ONLY WAY OUT | one dead terminal. one open line. it just reached you. |

About 27s. Tapping or pressing a key advances one shot. There's no skip, matching the other cinematics. Past shots are tagged `RECOVERED · CAM 02` / `TRANSIT · CAM 11` through the shot's `feed` field. The cell shots are `LIVE FEED`.

## Assets

- **Rooms.** `lab` / `lab-raid` (`paintLab` in scene-painter) have a wide back wall with a rain-streaked city window and a thesis whiteboard, Maya's workstation as a mid-plane prop (she stands behind it), and the LAB 4 door. Raid = power cut: dead screens, the door kicked open on a white corridor, a red emergency strobe.
- **Rain.** `SceneFx.rain` is a falling `DustSpec` drawn as streaks on the back plane, behind actors, and it moves with the back plane's parallax.
- **Pose.** Maya `slumped` (sitting, knees hugged, head down).
- **Audio.** `rain-loop` (ambience), `thunder`, `power-down` (sfx), synthesized with sox.

## Rules (enforced in `scenes.test.ts`)

- 20–30s total. Every caption is lowercase, ≤60 chars, no `!`.
- Opens in the `lab` on a dissolve with an "…EARLIER" card. Ends in the `cell` at the same location the Chapter 1 intro opens in.
- Every non-cell shot has a `feed` tag.
- The raid has ≥2 guards plus a shake and a flash. Maya appears `slumped`.
- The rain loop stops when the story leaves the lab.

`PlayerSettings.prologueSeen` is set when the prologue starts, so a reload mid-film doesn't replay it. Preview without game state at `/dev/cinematic?seq=PROLOGUE_SCENES`.
