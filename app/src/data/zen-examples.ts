// ── Zen debrief examples ──
// Before → after code for each zen rule, shown in the chapter debrief so a
// lesson is something the player *sees*, not just reads. Keyed by rule id
// (see src/lib/game/zen.ts). Rules without an entry show the principle only.

import { JAVASCRIPT_ZEN_EXAMPLES } from "./zen-examples.javascript";
import { PYTHON_ZEN_EXAMPLES } from "./zen-examples.python";
import { RUST_ZEN_EXAMPLES } from "./zen-examples.rust";

export interface ZenExample {
  before: string;
  after: string;
  /** One-line label for the change, e.g. "wrap the import in parentheses". */
  change: string;
}

// Rule ids are unique across languages (JS rules are js_*, Python py_*, Rust rs_*), so one
// map serves every language.
const GO_ZEN_EXAMPLES: Record<string, ZenExample> = {
  import_form: {
    before: 'import (\n    "fmt"\n)',
    after: 'import "fmt"',
    change: "one import, one plain line — parentheses are for two or more",
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
    before: 'fmt.Println("CELL", cellblock.Cell, "- SUBLEVEL", cellblock.Sublevel)',
    after: 'cell := cellblock.Cell\nsublevel := cellblock.Sublevel\nfmt.Println("CELL", cell, "- SUBLEVEL", sublevel)',
    change: "name the values with := (create and fill) — the name is the documentation",
  },
  use_printf_format: {
    before: 'fmt.Println("CELL", cellblock.Cell, "- SUBLEVEL", cellblock.Sublevel)',
    after: 'fmt.Printf("CELL %s - SUBLEVEL %d\\n", cellblock.Cell, cellblock.Sublevel)',
    change: "a format string separates the template from the data",
  },
  descriptive_names: {
    before: 'c := cellblock.Cell\ns := cellblock.Sublevel',
    after: 'cell := cellblock.Cell\nsublevel := cellblock.Sublevel',
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
  // ── Act III ──
  defer_scan_log: {
    before: 'scan = func(dir string) {\n    for _, entry := range archive[dir] { ... }\n    fmt.Println("scanned:", dir)\n}',
    after: 'scan = func(dir string) {\n    defer fmt.Println("scanned:", dir)\n    for _, entry := range archive[dir] { ... }\n}',
    change: "defer the closing line where the call begins — it runs however the call ends",
  },
  closure_counter: {
    before: 'func scan(archive map[string][]string, dir string, count *int) {\n    *count++\n}',
    after: 'count := 0\nvar scan func(dir string)\nscan = func(dir string) {\n    count++\n}',
    change: "let a closure capture the counter — no pointer to thread through",
  },
  recover_in_defer: {
    before: 'if r := recover(); r != nil {\n    errs = append(errs, fmt.Sprint(r))\n}\npanic("corrupted directory")',
    after: 'defer func() {\n    if r := recover(); r != nil {\n        errs = append(errs, fmt.Sprint(r))\n    }\n}()',
    change: "recover only works inside a deferred call — and the () runs it",
  },
  recover_per_call: {
    before: 'func safeScan(...) (int, []string) {\n    defer func() { recover() }()\n    scan(root)\n}',
    after: 'scan = func(dir string) {\n    defer func() {\n        if r := recover(); r != nil { ... }\n    }()\n    ...\n}',
    change: "recover in each call, so one bad directory doesn't end the walk",
  },
  go_statement_launch: {
    before: 'func cutAsync(name string) {\n    cut(name)\n}',
    after: 'func cutAsync(name string) {\n    go cut(name)\n}',
    change: "one word — go — and the caller stops waiting",
  },
  launcher_returns_now: {
    before: 'func cutAsync(name string) {\n    go cut(name)\n    time.Sleep(100 * time.Millisecond)\n}',
    after: 'func cutAsync(name string) {\n    go cut(name)\n}',
    change: "the launcher launches; whoever needs the result does the waiting",
  },
  wg_add_before_go: {
    before: 'go func(idx int, n string) {\n    wg.Add(1)\n    defer wg.Done()\n    ...\n}(i, name)',
    after: 'wg.Add(1)\ngo func(idx int, n string) {\n    defer wg.Done()\n    ...\n}(i, name)',
    change: "count the goroutine before it starts, or Wait may see zero",
  },
  defer_wg_done: {
    before: 'go func(idx int, n string) {\n    results[idx] = n + " circuit: DOWN"\n    wg.Done()\n}(i, name)',
    after: 'go func(idx int, n string) {\n    defer wg.Done()\n    results[idx] = n + " circuit: DOWN"\n}(i, name)',
    change: "defer Done on the first line — the count drops however the goroutine exits",
  },
  goroutine_args: {
    before: 'for i, name := range circuits {\n    go func() {\n        results[i] = name + " circuit: DOWN"\n    }()\n}',
    after: 'for i, name := range circuits {\n    go func(idx int, n string) {\n        results[idx] = n + " circuit: DOWN"\n    }(i, name)\n}',
    change: "pass loop values in — each goroutine owns its copy and says so",
  },
  results_by_index: {
    before: 'go func(n string) {\n    defer wg.Done()\n    fmt.Println(n + " circuit: DOWN")\n}(name)',
    after: 'results := make([]string, len(circuits))\ngo func(idx int, n string) {\n    defer wg.Done()\n    results[idx] = n + " circuit: DOWN"\n}(i, name)',
    change: "one slot per goroutine — no races, and the order survives",
  },
  sleep_inside_goroutine: {
    before: 'for i, name := range circuits {\n    time.Sleep(time.Duration(delays[i]) * time.Millisecond)\n    wg.Add(1)\n    go func(...) { ... }(...)\n}',
    after: 'for i, name := range circuits {\n    wg.Add(1)\n    go func(idx int, n string, d int) {\n        defer wg.Done()\n        time.Sleep(time.Duration(d) * time.Millisecond)\n        ...\n    }(i, name, delays[i])\n}',
    change: "sleep inside the goroutine — the window is the slowest, not the sum",
  },
  duration_conversion: {
    before: 'time.Sleep(d * time.Millisecond) // d is an int: won\'t compile',
    after: 'time.Sleep(time.Duration(d) * time.Millisecond)',
    change: "convert the int to a Duration, then give it a unit",
  },
  buffered_reply_channel: {
    before: 'ch := make(chan string)',
    after: 'ch := make(chan string, 1)',
    change: "room for one reply — the sender never gets stuck if nobody reads",
  },
  return_channel_now: {
    before: 'func hail(team string, delayMs int) chan string {\n    ch := make(chan string, 1)\n    time.Sleep(time.Duration(delayMs) * time.Millisecond)\n    ch <- team + " responding"\n    return ch\n}',
    after: 'func hail(team string, delayMs int) chan string {\n    ch := make(chan string, 1)\n    go func() {\n        time.Sleep(time.Duration(delayMs) * time.Millisecond)\n        ch <- team + " responding"\n    }()\n    return ch\n}',
    change: "hand the channel back at once — the caller chooses when to wait",
  },
  select_first_ready: {
    before: 'msg := <-alpha\nreturn msg',
    after: 'select {\ncase msg := <-alpha:\n    return msg\ncase msg := <-bravo:\n    return msg\ncase msg := <-charlie:\n    return msg\n}',
    change: "listen on every channel at once and take the first that answers",
  },
  blocking_select: {
    before: 'select {\ncase msg := <-alpha:\n    return msg\ndefault:\n    return ""\n}',
    after: 'select {\ncase msg := <-alpha:\n    return msg\ncase msg := <-bravo:\n    return msg\n}',
    change: "no default when the select is meant to wait",
  },
  timeout_from_param: {
    before: 'case <-time.After(500 * time.Millisecond):\n    return "NO CONTACT"',
    after: 'case <-time.After(time.Duration(timeoutMs) * time.Millisecond):\n    return "NO CONTACT"',
    change: "the caller sets the deadline — build it from the parameter",
  },
  default_only_in_sweep: {
    before: 'func sweep(ch chan string) string {\n    time.Sleep(10 * time.Millisecond)\n    return <-ch\n}',
    after: 'func sweep(ch chan string) string {\n    select {\n    case msg := <-ch:\n        return msg\n    default:\n        return "channel silent"\n    }\n}',
    change: "default means never wait — use it where you only want a glance",
  },
};

export const ZEN_EXAMPLES: Record<string, ZenExample> = {
  ...GO_ZEN_EXAMPLES,
  ...JAVASCRIPT_ZEN_EXAMPLES,
  ...PYTHON_ZEN_EXAMPLES,
  ...RUST_ZEN_EXAMPLES,
};
