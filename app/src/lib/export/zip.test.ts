import { describe, expect, it } from "vitest";
import { crc32, createZip } from "./zip";
import { projectFiles } from "./project";

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("writes local headers, a central directory, and the end record", () => {
    const zip = createZip([{ path: "a/main.go", content: "package main\n" }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(1);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("a/main.go");
    expect(text).toContain("package main");
  });
});

describe("projectFiles", () => {
  it("bundles go code with the shipped package and a go.mod", () => {
    const files = projectFiles({
      chapterId: "chapter-01",
      chapterTitle: "HANDSHAKE",
      language: "go",
      code: "package main",
      module: { module: "terminal", files: [{ path: "cellblock/cellblock.go", content: "package cellblock" }] },
    });
    expect(files.map((f) => f.path)).toEqual([
      "signal-chapter-01/main.go",
      "signal-chapter-01/cellblock/cellblock.go",
      "signal-chapter-01/go.mod",
      "signal-chapter-01/README.md",
    ]);
    expect(files[2].content).toBe("module terminal\n\ngo 1.21\n");
    expect(files[3].content).toContain("go run .");
  });

  it("marks javascript projects as ES modules", () => {
    const files = projectFiles({ chapterId: "chapter-04.2", chapterTitle: "CIPHER", language: "javascript", code: "x" });
    expect(files.map((f) => f.path)).toContain("signal-chapter-04-2/package.json");
  });
});
