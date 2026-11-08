import { describe, test, expect } from "vitest";
import { processKey, keyFromEvent, KEY_ESCAPE, KEY_REDO, visualRange, type VimOutput } from "./engine";

// ── Harness ──
// Keys are given as an array so named keys (Escape, <C-r>, Shift) can be mixed
// with characters; a plain string is split into single characters.

function start(code: string, pos: number): VimOutput {
  const r = processKey({ code, pos, mode: "normal", pending: "", yank: "", yankLinewise: false, undoStack: [], key: "" });
  return { ...r, code, pos, pending: "" };
}

function press(state: VimOutput, keys: string | string[]): VimOutput {
  const list = typeof keys === "string" ? [...keys] : keys;
  let s = state;
  for (const key of list) s = processKey({ ...s, key });
  return s;
}

function run(code: string, pos: number, keys: string | string[]): VimOutput {
  return press(start(code, pos), keys);
}

/** Simulate typing in insert mode (the textarea does this natively). */
function type(state: VimOutput, text: string): VimOutput {
  const code = state.code.slice(0, state.pos) + text + state.code.slice(state.pos);
  return { ...state, code, pos: state.pos + text.length };
}

const GO = `package main

import "fmt"

func main() {
    fmt.Println("hello")
    fmt.Println("world")
}`;

// ── Counts ──

describe("counts", () => {
  const five = "one\ntwo\nthree\nfour\nfive\nsix";

  test("4dd deletes four lines", () => {
    const r = run(five, 0, "4dd");
    expect(r.code).toBe("five\nsix");
    expect(r.yank).toBe("one\ntwo\nthree\nfour");
    expect(r.yankLinewise).toBe(true);
  });

  test("d4d is the same as 4dd", () => {
    expect(run(five, 0, "d4d").code).toBe("five\nsix");
  });

  test("dd4 runs dd, then 4 waits as a count", () => {
    const r = run(five, 0, "dd4");
    expect(r.code).toBe("two\nthree\nfour\nfive\nsix");
    expect(r.pending).toBe("4");
    expect(press(r, "j").pos).toBe(run("two\nthree\nfour\nfive\nsix", 0, "4j").pos);
  });

  test("count larger than the buffer deletes to the end", () => {
    expect(run(five, 8, "99dd").code).toBe("one\ntwo");
  });

  test("2d2j multiplies counts (5 lines)", () => {
    expect(run(five, 0, "2d2j").code).toBe("six");
  });

  test("d2j deletes three lines", () => {
    expect(run(five, 4, "d2j").code).toBe("one\nfive\nsix");
  });

  test("dk deletes current and previous line", () => {
    expect(run(five, 4, "dk").code).toBe("three\nfour\nfive\nsix");
  });

  test("dj on the last line does nothing", () => {
    const r = run("a\nb", 2, "dj");
    expect(r.code).toBe("a\nb");
    expect(r.codeChanged).toBe(false);
  });

  test("5j moves five lines down", () => {
    const r = run(five, 0, "5j");
    expect(r.code.slice(r.pos, r.pos + 3)).toBe("six");
  });

  test("10j clamps to the last line", () => {
    const r = run(five, 0, "10j");
    expect(r.code.slice(r.pos)).toBe("six");
  });

  test("3x deletes three chars", () => {
    const r = run("abcdef", 1, "3x");
    expect(r.code).toBe("aef");
    expect(r.yank).toBe("bcd");
  });

  test("3x near the line end stops at the newline", () => {
    expect(run("abc\ndef", 1, "5x").code).toBe("a\ndef");
  });

  test("d3w deletes three words", () => {
    expect(run("a b c d e", 0, "d3w").code).toBe("d e");
  });

  test("3w moves three words", () => {
    expect(run("a b c d e", 0, "3w").pos).toBe(6);
  });

  test("2p pastes twice", () => {
    const r = run("ab", 0, "yl2p");
    expect(r.code).toBe("aaab");
  });

  test("3G / 2gg jump to a line", () => {
    expect(run(five, 0, "3G").pos).toBe(8);
    expect(run(five, 20, "2gg").pos).toBe(4);
  });

  test("10 is a count, 0 alone is a motion", () => {
    const r = run("abcdefghijklmnop", 0, "10l");
    expect(r.pos).toBe(10);
    expect(run("abcdef", 4, "0").pos).toBe(0);
  });
});

