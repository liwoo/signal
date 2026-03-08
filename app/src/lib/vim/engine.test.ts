import { describe, test, expect } from "vitest";
import {
  processKey,
  lineStart,
  lineEnd,
  firstNonBlank,
  wordEndPos,
  wordForwardPos,
  wordBackPos,
  deleteLine,
  type VimInput,
  type VimOutput,
} from "./engine";

// ── Test harness ──

/** Simulate a sequence of keystrokes and return final state */
function sim(code: string, pos: number, keys: string): VimOutput {
  let state: VimInput = {
    code,
    pos,
    mode: "normal",
    pending: "",
    yank: "",
    yankLinewise: false,
    undoStack: [],
    key: "",
  };
  let result: VimOutput = {
    code, pos, mode: "normal", pending: "", yank: "", yankLinewise: false,
    undoStack: [], handled: false, codeChanged: false,
  };

  for (const key of keys) {
    state = {
      code: result.code,
      pos: result.pos,
      mode: result.mode,
      pending: result.pending,
      yank: result.yank,
      yankLinewise: result.yankLinewise,
      undoStack: result.undoStack,
      key,
    };
    result = processKey(state);
  }
  return result;
}

/** Continue from a previous result with one more key */
function cont(prev: VimOutput, key: string): VimOutput {
  return processKey({
    code: prev.code,
    pos: prev.pos,
    mode: prev.mode,
    pending: prev.pending,
    yank: prev.yank,
    yankLinewise: prev.yankLinewise,
    undoStack: prev.undoStack,
    key,
  });
}

/** Get the text of the line the cursor is on */
function cursorLine(result: VimOutput): string {
  const ls = lineStart(result.code, result.pos);
  const le = lineEnd(result.code, result.pos);
  return result.code.slice(ls, le);
}

// ── Helper functions ──

describe("lineStart", () => {
  test("first line", () => {
    expect(lineStart("hello\nworld", 3)).toBe(0);
  });
  test("second line", () => {
    expect(lineStart("hello\nworld", 8)).toBe(6);
  });
  test("at newline", () => {
    expect(lineStart("hello\nworld", 5)).toBe(0);
  });
  test("position 0", () => {
    expect(lineStart("hello", 0)).toBe(0);
  });
});

describe("lineEnd", () => {
  test("first line", () => {
    expect(lineEnd("hello\nworld", 2)).toBe(5);
  });
  test("last line (no trailing newline)", () => {
    expect(lineEnd("hello\nworld", 8)).toBe(11);
  });
  test("at newline", () => {
    expect(lineEnd("hello\nworld", 5)).toBe(5);
  });
});

describe("firstNonBlank", () => {
  test("no leading whitespace", () => {
    expect(firstNonBlank("hello", 0)).toBe(0);
  });
  test("leading spaces", () => {
    expect(firstNonBlank("  hello", 0)).toBe(2);
  });
  test("leading tab", () => {
    expect(firstNonBlank("\thello", 0)).toBe(1);
  });
  test("blank line returns from", () => {
    expect(firstNonBlank("   \nworld", 0)).toBe(0);
  });
});

describe("wordForwardPos", () => {
  test("jumps to start of next word", () => {
    const code = "hello world";
    expect(wordForwardPos(code, 0)).toBe(6);
  });
  test("at last word stays", () => {
    expect(wordForwardPos("hello", 0)).toBe(4);
  });
  test("from space to next word", () => {
    expect(wordForwardPos("a  b", 1)).toBe(3);
  });
});

describe("wordBackPos", () => {
  test("jumps to start of previous word", () => {
    expect(wordBackPos("hello world", 8)).toBe(6);
  });
  test("at start stays", () => {
    expect(wordBackPos("hello", 0)).toBe(0);
  });
});

describe("wordEndPos", () => {
  test("jumps to end of current/next word", () => {
    expect(wordEndPos("hello world", 0)).toBe(4);
  });
  test("from end of word jumps to end of next", () => {
    expect(wordEndPos("hello world", 4)).toBe(10);
  });
});

describe("deleteLine", () => {
  test("delete middle line", () => {
    const { newCode, deleted } = deleteLine("a\nb\nc", 2);
    expect(deleted).toBe("b");
    expect(newCode).toBe("a\nc");
  });
  test("delete first line", () => {
    const { newCode, deleted } = deleteLine("a\nb\nc", 0);
    expect(deleted).toBe("a");
    expect(newCode).toBe("b\nc");
  });
  test("delete last line", () => {
    const { newCode, deleted } = deleteLine("a\nb", 2);
    expect(deleted).toBe("b");
    expect(newCode).toBe("a");
  });
  test("delete only line", () => {
    const { newCode, deleted } = deleteLine("hello", 2);
    expect(deleted).toBe("hello");
    expect(newCode).toBe("");
  });
});

// ── Motion commands ──

