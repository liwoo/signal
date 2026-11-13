"use client";

// ── Boss 3 · KIRA · ALLEGIANCE ──
// The judgment boss: study Kira's encoder, mark the lines that betray the
// stream, explain WHY in words, then TRUST or REJECT. Optional redemption
// rewrites the encoder safely. No hearts, no game over, no kill-timer — the
// clock only fades in (dimly) late in the verdict, and only costs bonus XP.
// Rules live in src/lib/game/allegiance.ts; content in data/challenges/boss-03.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor } from "@/components/game/CodeEditor";
import { TwistReveal } from "@/components/story/TwistReveal";
import { useAudio } from "@/hooks/useAudio";
import { getLanguageService } from "@/lib/lang/registry";
import {
  ALLEGIANCE,
  ALLEGIANCE_LINES,
  ALLEGIANCE_TWISTS,
  FIX_EXPECTED_OUTPUT,
  RECEIVER_LOG,
  type AllegianceLine,
} from "@/data/challenges/boss-03";
import {
  CLOCK_VISIBLE_AT_SECONDS,
  REDEMPTION_SECONDS,
  checkMarks,
  gradeExplanation,
  isFinal,
  kiraVerdictFor,
  resolveVerdict,
  studyXP,
  tallyXP,
  usesCopy,
  type AllegianceTally,
  type Verdict,
  type VerdictOutcome,
} from "@/lib/game/allegiance";
import type { KiraVerdict, LanguageId } from "@/types/game";

export interface AllegianceResult {
  verdict: KiraVerdict;
  outcome: VerdictOutcome;
  tally: AllegianceTally;
}

interface AllegianceBossProps {
  language: LanguageId;
  compact?: boolean;
  soundEnabled: boolean;
  loopsEnabled: boolean;
  vimEnabled: boolean;
  onFinish: (result: AllegianceResult) => void;
}

type Phase = "study" | "verdict" | "decide" | "redeem-offer" | "redeem" | "twist";

const VOICE_COLOR: Record<AllegianceLine["who"], string> = {
  KIRA: "var(--color-kira)",
  REEVES: "var(--color-paper)",
  MAYA: "var(--color-signal)",
  GHOST: "var(--color-danger)",
  SYS: "var(--color-alert)",
};

