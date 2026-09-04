// ── Zen debrief examples ──
// Before → after code for each zen rule, shown in the chapter debrief so a
// lesson is something the player *sees*, not just reads. Keyed by rule id
// (see src/lib/game/zen.ts). Rules without an entry show the principle only.

export interface ZenExample {
  before: string;
  after: string;
  /** One-line label for the change, e.g. "wrap the import in parentheses". */
  change: string;
}

export const ZEN_EXAMPLES: Record<string, ZenExample> = {
  grouped_import: {
    before: 'import "fmt"',
    after: 'import (\n    "fmt"\n)',
    change: "parentheses, even for one import — future imports slot in cleanly",
  },
  package_import_sep: {
    before: 'package main\nimport "fmt"',
    after: 'package main\n\nimport "fmt"',
    change: "a blank line after package — sections breathe",
  },
  import_func_sep: {
    before: 'import "fmt"\nfunc main() {',
    after: 'import "fmt"\n\nfunc main() {',
    change: "a blank line before func — gofmt puts it there",
  },
  use_named_values: {
    before: 'fmt.Println("CELL B-09 · SUBLEVEL 3")',
    after: 'cell := "B-09"\nconst sublevel = 3\nfmt.Println("CELL", cell, "· SUBLEVEL", sublevel)',
    change: "name the values — the name is the documentation",
  },
  use_printf_format: {
    before: 'fmt.Println("CELL " + cell + " · SUBLEVEL 3")',
    after: 'fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)',
    change: "a format string separates the template from the data",
  },
  descriptive_names: {
    before: 'c := "B-09"\ns := 3',
    after: 'cell := "B-09"\nsublevel := 3',
    change: "say what it is — single letters hide meaning",
  },
  simple_increment: {
    before: 'for i := 1; i <= 10; i = i + 1 {',
    after: 'for i := 1; i <= 10; i++ {',
    change: "i++ — one operation, one form, nothing to misread",
  },
  switch_over_ifelse: {
    before: 'if i <= 3 {\n    fmt.Println(i, "DENY")\n} else if i <= 6 {\n    fmt.Println(i, "WARN")\n}',
    after: 'switch {\ncase i <= 3:\n    fmt.Println(i, "DENY")\ncase i <= 6:\n    fmt.Println(i, "WARN")\n}',
    change: "switch on true reads like a truth table, not a ladder",
  },
  no_unnecessary_break: {
    before: 'case i <= 3:\n    fmt.Println(i, "DENY")\n    break',
    after: 'case i <= 3:\n    fmt.Println(i, "DENY")',
    change: "drop the break — go cases don't fall through by default",
  },
  use_constants_labels: {
    before: 'fmt.Println(i, "DENY")\nfmt.Println(i, "WARN")',
    after: 'const (\n    deny = "DENY"\n    warn = "WARN"\n)\nfmt.Println(i, deny)',
    change: "name the labels — change them in one place, not ten",
  },
};