describe("motion: h/l", () => {
  test("h moves left", () => {
    const r = sim("hello", 3, "h");
    expect(r.pos).toBe(2);
  });
  test("h at start of line stays", () => {
    const r = sim("hello", 0, "h");
    expect(r.pos).toBe(0);
  });
  test("l moves right", () => {
    const r = sim("hello", 1, "l");
    expect(r.pos).toBe(2);
  });
  test("l stops at last char (does not go past end)", () => {
    const r = sim("hi", 1, "l");
    expect(r.pos).toBe(1); // 'i' is last char
  });
  test("multiple h", () => {
    const r = sim("hello", 4, "hh");
    expect(r.pos).toBe(2);
  });
  test("l does not cross newline", () => {
    const code = "ab\ncd";
    const r = sim(code, 1, "l"); // 'b' is last char on line 1
    expect(r.pos).toBe(1); // stays on 'b', does not go to '\n' or 'c'
  });
  test("h does not cross to previous line", () => {
    const code = "ab\ncd";
    const r = sim(code, 3, "h"); // 'c' at pos 3
    expect(r.pos).toBe(3); // stays, doesn't go to '\n' at pos 2
  });
});

describe("motion: j/k (vertical)", () => {
  const code = "abc\ndef\nghi";
  //            0123 4567 89..

  test("j moves down preserving column", () => {
    const r = sim(code, 1, "j"); // col 1 of line 0 → col 1 of line 1
    expect(r.pos).toBe(5); // 'e' at 5
  });
  test("j on last line stays", () => {
    const r = sim(code, 9, "j");
    expect(r.pos).toBe(9);
  });
  test("k moves up preserving column", () => {
    const r = sim(code, 5, "k"); // col 1 of line 1 → col 1 of line 0
    expect(r.pos).toBe(1);
  });
  test("k on first line stays", () => {
    const r = sim(code, 1, "k");
    expect(r.pos).toBe(1);
  });
  test("j clamps to shorter line", () => {
    const code2 = "abcdef\nab\nabcdef";
    const r = sim(code2, 5, "j"); // col 5 → line "ab" has 2 chars, clamp to last char
    expect(r.pos).toBe(8); // 7 + min(5, 1) = 8 → 'b'
  });
  test("j then k returns to same position", () => {
    const r = sim(code, 1, "jk");
    expect(r.pos).toBe(1);
  });
});

describe("motion: 0 $ ^", () => {
  const code = "  hello world";

  test("0 goes to line start", () => {
    const r = sim(code, 5, "0");
    expect(r.pos).toBe(0);
  });
  test("$ goes to last char on line (not past end)", () => {
    const r = sim(code, 0, "$");
    expect(r.pos).toBe(code.length - 1); // last char, not past end
  });
  test("$ on multiline goes to last char of current line", () => {
    const mc = "abc\ndef";
    const r = sim(mc, 1, "$");
    expect(r.pos).toBe(2); // 'c' at pos 2, not '\n' at pos 3
  });
  test("^ goes to first non-blank", () => {
    const r = sim(code, 0, "^");
    expect(r.pos).toBe(2);
  });
  test("_ also goes to first non-blank", () => {
    const r = sim(code, 0, "_");
    expect(r.pos).toBe(2);
  });
});

describe("motion: w b e", () => {
  const code = "hello world foo";

  test("w jumps to next word", () => {
    const r = sim(code, 0, "w");
    expect(r.pos).toBe(6);
  });
  test("b jumps back a word", () => {
    const r = sim(code, 8, "b");
    expect(r.pos).toBe(6);
  });
  test("e jumps to word end", () => {
    const r = sim(code, 0, "e");
    expect(r.pos).toBe(4);
  });
  test("w w moves two words", () => {
    const r = sim(code, 0, "ww");
    expect(r.pos).toBe(12);
  });
});

describe("motion: G gg", () => {
  const code = "line1\nline2\nline3";

  test("G goes to first non-blank of last line", () => {
    const r = sim(code, 0, "G");
    // Last line starts at 12 ("line3"), first non-blank is 12
    expect(r.pos).toBe(12);
    expect(cursorLine(r)).toBe("line3");
  });
  test("G on indented last line goes to first non-blank", () => {
    const code2 = "aaa\n  bbb";
    const r = sim(code2, 0, "G");
    expect(r.pos).toBe(6); // first non-blank of "  bbb"
    expect(code2[r.pos]).toBe("b");
  });
  test("gg goes to start", () => {
    const r = sim(code, 10, "gg");
    expect(r.pos).toBe(0);
  });
  test("G then gg roundtrip", () => {
    const r = sim(code, 5, "Ggg");
    expect(r.pos).toBe(0);
  });
});

describe("motion: % (bracket matching)", () => {
  test("( to )", () => {
    const r = sim("(abc)", 0, "%");
    expect(r.pos).toBe(4);
  });
  test(") to (", () => {
    const r = sim("(abc)", 4, "%");
    expect(r.pos).toBe(0);
  });
  test("{ to }", () => {
    const r = sim("{a{b}c}", 0, "%");
    expect(r.pos).toBe(6);
  });
  test("nested { to matching }", () => {
    const r = sim("{a{b}c}", 2, "%");
    expect(r.pos).toBe(4);
  });
  test("non-bracket char does nothing", () => {
    const r = sim("hello", 2, "%");
    expect(r.pos).toBe(2);
  });
});

// ── Insert mode transitions ──

