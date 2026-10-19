// ── Go harness injection + error explanations ──
// How Go runs a step: a test harness replaces the player's func main, a shipped
// package is bundled as a txtar module, and raw compiler / vet output becomes
// one clear line for Maya to say.

import type { CompileModule } from "@/types/game";

// ── Wrap the player's code + a shipped package into a txtar module ──
// The Go Playground (version 2) compiles a multi-file txtar body: each file is
// introduced by a `-- path --` marker. We emit go.mod, the player's main.go,
// and every package file the step provides.

export function buildModuleSource(mainGo: string, mod: CompileModule): string {
  const sections: string[] = [
    `-- go.mod --\nmodule ${mod.module}\n\ngo ${mod.goVersion ?? "1.21"}\n`,
    `-- main.go --\n${mainGo.trimEnd()}\n`,
    ...mod.files.map((f) => `-- ${f.path} --\n${f.content.trimEnd()}\n`),
  ];
  return sections.join("");
}

// ── Replace user's main() with test harness ──

export function replaceMain(code: string, harness: string): string {
  // Remove user's func main() { ... } and replace with the harness
  // Match func main() { ... } accounting for nested braces
  const mainStart = code.search(/func\s+main\s*\(\s*\)\s*\{/);
  if (mainStart === -1) {
    // No main found — just append the harness
    return code + "\n" + harness;
  }

  // Find the matching closing brace
  const braceStart = code.indexOf("{", mainStart);
  let depth = 0;
  let braceEnd = braceStart;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;
    if (depth === 0) {
      braceEnd = i;
      break;
    }
  }

  return code.slice(0, mainStart) + harness + code.slice(braceEnd + 1);
}

// ── Format Compile Errors ──

export function formatCompileError(errors: string, inRush: boolean): string {
  const raw = errors.trim();
  const prefix = inRush ? "no time for bugs. " : "";

  // Runtime panics — give targeted feedback
  if (raw.includes("assignment to entry in nil map")) {
    return `${prefix}your map is nil — you declared it but never initialized it.\n\nuse \`occupied := map[string]bool{}\` (with the curly braces) to create an empty map. \`var m map[string]bool\` gives you nil, and writing to nil panics.`;
  }
  if (raw.includes("index out of range")) {
    return `${prefix}index out of range — you're accessing a position that doesn't exist in the slice or string.`;
  }
  if (raw.includes("nil pointer dereference")) {
    return `${prefix}nil pointer — you're using a variable that was never initialized.`;
  }
  if (raw.includes("divide by zero")) {
    return `${prefix}division by zero. check your math.`;
  }
  if (raw.includes("goroutine") && raw.includes("panic")) {
    const panicMatch = raw.match(/panic:\s*(.+)/);
    if (panicMatch) {
      return `${prefix}runtime panic: ${panicMatch[1].trim()}`;
    }
    return `${prefix}your code panicked at runtime. check for nil maps, out-of-range indices, or uninitialized variables.`;
  }

  // Go compiler errors look like: ./prog.go:4:6: undefined: fmt.WriteLine
  // Strip the ./prog.go: prefix and take the first error
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "the terminal rejected that. check your code.";

  const first = lines[0]
    .replace(/^\.\/prog\.go:/, "")
    .trim();

  return `${prefix}${first}`;
}

export function formatVetError(vetErrors: string, inRush: boolean): string {
  // Go vet errors look like: ./prog.go:7:2: fmt.Println call has possible Printf formatting directive %s
  const lines = vetErrors.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "the terminal flagged a warning. check your code.";

  const first = lines[0]
    .replace(/^\.\/prog\.go:/, "")
    .trim();

  const prefix = inRush ? "hurry — " : "";

  // Common vet: Println with format verbs → give clear Maya-style guidance
  if (first.includes("Println") && first.includes("Printf")) {
    return `${prefix}${first}\n\nyou're using format verbs like \`%s\` or \`%d\` inside \`Println\`. that's \`Printf\` territory.\n\n\`Println\` just prints its args separated by spaces. \`Printf\` interprets the format string. switch to \`fmt.Printf(...)\` and add \`\\n\` at the end.`;
  }

  return `${prefix}go vet: ${first}`;
}
