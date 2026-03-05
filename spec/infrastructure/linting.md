# Linting Spec

## Purpose

Enforce Go formatting conventions and catch common mistakes in the browser editor. Lightweight, client-side only — no `gofmt` or `golint` binary.

---

## Scope

Linting is always active (not unlockable). It provides non-blocking feedback — warnings, not errors. Errors come from the LSP layer.

## Rules

### Formatting Rules (auto-fixable)

| Rule | Detection | Auto-fix |
| --- | --- | --- |
| Tabs vs spaces | Detect spaces used for indentation | Replace leading spaces with tabs |
| Trailing whitespace | Regex `/ +$/gm` | Strip on submit |
| Missing newline at EOF | Check last char | Append `\n` on submit |
| Brace style (`{` on same line) | Detect `func ...` followed by `\n{` | Suggest inline (no auto-fix — too risky) |

### Style Warnings (non-blocking)

| Rule | Detection | Message |
| --- | --- | --- |
| Line length > 100 chars | Character count per line | "long line — consider breaking" |
| Multiple blank lines | Regex `/\n{3,}/g` | "extra blank lines" |
| Snake_case variable | Regex `/[a-z]+_[a-z]+/` in identifier position | "Go uses camelCase" |
| Exported name without capital | Function/type starts lowercase but used outside `main` | "exported names start with uppercase" |

### Submission-time Checks

These run on submit and can block submission:

| Check | Behavior |
| --- | --- |
| Unmatched brackets | Block submit, highlight the unmatched bracket |
| Empty `func main()` | Block submit, show "main function is empty" |
| Missing package declaration | Auto-prepend `package main\n\n` silently |

## Auto-format on Submit

When player clicks SUBMIT:

1. Strip trailing whitespace
2. Ensure newline at EOF
3. Normalize indentation to tabs
4. Run submission-time checks
5. If checks pass, send to LLM for evaluation

Auto-format changes are applied silently — no confirmation dialog. The editor reflects the cleaned code.

## UI

- Warnings appear as amber underlines (distinct from LSP red squiggles)
- Hovering/tapping a warning shows a tooltip with the message
- A lint summary in the editor toolbar: `2 warnings` (amber dot) or checkmark if clean
- No separate lint panel — integrated into the editor

## Mobile

- Warnings shown as margin dots (no underlines — too small)
- Tap margin dot to see warning in a toast

## Integration

- Runs after LSP diagnostics (LSP has priority for error display)
- Debounced at 300ms (slower than LSP's 200ms to avoid flicker)
- Linting state is ephemeral — not persisted
- Jeopardy: during Signal Scramble, linting is paused (same as LSP)