describe("insert transitions", () => {
  test("i enters insert mode at cursor", () => {
    const r = sim("hello", 2, "i");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(2);
  });
  test("a enters insert after cursor", () => {
    const r = sim("hello", 2, "a");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(3);
  });
  test("a at end of line does NOT cross newline", () => {
    const code = "abc\ndef";
    // pos 2 is 'c', last char on first line
    const r = sim(code, 2, "a");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(3); // insert position at the '\n', which is end-of-line — OK for insert
    expect(r.pos).toBeLessThanOrEqual(lineEnd(code, 2)); // never past the newline
  });
  test("a at end of last line (no newline)", () => {
    const r = sim("abc", 2, "a");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(3); // one past last char, fine for insert
  });
  test("A enters insert at end of line", () => {
    const r = sim("hello\nworld", 2, "A");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(5); // at the '\n' position — insert mode end-of-line
  });
  test("I enters insert at first non-blank", () => {
    const r = sim("  hello", 5, "I");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(2);
  });
  test("o opens line below and enters insert", () => {
    const r = sim("abc\ndef", 1, "o");
    expect(r.mode).toBe("insert");
    expect(r.code).toBe("abc\n\ndef");
    expect(r.pos).toBe(4);
  });
  test("O opens line above and enters insert", () => {
    const r = sim("abc\ndef", 5, "O");
    expect(r.mode).toBe("insert");
    expect(r.code).toBe("abc\n\ndef");
    expect(r.pos).toBe(4);
  });
  test("S clears line and enters insert", () => {
    const r = sim("abc\ndef\nghi", 5, "S");
    expect(r.mode).toBe("insert");
    expect(r.code).toBe("abc\n\nghi");
  });
  test("C deletes to end of line and enters insert", () => {
    const r = sim("hello world", 5, "C");
    expect(r.mode).toBe("insert");
    expect(r.code).toBe("hello");
    expect(r.yank).toBe(" world");
  });
});

describe("Escape returns to normal mode", () => {
  test("Escape from insert → normal, cursor back one", () => {
    const r = sim("hello", 2, "i");
    expect(r.mode).toBe("insert");
    const r2 = cont(r, "Escape");
    expect(r2.mode).toBe("normal");
    expect(r2.pos).toBe(1);
  });
  test("Escape at pos 0 stays at 0", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "insert",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "Escape",
    });
    expect(r.pos).toBe(0);
  });
});

// ── Editing commands ──

describe("x — delete char", () => {
  test("deletes char under cursor", () => {
    const r = sim("hello", 1, "x");
    expect(r.code).toBe("hllo");
    expect(r.yank).toBe("e");
  });
  test("does not delete newline", () => {
    const r = sim("a\nb", 1, "x");
    expect(r.code).toBe("a\nb");
  });
  test("at end of content does nothing", () => {
    const r = sim("ab", 2, "x");
    expect(r.code).toBe("ab");
  });
});

describe("r — replace char", () => {
  test("replaces char at cursor", () => {
    const r = sim("hello", 1, "rX");
    expect(r.code).toBe("hXllo");
    expect(r.pos).toBe(1);
  });
  test("r then space replaces with space", () => {
    const r = sim("hello", 0, "r ");
    expect(r.code).toBe(" ello");
  });
});

describe("~ — toggle case", () => {
  test("lowercase to uppercase", () => {
    const r = sim("hello", 0, "~");
    expect(r.code).toBe("Hello");
    expect(r.pos).toBe(1);
  });
  test("uppercase to lowercase", () => {
    const r = sim("Hello", 0, "~");
    expect(r.code).toBe("hello");
  });
  test("non-alpha advances without change", () => {
    const r = sim("123", 0, "~");
    expect(r.code).toBe("123");
    expect(r.pos).toBe(1);
  });
});

describe("J — join lines", () => {
  test("joins two lines", () => {
    const r = sim("abc\n  def", 1, "J");
    expect(r.code).toBe("abc def");
    expect(r.pos).toBe(3);
  });
  test("last line does nothing", () => {
    const r = sim("abc", 1, "J");
    expect(r.code).toBe("abc");
  });
});

describe("D — delete to end of line", () => {
  test("deletes from cursor to end", () => {
    const r = sim("hello world", 5, "D");
    expect(r.code).toBe("hello");
    expect(r.yank).toBe(" world");
    expect(r.mode).toBe("normal");
  });
});

// ── Delete commands (d-prefixed) ──

describe("dd — delete line", () => {
  test("deletes current line", () => {
    const r = sim("aaa\nbbb\nccc", 5, "dd");
    expect(r.code).toBe("aaa\nccc");
    expect(r.yank).toBe("bbb");
    expect(r.yankLinewise).toBe(true);
  });
  test("deletes only line", () => {
    const r = sim("hello", 2, "dd");
    expect(r.code).toBe("");
    expect(r.yank).toBe("hello");
  });
  test("deletes first line", () => {
    const r = sim("aaa\nbbb", 1, "dd");
    expect(r.code).toBe("bbb");
    expect(r.yank).toBe("aaa");
  });
});

describe("dw — delete word", () => {
  test("deletes word forward", () => {
    const r = sim("hello world", 0, "dw");
    expect(r.code).toBe("world");
    expect(r.yank).toBe("hello ");
    expect(r.yankLinewise).toBe(false);
  });
});

