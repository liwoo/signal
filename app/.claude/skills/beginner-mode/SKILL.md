---
name: beginner-mode
description: How to write and extend beginner mode content — pre-level concept briefings for new players
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Beginner Mode in SIGNAL

## What It Is

A toggleable pre-level overlay that teaches Go concepts before the player starts a challenge. Each chapter has three sections: animated illustration, package card, and code recap. The player presses CONTINUE between each.

## Flow

```
Section 0: Animation (interactive office room illustration)
Section 1: Package Card (tappable paper-form showing Go program structure)
Section 2: Code Recap (text + code blocks with hotspot tooltips)
```

Every chapter follows this exact structure. No exceptions.

## The Appliance Model (Critical)

Every chapter reuses the **same office room** (the "Go appliance"). New concepts appear as objects inside the existing room. This builds the player's mental model across chapters.

### The Room (always present)

- **Left wall** with package slot (programme package slides in)
- **MAIN dept.** with worktable (zainab works here)
- **Shelf** with address labels (imports) and sealed folders (const groups)
- **Dividing wall** with postal slot (envelopes pass through)
- **FMT dept.** with table (jijo works here, processes print requests)
- **Display panel** at bottom (terminal output)
- **Complete button** (red/locked until programme finishes)

### The Flow (every chapter, every time)

1. Package arrives through left wall slot
2. Zainab reads the label → `package main`
3. Zainab checks attachments → walks to shelf → fetches address labels (`import`)
4. Zainab opens the main envelope → `func main()`
5. Zainab reads instructions inside (chapter-specific logic)
6. Results posted through postal slot to FMT dept
7. Jijo processes and sends to display
8. Complete button turns green

New concepts appear **inside step 5** (the instructions). The package/import/envelope structure is always the same.

### Physical Analogies (canonical list)

These analogies must be used consistently across all chapters:

| Analogy | Go Concept | Introduced |
|---------|-----------|------------|
| Package card | `package main` | Ch01 |
| Address label (shelf) | `import` | Ch01 |
| Envelope | `func` | Ch01 |
| Sealed envelope | `const` | Ch01 |
| Open envelope | variable (`:=`) | Ch01 |
| Sticker (color-coded) | value/data | Ch01 |
| Peel & stick | `:=` / `=` | Ch01 |
| Postal slot | function call | Ch01 |
| Display panel | terminal output | Ch01 |
| Sealed folder + name tags | `const ( )` group | Ch02 |
| Revolving door | `for` loop | Ch02 |
| Counter sign | loop init (`i := 1`) | Ch02 |
| Condition sign | loop condition (`i <= 10`) | Ch02 |
| Counter tick | loop post (`i++`) | Ch02 |
| Sorting room (postal depot) | `switch` | Ch02 |
| Labelled bay | `case` | Ch02 |
| DEFAULT bay | `default` | Ch02 |
| Checkpoint booth (passport control) | `if / else` | Ch02 |
| Inspector | condition check | Ch02 |
| Green/red gate | branch path | Ch02 |

When introducing a concept already taught in a prior chapter, the narration should acknowledge it: "same as last time", "she knows the drill", etc.

## Architecture

### Diagram Components: `src/components/game/diagrams/`

Each chapter has a diagram component with two views controlled by a `view` prop:

```typescript
interface DiagramProps {
  onHotspotClick?: (id: string) => void;  // XP tracking
  clickedIds?: Set<string>;                // already-clicked parts
  view?: "animation" | "card";             // which view to render
}
```

- **`view="animation"`**: The animated office room with scene progression, narration, play/pause/next controls
- **`view="card"`**: The package card (paper form) with side-by-side code panel, tappable pills, and analogy map button

Existing diagrams:
- `GoAppliance.tsx` — Ch01 (package/import/const/var/print)
- `DoorCodeMachine.tsx` — Ch02 (const groups/for loops/switch)

### Building a New Diagram

1. **Copy the structure from GoAppliance.tsx** — same design tokens `T`, same `OfficeRoom` layout, same `WorkerChip`, same `CodePanel`, same `AnalogyMapModal`
2. **Add new overlay objects** that appear progressively (like the revolving door overlay in ch02)
3. **Write scenes** following the canonical flow (idle → package_in → check_attach → [new concept on shelf] → open_main → [chapter-specific instructions] → exit)
4. **Write CARD_PARTS** covering the full card hierarchy:
   - Always include: `card`, `pname`, `attach`, `envelope`, `req`, `body`, `exp`
   - Add chapter-specific parts (e.g., `folder`, `nametag`, `forloop`, `switch`, etc.)
   - Each part maps to specific code lines for highlighting

