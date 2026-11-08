// What each chapter leaves the player with: the pattern, lifted from their own
// solution; where it shows up in everyday code; and one optional transfer
// question (same idea, changed input) that checks they could reuse it.
//
// Text is language-neutral; only the snippet rules and fallbacks are per
// language. The snippet is extracted from the player's final code — the
// fallback only shows if their code takes a shape the rule can't find.

import type { LanguageId } from "@/types/game";
import type { SnippetRule } from "@/lib/game/takeaway";

export interface TransferOption {
  label: string;
  correct: boolean;
  /** One line back after picking it — why it is (or isn't) the change. */
  reply: string;
}

export interface ChapterTakeaway {
  /** What the player did, as one plain sentence. */
  headline: string;
  /** The pattern's shape, e.g. "IMPORT → READ → PRINT". */
  pattern: string;
  /** Where to find the pattern in the player's final code. */
  snippet: Record<LanguageId, SnippetRule>;
  /** Shown when the player's code doesn't match the snippet rule. */
  fallback: Record<LanguageId, string>;
  /** Why the pattern is worth keeping, one sentence. */
  why: string;
  /** Where it turns up outside the game. */
  useIt: string;
  /** The optional changed-input question. */
  transfer: { question: string; options: TransferOption[] };
}

export const TAKEAWAYS: Record<string, ChapterTakeaway> = {
  "chapter-01": {
    headline: "You read data from another file instead of typing it in.",
    pattern: "IMPORT → READ → PRINT",
    snippet: {
      go: { start: /fmt\.Print/, contains: /cellblock\./ },
      python: { start: /print\(/, contains: /cellblock\./ },
      javascript: { start: /console\.log\(/, contains: /\b(cell|sublevel)\b/ },
    },
    fallback: {
      go: 'fmt.Println("CELL", cellblock.Cell, "- SUBLEVEL", cellblock.Sublevel)',
      python: 'print(f"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")',
      javascript: "console.log(`CELL ${cell} - SUBLEVEL ${sublevel}`);",
    },
    why: "read values from where they live instead of retyping them. when the source changes, your output follows.",
    useIt: "config files, shared constants, settings — real programs mostly print values they never typed.",
    transfer: {
      question: "the cell changes to C-12. what should change in the program?",
      options: [
        { label: "the value in the cellblock file", correct: true, reply: "right. your print line reads the value, so its output follows on its own." },
        { label: "your print line", correct: false, reply: "no need — your line reads the value, it doesn't contain it. change it at the source." },
      ],
    },
  },
  "chapter-02": {
    headline: "You turned a run of numbers into decisions.",
    pattern: "LOOP → TEST → LABEL",
    snippet: {
      go: { start: /^\s*for\b/ },
      python: { start: /^\s*for\b/ },
      javascript: { start: /^\s*for\b/ },
    },
    fallback: {
      go: 'for i := 1; i <= 10; i++ {\n    switch {\n    case i <= 3:\n        fmt.Println(i, "DENY")\n    case i <= 6:\n        fmt.Println(i, "WARN")\n    default:\n        fmt.Println(i, "GRANT")\n    }\n}',
      python: 'for i in range(1, 11):\n    if i <= 3:\n        print(i, "DENY")\n    elif i <= 6:\n        print(i, "WARN")\n    else:\n        print(i, "GRANT")',
      javascript: 'for (let i = 1; i <= 10; i++) {\n  if (i <= 3) console.log(i, "DENY");\n  else if (i <= 6) console.log(i, "WARN");\n  else console.log(i, "GRANT");\n}',
    },
    why: "a loop visits every value; a branch decides what each one means. together they label anything in bulk.",
    useIt: "grading scores, sorting logs by severity, tagging orders — any \"for each thing, decide\" job.",
    transfer: {
      question: "the keypad grows to codes 1–20. what has to change?",
      options: [
        { label: "the loop's upper limit", correct: true, reply: "right. the branches already judge whatever code comes through — only the range grows." },
        { label: "a new branch for every new code", correct: false, reply: "no — branches cover ranges, not single codes. widen the loop and the ranges do the rest." },
      ],
    },
  },
  "chapter-03": {
    headline: "You packaged logic into functions that hand back answers.",
    pattern: "TAKE INPUTS → COMPUTE → RETURN",
    snippet: {
      go: { start: /^\s*func\s+validateCode\b/ },
      python: { start: /^\s*def\s+validate_code\b/ },
      javascript: { start: /^\s*(function\s+validateCode\b|(const|let|var)\s+validateCode\b)/ },
    },
    fallback: {
      go: "func validateCode(codes ...int) (int, bool) {\n    total := sumCodes(codes...)\n    return total, total > 100\n}",
      python: "def validate_code(*codes):\n    total = sum_codes(*codes)\n    return total, total > 100",
      javascript: "function validateCode(...codes) {\n  const total = sumCodes(...codes);\n  return [total, total > 100];\n}",
    },
    why: "name a job once and it works for any inputs. returning two values answers \"how much\" and \"is it ok\" together.",
    useIt: "order totals with a limit check, password rules, checksums — compute something, then judge it.",
    transfer: {
      question: "a new junction only opens for totals over 200. what has to change?",
      options: [
        { label: "the limit inside the validator", correct: true, reply: "right. summing doesn't care about the rule — only the check that judges the total changes." },
        { label: "the summing function", correct: false, reply: "the sum adds whatever it's given. the rule lives in the validator, so that's the one line to change." },
      ],
    },
  },
  "chapter-04": {
    headline: "You used a lookup to find what's missing.",
    pattern: "COLLECT → CHECK MEMBERSHIP → FIRST GAP",
    snippet: {
      go: { start: /^\s*func\s+findClearFloor\b/ },
      python: { start: /^\s*def\s+find_clear_floor\b/ },
      javascript: { start: /^\s*(function\s+findClearFloor\b|(const|let|var)\s+findClearFloor\b)/ },
    },
    fallback: {
      go: 'func findClearFloor(guards map[string]string, maxFloor int) string {\n    occupied := map[string]bool{}\n    for _, floor := range guards {\n        occupied[floor] = true\n    }\n    for i := 1; i <= maxFloor; i++ {\n        name := fmt.Sprintf("Floor %d", i)\n        if !occupied[name] {\n            return name\n        }\n    }\n    return ""\n}',
      python: 'def find_clear_floor(guards, max_floor):\n    occupied = set(guards.values())\n    for i in range(1, max_floor + 1):\n        name = f"Floor {i}"\n        if name not in occupied:\n            return name\n    return ""',
      javascript: 'function findClearFloor(guards, maxFloor) {\n  const occupied = new Set(Object.values(guards));\n  for (let i = 1; i <= maxFloor; i++) {\n    const name = `Floor ${i}`;\n    if (!occupied.has(name)) return name;\n  }\n  return "";\n}',
    },
    why: "collect what's taken into a lookup, then walk the options and return the first one that isn't.",
    useIt: "finding a free meeting room, an unused username, the next open port.",
    transfer: {
      question: "a fifth floor opens up. what has to change?",
      options: [
        { label: "call it with 5 floors", correct: true, reply: "right. the function walks however many floors it's told to — the count is an input." },
        { label: "rewrite the loop", correct: false, reply: "the loop already takes the floor count as a parameter. pass 5 and it covers the new floor." },
      ],
    },
  },
  "chapter-04.2": {
    headline: "You turned untrusted text into a number — and handled the failure.",
    pattern: "PARSE → CHECK THE ERROR → FORMAT",
    snippet: {
      go: { start: /^\s*func\s+relayHeader\b/ },
      python: { start: /^\s*def\s+relay_header\b/ },
      javascript: { start: /^\s*(function\s+relayHeader\b|(const|let|var)\s+relayHeader\b)/ },
    },
    fallback: {
      go: 'func relayHeader(floor int, code string) string {\n    n, err := strconv.Atoi(code)\n    if err != nil {\n        return "F" + strconv.Itoa(floor) + "-ERR"\n    }\n    return "F" + strconv.Itoa(floor) + "-C" + strconv.Itoa(n*2)\n}',
      python: 'def relay_header(floor, code):\n    try:\n        n = int(code)\n    except ValueError:\n        return f"F{floor}-ERR"\n    return f"F{floor}-C{n * 2}"',
      javascript: 'function relayHeader(floor, code) {\n  const n = Number(code);\n  if (Number.isNaN(n)) return `F${floor}-ERR`;\n  return `F${floor}-C${n * 2}`;\n}',
    },
    why: "input from outside can be wrong. convert it, check whether that worked, and only then use it.",
    useIt: "form fields, query strings, spreadsheet columns — anything a person typed.",
    transfer: {
      question: "floor 2's code arrives as \"7x\". what should the header be?",
      options: [
        { label: "F2-ERR", correct: true, reply: "right. \"7x\" isn't a number, so the conversion fails and the error branch answers." },
        { label: "F2-C14", correct: false, reply: "that reads \"7x\" as 7 — a guess. it isn't a valid number, so the honest answer is the error." },
      ],
    },
  },
};

export function takeawayFor(chapterId: string): ChapterTakeaway | undefined {
  return TAKEAWAYS[chapterId];
}
