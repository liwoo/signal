"use client";

import { Suspense, useCallback, useState, useSyncExternalStore } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { CodeEditor } from "@/components/game/CodeEditor";
import { ObjectiveBar } from "@/components/game/ObjectiveBar";
import { LevelObjectivesOverlay } from "@/components/game/MissionPanel";
import { KnowStep, LoopStrip, PaceStep } from "@/components/game/FirstSession";
import { ChapterTakeaway } from "@/components/game/ChapterTakeaway";
import { LanguageProvider } from "@/components/game/LanguageContext";
import { callMayaEngineAsync } from "@/lib/ai/engine";
import { buildSubmissionFeedback } from "@/lib/game/submission-feedback";
import { isLanguageId, getLanguageService } from "@/lib/lang/registry";
import { realizeChallenge } from "@/data/challenges/realizations";
import { chapter01 } from "@/data/challenges/chapter-01";
import { TAKEAWAYS } from "@/data/takeaways";
import { SOLUTIONS } from "@/lib/lang/fixtures";
import type { LanguageId, Pace, PriorLanguage, SubmissionFeedback } from "@/types/game";

// Development-only preview of the visual-UX recommendations, one screen each
// (the real /play flow needs Google sign-in):
//   /dev/ux?screen=first&stage=hook|know|pace  → the first-session screens
//   /dev/ux?screen=loop&lang=go                 → TEST / TRANSMIT + mission checks on Ch1 step 2
//   /dev/ux?screen=takeaway&lang=python         → the chapter takeaway (Ch1)

const GO_ALMOST = `package main

import (
    "fmt"
    "terminal/cellblock"
)

func main() {
    fmt.Println("CELL", cellblock.Cell, "SUBLEVEL", cellblock.Sublevel)
}`;

const GO_SOLVED = GO_ALMOST.replace('"SUBLEVEL"', '"- SUBLEVEL"');

function solved(language: LanguageId): string {
  return language === "go" ? GO_SOLVED : SOLUTIONS[language]["chapter-01:location"];
}

function almost(language: LanguageId): string {
  return language === "go" ? GO_ALMOST : solved(language).replace(" - SUBLEVEL", " SUBLEVEL");
}

