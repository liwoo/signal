import type { Challenge } from "@/types/game";

// Act III opens. Save keys 7–12 are held for the unbuilt Act II chapters
// (4.3, Relay Interceptor, 5, 6, 6.2, Vasik T1); Act III numbers from 13 so
// nobody's completed-chapter list collides when those land. See docs/act-3-plan.md.

const ARCHIVE = `\tarchive := map[string][]string{
\t\t"root":    {"config.dat", "logs/", "servers/"},
\t\t"logs":    {"access.log", "error.log"},
\t\t"servers": {"alpha/", "beta/", "gamma/"},
\t\t"alpha":   {"thesis_v1.enc", "readme.txt"},
\t\t"beta":    {"backup.dat"},
\t\t"gamma":   {"thesis_v2.enc", "thesis_v3.enc", "notes.txt"},
\t}`;

const CORRUPTED_ARCHIVE = `\tarchive := map[string][]string{
\t\t"root":    {"config.dat", "logs/", "servers/", "vault/"},
\t\t"logs":    {"access.log", "error.log"},
\t\t"servers": {"alpha/", "beta/", "gamma/"},
\t\t"alpha":   {"thesis_v1.enc", "readme.txt"},
\t\t"beta":    {"backup.dat"},
\t\t"gamma":   {"thesis_v2.enc", "thesis_v3.enc", "notes.txt"},
\t\t"vault":   nil,
\t}`;

export const CH07_SCAN_OUTPUT = [
  "scanned: logs",
  "scanned: alpha",
  "scanned: beta",
  "scanned: gamma",
  "scanned: servers",
  "scanned: root",
  "total files: 9",
  "scanned: b",
  "scanned: a",
  "total files: 2",
].join("\n");

export const CH07_RECOVER_OUTPUT = [
  "scanned: logs",
  "scanned: alpha",
  "scanned: beta",
  "scanned: gamma",
  "scanned: servers",
  "scanned: vault",
  "scanned: root",
  "total files: 9",
  "ERROR: vault: corrupted directory",
  "scanned: bad",
  "scanned: b",
  "scanned: a",
  "total files: 2",
  "ERROR: bad: corrupted directory",
].join("\n");