// ── Text objects ──

describe("text objects", () => {
  test("ciw changes the word under the cursor", () => {
    const r = run("foo bar baz", 5, "ciw");
    expect(r.code).toBe("foo  baz");
    expect(r.pos).toBe(4);
    expect(r.mode).toBe("insert");
  });

  test("diw on whitespace deletes the whitespace run", () => {
    expect(run("foo   bar", 4, "diw").code).toBe("foobar");
  });

  test("daw takes the trailing space", () => {
    expect(run("foo bar baz", 5, "daw").code).toBe("foo baz");
  });

  test("ciW treats punctuation as part of the WORD", () => {
    expect(run("x fmt.Println(y) z", 4, "ciW").code).toBe("x  z");
  });

  test("ci{ on a Go function body empties it and indents the blank line", () => {
    const pos = GO.indexOf("fmt.Println(\"world");
    const r = run(GO, pos, "ci{");
    expect(r.mode).toBe("insert");
    expect(r.code).toBe(`package main\n\nimport "fmt"\n\nfunc main() {\n    \n}`);
    expect(r.pos).toBe(r.code.indexOf("{\n") + 2 + 4);
  });

  test("di{ removes the body lines and keeps the braces", () => {
    const r = run(GO, GO.indexOf("hello"), "di{");
    expect(r.code).toBe(`package main\n\nimport "fmt"\n\nfunc main() {\n}`);
    expect(r.yankLinewise).toBe(true);
  });

  test("ci{ works with the cursor on the brace itself", () => {
    const r = run(GO, GO.indexOf("{"), "ci{");
    expect(r.code.endsWith("func main() {\n    \n}")).toBe(true);
  });

  test("ci} and ciB are aliases", () => {
    const pos = GO.indexOf("hello");
    expect(run(GO, pos, "ci}").code).toBe(run(GO, pos, "ci{").code);
    expect(run(GO, pos, "ciB").code).toBe(run(GO, pos, "ci{").code);
  });

  test("ci{ on an inline block is charwise", () => {
    const r = run("if x { return 1 }", 10, "ci{");
    expect(r.code).toBe("if x {}");
    expect(r.pos).toBe(6);
  });

  test("ci{ on an empty multi-line block opens an indented line", () => {
    const r = run("func f() {\n}", 9, "ci{");
    expect(r.code).toBe("func f() {\n    \n}");
    expect(r.pos).toBe(15);
  });

  test("ci( changes call arguments", () => {
    const r = run('fmt.Println("hi", x)', 14, "ci(");
    expect(r.code).toBe("fmt.Println()");
    expect(r.pos).toBe(12);
  });

  test("2di( reaches the outer parens", () => {
    expect(run("f(a, g(b))", 7, "2di(").code).toBe("f()");
  });

  test("ci\" from before the string jumps into the first string on the line", () => {
    const r = run('fmt.Println("hello")', 0, 'ci"');
    expect(r.code).toBe('fmt.Println("")');
    expect(r.pos).toBe(13);
  });

  test("ci\" with the cursor on the closing quote", () => {
    expect(run('a("x") + b("y")', 4, 'ci"').code).toBe('a("") + b("y")');
  });

  test("ci\" picks the string the cursor is in, not an earlier one", () => {
    expect(run('a("x") + b("yy")', 13, 'ci"').code).toBe('a("x") + b("")');
  });

  test("da\" takes the trailing space", () => {
    expect(run('say "hi" now', 5, 'da"').code).toBe("say now");
  });

  test("yi( yanks without changing the buffer", () => {
    const r = run("f(abc)", 3, "yi(");
    expect(r.yank).toBe("abc");
    expect(r.code).toBe("f(abc)");
    expect(r.pos).toBe(2);
  });

  test("da[ deletes brackets too", () => {
    expect(run("x := a[i+1]", 8, "da[").code).toBe("x := a");
  });

  test("dip deletes the paragraph", () => {
    expect(run("a\nb\n\nc", 0, "dip").code).toBe("\nc");
  });

  test("a failed text object is a no-op", () => {
    const r = run("no brackets", 3, "ci(");
    expect(r.code).toBe("no brackets");
    expect(r.mode).toBe("normal");
    expect(r.pending).toBe("");
  });
});