### The Package Card Format

The card view **must** follow this exact layout for every chapter:

```
┌──────────────────────────────────┐
│ GO PROGRAMME PACKAGE    rev X.0  │  ← red header bar
├──────────────────────────────────┤
│ Package Name:                    │  ← tappable (pname)
│ main                             │
│                                  │
│ Required Attachments:            │  ← tappable (attach)
│ ☑ fmt (printer toolkit)          │
│ ☐ add more...                    │
│                                  │
│ [chapter-specific sections here] │  ← e.g. sealed folder (ch02+)
│                                  │
│ ┌────────────────────────────┐   │
│ │ ENVELOPE: main             │   │  ← tappable (envelope)
│ ├──────────┬─────────────────┤   │
│ │  FRONT   │      BACK       │   │  ← flip toggle
│ ├──────────┴─────────────────┤   │
│ │ Required Information:      │   │  ← tappable (req)
│ │ - none -  ()               │   │
│ │                            │   │
│ │ Instructions:              │   │  ← tappable (body)
│ │ [chapter-specific steps]   │   │  ← each instruction tappable
│ └────────────────────────────┘   │
│                                  │
│ tap any section · flip front/back│
└──────────────────────────────────┘
```

The card sits side-by-side with a code panel. Below the code panel: tappable pills for each CARD_PART. Below both: an explanation panel that shows the selected part's description.

### Analogy Map Modal

Every card view ends with a centered "ANALOGY MAP →" button. Tapping opens a fixed-position modal overlay showing all physical-to-code mappings for that chapter. The modal is dismissible via close button or backdrop click.

Use the `AnalogyMapModal` component (defined in each diagram file):

```typescript
<AnalogyMapModal items={[
  { a: "Package card", c: "package main", col: T.red },
  { a: "Address label", c: "import", col: T.blue },
  // ... chapter-specific items
]} />
```

Include analogies from **all previous chapters plus the current one**. This reinforces the cumulative mental model.

### Design Tokens

All diagram components share the same token object `T`:

```typescript
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};
```

These are internal to the diagram components (not CSS vars) because diagrams use inline styles for the paper/office aesthetic.

### Animation View Layout

The animation view uses a flex layout with pinned controls:

```
┌─────────────────────────────┐
│ [scrollable content area]   │  ← flex: 1, overflow: auto
│   OfficeRoom (scene visual) │
│   Legend (color dots)       │
│   Narration + Code panel    │
├─────────────────────────────┤
│ [pinned controls]           │  ← flexShrink: 0
│   Scene dots (1-12)         │
│   ← BACK  ▶ PLAY  NEXT →   │
└─────────────────────────────┘
```

Controls are **never** hidden beneath scroll. The parent (BeginnerOverlay) detects diagram sections and switches from `overflow-y-auto` to flex layout, giving the diagram a concrete height.

## Data Layer: `src/data/beginner-notes.ts`

### Diagram Blocks

Diagram blocks are a special `NoteBlock` type that renders interactive visual components:

```typescript
{
  type: "diagram",
  section: 0,           // section 0 = animation, section 1 = card
  content: "ch02-animation",  // diagram ID
}
```

Diagram IDs follow the pattern: `ch{XX}-animation` and `ch{XX}-card`.

### Section Structure (every chapter)

```typescript
"chapter-XX": {
  title: "CHAPTER TITLE",
  subtitle: "WHAT YOU NEED FOR THIS LEVEL",
  blocks: [
    { type: "diagram", section: 0, content: "chXX-animation" },
    { type: "diagram", section: 1, content: "chXX-card" },
    // Section 2: code recap with text + code blocks + hotspots
    { type: "text", section: 2, content: "..." },
    { type: "code", section: 2, content: "...", hotspots: [...] },
    // ...more text/code blocks in section 2
  ],
}
```

### BeginnerOverlay Diagram Detection

When the current section contains only diagram blocks (`isDiagramSection`), BeginnerOverlay:
- Switches container from `overflow-y-auto` to `flex-1 min-h-0 flex flex-col`
- Sets concrete height (`90dvh`) so diagram internal flex resolves
- Uses wider max-width (960px vs 860px)
- Hides completed blocks (only shows current diagram)
- Removes notebook border-left styling