function FirstSessionPreview({ stage }: { stage: string }) {
  const [language, setLanguage] = useState<LanguageId>("go");
  const [prior, setPrior] = useState<PriorLanguage | undefined>(stage === "know" ? undefined : "python");
  const [pace, setPace] = useState<Pace | undefined>();
  const go = (s: string) => { window.location.search = `?screen=first&stage=${s}`; };
  return (
    <div className="min-h-dvh flex items-center justify-center px-5" style={{ background: "var(--color-background)" }}>
      <div className="max-w-[480px] w-full px-5 py-6" style={{ border: "1px dashed var(--color-border)" }}>
        {stage === "know" ? (
          <KnowStep language={language} prior={prior} onChangeLanguage={setLanguage} onChangePrior={setPrior} onNext={() => go("pace")} onBack={() => go("hook")} />
        ) : stage === "pace" ? (
          <PaceStep pace={pace} onPick={setPace} onBack={() => go("know")} />
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="text-[var(--color-dim)] text-[10px] tracking-[6px] mb-3.5">▸ ENCRYPTED SIGNAL · ACT I</div>
              <div className="font-[family-name:var(--font-display)] font-black text-[var(--color-signal)] tracking-[6px] leading-none" style={{ fontSize: 64 }}>SIGNAL</div>
              <div className="text-[var(--color-dim)] text-[10px] tracking-[5px] mt-1.5">FIRST CONTACT</div>
            </div>
            <LoopStrip />
            <div className="border border-[#0a2a1a] border-l-[3px] border-l-[#2a8a5a] p-3.5 mb-3.5">
              <p className="text-[var(--color-dim)] text-xs leading-[1.8]">maya chen. missing 72hrs. she&apos;s alive — hacked a terminal in sublevel 3.</p>
              <p className="text-[var(--color-signal)] text-xs leading-[1.8] mt-1.5">she needs a Go programmer. write the code. get her out.</p>
            </div>
            <button type="button" onClick={() => go("know")} className="w-full py-3.5 bg-transparent border-2 border-[var(--color-signal)] text-[var(--color-signal)] font-[family-name:var(--font-display)] text-xs tracking-[6px]">
              CONNECT TO MAYA
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoopPreview({ language }: { language: LanguageId }) {
  const challenge = realizeChallenge(chapter01, language);
  const step = challenge.steps[1];
  const [code, setCode] = useState(() => almost(language));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const [objectives, setObjectives] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const isMobile = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );

  const run = useCallback(async (source: "test" | "transmit") => {
    if (source === "test") setTesting(true); else setBusy(true);
    const res = await callMayaEngineAsync(step.id, code, true, false, false, attempts, {
      testHarness: step.testHarness, expectedOutput: step.expectedOutput, requiredCode: step.requiredCode, compileModule: step.compileModule,
    }, language);
    if (source === "transmit") {
      setAttempts((a) => a + 1);
      setSent(res.isComplete ? "maya: step cleared" : `maya: ${res.reply}`);
    }
    setFeedback(source === "transmit" && res.isComplete ? null : {
      ...buildSubmissionFeedback(code, res.reply, step.hints[0]?.text, language),
      source, code, ...(res.report ? { report: res.report } : {}),
    });
    setTesting(false);
    setBusy(false);
  }, [code, step, attempts, language]);

  return (
    <div className="h-dvh flex flex-col" style={{ background: "var(--color-background)" }}>
      <ObjectiveBar challenge={challenge} currentStep={step} currentStepIndex={1} jeopardy={[]} onOpenMission={() => setObjectives(true)} />
      <div className="flex-1 min-h-0 flex flex-col">
        <CodeEditor
          code={code}
          onCodeChange={setCode}
          onSubmit={() => run("transmit")}
          onTest={() => run("test")}
          testing={testing}
          busy={busy}
          attempts={attempts}
          inRush={false}
          baseXP={step.xp.base}
          rushBonus={0}
          language={language}
          isMobile={isMobile}
          submissionFeedback={feedback}
          onDismissSubmissionFeedback={() => setFeedback(null)}
        />
      </div>
      {sent ? <div className="px-3 py-1.5 text-[10px]" style={{ color: "var(--color-dim)" }}>{sent}</div> : null}
      {objectives ? (
        <LevelObjectivesOverlay challenge={challenge} currentStep={step} currentStepIndex={1} totalSteps={challenge.steps.length} onClose={() => setObjectives(false)} />
      ) : null}
    </div>
  );
}

function UxPreview() {
  const params = useSearchParams();
  if (process.env.NODE_ENV === "production") notFound();
  const raw = params.get("lang");
  const language: LanguageId = isLanguageId(raw) ? raw : "go";
  const screen = params.get("screen") ?? "loop";

  return (
    <LanguageProvider language={language}>
      {screen === "first" ? (
        <FirstSessionPreview stage={params.get("stage") ?? "hook"} />
      ) : screen === "takeaway" ? (
        <ChapterTakeaway
          chapterId="chapter-01"
          title="CHAPTER 1 COMPLETE"
          subtitle="HANDSHAKE ESTABLISHED"
          takeaway={TAKEAWAYS["chapter-01"]}
          language={language}
          code={solved(language)}
          module={realizeChallenge(chapter01, language).steps[1].compileModule}
          xp={240}
          level={2}
          onContinue={() => alert("continue")}
          onRetry={() => alert("replay")}
        />
      ) : (
        <LoopPreview key={language} language={language} />
      )}
      <div className="fixed bottom-1 right-2 z-[2000] text-[9px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
        {getLanguageService(language).label} · dev/ux
      </div>
    </LanguageProvider>
  );
}

export default function UxDevPage() {
  return (
    <Suspense fallback={null}>
      <UxPreview />
    </Suspense>
  );
}