// ── Shift and other modifier keys never break a command ──

describe("modifier keys mid-command", () => {
  test("ci Shift { works (Shift keydown arrives before {)", () => {
    const r = run(GO, GO.indexOf("hello"), ["c", "i", "Shift", "{"]);
    expect(r.mode).toBe("insert");
    expect(r.code.endsWith("func main() {\n    \n}")).toBe(true);
  });

  test("d Shift $ deletes to end of line", () => {
    expect(run("hello world", 5, ["d", "Shift", "$"]).code).toBe("hello");
  });

  test("y Shift G yanks to the end", () => {
    const r = run("a\nb\nc", 0, ["y", "Shift", "G"]);
    expect(r.yank).toBe("a\nb\nc");
  });

  test("Control / Alt / Meta keydowns keep pending", () => {
    const r = run("abc", 0, ["d", "Control", "Alt", "Meta"]);
    expect(r.pending).toBe("d");
  });
});

// ── Motions inside operators ──

describe("operator + motion", () => {
  test("dw on the last word of a line doesn't join lines", () => {
    expect(run("foo bar\nbaz", 4, "dw").code).toBe("foo \nbaz");
  });

  test("dw on the last word of the buffer deletes it", () => {
    expect(run("hello", 0, "dw").code).toBe("");
  });

  test("cw on the last char of a word changes just that char", () => {
    expect(run("ab cd", 1, "cw").code).toBe("a cd");
  });

  test("c2w changes two words", () => {
    expect(run("a bb cc dd", 2, "c2w").code).toBe("a  dd");
  });

  test("dt) deletes up to the paren", () => {
    expect(run("f(abc)", 2, "dt)").code).toBe("f()");
  });

  test("df, deletes through the comma", () => {
    expect(run("a, b, c", 0, "df,").code).toBe(" b, c");
  });

  test("cf, with Shift is still fine", () => {
    expect(run("a, b", 0, ["c", "f", ","]).code).toBe(" b");
  });

  test("d$ / D / C", () => {
    expect(run("abc def", 3, "d$").code).toBe("abc");
    expect(run("abc def", 3, "C").mode).toBe("insert");
  });

  test("d0 deletes to line start", () => {
    expect(run("abc def", 4, "d0").code).toBe("def");
  });

  test("d^ deletes back to first non-blank", () => {
    expect(run("    abc def", 8, "d^").code).toBe("    def");
  });

  test("dG deletes to the end of the buffer (linewise)", () => {
    expect(run("a\nb\nc", 2, "dG").code).toBe("a");
  });

  test("dgg deletes to the top", () => {
    expect(run("a\nb\nc", 2, "dgg").code).toBe("c");
  });

  test("d% deletes a bracket pair", () => {
    expect(run("x(a(b)) y", 1, "d%").code).toBe("x y");
  });

  test("d} deletes to the paragraph break", () => {
    expect(run("a\nb\n\nc", 0, "d}").code).toBe("\n\nc");
  });

  test("yw keeps the cursor, y$ yanks to end", () => {
    const r = run("hello world", 0, "y$");
    expect(r.yank).toBe("hello world");
    expect(r.pos).toBe(0);
  });

  test("ge moves to previous word end", () => {
    expect(run("foo bar", 5, "ge").pos).toBe(2);
  });

  test("; and , repeat the last find", () => {
    const r1 = run("a,b,c,d", 0, "f,");
    expect(r1.pos).toBe(1);
    const r2 = press(r1, ";");
    expect(r2.pos).toBe(3);
    const r3 = press(r2, ",");
    expect(r3.pos).toBe(1);
  });

  test("; after t steps past the adjacent match", () => {
    const r = run("a,b,c", 0, "t,;");
    expect(r.pos).toBe(2);
  });

  test("% searches forward on the line for a bracket", () => {
    expect(run("if (x) {", 0, "%").pos).toBe(5);
  });
});