describe("de — delete to word end", () => {
  test("deletes to end of word", () => {
    const r = sim("hello world", 0, "de");
    expect(r.code).toBe(" world");
    expect(r.yank).toBe("hello");
  });
});

describe("db — delete word backward", () => {
  test("deletes word backward from mid-word", () => {
    const r = sim("hello world", 8, "db");
    expect(r.code).toBe("hello rld");
    expect(r.yank).toBe("wo");
  });
  test("deletes word backward from word start", () => {
    const r = sim("hello world", 6, "db");
    expect(r.code).toBe("world");
    expect(r.yank).toBe("hello ");
  });
});

// ── Change commands (c-prefixed) ──

describe("cc — change line", () => {
  test("clears line and enters insert", () => {
    const r = sim("abc\ndef\nghi", 5, "cc");
    expect(r.code).toBe("abc\n\nghi");
    expect(r.mode).toBe("insert");
    expect(r.yank).toBe("def");
    expect(r.yankLinewise).toBe(true);
  });
});

describe("cw — change word", () => {
  test("deletes word and enters insert", () => {
    const r = sim("hello world", 0, "cw");
    expect(r.code).toBe("world");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(0);
    expect(r.yankLinewise).toBe(false);
  });
});

describe("ce — change to word end", () => {
  test("deletes to word end and enters insert", () => {
    const r = sim("hello world", 0, "ce");
    expect(r.code).toBe(" world");
    expect(r.mode).toBe("insert");
  });
});

describe("cb — change word backward", () => {
  test("deletes word backward and enters insert", () => {
    const r = sim("hello world", 6, "cb");
    expect(r.mode).toBe("insert");
  });
});

// ── Yank and paste ──

describe("yy — yank line (linewise)", () => {
  test("yanks current line without deleting", () => {
    const r = sim("abc\ndef\nghi", 5, "yy");
    expect(r.yank).toBe("def");
    expect(r.yankLinewise).toBe(true);
    expect(r.code).toBe("abc\ndef\nghi");
  });
});

describe("yw — yank word (charwise)", () => {
  test("yanks word forward", () => {
    const r = sim("hello world", 0, "yw");
    expect(r.yank).toBe("hello ");
    expect(r.yankLinewise).toBe(false);
    expect(r.code).toBe("hello world");
  });
});

describe("p — paste after (linewise)", () => {
  test("yy then p pastes line BELOW current line", () => {
    const r1 = sim("aaa\nbbb\nccc", 0, "yy"); // yank "aaa"
    expect(r1.yank).toBe("aaa");
    expect(r1.yankLinewise).toBe(true);
    // Move to second line, then paste
    const r2 = cont(r1, "j");
    const r3 = cont(r2, "p");
    expect(r3.code).toBe("aaa\nbbb\naaa\nccc");
    expect(cursorLine(r3)).toBe("aaa"); // cursor on pasted line
  });

  test("dd then p pastes deleted line below", () => {
    const r1 = sim("aaa\nbbb\nccc", 0, "dd"); // delete "aaa", yank linewise
    expect(r1.code).toBe("bbb\nccc");
    expect(r1.yank).toBe("aaa");
    expect(r1.yankLinewise).toBe(true);
    // p should paste "aaa" below current line
    const r2 = cont(r1, "p");
    expect(r2.code).toBe("bbb\naaa\nccc");
  });

  test("yy on last line then p appends line at end", () => {
    const r1 = sim("aaa\nbbb", 4, "yy"); // yank "bbb"
    const r2 = cont(r1, "p");
    expect(r2.code).toBe("aaa\nbbb\nbbb");
  });

  test("charwise p still inserts after cursor", () => {
    const r1 = sim("hello world", 0, "yw"); // yank "hello " (charwise)
    expect(r1.yankLinewise).toBe(false);
    const r2 = cont(r1, "$"); // go to last char
    const r3 = cont(r2, "p");
    expect(r3.code).toBe("hello worldhello ");
  });

  test("p with empty yank does nothing", () => {
    const r = sim("hello", 0, "p");
    expect(r.code).toBe("hello");
    expect(r.codeChanged).toBe(false);
  });
});

describe("P — paste before (linewise)", () => {
  test("yy then P pastes line ABOVE current line", () => {
    const r1 = sim("aaa\nbbb\nccc", 4, "yy"); // yank "bbb"
    const r2 = cont(r1, "P"); // paste above current line
    expect(r2.code).toBe("aaa\nbbb\nbbb\nccc");
  });

  test("dd then P pastes deleted line above", () => {
    // Delete middle line, paste it above current
    const r1 = sim("aaa\nbbb\nccc", 4, "dd"); // delete "bbb"
    expect(r1.code).toBe("aaa\nccc");
    const r2 = cont(r1, "P"); // paste above "ccc"
    expect(r2.code).toBe("aaa\nbbb\nccc");
  });

  test("charwise P still inserts before cursor", () => {
    // Use a two-word string so yw captures cleanly to next word boundary
    const r1 = sim("hello world end", 6, "yw"); // yank "world " (charwise)
    expect(r1.yankLinewise).toBe(false);
    expect(r1.yank).toBe("world ");
    const r2 = cont(r1, "0");
    const r3 = cont(r2, "P");
    expect(r3.code).toBe("world hello world end");
  });
});

