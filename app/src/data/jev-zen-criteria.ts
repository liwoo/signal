// ── Jev zen criteria ──
// The neutral yes/no questions Jev (TypeSafe's decision model) answers about a
// player's code, keyed by zen rule id. Maya's `jolt`/`suggestion` lines are
// in-character story text; these are the rubric — plain, specific, judged
// against the code alone.
//
// Only SEMANTIC rules are listed. Formatting rules (blank lines, quotes,
// semicolons, indentation, spacing) are decided exactly by the heuristics in
// zen*.ts and never sent to Jev.
//
// `follows` — "does the code follow the idiom?" (true = earns the zen XP)
// `relevant` — optional "does the rule even apply to this code?" For rules
//   whose heuristic relevance gate is a guess about the player's intent (did
//   they choose a switch? a branch ladder?), not a structural fact.

export interface JevZenCriterion {
  follows: string;
  relevant?: string;
}

export const JEV_ZEN_CRITERIA: Record<string, JevZenCriterion> = {
  // ── Go ──
  use_named_values: {
    follows:
      "Does the code store the imported package values (cellblock.Cell, cellblock.Sublevel) in its own named variables or constants before printing them, instead of only passing them straight into the print call?",
  },
  use_printf_format: {
    follows:
      "Does the code print the whole line from a single fmt.Printf format string with verbs like %s and %d (template separate from data), rather than gluing pieces with + or passing several separate arguments to Println?",
  },
  descriptive_names: {
    follows:
      "Do the variables the player declared have names that say what they hold (like cell, sublevel), rather than single letters or meaningless names like x, a, tmp, val?",
    relevant: "Does the code declare at least one variable or constant of its own?",
  },
  use_constants_labels: {
    follows:
      "Are the access labels (DENY, WARN, GRANT, OVERRIDE) defined once as named constants and referenced by name, rather than written as repeated string literals inside the branches?",
  },
  switch_over_ifelse: {
    follows:
      "Is the classification written as a Go switch statement whose case clauses each test a condition (for example `switch { case i <= 3: ... }`), reading like a truth table?",
    relevant:
      "Does the code classify values using a Go switch statement with case clauses (as opposed to an if / else if chain)?",
  },
  no_unnecessary_break: {
    follows:
      "Inside the switch statement, does every case end without a redundant `break` statement? (A `break` used to exit a for loop does not count.)",
    relevant: "Does the code contain a Go switch statement?",
  },
  short_var_loop: {
    follows:
      "Does the range loop use a short variable name (one or two letters, like c or v) for the value it iterates over, as Go style prefers for small scopes?",
  },
  underscore_unused: {
    follows:
      "If the range loop's index is never used, is it discarded with the blank identifier `_` (for example `for _, c := range codes`)? Answer true also if the loop only declares the value or genuinely uses the index.",
  },
  single_purpose: {
    follows:
      "Does the sumCodes function only compute and return the sum, with no printing or other side effects inside it?",
  },
  direct_bool_return: {
    follows:
      "Does validateCode return the comparison result directly (like `return total, total > 100`) instead of using an if/else that returns true and false literals?",
  },
  reuse_functions: {
    follows:
      "Does validateCode get its total by calling the existing sumCodes function, rather than re-implementing the summing loop?",
  },
  slice_indexing: {
    follows:
      "Does the code find positions in the slice using len(...) (for example codes[len(codes)-1]) rather than hardcoded numeric indexes for the last elements?",
  },
  delta_computation: {
    follows:
      "Does the code compute the differences between consecutive elements (codes[i] - codes[i-1]) to find the pattern?",
  },
  early_return: {
    follows:
      "Does the prediction function guard against a too-short slice (fewer than two elements) with an early return before its main logic?",
  },
  named_variables: {
    follows:
      "Are the intermediate values (like the difference between codes) stored in descriptively named variables such as delta, diff or step, rather than single letters like d or x?",
  },

  // ── Python ──
  py_flat_top_level: {
    follows:
      "Is the program written as plain top-level statements, without wrapping everything in a def main() function?",
  },
  py_fstring: {
    follows:
      "Does the code build the printed text with an f-string (f\"...{value}...\") rather than concatenating with + and str() or using % / .format()?",
  },
  py_qualified_import: {
    follows:
      "Does the code `import cellblock` and refer to values as cellblock.NAME, rather than using `from cellblock import ...`?",
  },
  py_range_start_stop: {
    follows:
      "Does the loop give range() both a start and a stop (like range(1, 11)) so the loop variable is the value itself, with no +1 arithmetic inside the loop?",
  },
  py_elif_chain: {
    follows:
      "Are the conditions written as one flat if / elif / else ladder, rather than separate independent if statements or an if nested under an else?",
    relevant: "Does the code choose between several outcomes with if/elif/else conditions?",
  },
  py_print_separator: {
    follows:
      "Does the code pass the number and the label to print() as separate arguments (print(i, \"DENY\")) rather than gluing them into one string with + and str()?",
  },
  py_data_over_branches: {
    follows:
      "Does the code look the label up in a dict (levels[i]) instead of still deciding it with if/elif branches?",
  },
  py_sum_builtin: {
    follows: "Does sum_codes use Python's built-in sum() rather than a manual accumulation loop?",
  },
  py_pure_function: {
    follows: "Does sum_codes return the total without printing anything inside the function?",
  },
  py_augmented_assign: {
    follows: "Where the code adds to a running total, does it use augmented assignment (total += c) rather than total = total + c?",
  },
  py_direct_bool_return: {
    follows:
      "Does validate_code return the comparison itself (like `return total, total > 100`) rather than an if/else returning True and False?",
  },
  py_reuse_unpack: {
    follows: "Does validate_code compute its total by calling sum_codes(*codes) rather than re-implementing the sum?",
  },
  py_tuple_unpacking: {
    follows:
      "Is the result of validate_code unpacked straight into named variables (like `s, v = validate_code(...)`) rather than indexed with [0] and [1]?",
  },

  // ── JavaScript ──
  js_top_level: {
    follows: "Is the program written as top-level statements, without wrapping it in a main() function that is then called?",
  },
  js_template_literal: {
    follows:
      "Does the code build the printed line with a template literal (`...${value}...`) rather than concatenating strings with +?",
  },
  js_named_imports: {
    follows: "Does the code import exactly the names it uses with a named import (import { cell, sublevel } from ...)?",
  },
  js_const_default: {
    follows: "Is every variable that is never reassigned declared with const (using let only for values that change, and never var)?",
  },
  js_let_counter: {
    follows: "Is the loop counter declared with let inside the for-loop header (for (let i = 1; ...))?",
  },
  js_exclusive_branches: {
    follows:
      "Are the classification conditions one chain (if / else if / else, or a switch) so that exactly one branch runs, rather than separate independent if statements?",
    relevant: "Does the code choose between several labels using if/else conditions or a switch?",
  },
  js_catch_all: {
    follows:
      "Does the branch chain end with a final catch-all (a plain else, or default: in a switch) that handles every remaining value?",
    relevant: "Does the code choose between several labels using if/else conditions or a switch?",
  },
  js_switch_break: {
    follows: "Inside the switch, does every case except the last end with break (no accidental fall-through)?",
    relevant: "Does the code contain a JavaScript switch statement?",
  },
  js_rest_params: {
    follows: "Does sumCodes take its values with a rest parameter (function sumCodes(...codes)) rather than using the arguments object?",
  },
  js_for_of: {
    follows: "Does the summing loop iterate the values directly with for...of (or a reduce) rather than an index-based for loop?",
  },
  js_pure_function: {
    follows: "Does sumCodes only compute and return the sum, with no console.log inside it?",
  },
  js_direct_bool: {
    follows:
      "Does validateCode return the comparison directly (like `return [total, total > 100]`) rather than an if/else returning true and false?",
  },
  js_reuse_sum: {
    follows: "Does validateCode compute its total by calling sumCodes(...codes) rather than re-implementing the loop?",
  },
  js_destructure: {
    follows:
      "Is the pair returned by validateCode destructured into named constants (const [total, valid] = ...) rather than indexed with [0] and [1]?",
  },
};