// ── Indent, join, paste ──

describe("indent / join / paste", () => {
  test(">> and << shift by four spaces", () => {
    expect(run("a\nb", 0, ">>").code).toBe("    a\nb");
    expect(run("        a", 0, "<<").code).toBe("    a");
  });

  test("3>> indents three lines", () => {
    expect(run("a\nb\nc\nd", 0, "3>>").code).toBe("    a\n    b\n    c\nd");
  });

  test(">ip indents a paragraph", () => {
    expect(run("a\nb\n\nc", 0, ">ip").code).toBe("    a\n    b\n\nc");
  });

  test("J removes the next line's indent", () => {
    expect(run("foo(\n    x)", 0, "J").code).toBe("foo( x)");
  });

  test("J before a closing paren adds no space", () => {
    expect(run("foo(x\n)", 0, "J").code).toBe("foo(x)");
  });

  test("3J joins three lines", () => {
    expect(run("a\nb\nc\nd", 0, "3J").code).toBe("a b c\nd");
  });

  test("yyp duplicates a line", () => {
    const r = run("    x := 1\ny", 0, "yyp");
    expect(r.code).toBe("    x := 1\n    x := 1\ny");
    expect(r.pos).toBe(15);
  });

  test("ddp swaps lines", () => {
    expect(run("a\nb\nc", 0, "ddp").code).toBe("b\na\nc");
  });

  test("o after an opening brace indents one level deeper", () => {
    const r = run("func main() {\n}", 3, "o");
    expect(r.code).toBe("func main() {\n    \n}");
    expect(r.pos).toBe(18);
  });

  test("o keeps the current indent", () => {
    const r = run("    a\nb", 4, "o");
    expect(r.code).toBe("    a\n    \nb");
  });

  test("cc keeps the line's indent", () => {
    const r = run("    x := 1\n", 6, "cc");
    expect(r.code).toBe("    \n");
    expect(r.pos).toBe(4);
  });
});

// ── Undo / redo / repeat ──

describe("undo, redo and dot-repeat", () => {
  test("<C-r> redoes an undo", () => {
    const r1 = run("abc", 0, "x");
    const r2 = press(r1, "u");
    expect(r2.code).toBe("abc");
    const r3 = press(r2, [KEY_REDO]);
    expect(r3.code).toBe("bc");
  });

  test("u puts the cursor where the change was", () => {
    const r = run("one\ntwo\nthree", 8, "ddgg");
    expect(r.pos).toBe(0);
    const u = press(r, "u");
    expect(u.code).toBe("one\ntwo\nthree");
    expect(u.pos).toBe(8);
  });

  test("2u undoes two changes", () => {
    const r = run("abc", 0, "xx2u");
    expect(r.code).toBe("abc");
  });

  test("a new change clears redo", () => {
    const r = run("abc", 0, "xux");
    expect(press(r, [KEY_REDO]).code).toBe("bc");
  });

  test("insert then Escape undoes as one step", () => {
    let s = run("ab", 1, "i");
    s = type(s, "XYZ");
    s = press(s, [KEY_ESCAPE]);
    expect(s.code).toBe("aXYZb");
    expect(press(s, "u").code).toBe("ab");
  });

  test("an empty insert leaves no undo step", () => {
    const s = press(run("ab", 0, "x"), ["i", KEY_ESCAPE, "u"]);
    expect(s.code).toBe("ab");
  });

  test(". repeats dd", () => {
    expect(run("a\nb\nc\nd", 0, "dd.").code).toBe("c\nd");
  });

  test(". repeats 3x", () => {
    expect(run("abcdefg", 0, "3x.").code).toBe("g");
  });

  test(". repeats ciw with the typed text", () => {
    let s = run("foo bar", 0, "ciw");
    s = type(s, "baz");
    s = press(s, [KEY_ESCAPE, "w", "."]);
    expect(s.code).toBe("baz baz");
  });

  test(". repeats o with text", () => {
    let s = run("a", 0, "o");
    s = type(s, "b");
    s = press(s, [KEY_ESCAPE, "."]);
    expect(s.code).toBe("a\nb\nb");
  });

  test("count on . replaces the original count", () => {
    expect(run("abcdefgh", 0, "x3.").code).toBe("efgh");
  });

  test("u after . undoes the repeat", () => {
    expect(run("a\nb\nc", 0, "dd.u").code).toBe("b\nc");
  });
});

