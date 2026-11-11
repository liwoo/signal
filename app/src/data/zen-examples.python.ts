import type { ZenExample } from "./zen-examples";

// Before → after for every Python zen rule (src/lib/game/zen-python.ts), Acts I–III.
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
    before: 'print("CELL " + cellblock.CELL + " - SUBLEVEL " + str(cellblock.SUBLEVEL))',
    after: 'print(f"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")',
    change: "an f-string — values in braces, numbers converted for you",
  },
  py_qualified_import: {
    before: 'from cellblock import CELL, SUBLEVEL\n\nprint(f"CELL {CELL} - SUBLEVEL {SUBLEVEL}")',
    after: 'import cellblock\n\nprint(f"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")',
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
  py_line_length: {
    before: 'roster = {"Chen": "Floor 1", "Alvarez": "Floor 2", "Volkov": "Floor 2", "Park": "Floor 3"}',
    after: 'roster = {\n    "Chen": "Floor 1",\n    "Alvarez": "Floor 2",\n    "Volkov": "Floor 2",\n    "Park": "Floor 3",\n}',
    change: "break long lines inside their brackets — 79 characters at most",
  },
  py_dict_literal: {
    before: 'def build_roster():\n    roster = {}\n    roster["Chen"] = "Floor 1"\n    roster["Park"] = "Floor 3"\n    return roster',
    after: 'def build_roster():\n    return {\n        "Chen": "Floor 1",\n        "Park": "Floor 3",\n    }',
    change: "write the whole dict in one literal",
  },
  py_one_pair_per_line: {
    before: 'return {"Chen": "Floor 1", "Alvarez": "Floor 2", "Volkov": "Floor 2"}',
    after: 'return {\n    "Chen": "Floor 1",\n    "Alvarez": "Floor 2",\n    "Volkov": "Floor 2",\n}',
    change: "one pair per line, a comma after each — the next one is a one-line change",
  },
  py_set_membership: {
    before: "occupied = list(guards.values())\nif name not in occupied:",
    after: "occupied = set(guards.values())\nif name not in occupied:",
    change: "a set answers `in` at once and holds each floor once",
  },
  py_dict_values: {
    before: "for name in guards:\n    occupied.add(guards[name])",
    after: "occupied = set(guards.values())",
    change: "ask for the values — you never needed the names",
  },
  py_not_in: {
    before: "if not name in occupied:",
    after: "if name not in occupied:",
    change: "`not in` is one operator and reads like english",
  },
  py_blank_line_limit: {
    before: 'print("Hello World")\n\n\n\nprint("relay online")',
    after: 'print("Hello World")\n\nprint("relay online")',
    change: "two blank lines at most",
  },
  py_slice_reverse: {
    before: 'def reverse_word(s):\n    out = ""\n    for ch in s:\n        out = ch + out\n    return out',
    after: "def reverse_word(s):\n    return s[::-1]",
    change: "a slice with step -1 is the whole reversal",
  },
  py_no_range_len: {
    before: 'for i in range(len(s)):\n    out = s[i] + out',
    after: "for ch in s:\n    out = ch + out",
    change: "loop over the characters, not their positions",
  },
  py_join_words: {
    before: 'out = ""\nfor w in words:\n    out += reverse_word(w) + " "',
    after: 'out = " ".join(reverse_word(w) for w in words)',
    change: "join puts spaces only between the words",
  },
  py_split_whitespace: {
    before: 'words = msg.split(" ")',
    after: "words = msg.split()",
    change: "no argument — split on any whitespace, no empty words",
  },
  py_comprehension_join: {
    before: 'result = []\nfor w in msg.split():\n    result.append(reverse_word(w))\nreturn " ".join(result)',
    after: 'return " ".join(reverse_word(w) for w in msg.split())',
    change: "the loop moves inside the join",
  },
  py_narrow_except: {
    before: 'try:\n    n = int(code)\nexcept:\n    return f"F{floor}-ERR"',
    after: 'try:\n    n = int(code)\nexcept ValueError:\n    return f"F{floor}-ERR"',
    change: "catch the error you expect, not every error",
  },
  py_small_try: {
    before: 'try:\n    n = int(code)\n    return f"F{floor}-C{n * 2}"\nexcept ValueError:\n    return f"F{floor}-ERR"',
    after: 'try:\n    n = int(code)\nexcept ValueError:\n    return f"F{floor}-ERR"\nreturn f"F{floor}-C{n * 2}"',
    change: "only the line that can fail goes inside the try",
  },
  py_fstring_header: {
    before: 'return "F" + str(floor) + "-C" + str(n * 2)',
    after: 'return f"F{floor}-C{n * 2}"',
    change: "an f-string reads like the header it builds",
  },
  // ── Act III ──
  py_spaces_not_tabs: {
    before: 'def scan(d):\n\tprint("scanned:", d)',
    after: 'def scan(d):\n    print("scanned:", d)',
    change: "indent with four spaces, never a tab",
  },
  py_nonlocal_counter: {
    before: "count = [0]\n\ndef scan(d):\n    count[0] += 1",
    after: "count = 0\n\ndef scan(d):\n    nonlocal count\n    count += 1",
    change: "say which outer name the closure changes",
  },
  py_finally_log: {
    before: 'def scan(d):\n    for entry in archive[d]:\n        ...\n    print("scanned:", d)',
    after: 'def scan(d):\n    try:\n        for entry in archive[d]:\n            ...\n    finally:\n        print("scanned:", d)',
    change: "the log runs on the way out, whatever happens",
  },
  py_endswith: {
    before: 'if entry[-1] == "/":',
    after: 'if entry.endswith("/"):',
    change: "ask the string in words",
  },
  py_except_per_call: {
    before: 'try:\n    scan(root)\nexcept Exception as e:\n    errors.append(f"{root}: {e}")',
    after: 'def scan(d):\n    try:\n        ...\n    except Exception as e:\n        errors.append(f"{d}: {e}")',
    change: "each directory catches its own error",
  },
  py_specific_raise: {
    before: 'raise Exception("corrupted directory")',
    after: 'raise RuntimeError("corrupted directory")',
    change: "name the kind of trouble",
  },
  py_is_none: {
    before: "if archive[d] == None:",
    after: "if archive[d] is None:",
    change: "check for None by identity",
  },
  py_unused_import: {
    before: 'import asyncio\n\nprint("Hello World")',
    after: 'print("Hello World")',
    change: "import it in the step that uses it",
  },
  py_no_space_inside_brackets: {
    before: 'print( "Hello World" )',
    after: 'print("Hello World")',
    change: "no padding just inside the brackets",
  },
  py_task_reference: {
    before: "def cut_async(name):\n    asyncio.create_task(cut(name))",
    after: "def cut_async(name):\n    return asyncio.create_task(cut(name))",
    change: "hand the task back instead of dropping it",
  },
  py_asyncio_namespace: {
    before: "from asyncio import create_task\n\ncreate_task(cut(name))",
    after: "import asyncio\n\nasyncio.create_task(cut(name))",
    change: "keep the event-loop tools under asyncio",
  },
  py_gather_not_loop: {
    before: "lines = []\nfor n in circuits:\n    lines.append(await trip(n))",
    after: "lines = await asyncio.gather(*(trip(n) for n in circuits))",
    change: "start them all, then wait once",
  },
  py_gather_results: {
    before: "lines = []\nfor line in await asyncio.gather(*tasks):\n    lines.append(line)\nreturn lines",
    after: "return await asyncio.gather(*tasks)",
    change: "gather already returns the list, in order",
  },
  py_async_sleep: {
    before: "async def trip_timed(n, d):\n    time.sleep(d / 1000)",
    after: "async def trip_timed(n, d):\n    await asyncio.sleep(d / 1000)",
    change: "await the sleep so the others get their turn",
  },
  py_zip_pairs: {
    before: "for i in range(len(circuits)):\n    trip_timed(circuits[i], delays[i])",
    after: "for n, d in zip(circuits, delays):\n    trip_timed(n, d)",
    change: "walk the two lists side by side",
  },
  py_no_extra_parens: {
    before: 'print(("Hello World"))',
    after: 'print("Hello World")',
    change: "drop the brackets that only wrap",
  },
  py_hail_plain_def: {
    before: "async def hail(team, delay_ms):\n    await asyncio.sleep(delay_ms / 1000)\n    return f\"{team} responding\"",
    after: "def hail(team, delay_ms):\n    async def respond():\n        await asyncio.sleep(delay_ms / 1000)\n        return f\"{team} responding\"\n\n    return asyncio.create_task(respond())",
    change: "hail schedules, respond waits",
  },
  py_ms_to_seconds: {
    before: "await asyncio.sleep(delay_ms // 1000)",
    after: "await asyncio.sleep(delay_ms / 1000)",
    change: "one slash keeps the fraction of a second",
  },
  py_cancel_losers: {
    before: "done, pending = await asyncio.wait(teams, return_when=asyncio.FIRST_COMPLETED)\nreturn done.pop().result()",
    after: "done, pending = await asyncio.wait(teams, return_when=asyncio.FIRST_COMPLETED)\nfor t in pending:\n    t.cancel()\nreturn done.pop().result()",
    change: "stop the tasks that lost the race",
  },
  py_unpack_wait: {
    before: "result = await asyncio.wait(teams, return_when=asyncio.FIRST_COMPLETED)\nreturn result[0].pop().result()",
    after: "done, pending = await asyncio.wait(teams, return_when=asyncio.FIRST_COMPLETED)\nreturn done.pop().result()",
    change: "name both sets the wait hands back",
  },
  py_sweep_plain_def: {
    before: "async def sweep(task):\n    if task.done():\n        return task.result()\n    return \"channel silent\"",
    after: "def sweep(task):\n    if task.done():\n        return task.result()\n    return \"channel silent\"",
    change: "a glance never waits, so it isn't async",
  },
  py_timeout_from_param: {
    before: "await asyncio.wait(teams, timeout=0.2, return_when=asyncio.FIRST_COMPLETED)",
    after: "await asyncio.wait(teams, timeout=timeout_ms / 1000, return_when=asyncio.FIRST_COMPLETED)",
    change: "the deadline comes from the caller",
  },
  py_empty_falsy: {
    before: 'if len(done) == 0:\n    return "NO CONTACT"',
    after: 'if not done:\n    return "NO CONTACT"',
    change: "an empty set is already false",
  },
};
