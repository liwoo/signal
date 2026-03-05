# Unit Testing Spec

## Purpose

Ensure correctness of game logic, UI components, and utility functions. Tests run in CI and locally.

---

## Stack

| Tool | Role |
| --- | --- |
| Vitest | Test runner (fast, ESM-native, React-compatible) |
| React Testing Library | Component rendering and interaction |
| @testing-library/user-event | Simulating user input (typing, clicking) |
| jsdom | Browser environment simulation |

## Test Categories

### 1. Game Logic (Pure Functions)

No DOM, no React. Pure input/output tests.

| Module | Tests |
| --- | --- |
| XP calculation | Base XP, first-try bonus, speed bonus formula, streak multiplier |
| Energy system | Drain on wrong attempt (progressive), regen rate, cap at max |
| Rush timer | Countdown, expiry triggers jeopardy, speed bonus calculation |
| Streak system | Increment, multiplier tiers, reset on wrong attempt |
| Jeopardy events | Event selection, stacking, 50% intensity on retry |
| Chapter progression | Unlock conditions, act boundaries, boss detection |
| Black Market | Purchase validation, XP deduction, item effects |
| Level thresholds | XP -> level mapping, unlock triggers |

### 2. Tokenizer / Syntax Highlighter

| Test | Input | Expected |
| --- | --- | --- |
| Keywords | `func main()` | `[{type: "keyword", value: "func"}, ...]` |
| Strings | `"hello"` | `[{type: "string", value: "\"hello\""}]` |
| Comments | `// note` | `[{type: "comment", value: "// note"}]` |
| Nested backticks | `` `raw string` `` | Correct token boundaries |
| Mixed | Full Go program | All tokens classified correctly |

### 3. Vim Mode State Machine

| Test | Input Sequence | Expected State |
| --- | --- | --- |
| Mode transitions | `i` -> type -> `Esc` | INSERT -> NORMAL |
| `dd` delete line | Position line 3, `dd` | Line 3 removed, cursor on new line 3 |
| `yy` + `p` | Yank line 2, move to 4, `p` | Line 2 content pasted after line 4 |
| `/search` | `/main` + Enter | First "main" highlighted |
| `ci"` | Cursor inside `"hello"`, `ci"` | Content cleared, INSERT mode, quotes remain |

### 4. LSP / Linting

| Test | Input | Expected |
| --- | --- | --- |
| Unmatched brackets | `func main() {` (no close) | Error diagnostic at EOF |
| Unknown keyword | `fucn main()` | Warning: did you mean `func`? |
| Snake case detection | `my_var := 1` | Warning: Go uses camelCase |
| Auto-format | Spaces + trailing whitespace | Tabs + trimmed on submit |

### 5. Component Tests

| Component | Tests |
| --- | --- |
| Editor | Renders, accepts input, shows line numbers, toolbar toggles |
| Chat panel | Displays messages, respects fade on chapter advance, input sends |
| HUD | Shows XP bar, level, energy, token count, streak label |
| Rush timer | Renders countdown, fires callback on expiry, visual states |
| Black Market | Lists items, validates purchase, updates XP display |
| Hint panel | Progressive reveal (3 hints), energy cost deducted |

### 6. Persistence

| Test | Scenario | Expected |
| --- | --- | --- |
| Save progress | Complete chapter -> localStorage | Chapter marked complete, XP stored |
| Load progress | Fresh page load with existing localStorage | Resumes at correct chapter |
| Session chat | Send message -> sessionStorage | Message persisted for current session |
| Clear on chapter advance | New challenge starts | LLM session reset, chat context fresh |

## Coverage Targets

| Category | Target |
| --- | --- |
| Game logic (pure functions) | 95% |
| Tokenizer / highlighter | 90% |
| Vim mode | 85% |
| Components | 80% |
| Overall | 85% |

## Running

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific category
npm test -- --grep "game-logic"
```

## CI

- Tests run on every push and PR
- Coverage report uploaded as CI artifact
- PR blocked if coverage drops below thresholds