// ── Visual mode ──

describe("visual mode", () => {
  test("v + motion + d deletes the selection (inclusive)", () => {
    const r = run("hello world", 0, "ved");
    expect(r.code).toBe(" world");
    expect(r.mode).toBe("normal");
  });

  test("v + y yanks and returns to the start", () => {
    const r = run("hello world", 6, "veyx");
    expect(r.yank).toBe("w");
  });

  test("V selects whole lines", () => {
    const r = run("a\nb\nc", 0, "Vjd");
    expect(r.code).toBe("c");
    expect(r.yankLinewise).toBe(true);
  });

  test("V> indents selected lines", () => {
    expect(run("a\nb\nc", 0, "Vj>").code).toBe("    a\n    b\nc");
  });

  test("viw selects the word, c changes it", () => {
    const r = run("foo bar", 5, "viwc");
    expect(r.code).toBe("foo ");
    expect(r.mode).toBe("insert");
  });

  test("vi{ on a block selects its lines", () => {
    const s = run(GO, GO.indexOf("hello"), "vi{");
    expect(s.mode).toBe("visual-line");
    const sel = visualRange(s.code, s.anchor, s.pos, s.mode);
    expect(s.code.slice(sel.start, sel.end)).toBe('    fmt.Println("hello")\n    fmt.Println("world")');
  });

  test("o swaps the selection ends", () => {
    const r = run("abcdef", 1, "vllo");
    expect(r.pos).toBe(1);
    expect(r.anchor).toBe(3);
  });

  test("U uppercases the selection", () => {
    expect(run("abc def", 0, "veU").code).toBe("ABC def");
  });

  test("r replaces every selected char", () => {
    expect(run("abc def", 0, "verx").code).toBe("xxx def");
  });

  test("p replaces the selection with the register", () => {
    expect(run("one two", 0, "yiwwviwp").code).toBe("one one");
  });

  test("Escape leaves visual without moving", () => {
    const r = press(run("abcdef", 1, "vll"), [KEY_ESCAPE]);
    expect(r.mode).toBe("normal");
    expect(r.pos).toBe(3);
  });

  test("v toggles back to normal; V switches to linewise", () => {
    expect(run("abc", 0, "vv").mode).toBe("normal");
    expect(run("abc", 0, "vV").mode).toBe("visual-line");
  });

  test("visualRange covers the right chars", () => {
    expect(visualRange("abc\ndef", 1, 5, "visual")).toEqual({ start: 1, end: 6 });
    expect(visualRange("abc\ndef", 5, 1, "visual-line")).toEqual({ start: 0, end: 7 });
  });
});

// ── Cursor stability ──

