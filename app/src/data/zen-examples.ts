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
};
