# LSP — Language Server Protocol Spec

## Purpose

Provide Go syntax intelligence in the browser editor without a backend compiler. The LSP layer powers autocomplete, error squiggles, and hover documentation — all unlockable through gameplay progression.

---

## Scope

| Feature | Priority | Unlock Condition |
| --- | --- | --- |
| Syntax error highlighting (red squiggles) | P0 | Available from Level 1 |
| Keyword autocomplete (`func`, `for`, `if`, etc.) | P1 | Available from Level 2 |
| Snippet expansion (`fori` -> for loop template) | P2 | Available from Level 3 (with Vim mode) |
| Hover documentation (built-in types/functions) | P2 | Available from Level 4 |
| Go import suggestions | P3 | Available from Level 6 |

## Architecture

### Client-Side Only

No remote language server. All intelligence runs in-browser via a lightweight Go grammar module.

```
Editor Keystroke
  -> Debounce (200ms)
  -> Tokenizer (same as syntax highlighter, see §12.6 in design doc)
  -> Diagnostic Pass (bracket matching, keyword validation, type checking for known builtins)
  -> Render: squiggles, autocomplete dropdown, hover tooltip
```

### Tokenizer Reuse

The syntax highlighter tokenizer (regex-based, single pass) is shared with the LSP layer. Tokens are enriched with positional metadata (`line`, `col`, `start`, `end`) for diagnostic mapping.

### Autocomplete Engine

- **Trigger:** Any alphabetic character or `.` after an identifier
- **Sources:**
  - Go keywords (static set)
  - Go built-in functions (`make`, `append`, `len`, `cap`, `close`, `delete`, `copy`, `new`, `panic`, `recover`, `print`, `println`)
  - Go built-in types (`int`, `string`, `bool`, `byte`, `rune`, `float64`, `error`, etc.)
  - User-defined identifiers extracted from current buffer
  - Challenge-specific identifiers (injected per chapter — e.g., struct names from the mission brief)
- **Ranking:** Exact prefix match > fuzzy match > type match
- **Display:** Max 6 items, navigable with arrow keys or `Ctrl+N/P` (Vim mode compatible)

### Diagnostics

| Diagnostic | Detection Method | Severity |
| --- | --- | --- |
| Unmatched brackets `{}[]()` | Stack-based bracket matcher | Error |
| Unknown keyword (typo) | Levenshtein distance < 2 from known keyword | Warning |
| Missing `func main()` | AST-level check (required for submission) | Error |
| Unused import (basic) | Regex scan for `import` vs usage in body | Warning |
| Missing closing quote | Tokenizer state at EOF | Error |

### Limitations

- No full type inference — only built-in types are checked
- No cross-file analysis (single-file challenges only)
- No `go vet` or `go fmt` equivalent — linting handles formatting (see `linting.md`)

## Integration Points

- **Syntax Highlighter:** Shares tokenizer; LSP adds diagnostics on top of highlight spans
- **Vim Mode:** Autocomplete respects Vim insert mode; suppressed in Normal/Visual mode
- **Jeopardy System:** During Signal Scramble events, diagnostics are paused (scrambled characters would flood errors)
- **Mobile:** Autocomplete dropdown repositioned above keyboard; max 4 items instead of 6

## State

- LSP state is ephemeral — recomputed on every keystroke (debounced)
- No persistence needed
- Challenge-specific identifiers loaded from challenge config on chapter start

## Dependencies

- Tokenizer module (shared with syntax highlighter)
- Challenge config (for injected identifiers)
- Editor component (for cursor position, viewport)