describe("dd then p — cut and paste line workflow", () => {
  test("move line down: dd j p", () => {
    const r1 = sim("line1\nline2\nline3", 0, "dd");
    expect(r1.code).toBe("line2\nline3");
    expect(r1.yank).toBe("line1");
    // j to line3, then p
    const r2 = cont(r1, "j");
    const r3 = cont(r2, "p");
    expect(r3.code).toBe("line2\nline3\nline1");
  });

  test("swap two lines: dd k P", () => {
    const r1 = sim("aaa\nbbb", 4, "dd"); // delete "bbb"
    expect(r1.code).toBe("aaa");
    const r2 = cont(r1, "P"); // paste above "aaa"
    expect(r2.code).toBe("bbb\naaa");
  });
});

// ── Undo ──

describe("u — undo", () => {
  test("undo restores previous code", () => {
    const r = sim("hello", 1, "x");
    expect(r.code).toBe("hllo");
    const r2 = cont(r, "u");
    expect(r2.code).toBe("hello");
  });
  test("undo with empty stack does nothing", () => {
    const r = sim("hello", 0, "u");
    expect(r.code).toBe("hello");
  });
  test("multiple undos", () => {
    const r1 = sim("abc", 0, "x");
    expect(r1.code).toBe("bc");
    const r2 = cont(r1, "x");
    expect(r2.code).toBe("c");
    const r3 = cont(r2, "u");
    expect(r3.code).toBe("bc");
    const r4 = cont(r3, "u");
    expect(r4.code).toBe("abc");
  });
});

// ── Pending key sequences ──

describe("pending key buffer", () => {
  test("g alone sets pending, gg completes", () => {
    const r1 = processKey({
      code: "hello", pos: 3, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "g",
    });
    expect(r1.pending).toBe("g");
    const r2 = cont(r1, "g");
    expect(r2.pending).toBe("");
    expect(r2.pos).toBe(0);
  });
  test("d alone sets pending", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "d",
    });
    expect(r.pending).toBe("d");
  });
  test("c alone sets pending", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "c",
    });
    expect(r.pending).toBe("c");
  });
  test("y alone sets pending", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "y",
    });
    expect(r.pending).toBe("y");
  });
  test("r alone sets pending", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "r",
    });
    expect(r.pending).toBe("r");
  });
  test("unrecognized key clears pending", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "normal",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "Z",
    });
    expect(r.pending).toBe("");
  });
});

// ── Insert mode passthrough ──

describe("insert mode", () => {
  test("non-Escape keys are not handled", () => {
    const r = processKey({
      code: "hello", pos: 2, mode: "insert",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "a",
    });
    expect(r.handled).toBe(false);
  });
  test("Escape switches to normal", () => {
    const r = processKey({
      code: "hello", pos: 3, mode: "insert",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "Escape",
    });
    expect(r.mode).toBe("normal");
    expect(r.pos).toBe(2);
    expect(r.handled).toBe(true);
  });
  test("Escape at pos 0 stays at 0", () => {
    const r = processKey({
      code: "hello", pos: 0, mode: "insert",
      pending: "", yank: "", yankLinewise: false, undoStack: [], key: "Escape",
    });
    expect(r.pos).toBe(0);
  });
});

// ── Combined sequences ──

describe("combined workflows", () => {
  test("dd then u restores line", () => {
    const r1 = sim("aaa\nbbb\nccc", 5, "dd");
    expect(r1.code).toBe("aaa\nccc");
    const r2 = cont(r1, "u");
    expect(r2.code).toBe("aaa\nbbb\nccc");
  });

  test("navigate to word, change it, escape", () => {
    const r1 = sim("foo bar baz", 0, "w");
    expect(r1.pos).toBe(4);
    const r2 = sim("foo bar baz", r1.pos, "cw");
    expect(r2.mode).toBe("insert");
    expect(r2.code).toBe("foo baz");
    const r3 = cont(r2, "Escape");
    expect(r3.mode).toBe("normal");
  });

  test("multiple ~ toggles case of consecutive chars", () => {
    const r = sim("hello", 0, "~~~");
    expect(r.code).toBe("HELlo");
    expect(r.pos).toBe(3);
  });

  test("r replaces single char without mode change", () => {
    const r = sim("hello", 2, "rX");
    expect(r.code).toBe("heXlo");
    expect(r.mode).toBe("normal");
  });
});

// ── dd navigation (detailed) ──