export const chapter07: Challenge = {
  id: "chapter-07",
  act: 3,
  chapter: 13,
  title: "FILE TREE",
  location: "SERVER ROOM · ARCHIVE",
  concepts: ["Closures", "Recursion", "Defer", "Panic & Recover"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-07:scaffold",
      title: "SCAFFOLD",
      ask: "Print Hello World",
      stake: "Wake the archive terminal before the server room's night cycle locks it.",
      brief:
        "the archive terminal runs go. print `Hello World` to wake it — package, import, and main come with it.",
      starterCode: ``,
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "new room, same skeleton — tap whatever you need a refresher on.",
        items: [
          { question: "which line makes it runnable?", answer: "`package main` on the first line — that's what lets go run the file." },
          { question: "how do i pull in fmt?", answer: "`import \"fmt\"` right after the package line, quotes included." },
          { question: "where does the code that runs go?", answer: "inside `func main()` — that's the entry point go looks for." },
        ],
      },
      hints: [
        { level: 1, text: "same skeleton as always: package main, import \"fmt\", func main() { }.", energyCost: 5 },
        { level: 2, text: "inside main, `fmt.Println(\"Hello World\")`.", energyCost: 8 },
        { level: 3, text: 'package main, then import "fmt", then func main() { fmt.Println("Hello World") }', energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 40, firstTryBonus: 20, parTimeSeconds: 25 },
      events: [],
    },
    // ── Step 1: Recursive scan with a closure counter + defer ──
    {
      id: "chapter-07:scan",
      title: "SCAN",
      ask: "Count every file in the archive tree",
      stake: "Find which server holds Maya's thesis by counting every file in the archive, however deep it goes.",
      brief:
        "write `func scanArchive(archive map[string][]string, root string) int`.\n\ninside it: a counter `count := 0`, and a function variable `scan` that walks one directory — entries ending in `/` are directories (call `scan` on the name without the slash), everything else is a file (`count++`). `defer fmt.Println(\"scanned:\", dir)` at the top of `scan` logs each directory as it finishes. call `scan(root)`, return `count`.\n\nthe terminal scans the archive, then a small test tree:\n\nscanned: logs\nscanned: alpha\nscanned: beta\nscanned: gamma\nscanned: servers\nscanned: root\ntotal files: 9\nscanned: b\nscanned: a\ntotal files: 2",
      starterCode: null,
      expectedBehavior: CH07_SCAN_OUTPUT,
      testHarness: `func main() {
${ARCHIVE}
\tfmt.Println("total files:", scanArchive(archive, "root"))
\tfmt.Println("total files:", scanArchive(map[string][]string{"a": {"x.txt", "b/"}, "b": {"y.txt"}}, "a"))
}`,
      expectedOutput: CH07_SCAN_OUTPUT,
      requiredCode: ["defer", "scan("],
      quickCheck: {
        prompt: "stuck in the tree? tap the question that's in your head.",
        items: [
          {
            question: "how can a function call itself?",
            answer: "declare it first, then assign: `var scan func(dir string)` then `scan = func(dir string) { ... }`. now the body can call `scan(...)` on a subdirectory.",
          },
          {
            question: "how does the inner function change `count`?",
            answer: "it's a closure — it captures `count` from scanArchive, so `count++` inside changes the same variable scanArchive returns.",
          },
          {
            question: "why does `scanned: root` print last?",
            answer: "`defer` runs when the function returns. root is the first directory to start and the last to finish, so its line comes out at the end.",
          },
          {
            question: "how do i tell a directory from a file?",
            answer: "`strings.HasSuffix(entry, \"/\")`, or check the last byte: `entry[len(entry)-1] == '/'`. strip it with `entry[:len(entry)-1]`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "closures capture outer variables. `count := 0` in scanArchive, `count++` inside scan — same variable.", energyCost: 5 },
        { level: 2, text: "to recurse, declare first: `var scan func(dir string)`, then `scan = func(dir string) { ... }`. a directory entry ends in `/` — call `scan(entry[:len(entry)-1])`.", energyCost: 8 },
        { level: 3, text: "first line of scan: `defer fmt.Println(\"scanned:\", dir)`. then `for _, entry := range archive[dir]`. after the walk: `scan(root)` and `return count`.", energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 120, firstTryBonus: 60, parTimeSeconds: 90 },
      events: [
        { triggerAtSeconds: 10, type: "story", speaker: "KIRA", message: "You're in the archive. I can help with that. But information costs." },
        { triggerAtSeconds: 30, type: "story", speaker: "REEVES", message: "Maya. Do not trust her. Not one line." },
      ],
    },
    // ── Step 2: panic + recover per directory ──
    {
      id: "chapter-07:recover",
      title: "RECOVER",
      ask: "Survive the corrupted directories",
      stake: "GHOST has booby-trapped part of the archive — the scan has to survive it and keep counting, or the alarm trips.",
      brief:
        "write `func safeScan(archive map[string][]string, root string) (int, []string)` — the same scan, but a directory with no entries (`nil`) is corrupted: `panic(\"corrupted directory\")`.\n\neach `scan` call catches its own panic with a deferred `recover()`, records `\"<dir>: <panic>\"` in an errors slice, and the walk carries on. return the count and the errors.\n\nthe terminal prints:\n\nscanned: logs … scanned: vault\nscanned: root\ntotal files: 9\nERROR: vault: corrupted directory\n…and the same for a small test tree.",
      starterCode: null,
      expectedBehavior: CH07_RECOVER_OUTPUT,
      testHarness: `func main() {
${CORRUPTED_ARCHIVE}
\tcount, errs := safeScan(archive, "root")
\tfmt.Println("total files:", count)
\tfor _, e := range errs {
\t\tfmt.Println("ERROR:", e)
\t}
\tcount, errs = safeScan(map[string][]string{"a": {"x.txt", "bad/", "b/"}, "b": {"y.txt"}, "bad": nil}, "a")
\tfmt.Println("total files:", count)
\tfor _, e := range errs {
\t\tfmt.Println("ERROR:", e)
\t}
}`,
      expectedOutput: CH07_RECOVER_OUTPUT,
      requiredCode: ["panic(", "recover()"],
      quickCheck: {
        prompt: "stuck on the trap? tap the question that's in your head.",
        items: [
          {
            question: "what does panic actually do?",
            answer: "it stops the function on the spot and unwinds back up the calls, running each deferred function on the way. if nothing recovers, the whole program crashes.",
          },
          {
            question: "where does recover go?",
            answer: "only inside a deferred function: `defer func() { if r := recover(); r != nil { ... } }()`. called anywhere else it does nothing.",
          },
          {
            question: "why does the scan keep going after vault?",
            answer: "each `scan` call has its own deferred recover. vault's call catches vault's panic and returns normally, so root's loop just moves on to the next entry.",
          },
          {
            question: "how do i turn the panic value into text?",
            answer: "`fmt.Sprintf(\"%s: %v\", dir, r)` — `%v` prints whatever was passed to panic.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`panic(\"corrupted directory\")` when `archive[dir] == nil`. `recover()` inside a deferred func catches it.", energyCost: 5 },
        { level: 2, text: "the pattern: `defer func() { if r := recover(); r != nil { errs = append(errs, fmt.Sprintf(\"%s: %v\", dir, r)) } }()` — the `()` at the end calls it.", energyCost: 8 },
        { level: 3, text: "keep `defer fmt.Println(\"scanned:\", dir)` too. defers run last-in-first-out, so the print still happens while the panic unwinds, then recover catches it and the parent carries on.", energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 120, firstTryBonus: 60, parTimeSeconds: 90 },
      events: [
        { triggerAtSeconds: 15, type: "story", speaker: "KIRA", message: "Some of those directories are corrupted. GHOST booby-traps them. Your code needs to survive the fall, not avoid it." },
        { triggerAtSeconds: 50, type: "system", message: "ARCHIVE INTEGRITY: 3 SECTORS UNREADABLE" },
      ],
    },
  ],
  events: [],
  timer: { timeLimitSeconds: 420, gameOverOnExpiry: true },
  isBoss: false,
  parTimeSeconds: 200,
};

export const chapter07Twist = {
  headline: "THESIS LOCATED",
  lines: [
    "> scan complete — 9 files — 1 sector corrupted",
    "> match: thesis_v2.enc — /servers/gamma",
    "> kira: found it. now look at the vault. GHOST isn't hiding evidence — he's erasing it.",
    "> kira: your thesis won't survive in there. we copy it out tonight.",
    "> maya: 'we.' she said we.",
  ],
};