### Registering New Diagrams

In `BeginnerOverlay.tsx`, add the import and a case in the diagram block renderer:

```typescript
import { NewDiagram } from "./diagrams/NewDiagram";

// In BlockRenderer, inside the diagram handling:
if (b.content === "chXX-animation") return <NewDiagram view="animation" ... />;
if (b.content === "chXX-card") return <NewDiagram view="card" ... />;
```

## Code Recap (Section 2)

### Block Types

```typescript
interface NoteBlock {
  type: "text" | "code" | "diagram";
  content: string;
  section: number;
  hotspots?: Hotspot[];  // only for code blocks
}

interface Hotspot {
  text: string;   // exact substring in the code to highlight
  tip: string;    // tooltip shown on click
}
```

### Writing Guidelines

- **Maya's voice** — lowercase, no exclamation marks, no bullet points
- **Text blocks** — 1-3 sentences, explain one concept, use physical analogies from the table above
- **Code blocks** — short (3-8 lines), valid Go, 3-5 hotspots each
- **Hotspot tips** — use analogy language ("the sealed envelope", "the revolving door stops spinning")
- **Order** — foundational concepts first, build up. Mirror the challenge step order
- **Only teach what's needed** — cover just enough for the player to attempt the level

### Hotspot Rules

- `text` must be an exact substring of the code block's `content`
- No overlapping hotspots
- Tips explain what the code does using physical analogies, not just restating syntax
- Already-clicked hotspots dim (opacity 0.6)
- Each hotspot awards +5 XP on first click

## Component: `src/components/game/BeginnerOverlay.tsx`

Fullscreen overlay (`z-[60]`) with:
- **Sections** — blocks grouped by `section` number, revealed together
- **Streaming** — character-by-character (18ms text, 8ms code) with blinking cursor
- **Hotspots** — dashed-underlined clickable spans in code blocks
- **XP rewards** — +5 XP per hotspot, tracked via `clickedHotspots` set
- **Progress dots** — green = done, amber = current, dim = upcoming
- **SKIP** — fast-forwards current section streaming
- **CONTINUE** — advances to next section
- **START LEVEL** — replaces CONTINUE on last section

Props:
```typescript
interface BeginnerOverlayProps {
  notes: BeginnerNotes;
  onReady: () => void;
  onDisable: () => void;
  onHotspotXP: (amount: number) => void;
}
```

## Checklist: Adding Beginner Mode to a New Chapter

1. **Check Go docs** (context7/learngobyexample) for accuracy before writing content
2. **Identify new concepts** — what physical analogies do they map to? Add to the canonical table above
3. **Create diagram component** in `src/components/game/diagrams/` following GoAppliance structure:
   - Same `T` tokens, `OfficeRoom` layout, `WorkerChip`, `CodePanel`, `AnalogyMapModal`
   - Same canonical flow (package → attachments → open envelope → instructions)
   - New objects appear progressively inside the existing room
   - `view="animation"` with scenes + pinned controls
   - `view="card"` with package card format (red header, envelope flip, etc.) + analogy map button
4. **Add beginner notes** in `src/data/beginner-notes.ts`:
   - Section 0: `{ type: "diagram", content: "chXX-animation" }`
   - Section 1: `{ type: "diagram", content: "chXX-card" }`
   - Section 2: code recap with text/code blocks + hotspots using analogy language
5. **Register diagram** in `BeginnerOverlay.tsx` (import + case in renderer)
6. **Verify** — TypeScript compiles, tests pass, animation controls visible, card tappable

## Common Mistakes

- **Breaking the appliance model.** Never build a separate room/layout. Always extend the existing office room with new overlay objects
- **Skipping the canonical flow.** Package must arrive → label read → attachments fetched → envelope opened → instructions followed. Every time
- **Inconsistent card format.** The package card must have red header, package name, attachments, envelope with FRONT/BACK flip. No exceptions
- **Inline analogy map.** Always use the `AnalogyMapModal` button/modal pattern, never render analogies inline
- **Missing previous analogies.** The analogy map modal should include all analogies from prior chapters plus current
- **Controls hidden beneath scroll.** Animation controls must be pinned (flexShrink: 0). Test in the actual BeginnerOverlay
- **Teaching concepts not in the challenge.** Only cover what the player needs for THIS level
- **Concepts used before taught.** Never reference slices, range, var/const groups etc. without teaching them first in a prior or current section