describe("dd navigation", () => {
  const fiveLines = "line1\nline2\nline3\nline4\nline5";

  test("dd on first line moves to next line", () => {
    const r = sim(fiveLines, 2, "dd");
    expect(r.code).toBe("line2\nline3\nline4\nline5");
    expect(r.pos).toBe(0);
  });

  test("dd on middle line — cursor on next line content", () => {
    const r = sim(fiveLines, 8, "dd");
    expect(r.code).toBe("line1\nline3\nline4\nline5");
    expect(r.pos).toBe(6);
    expect(r.code[r.pos]).toBe("l");
  });

  test("dd on last line moves cursor to previous line", () => {
    const r = sim(fiveLines, 26, "dd");
    expect(r.code).toBe("line1\nline2\nline3\nline4");
    expect(r.pos).toBeLessThan(r.code.length);
    expect(cursorLine(r)).toBe("line4");
  });

  test("dd on second-to-last line keeps cursor in bounds", () => {
    const r = sim("aaa\nbbb", 0, "dd");
    expect(r.code).toBe("bbb");
    expect(r.pos).toBe(0);
  });

  test("dd on last of two lines moves to first", () => {
    const r = sim("aaa\nbbb", 5, "dd");
    expect(r.code).toBe("aaa");
    expect(r.pos).toBeLessThanOrEqual(r.code.length - 1);
  });

  test("dd on single line results in empty code", () => {
    const r = sim("hello", 3, "dd");
    expect(r.code).toBe("");
    expect(r.pos).toBe(0);
  });

  test("repeated dd never goes out of bounds", () => {
    let result = sim(fiveLines, 6, "dd");
    for (let i = 0; i < 4; i++) {
      if (result.code.length === 0) break;
      result = cont(result, "d");
      result = cont(result, "d");
      expect(result.pos).toBeGreaterThanOrEqual(0);
      expect(result.pos).toBeLessThanOrEqual(Math.max(0, result.code.length - 1));
    }
    expect(result.code).toBe("");
  });

  test("dd then j moves to next line correctly", () => {
    const r1 = sim(fiveLines, 8, "dd");
    expect(r1.code).toBe("line1\nline3\nline4\nline5");
    const r2 = cont(r1, "j");
    expect(cursorLine(r2)).toBe("line4");
  });

  test("dd then k moves to previous line correctly", () => {
    const r1 = sim(fiveLines, 14, "dd");
    expect(r1.code).toBe("line1\nline2\nline4\nline5");
    const r2 = cont(r1, "k");
    expect(cursorLine(r2)).toBe("line2");
  });

  test("dd preserves position within bounds after deleting last line", () => {
    const code = "a\nb\nc\nd";
    const r = sim(code, 6, "dd");
    expect(r.code).toBe("a\nb\nc");
    expect(r.pos).toBeLessThanOrEqual(r.code.length - 1);
    expect(r.pos).toBeGreaterThanOrEqual(0);
  });
});

// ── j/k navigation edge cases ──

describe("j/k navigation edge cases", () => {
  test("j on varying line lengths preserves column when possible", () => {
    const code = "short\nvery long line here\nmed";
    const r = sim(code, 3, "j");
    expect(r.pos).toBe(9); // 6 + 3
    expect(code[r.pos]).toBe("y");
  });

  test("j then k preserves column on equal-length lines", () => {
    const code = "abc\ndef\nghi";
    const r = sim(code, 2, "jk");
    expect(r.pos).toBe(2);
  });

  test("k then j preserves column on equal-length lines", () => {
    const code = "abc\ndef\nghi";
    const r = sim(code, 6, "kj");
    // col at pos 6 = 6 - 4 (lineStart of "ghi" is 8... wait)
    // "abc\ndef\nghi" positions: a0 b1 c2 \n3 d4 e5 f6 \n7 g8 h9 i10
    // pos 6 = 'f', col = 6 - 4 = 2
    // k: go to line 0, col min(2, 2) = 2 → pos 2 = 'c'
    // j: go to line 1, col min(2, 2) = 2 → pos 6 = 'f'
    expect(r.pos).toBe(6);
  });

  test("j past empty line", () => {
    const code = "abc\n\ndef";
    // "abc" line 0 (pos 0-2), "\n" at 3, empty line at pos 4 ("\n"), "def" at 5-7
    // j from col 1: empty line has 0 chars, clampNormal lands on the \n at 4
    // which backs up to pos 3. But pos 3 is also \n (end of "abc").
    // For an empty line, cursor should go to the line start which equals lineEnd.
    const r = sim(code, 1, "j");
    // The empty line is between two \n chars — cursor goes to pos 4 but
    // clampNormal sees \n and backs up. The exact pos depends on clamp behavior.
    // Two j's should reach "def":
    const r2 = cont(r, "j");
    expect(cursorLine(r2)).toBe("def");
  });

  test("multiple j to bottom", () => {
    const code = "a\nb\nc\nd";
    const r = sim(code, 0, "jjj");
    expect(r.pos).toBe(6);
  });

  test("multiple k to top", () => {
    const code = "a\nb\nc\nd";
    const r = sim(code, 6, "kkk");
    expect(r.pos).toBe(0);
  });

  test("j at very end of file (last line)", () => {
    const code = "abc\ndef";
    const r = sim(code, 6, "j");
    expect(r.pos).toBe(6);
  });

  test("k at very beginning", () => {
    const code = "abc\ndef";
    const r = sim(code, 0, "k");
    expect(r.pos).toBe(0);
  });
});

// ── Navigation after editing ──

