import type { ZenExample } from "./zen-examples";

// Before → after for every Python zen rule (src/lib/game/zen-python.ts).
export const PYTHON_ZEN_EXAMPLES: Record<string, ZenExample> = {
  py_no_semicolon: {
    before: 'print("Hello World");',
    after: 'print("Hello World")',
    change: "drop the semicolon — the end of the line ends the statement",
  },
  py_no_space_before_paren: {
    before: 'print ("Hello World")',
    after: 'print("Hello World")',
    change: "no space between a function and its brackets",
  },
  py_flat_top_level: {
    before: 'def main():\n    print("Hello World")\n\nmain()',
    after: 'print("Hello World")',
    change: "no wrapper needed — the file is the program",
  },
  py_no_trailing_whitespace: {
    before: 'print("Hello World")   ',
    after: 'print("Hello World")',
    change: "trim the invisible spaces at the end of the line",
  },
  py_consistent_quotes: {
    before: "print('Hello')\nprint(\"World\")",
    after: 'print("Hello")\nprint("World")',
    change: "pick one quote style and keep it",
  },
  py_comment_space: {
    before: '#open the panel\nprint("Hello World")',
    after: '# open the panel\nprint("Hello World")',
    change: "a space after the hash — comments read like notes",
  },
  py_fstring: {
    before: 'print("CELL " + cellblock.CELL + " · SUBLEVEL " + str(cellblock.SUBLEVEL))',
    after: 'print(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")',
    change: "an f-string — values in braces, numbers converted for you",
  },
  py_qualified_import: {
    before: 'from cellblock import CELL, SUBLEVEL\n\nprint(f"CELL {CELL} · SUBLEVEL {SUBLEVEL}")',
    after: 'import cellblock\n\nprint(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")',
    change: "keep the module name in front — the reader sees where it came from",
  },
  py_imports_at_top: {
    before: 'import cellblock\nprint(cellblock.CELL)',
    after: 'import cellblock\n\nprint(cellblock.CELL)',
    change: "imports first, then a blank line, then the work",
  },
  py_range_start_stop: {
    before: "for i in range(10):\n    print(i + 1)",
    after: "for i in range(1, 11):\n    print(i)",
    change: "give range both ends — no + 1 patching in the body",
  },
  py_four_space_indent: {
    before: "for i in range(1, 11):\n  print(i)",
    after: "for i in range(1, 11):\n    print(i)",
    change: "four spaces per level — the indentation is the structure",
  },
  py_elif_chain: {
    before: 'if i <= 3:\n    print(i, "DENY")\nelse:\n    if i <= 6:\n        print(i, "WARN")',
    after: 'if i <= 3:\n    print(i, "DENY")\nelif i <= 6:\n    print(i, "WARN")',
    change: "elif keeps the ladder flat — first true branch wins",
  },
  py_operator_spacing: {
    before: "if i<=3:",
    after: "if i <= 3:",
    change: "a space on each side of a comparison",
  },
  py_print_separator: {
    before: 'print(str(i) + " DENY")',
    after: 'print(i, "DENY")',
    change: "give print both values — it adds the space",
  },
  py_data_over_branches: {
    before: 'if i <= 3:\n    print(i, "DENY")\nelif i <= 6:\n    print(i, "WARN")',
    after: 'levels = {1: "DENY", 2: "DENY", 3: "DENY", 4: "WARN"}\nprint(i, levels[i])',
    change: "a table holds the answers — the loop just looks them up",
  },
  py_dict_trailing_comma: {
    before: 'levels = {\n    9: "GRANT",\n    10: "OVERRIDE"\n}',
    after: 'levels = {\n    9: "GRANT",\n    10: "OVERRIDE",\n}',
    change: "a trailing comma — the next entry only touches one line",
  },
  py_pure_function: {
    before: "def sum_codes(*codes):\n    total = sum(codes)\n    print(total)",
    after: "def sum_codes(*codes):\n    return sum(codes)",
    change: "return the value — let the caller decide what to print",
  },
  py_sum_builtin: {
    before: "total = 0\nfor c in codes:\n    total += c\nreturn total",
    after: "return sum(codes)",
    change: "the built-in sum() already is that loop",
  },
  py_augmented_assign: {
    before: "total = total + c",
    after: "total += c",
    change: "+= writes the name once",
  },
  py_direct_bool_return: {
    before: "if total > 100:\n    return total, True\nelse:\n    return total, False",
    after: "return total, total > 100",
    change: "the comparison already is True or False — return it",
  },
  py_reuse_unpack: {
    before: "def validate_code(*codes):\n    total = 0\n    for c in codes:\n        total += c",
    after: "def validate_code(*codes):\n    total = sum_codes(*codes)",
    change: "reuse sum_codes and spread the tuple back in with *",
  },
  py_tuple_unpacking: {
    before: "result = validate_code(25, 30)\nprint(result[0], result[1])",
    after: "s, v = validate_code(25, 30)\nprint(s, v)",
    change: "unpack the tuple into names, not positions",
  },
};
