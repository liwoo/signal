"use client";

import { Suspense, useCallback, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { CodeEditor } from "@/components/game/CodeEditor";
import { LanguageProvider } from "@/components/game/LanguageContext";
import { getLanguageService, isLanguageId, LANGUAGE_OPTIONS } from "@/lib/lang/registry";
import { callMayaEngineAsync } from "@/lib/ai/engine";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { realizeChallenge } from "@/data/challenges/realizations";
import { SOLUTIONS } from "@/lib/lang/act1.fixtures";
import type { LanguageId } from "@/types/game";

// Development-only language QA:
//   /dev/lang?lang=python      → an editor + RUN on the real in-browser backend
//   RUN ACT I                   → every Act I reference solution through the
//                                 real engine (worker / Pyodide), PASS/FAIL each

interface Row {
  id: string;
  ok: boolean;
  detail: string;
  ms: number;
}

const STARTER: Record<LanguageId, string> = {
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}`,
  javascript: `console.log("Hello World");`,
  python: `print("Hello World")`,
};

function LangPreview() {
  const params = useSearchParams();
  const raw = params.get("lang");
  const language: LanguageId = isLanguageId(raw) ? raw : "javascript";
  const lang = getLanguageService(language);
  const [code, setCode] = useState(STARTER[language]);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  if (process.env.NODE_ENV === "production") notFound();

  const run = useCallback(async () => {
    setBusy(true);
    const t = performance.now();
    const res = await lang.run({ code });
    const ms = Math.round(performance.now() - t);
    setOut(
      res.status === "ok"
        ? `${res.stdout}\n— ok · ${ms}ms`
        : res.status === "offline"
          ? `— offline · ${ms}ms`
          : `${lang.explainError(res.error, false)}\n\nraw: ${res.error}\n— error · ${ms}ms`,
    );
    setBusy(false);
  }, [code, lang]);

  const runAct1 = useCallback(async () => {
    if (language === "go") return;
    setBusy(true);
    setRows([]);
    const steps = [chapter01, chapter02, chapter03].flatMap((c) => realizeChallenge(c, language).steps);
    for (const step of steps) {
      const t = performance.now();
      const res = await callMayaEngineAsync(
        step.id,
        SOLUTIONS[language][step.id],
        true,
        false,
        false,
        0,
        { testHarness: step.testHarness, expectedOutput: step.expectedOutput, requiredCode: step.requiredCode, compileModule: step.compileModule },
        language,
      );
      const row = { id: step.id, ok: res.isComplete, detail: res.reply, ms: Math.round(performance.now() - t) };
      setRows((r) => [...r, row]);
    }
    setBusy(false);
  }, [language]);

  return (
    <LanguageProvider language={language}>
      <div className="min-h-dvh flex flex-col gap-3 p-4" style={{ background: "var(--color-background)" }}>
        <div className="flex items-center gap-2 text-[9px] tracking-[2px]">
          {LANGUAGE_OPTIONS.map((o) => (
            <a key={o.id} href={`/dev/lang?lang=${o.id}`} style={{ color: o.id === language ? "var(--color-signal)" : "var(--color-dim)" }}>
              {o.label}
            </a>
          ))}
          <button type="button" onClick={runAct1} disabled={busy || language === "go"} data-testid="run-act1" className="ml-auto border border-[var(--color-signal)] px-3 py-1 text-[var(--color-signal)]">
            RUN ACT I
          </button>
        </div>
        <div className="h-[320px]" data-testid="editor">
          <CodeEditor code={code} onCodeChange={setCode} onSubmit={run} busy={busy} attempts={0} inRush={false} baseXP={0} rushBonus={0} language={language} />
        </div>
        <pre data-testid="output" className="whitespace-pre-wrap text-[12px] p-3 border border-[var(--color-border)]" style={{ color: "var(--color-foreground)" }}>
          {out || "⌘↵ to run"}
        </pre>
        {rows.length > 0 && (
          <table data-testid="act1" className="text-[11px]" style={{ color: "var(--color-foreground)" }}>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="pr-3" style={{ color: r.ok ? "var(--color-signal)" : "var(--color-danger)" }}>{r.ok ? "PASS" : "FAIL"}</td>
                  <td className="pr-3">{r.id}</td>
                  <td className="pr-3">{r.ms}ms</td>
                  <td style={{ color: "var(--color-dim)" }}>{r.detail.slice(0, 120)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </LanguageProvider>
  );
}

export default function LangDevPage() {
  return (
    <Suspense fallback={null}>
      <LangPreview />
    </Suspense>
  );
}
