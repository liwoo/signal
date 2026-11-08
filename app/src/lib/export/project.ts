// The player's finished chapter as a runnable project: their own code, any
// package the game shipped for the step, and the one command that runs it.

import type { CompileModule, LanguageId } from "@/types/game";
import type { ZipFile } from "./zip";

const RUN: Record<LanguageId, string> = {
  go: "go run .",
  python: "python3 main.py",
  javascript: "node main.js",
};

const MAIN: Record<LanguageId, string> = { go: "main.go", python: "main.py", javascript: "main.js" };

const INSTALL: Record<LanguageId, string> = {
  go: "Go 1.21+ (https://go.dev/dl)",
  python: "Python 3 (https://www.python.org/downloads)",
  javascript: "Node.js 18+ (https://nodejs.org)",
};

/** A filesystem-safe folder name, e.g. "signal-chapter-01". */
export function projectName(chapterId: string): string {
  return `signal-${chapterId.replace(/[^a-z0-9.-]+/gi, "-").replace(/\./g, "-").toLowerCase()}`;
}

export function projectFiles(opts: {
  chapterId: string;
  chapterTitle: string;
  language: LanguageId;
  code: string;
  module?: CompileModule;
}): ZipFile[] {
  const { chapterId, chapterTitle, language, code, module } = opts;
  const root = projectName(chapterId);
  const files: ZipFile[] = [{ path: `${root}/${MAIN[language]}`, content: code.endsWith("\n") ? code : `${code}\n` }];

  for (const file of module?.files ?? []) {
    files.push({ path: `${root}/${file.path}`, content: file.content });
  }
  if (language === "go") {
    files.push({
      path: `${root}/go.mod`,
      content: `module ${module?.module ?? "signal"}\n\ngo ${module?.goVersion ?? "1.21"}\n`,
    });
  }
  if (language === "javascript") {
    // `import ... from "./x.js"` needs ES modules.
    files.push({ path: `${root}/package.json`, content: `{\n  "name": "${root}",\n  "type": "module"\n}\n` });
  }

  const shipped = (module?.files ?? []).map((f) => `- \`${f.path}\` — provided by the game (Maya's facility)`).join("\n");
  files.push({
    path: `${root}/README.md`,
    content: [
      `# SIGNAL · ${chapterTitle}`,
      "",
      "Your solution from SIGNAL, as a project you can run on your own machine.",
      "",
      `Needs ${INSTALL[language]}. Then, in this folder:`,
      "",
      "```",
      RUN[language],
      "```",
      "",
      "## Files",
      "",
      `- \`${MAIN[language]}\` — your code`,
      ...(shipped ? [shipped] : []),
      "",
      "Try changing a value and running it again.",
      "",
    ].join("\n"),
  });
  return files;
}