function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AllegianceBoss({ language, compact = false, soundEnabled, loopsEnabled, vimEnabled, onFinish }: AllegianceBossProps) {
  const r = ALLEGIANCE[language] ?? ALLEGIANCE.go;
  const lang = getLanguageService(language);
  const audio = useAudio(soundEnabled, loopsEnabled);

  const [phase, setPhase] = useState<Phase>("study");
  const [feed, setFeed] = useState<AllegianceLine[]>([]);
  const say = useCallback((line: AllegianceLine) => setFeed((f) => (f.includes(line) ? f : [...f, line])), []);

  // ── Study ──
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [wrongMarks, setWrongMarks] = useState(0);
  const [markNote, setMarkNote] = useState<string | null>(null);

  // ── Verdict ──
  const [explanation, setExplanation] = useState("");
  const [inputNote, setInputNote] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [revisions, setRevisions] = useState(0);
  const [pendingOutcome, setPendingOutcome] = useState<VerdictOutcome | null>(null);
  const [outcome, setOutcome] = useState<VerdictOutcome | null>(null);
  const verdictStartRef = useRef(0);
  const verdictSecondsRef = useRef(0);
  const [verdictElapsed, setVerdictElapsed] = useState(0);

  // ── Redemption ──
  const [fixCode, setFixCode] = useState(r.fixStarter);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixFails, setFixFails] = useState(0);
  const [fixNote, setFixNote] = useState<string | null>(null);
  const [redeemLeft, setRedeemLeft] = useState(REDEMPTION_SECONDS);
  const [redeemed, setRedeemed] = useState(false);

  // Atmosphere: the only silent boss — a drone, and a slow heartbeat under the verdict.
  useEffect(() => {
    audio.startLoop("dark-drone-1", 0.1, 2000);
    return () => {
      audio.stopLoop("dark-drone-1", 800);
      audio.stopLoop("heartbeat-slow", 800);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, []);

  // Study-phase voices.
  useEffect(() => {
    if (phase !== "study") return;
    const a = setTimeout(() => say(ALLEGIANCE_LINES.studyOpen), 600);
    const b = setTimeout(() => say(ALLEGIANCE_LINES.studyLog), 7000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [phase, say]);

  // Verdict-phase clock + voices (soft: nothing here ends the encounter).
  useEffect(() => {
    if (phase !== "verdict" && phase !== "decide") return;
    if (!verdictStartRef.current) {
      verdictStartRef.current = Date.now();
      say(ALLEGIANCE_LINES.verdictOpen);
      audio.startLoop("heartbeat-slow", 0.12, 3000);
    }
    const iv = setInterval(() => {
      const s = (Date.now() - verdictStartRef.current) / 1000;
      setVerdictElapsed(s);
      if (s >= 120) say(ALLEGIANCE_LINES.verdict120);
      if (s >= 240) say(ALLEGIANCE_LINES.verdict240);
      if (s >= 300) say(ALLEGIANCE_LINES.verdict300);
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, say, audio]);

  // Redemption countdown: expiry just closes the offer.
  useEffect(() => {
    if (phase !== "redeem") return;
    const iv = setInterval(() => setRedeemLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [phase]);
  useEffect(() => {
    if (phase !== "redeem") return;
    if (redeemLeft === 30) say(ALLEGIANCE_LINES.fixFinalCall);
    if (redeemLeft === 0) {
      setFixNote("the dock window closed. we move without the rewrite.");
      const t = setTimeout(() => setPhase("twist"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase, redeemLeft, say]);

  const toggleLine = (i: number) => {
    if (phase !== "study") return;
    audio.playSfx("keypad-beep", 0.25);
    setMarkNote(null);
    setMarked((m) => {
      const next = new Set(m);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submitMarks = () => {
    const result = checkMarks(marked, r.suspectLines, r.acceptableLines);
    if (result.correct) {
      audio.playSfx("handshake-confirm", 0.3);
      setMarkNote(null);
      setPhase("verdict");
      return;
    }
    const wrong = wrongMarks + 1;
    setWrongMarks(wrong);
    audio.playSfx("warning-beep", 0.25);
    if (wrong === 2) say(ALLEGIANCE_LINES.studyNudge);
    setMarkNote(
      result.missing.length && !result.extra.length
        ? `not all of it. ${result.missing.length === 1 ? "one line" : "lines"} still unmarked.`
        : result.extra.length && !result.missing.length
          ? "something you marked is innocent."
          : "not those. look at the log again.",
    );
  };

  const finishVerdict = (o: VerdictOutcome) => {
    verdictSecondsRef.current = (Date.now() - verdictStartRef.current) / 1000;
    setOutcome(o);
    audio.playSfx("captured-impact", 0.45);
    audio.stopLoop("heartbeat-slow", 1500);
    setPhase("redeem-offer");
    say(ALLEGIANCE_LINES.fixOpen);
  };

  const submitVerdict = (verdict: Verdict) => {
    if (explanation.trim().split(/\s+/).length < 5) {
      setInputNote("say why first. a few sentences — what does her code do to the frames?");
      return;
    }
    const grade = gradeExplanation(explanation);
    if (grade.isCode) {
      setInputNote("words, not code. explain it the way you'd explain it to reeves.");
      return;
    }
    setInputNote(null);
    const o = resolveVerdict({ passes: grade.passes, verdict, attempt });
    if (isFinal(o)) {
      finishVerdict(o);
      return;
    }
    setPendingOutcome(o);
    setPhase("decide");
    say(o === "challenge" ? ALLEGIANCE_LINES.contradiction : ALLEGIANCE_LINES.luckyGuess);
  };

  // The one extra move the contradiction / lucky guess allows.
  const resolvePending = (choice: "switch-reject" | "confirm-trust" | "revise" | "lock") => {
    if (choice === "switch-reject") finishVerdict("informed-reject");
    else if (choice === "confirm-trust") finishVerdict("eyes-open-trust");
    else if (choice === "lock") finishVerdict("unproven-reject");
    else {
      setRevisions((n) => n + 1);
      setAttempt(2);
      setPendingOutcome(null);
      setPhase("verdict");
    }
  };

  // A revision is graded as REJECT again (the verdict was already chosen).
  const submitRevision = () => {
    const grade = gradeExplanation(explanation);
    if (grade.isCode) {
      setInputNote("words, not code. explain it the way you'd explain it to reeves.");
      return;
    }
    finishVerdict(resolveVerdict({ passes: grade.passes, verdict: "reject", attempt: 2 }));
  };

  const runFix = async () => {
    if (fixBusy) return;
    setFixBusy(true);
    setFixNote(null);
    const res = await lang.run({ code: fixCode, harness: r.fixHarness });
    setFixBusy(false);
    const ok =
      res.status === "ok" && res.stdout.trim() === FIX_EXPECTED_OUTPUT && usesCopy(lang.codeForRequiredCheck(fixCode), r.fixUsesAnyOf);
    if (res.status === "offline") {
      setFixNote("the relay can't reach the compiler right now. try again in a moment.");
      return;
    }
    if (ok) {
      audio.playSfx("handshake-confirm", 0.4);
      setRedeemed(true);
      setFixNote("frames froze at send time. that's how it should have been written.");
      setTimeout(() => setPhase("twist"), 1800);
      return;
    }
    const fails = fixFails + 1;
    setFixFails(fails);
    const why = res.error
      ? `it didn't run: ${res.error.split("\n")[0]}`
      : res.stdout.includes("CORRUPTED")
        ? "the frames still change after they're sent. each one needs its own bytes."
        : "the frames came out wrong. keep the flip, freeze each frame as you send it.";
    if (fails >= 2) {
      setFixNote(`${why} the offer's closed — we move.`);
      setTimeout(() => setPhase("twist"), 2200);
    } else {
      setFixNote(`${why} one more try.`);
    }
  };

  const verdict = outcome ? kiraVerdictFor(outcome) : null;
  const tally = useMemo(
    () =>
      outcome
        ? tallyXP({ wrongMarks, outcome, verdictSeconds: verdictSecondsRef.current, revisions, redeemed })
        : null,
    [outcome, wrongMarks, revisions, redeemed],
  );

  if (phase === "twist" && outcome && tally && verdict) {
    const twist = ALLEGIANCE_TWISTS[verdict === "rejected" ? "rejected" : "trusted"];
    return <TwistReveal headline={twist.headline} lines={[...twist.lines]} onDone={() => onFinish({ verdict, outcome, tally })} />;
  }

  const showClock = (phase === "verdict" || phase === "decide") && verdictElapsed >= CLOCK_VISIBLE_AT_SECONDS;
  const verdictOpen = phase === "verdict";

  return (
    <div className="fixed inset-0 z-[800] flex flex-col" style={{ background: "#020406" }} data-testid="allegiance-boss">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        <span className="text-[10px] tracking-[3px] font-[family-name:var(--font-display)] text-[var(--color-alert)] whitespace-nowrap">
          <span className="inline-block w-2 h-2 mr-2 align-middle" style={{ background: "var(--color-alert)", opacity: 0.8 }} />
          {compact ? "KIRA · ALLEGIANCE" : "KIRA · ALLEGIANCE CHECK"}
        </span>
        <span className="text-[10px] tracking-[2px] text-[var(--color-dim)] whitespace-nowrap">
          {phase === "study" ? (compact ? "STUDY" : "STUDY THE EVIDENCE") : phase === "redeem" ? `REWRITE · ${mmss(redeemLeft)}` : phase === "redeem-offer" ? "VERDICT SENT" : "YOUR VERDICT"}
          {showClock && <span className="ml-3 opacity-60">{mmss(verdictElapsed)}</span>}
        </span>
      </div>

      <div className={`flex-1 min-h-0 ${compact ? "flex flex-col overflow-y-auto" : "grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"}`}>
        {/* Evidence: Kira's code + the receiver log */}
        <div className={`flex flex-col min-h-0 ${compact ? "" : "border-r border-[var(--color-border)]"}`}>
          {phase === "redeem" ? (
            <div className="flex-1 min-h-[320px]">
              <CodeEditor
                code={fixCode}
                onCodeChange={setFixCode}
                onSubmit={runFix}
                busy={fixBusy}
                attempts={fixFails}
                inRush={false}
                baseXP={0}
                rushBonus={0}
                vimEnabled={compact ? false : vimEnabled}
                isMobile={compact}
                language={language}
              />
            </div>
          ) : (
            <>
              <div className="px-4 pt-3 pb-1 text-[10px] tracking-[3px] text-[var(--color-dim)]">
                TRANSMIT · K.VOLKOV · READ-ONLY{phase === "study" ? " · TAP A LINE TO MARK IT" : ""}
              </div>
              <pre className={`px-2 pb-3 font-[family-name:var(--font-mono)] ${compact ? "text-[13px]" : "text-[15px]"} leading-[1.9] overflow-x-auto`}>
                {r.kiraCode.map((line, i) => {
                  const on = marked.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleLine(i)}
                      disabled={phase !== "study"}
                      aria-pressed={on}
                      className="block w-full text-left px-2 border-l-2 bg-transparent"
                      style={{
                        cursor: phase === "study" ? "pointer" : "default",
                        borderColor: on ? "var(--color-danger)" : "transparent",
                        background: on ? "color-mix(in srgb, var(--color-danger) 14%, transparent)" : "transparent",
                        color: on ? "var(--color-danger)" : "var(--color-foreground)",
                        textShadow: on ? "0 0 10px rgba(255,64,64,.45)" : undefined,
                      }}
                    >
                      <span className="inline-block w-6 text-[var(--color-dim)] opacity-60 select-none">{i + 1}</span>
                      {line || " "}
                    </button>
                  );
                })}
              </pre>
              <div className="px-4 pt-2 pb-1 text-[10px] tracking-[3px] text-[var(--color-dim)] border-t border-[var(--color-border)]">
                RECEIVER LOG · DOCK 4 LOOPBACK
              </div>
              <pre className={`px-4 pb-4 font-[family-name:var(--font-mono)] ${compact ? "text-[11px]" : "text-[13px]"} leading-[1.7] overflow-x-auto`}>
                {RECEIVER_LOG.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      color: l.includes("MISMATCH")
                        ? "var(--color-danger)"
                        : l.endsWith("ok")
                          ? "var(--color-signal)"
                          : l.startsWith("---")
                            ? "var(--color-dim)"
                            : "var(--color-foreground)",
                    }}
                  >
                    {l}
                  </div>
                ))}
              </pre>
            </>
          )}
        </div>

        {/* The channel + what you do now */}
        <div className="flex flex-col min-h-0">
          <div className={`${compact ? "max-h-[160px]" : "flex-1"} min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2`} aria-live="polite">
            {feed.map((l, i) => (
              <div key={i} className="msg-enter text-[14px] leading-[1.6]">
                <div className="text-[10px] tracking-[2px] opacity-70" style={{ color: VOICE_COLOR[l.who] }}>{l.who}</div>
                <div style={{ color: VOICE_COLOR[l.who] }}>{l.text}</div>
              </div>
            ))}
            {phase !== "study" && phase !== "redeem" && phase !== "redeem-offer" && (
              <div className="text-[12px] text-[var(--color-dim)] opacity-80">maya: {r.syntaxAssist}</div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--color-border)] p-4 flex flex-col gap-3">
            {phase === "study" && (
              <>
                <div className="text-[13px] text-[var(--color-alert)] leading-[1.6]">
                  Reeves ran Kira&apos;s encoder on a loopback. Mark the two lines that make the frames go wrong.
                </div>
                <div className="text-[12px] text-[var(--color-dim)]">maya: {r.syntaxAssist}</div>
                {markNote && <div className="text-[13px] text-[var(--color-danger)]">{markNote}</div>}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={submitMarks}
                    disabled={marked.size === 0}
                    className="border border-[var(--color-signal)] text-[var(--color-signal)] px-5 py-2 text-[11px] tracking-[3px] font-[family-name:var(--font-display)] disabled:opacity-40 bg-transparent cursor-pointer"
                  >
                    SUBMIT MARKS ▸
                  </button>
                  {wrongMarks > 2 && (
                    <span className="text-[11px] text-[var(--color-dim)]">study xp {studyXP(wrongMarks)}</span>
                  )}
                </div>
              </>
            )}

            {(phase === "verdict" || phase === "decide") && (
              <>
                <label htmlFor="kira-explanation" className="text-[13px] text-[var(--color-alert)] leading-[1.6]">
                  Does this code corrupt the stream? Say what it does to the frames, and why — in words, not code.
                </label>
                <textarea
                  id="kira-explanation"
                  value={explanation}
                  onChange={(e) => {
                    setExplanation(e.target.value);
                    if (e.target.value.length % 6 === 0) audio.playSfx("maya-typing", 0.08);
                  }}
                  onPaste={(e) => e.preventDefault()}
                  disabled={phase === "decide"}
                  rows={compact ? 4 : 6}
                  className="w-full bg-[var(--color-code-bg)] border border-[var(--color-border)] p-3 text-[14px] leading-[1.6] text-[var(--color-foreground)] resize-none outline-none focus:border-[var(--color-dim)]"
                  placeholder="every frame she sends…"
                />
                {inputNote && <div className="text-[13px] text-[var(--color-danger)]">{inputNote}</div>}

                {phase === "decide" && pendingOutcome === "challenge" && (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => resolvePending("switch-reject")} className="border border-[var(--color-danger)] text-[var(--color-danger)] px-5 py-2 text-[11px] tracking-[3px] font-[family-name:var(--font-display)] bg-transparent cursor-pointer">
                      SWITCH TO REJECT
                    </button>
                    <button type="button" onClick={() => resolvePending("confirm-trust")} className="btn-secondary border border-[var(--color-dim)] text-[var(--color-dim)] px-5 py-2 text-[11px] tracking-[3px] bg-transparent cursor-pointer">
                      TRUST HER ANYWAY
                    </button>
                  </div>
                )}
                {phase === "decide" && pendingOutcome === "lucky-guess" && (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => resolvePending("revise")} className="border border-[var(--color-alert)] text-[var(--color-alert)] px-5 py-2 text-[11px] tracking-[3px] font-[family-name:var(--font-display)] bg-transparent cursor-pointer">
                      REVISE · −10 XP
                    </button>
                    <button type="button" onClick={() => resolvePending("lock")} className="btn-secondary border border-[var(--color-dim)] text-[var(--color-dim)] px-5 py-2 text-[11px] tracking-[3px] bg-transparent cursor-pointer">
                      LOCK MY VERDICT
                    </button>
                  </div>
                )}
                {phase === "verdict" && attempt >= 2 && (
                  <button type="button" onClick={submitRevision} className="self-start border border-[var(--color-danger)] text-[var(--color-danger)] px-5 py-2 text-[11px] tracking-[3px] font-[family-name:var(--font-display)] bg-transparent cursor-pointer">
                    SEND REVISED REJECTION ▸
                  </button>
                )}
              </>
            )}

            {phase === "redeem-offer" && (
              <>
                <div className="text-[13px] text-[var(--color-alert)] leading-[1.6]">
                  Optional · {REDEMPTION_SECONDS / 60} minutes · +150 XP. Rewrite the encoder so every frame freezes the moment it&apos;s sent.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setPhase("redeem")} className="border border-[var(--color-signal)] text-[var(--color-signal)] px-5 py-2 text-[11px] tracking-[3px] font-[family-name:var(--font-display)] bg-transparent cursor-pointer">
                    SHOW HER HOW ▸
                  </button>
                  <button type="button" onClick={() => setPhase("twist")} className="btn-secondary border border-[var(--color-dim)] text-[var(--color-dim)] px-5 py-2 text-[11px] tracking-[3px] bg-transparent cursor-pointer">
                    MOVE ON
                  </button>
                </div>
              </>
            )}

            {phase === "redeem" && (
              <>
                <div className="text-[13px] text-[var(--color-alert)] leading-[1.6]">
                  Keep the flip. Send each frame its own copy of the bytes, so nothing done later can reach it. Transmit to run Reeves&apos; loopback.
                </div>
                {fixNote && <div className="text-[13px]" style={{ color: redeemed ? "var(--color-signal)" : "var(--color-danger)" }}>{fixNote}</div>}
                <button type="button" onClick={() => setPhase("twist")} className="self-start btn-secondary border border-[var(--color-dim)] text-[var(--color-dim)] px-4 py-1.5 text-[10px] tracking-[3px] bg-transparent cursor-pointer">
                  MOVE ON WITHOUT IT
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* The verdict buttons — dim until the evidence is studied */}
      {phase !== "redeem" && phase !== "redeem-offer" && attempt < 2 && (
        <div className={`shrink-0 grid grid-cols-2 gap-px border-t border-[var(--color-border)] ${compact ? "sticky bottom-0" : ""}`} style={{ background: "var(--color-border)" }}>
          {(["trust", "reject"] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={!verdictOpen}
              onClick={() => submitVerdict(v)}
              className="py-4 text-[12px] tracking-[5px] font-[family-name:var(--font-display)] cursor-pointer disabled:cursor-default"
              style={{
                background: "#020406",
                color: !verdictOpen ? "var(--color-dim)" : v === "trust" ? "var(--color-kira)" : "var(--color-danger)",
                opacity: verdictOpen ? 1 : 0.35,
              }}
            >
              {v === "trust" ? "TRUST KIRA" : "REJECT KIRA"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