describe("navigation after editing operations", () => {
  test("o then Escape then jj navigates to line below", () => {
    const r1 = sim("aaa\nccc", 1, "o");
    expect(r1.code).toBe("aaa\n\nccc");
    expect(r1.pos).toBe(4); // on empty line (insert mode)
    const r2 = cont(r1, "Escape");
    expect(r2.mode).toBe("normal");
    // Escape clamps back — from empty line the cursor may be on \n clamped to prev line
    // Two j's should reliably reach "ccc"
    const r3 = cont(r2, "j");
    const r4 = cont(r3, "j");
    expect(cursorLine(r4)).toBe("ccc");
  });

  test("J then j navigates correctly after join", () => {
    const r1 = sim("aaa\nbbb\nccc", 1, "J");
    expect(r1.code).toBe("aaa bbb\nccc");
    const r2 = cont(r1, "j");
    expect(cursorLine(r2)).toBe("ccc");
  });

  test("x does not affect vertical navigation", () => {
    const code = "abcd\nefgh\nijkl";
    const r1 = sim(code, 2, "x");
    expect(r1.code).toBe("abd\nefgh\nijkl");
    const r2 = cont(r1, "j");
    expect(cursorLine(r2)).toBe("efgh");
  });

  test("dw then navigation stays on correct line", () => {
    const code = "hello world\nfoo bar";
    const r1 = sim(code, 0, "dw");
    expect(r1.code).toBe("world\nfoo bar");
    expect(r1.pos).toBe(0);
    const r2 = cont(r1, "j");
    expect(cursorLine(r2)).toBe("foo bar");
  });

  test("G then dd deletes last line and stays in bounds", () => {
    const code = "aaa\nbbb\nccc";
    const r1 = sim(code, 0, "G");
    // G goes to first non-blank of last line
    expect(cursorLine(r1)).toBe("ccc");
    const r2 = cont(r1, "d");
    const r3 = cont(r2, "d");
    expect(r3.pos).toBeLessThanOrEqual(Math.max(0, r3.code.length - 1));
    expect(r3.pos).toBeGreaterThanOrEqual(0);
    expect(cursorLine(r3)).toBe("bbb");
  });

  test("gg then dd repeatedly clears file", () => {
    let code = "a\nb\nc";
    let pos = 0;
    let yank = "";
    let yankLinewise = false;
    let undoStack: string[] = [];

    for (let i = 0; i < 3; i++) {
      if (code.length === 0) break;
      let r = processKey({ code, pos, mode: "normal", pending: "", yank, yankLinewise, undoStack, key: "g" });
      r = cont(r, "g");
      expect(r.pos).toBe(0);
      r = cont(r, "d");
      r = cont(r, "d");
      expect(r.pos).toBeLessThanOrEqual(Math.max(0, r.code.length - 1));
      code = r.code;
      pos = r.pos;
      yank = r.yank;
      yankLinewise = r.yankLinewise;
      undoStack = r.undoStack;
    }
    expect(code).toBe("");
  });
});

// ── Regression: `a` must never jump to next line ──

describe("regression: a command line boundaries", () => {
  test("a on last char of first line stays on that line", () => {
    const code = "abc\ndef\nghi";
    // 'c' is at pos 2, last char on line 1
    const r = sim(code, 2, "a");
    expect(r.mode).toBe("insert");
    // Insert pos should be 3 (the \n position) — that's where insert-mode
    // typing appends to the end of "abc". It must NOT be 4+ (next line).
    expect(r.pos).toBe(3);
    expect(r.pos).toBeLessThanOrEqual(lineEnd(code, 2));
  });

  test("a on middle char works normally", () => {
    const code = "abc\ndef";
    const r = sim(code, 0, "a");
    expect(r.pos).toBe(1); // after 'a'
  });

  test("a on single-char line", () => {
    const code = "x\ny";
    const r = sim(code, 0, "a"); // 'x' is only char on line
    expect(r.mode).toBe("insert");
    expect(r.pos).toBe(1); // after 'x', at the \n — insert end of line
  });

  test("a on empty first line of multiline", () => {
    const code = "\nabc";
    // pos 0 is the \n itself, but clampNormal would've put us at 0
    // In practice the cursor wouldn't be here in normal mode,
    // but test that a doesn't crash or jump wildly
    const r = sim(code, 0, "a");
    expect(r.mode).toBe("insert");
    expect(r.pos).toBeLessThanOrEqual(1);
  });
});

// ── Regression: cursor never on newline in normal mode ──

describe("regression: cursor never on newline in normal mode", () => {
  test("$ does not land on newline", () => {
    const code = "abc\ndef";
    const r = sim(code, 0, "$");
    expect(code[r.pos]).not.toBe("\n");
    expect(r.pos).toBe(2); // 'c'
  });

  test("l at end of line stays on last char", () => {
    const code = "ab\ncd";
    const r = sim(code, 0, "ll");
    // 'a' → 'b' → stays on 'b' (pos 1)
    expect(r.pos).toBe(1);
    expect(code[r.pos]).toBe("b");
  });

  test("G does not go past last char", () => {
    const code = "abc\ndef";
    const r = sim(code, 0, "G");
    expect(r.pos).toBeLessThan(code.length);
    expect(code[r.pos]).not.toBe("\n");
  });

  test("Escape from insert at newline position clamps", () => {
    // After A (goes to newline pos for insert), Escape should go back to last char
    const code = "abc\ndef";
    const r1 = sim(code, 0, "A"); // insert at pos 3 (the \n)
    expect(r1.mode).toBe("insert");
    expect(r1.pos).toBe(3);
    const r2 = cont(r1, "Escape");
    expect(r2.mode).toBe("normal");
    expect(code[r2.pos]).not.toBe("\n");
    expect(r2.pos).toBe(2); // 'c'
  });
});