describe("cursor stability", () => {
  test("j/k keep the column across a shorter line", () => {
    const code = "abcdefgh\nab\nabcdefgh";
    const r1 = run(code, 6, "j");
    expect(r1.pos).toBe(10); // clamped to 'b'
    const r2 = press(r1, "j");
    expect(r2.pos).toBe(12 + 6); // back to column 6
  });

  test("j/k keep the column across an empty line", () => {
    const code = "abcdef\n\nabcdef";
    const r = run(code, 4, "jj");
    expect(r.pos).toBe(8 + 4);
  });

  test("$ then j sticks to the end of each line", () => {
    const code = "abc\nabcdefg\nab";
    const r = run(code, 0, "$j");
    expect(r.pos).toBe(10);
    expect(press(r, "j").pos).toBe(13);
  });

  test("Escape at column 0 stays on the same line", () => {
    const s = press({ ...start("abc\ndef", 4), mode: "insert" }, [KEY_ESCAPE]);
    expect(s.pos).toBe(4);
  });

  test("Escape after typing at end of line lands on the last char", () => {
    let s = run("ab\ncd", 1, "a");
    s = type(s, "X");
    s = press(s, [KEY_ESCAPE]);
    expect(s.code).toBe("abX\ncd");
    expect(s.pos).toBe(2);
  });

  test("h/l never cross lines", () => {
    expect(run("ab\ncd", 3, "h").pos).toBe(3);
    expect(run("ab\ncd", 1, "l").pos).toBe(1);
  });

  test("x on the last char moves the cursor left, not to the next line", () => {
    const r = run("abc\ndef", 2, "x");
    expect(r.code).toBe("ab\ndef");
    expect(r.pos).toBe(1);
  });

  test("random key mashing never puts the cursor out of range", () => {
    const keys = [..."hjklwbeWBE0^$GggxXpPJ~u.%{}ftT;,dciwyy>><<vVoO"];
    let s = start(GO, 30);
    let seed = 7;
    for (let n = 0; n < 2000; n++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const key = keys[seed % keys.length];
      s = processKey({ ...s, key: s.mode === "insert" ? KEY_ESCAPE : key });
      expect(s.pos).toBeGreaterThanOrEqual(0);
      expect(s.pos).toBeLessThanOrEqual(s.code.length);
      if (s.mode === "normal" && s.code.length > 0) {
        // normal-mode cursor sits on a char, or on an empty line
        const onNewline = s.code[s.pos] === "\n" || s.pos === s.code.length;
        if (onNewline) {
          const ls = s.code.lastIndexOf("\n", s.pos - 1) + 1;
          expect(ls).toBe(s.pos);
        }
      }
      if (s.code.length === 0) s = start(GO, 0);
    }
  });
});

// ── Keyboard translation ──

describe("keyFromEvent", () => {
  const k = (key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
    key, ctrlKey: false, metaKey: false, altKey: false, ...mods,
  });

  test("insert mode only takes Escape (and Ctrl-[ / Ctrl-c)", () => {
    expect(keyFromEvent(k("a"), "insert")).toBeNull();
    expect(keyFromEvent(k("Enter"), "insert")).toBeNull();
    expect(keyFromEvent(k("Escape"), "insert")).toBe(KEY_ESCAPE);
    expect(keyFromEvent(k("[", { ctrlKey: true }), "insert")).toBe(KEY_ESCAPE);
  });

  test("modifier keydowns are swallowed without touching state", () => {
    for (const key of ["Shift", "Control", "Alt", "Meta", "CapsLock"]) {
      expect(keyFromEvent(k(key), "normal")).toBe("");
    }
  });

  test("arrows, Backspace, Enter map to motions", () => {
    expect(keyFromEvent(k("ArrowDown"), "normal")).toBe("j");
    expect(keyFromEvent(k("ArrowLeft"), "visual")).toBe("h");
    expect(keyFromEvent(k("Backspace"), "normal")).toBe("h");
    expect(keyFromEvent(k("Enter"), "normal")).toBe("+");
  });

  test("⌘-shortcuts stay with the editor; Ctrl-r is redo", () => {
    expect(keyFromEvent(k("s", { metaKey: true }), "normal")).toBeNull();
    expect(keyFromEvent(k("r", { ctrlKey: true }), "normal")).toBe(KEY_REDO);
  });

  test("a pending r/f/t ignores named keys", () => {
    expect(keyFromEvent(k("Enter"), "normal", "r")).toBe("");
    expect(keyFromEvent(k("ArrowDown"), "normal", "dt")).toBe("");
    expect(keyFromEvent(k("Escape"), "normal", "f")).toBe(KEY_ESCAPE);
  });

  test("printable keys pass through", () => {
    expect(keyFromEvent(k("{"), "normal")).toBe("{");
    expect(keyFromEvent(k("$"), "visual-line")).toBe("$");
  });
});
