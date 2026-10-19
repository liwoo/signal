// ── Maya answer banks ──
// Each step has a bank of Maya's lines: her intro, concept answers, targeted
// feedback for common wrong code/output, and the completion line carrying the
// sacred ||COMPLETE|| token. Banks are authored per language under the shared
// step ids ("chapter-01:scaffold").

export interface CodePattern {
  match: (code: string) => boolean;
  response: string;
}

export interface OutputPattern {
  match: (output: string) => boolean;
  response: string;
}

export interface ConceptEntry {
  keywords: string[];
  response: string;
}

export interface StepBank {
  intro: string;
  conceptFAQ: ConceptEntry[];
  codePatterns: CodePattern[];
  outputPatterns?: OutputPattern[];
  correctResponse: string;
  genericWrong: string[];
  rushDialogue: string[];
  stuckResponses: string[];
  deflections: string[];
}