// ── Regression: linewise yank distinction ──

describe("regression: linewise vs charwise yank", () => {
  test("yy sets yankLinewise true", () => {
    const r = sim("abc\ndef", 0, "yy");
    expect(r.yankLinewise).toBe(true);
  });

  test("yw sets yankLinewise false", () => {
    const r = sim("abc def", 0, "yw");
    expect(r.yankLinewise).toBe(false);
  });

  test("dd sets yankLinewise true", () => {
    const r = sim("abc\ndef", 0, "dd");
    expect(r.yankLinewise).toBe(true);
  });

  test("dw sets yankLinewise false", () => {
    const r = sim("abc def", 0, "dw");
    expect(r.yankLinewise).toBe(false);
  });

  test("x sets yankLinewise false", () => {
    const r = sim("abc", 0, "x");
    expect(r.yankLinewise).toBe(false);
  });

  test("after yy, p pastes as new line; after yw, p pastes inline", () => {
    // linewise
    const r1 = sim("aaa\nbbb", 0, "yy");
    const r2 = cont(r1, "p");
    expect(r2.code).toBe("aaa\naaa\nbbb"); // new line below

    // charwise: yw from "hello world" at pos 0 yanks "hello "
    const r3 = sim("hello world", 0, "yw");
    expect(r3.yankLinewise).toBe(false);
    expect(r3.yank).toBe("hello ");
    const r4 = cont(r3, "p");
    // charwise paste after pos 0 → insert at pos 1
    expect(r4.code).toBe("hhello ello world");
  });
});

// ── Edge cases ──

describe("edge cases", () => {
  test("empty code, various commands don't crash", () => {
    expect(() => sim("", 0, "h")).not.toThrow();
    expect(() => sim("", 0, "j")).not.toThrow();
    expect(() => sim("", 0, "dd")).not.toThrow();
    expect(() => sim("", 0, "x")).not.toThrow();
    expect(() => sim("", 0, "w")).not.toThrow();
    expect(() => sim("", 0, "b")).not.toThrow();
    expect(() => sim("", 0, "G")).not.toThrow();
    expect(() => sim("", 0, "gg")).not.toThrow();
    expect(() => sim("", 0, "%")).not.toThrow();
  });

  test("single char code", () => {
    const r = sim("a", 0, "x");
    expect(r.code).toBe("");
  });

  test("cursor at end of code (clamped)", () => {
    const r = sim("abc", 3, "h");
    expect(r.pos).toBe(2);
  });

  test("o on last line of code", () => {
    const r = sim("abc", 1, "o");
    expect(r.code).toBe("abc\n");
    expect(r.pos).toBe(4);
  });

  test("O on first line of code", () => {
    const r = sim("abc", 1, "O");
    expect(r.code).toBe("\nabc");
    expect(r.pos).toBe(0);
  });

  test("dd on single remaining line", () => {
    const r = sim("last", 2, "dd");
    expect(r.code).toBe("");
  });

  test("J on last line does nothing", () => {
    const r = sim("only line", 3, "J");
    expect(r.code).toBe("only line");
  });

  test("% with no bracket at cursor", () => {
    const r = sim("abc", 1, "%");
    expect(r.pos).toBe(1);
  });

  test("D at start of line clears whole line content", () => {
    const r = sim("hello", 0, "D");
    expect(r.code).toBe("");
    expect(r.yank).toBe("hello");
  });
});

// ── Real Go code scenarios ──

describe("real Go editing scenarios", () => {
  const goCode = `package main

import "fmt"

func main() {
    fmt.Println("hello")
}`;

  test("navigate to Println line and dd it", () => {
    // Find the start of the Println line
    const pIdx = goCode.indexOf("fmt.Println");
    const r1 = sim(goCode, pIdx, "dd");
    expect(r1.code).not.toContain("Println");
    expect(r1.code).toContain("package main");
    expect(r1.code).toContain("func main()");
    // Cursor should be on a valid char
    expect(r1.pos).toBeGreaterThanOrEqual(0);
    expect(r1.pos).toBeLessThanOrEqual(Math.max(0, r1.code.length - 1));
  });

  test("yy on import line, G, p pastes at bottom", () => {
    const importIdx = goCode.indexOf('import');
    const r1 = sim(goCode, importIdx, "yy");
    expect(r1.yank).toBe('import "fmt"');
    const r2 = cont(r1, "G"); // last line
    const r3 = cont(r2, "p"); // paste below
    expect(r3.code).toContain('}\nimport "fmt"');
  });

  test("A on func line goes to end of that line", () => {
    const funcIdx = goCode.indexOf("func");
    const r = sim(goCode, funcIdx, "A");
    expect(r.mode).toBe("insert");
    // Should be at the end of "func main() {" line
    const le = lineEnd(goCode, funcIdx);
    expect(r.pos).toBe(le);
  });

  test("$ stays on same line", () => {
    const funcIdx = goCode.indexOf("func");
    const r = sim(goCode, funcIdx, "$");
    const line = cursorLine(r);
    expect(line).toContain("func main()");
    expect(goCode[r.pos]).not.toBe("\n");
  });
});
