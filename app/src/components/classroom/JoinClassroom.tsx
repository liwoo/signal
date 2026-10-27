"use client";

/**
 * /join and /join/[code] — how a student gets onto a teacher's roster.
 * Sign in with Google (bouncing back here), confirm the class, join, play.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInScreen } from "@/components/auth/SignInScreen";
import {
  ClassroomError,
  joinClassroom,
  leaveClassroom,
  listStudentClassrooms,
  previewClassroom,
} from "@/lib/classroom/api";
import type { ClassroomPreview, StudentClassroom } from "@/types/classroom";
import { ActionButton, ErrorLine, Loading, Panel, Shell } from "./ui";

const CODE_LENGTH = 6;

function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

export function JoinClassroom({ initialCode }: { initialCode?: string }) {
  const { user, loading } = useAuth();
  const code = initialCode ? cleanCode(initialCode) : "";

  if (loading) return <Shell><Loading label="AUTHENTICATING" /></Shell>;
  if (!user) {
    return (
      <SignInScreen
        returnPath={code ? `/join/${code}` : "/join"}
        subtitle={code ? `CLASS CODE ${code}` : "JOIN A CLASS"}
        eyebrow="▸ YOUR TEACHER IS WAITING"
        lines={[
          "you've been invited to a class on signal — learn to code by helping maya escape.",
          "sign in with google to join. your progress saves to your account.",
        ]}
        footer="YOUR TEACHER WILL SEE YOUR PROGRESS"
      />
    );
  }

  return (
    <Shell>
      <div className="max-w-[520px] mx-auto px-5 py-10 flex flex-col gap-5">
        <div className="text-center">
          <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-[var(--color-signal)] tracking-[6px] text-3xl">
            SIGNAL
          </Link>
          <div className="text-[10px] tracking-[4px] text-[var(--color-dim)] mt-1.5">JOIN A CLASS</div>
        </div>
        <JoinCard initialCode={code} />
        <MyClasses userId={user.id} />
        <div className="text-center text-[11px] text-[var(--color-dim)]">
          signed in as {user.email} · <Link href="/play" className="text-[var(--color-signal)] underline">play without a class</Link>
        </div>
      </div>
    </Shell>
  );
}

type JoinState =
  | { kind: "enter" }
  | { kind: "looking" }
  | { kind: "found"; preview: ClassroomPreview }
  | { kind: "joined"; preview: ClassroomPreview }
  | { kind: "missing" };

function JoinCard({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<JoinState>(initialCode.length === CODE_LENGTH ? { kind: "looking" } : { kind: "enter" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (value: string) => {
    setState({ kind: "looking" });
    setError(null);
    try {
      const preview = await previewClassroom(value);
      setState(preview ? { kind: "found", preview } : { kind: "missing" });
    } catch (e) {
      setState({ kind: "enter" });
      setError(e instanceof ClassroomError ? e.message : "couldn't look up that code");
    }
  }, []);

  useEffect(() => {
    if (initialCode.length === CODE_LENGTH) void lookup(initialCode);
  }, [initialCode, lookup]);

  async function join(preview: ClassroomPreview) {
    setBusy(true);
    setError(null);
    try {
      await joinClassroom(code);
      setState({ kind: "joined", preview });
      window.dispatchEvent(new CustomEvent("signal:classes-changed"));
    } catch (e) {
      setError(e instanceof ClassroomError ? e.message : "couldn't join the class");
    } finally {
      setBusy(false);
    }
  }

  const codeForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === CODE_LENGTH) {
          window.history.replaceState(null, "", `/join/${code}`);
          void lookup(code);
        }
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="join-code" className="text-[12px] text-[var(--color-foreground)] opacity-80">
        enter the 6-character code from your teacher
      </label>
      <input
        id="join-code"
        value={code}
        onChange={(e) => setCode(cleanCode(e.target.value))}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        placeholder="ABC234"
        className="w-full bg-transparent px-3 py-3 text-center font-[family-name:var(--font-mono)] font-bold text-2xl tracking-[10px] text-[var(--color-signal)] border border-[var(--color-border)] focus:border-[var(--color-signal)] outline-none placeholder:text-[var(--color-border)]"
      />
      <ActionButton type="submit" solid disabled={code.length !== CODE_LENGTH}>FIND CLASS</ActionButton>
    </form>
  );

  return (
    <Panel>
      <div className="p-5">
        {state.kind === "enter" && codeForm}
        {state.kind === "looking" && <Loading label="LOOKING UP CODE" />}
        {state.kind === "missing" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-[var(--color-alert)]">no class with code {code}. check it with your teacher.</p>
            {codeForm}
          </div>
        )}
        {state.kind === "found" && (
          <FoundClass preview={state.preview} busy={busy} onJoin={() => void join(state.preview)} onBack={() => setState({ kind: "enter" })} />
        )}
        {state.kind === "joined" && (
          <div className="flex flex-col gap-4 text-center">
            <div className="text-[10px] tracking-[3px] text-[var(--color-dim)]">YOU&apos;RE IN</div>
            <div className="font-[family-name:var(--font-display)] text-xl text-[var(--color-signal)]">{state.preview.name}</div>
            <p className="text-[12px] leading-[1.7] text-[var(--color-foreground)] opacity-80">
              {state.preview.teacherName} can now follow your progress. head in — maya&apos;s waiting.
            </p>
            <Link
              href="/play"
              className="block py-3 border-2 border-[var(--color-signal)] text-[var(--color-signal)] font-[family-name:var(--font-display)] text-xs tracking-[5px] hover:bg-[var(--color-signal)] hover:text-[var(--color-background)] transition-colors"
            >
              START PLAYING
            </Link>
          </div>
        )}
        <ErrorLine message={error} />
      </div>
    </Panel>
  );
}

function FoundClass({ preview, busy, onJoin, onBack }: {
  preview: ClassroomPreview;
  busy: boolean;
  onJoin: () => void;
  onBack: () => void;
}) {
  const heading = (
    <div className="text-center">
      <div className="font-[family-name:var(--font-display)] text-xl text-[var(--color-signal)] break-words">{preview.name}</div>
      <div className="text-[12px] text-[var(--color-dim)] mt-1">
        taught by {preview.teacherName}
        {preview.teacherSchool && <> · {preview.teacherSchool}</>}
      </div>
    </div>
  );

  if (preview.isTeacher) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="text-[12px] text-center text-[var(--color-foreground)] opacity-80">this is your class. share this link with students — you&apos;ll see them on the teacher console.</p>
        <Link href="/teach" className="text-center text-[11px] tracking-[2px] text-[var(--color-info)] underline">OPEN TEACHER CONSOLE</Link>
      </div>
    );
  }
  if (preview.callerIsTeacher) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="text-[12px] text-center text-[var(--color-alert)] leading-[1.7]">
          you&apos;re signed in with a teacher account. students join with their own google account.
        </p>
        <Link href="/teach" className="text-center text-[11px] tracking-[2px] text-[var(--color-info)] underline">OPEN TEACHER CONSOLE</Link>
      </div>
    );
  }
  if (preview.alreadyMember) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="text-[12px] text-center text-[var(--color-foreground)] opacity-80">you&apos;re already in this class.</p>
        <Link href="/play" className="block text-center py-3 border-2 border-[var(--color-signal)] text-[var(--color-signal)] font-[family-name:var(--font-display)] text-xs tracking-[5px]">
          CONTINUE PLAYING
        </Link>
      </div>
    );
  }
  if (!preview.joiningOpen) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="text-[12px] text-center text-[var(--color-alert)]">this class isn&apos;t taking new students right now. ask your teacher to reopen joining.</p>
        <ActionButton tone="dim" onClick={onBack}>TRY ANOTHER CODE</ActionButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {heading}
      <div className="border-l-2 border-[var(--color-info)] pl-3 text-[11px] leading-[1.7] text-[var(--color-foreground)] opacity-80">
        joining shares your name, email, chapter progress, xp and in-game activity (passed and failed tries, hints, when you last played) with {preview.teacherName}.
        your code and chats with maya are not shared. you can leave the class any time.
      </div>
      <ActionButton solid disabled={busy} onClick={onJoin}>{busy ? "JOINING…" : "JOIN CLASS"}</ActionButton>
      <ActionButton tone="dim" onClick={onBack}>NOT MY CLASS</ActionButton>
    </div>
  );
}

function MyClasses({ userId }: { userId: string }) {
  const [classes, setClasses] = useState<StudentClassroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      listStudentClassrooms(userId).then(setClasses, (e) => {
        setClasses([]);
        setError(e instanceof ClassroomError ? e.message : "couldn't load your classes");
      }),
    [userId],
  );

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener("signal:classes-changed", onChange);
    return () => window.removeEventListener("signal:classes-changed", onChange);
  }, [load]);

  if (!classes || classes.length === 0) return <ErrorLine message={error} />;

  return (
    <Panel title="YOUR CLASSES">
      <ul>
        {classes.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-b-0">
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--color-foreground)] truncate">{c.name}</div>
              <div className="text-[10px] text-[var(--color-dim)]">
                {c.teacherName}
                {c.teacherSchool && <> · {c.teacherSchool}</>} · joined {new Date(c.joinedAt).toLocaleDateString()}
              </div>
            </div>
            <ActionButton
              tone="dim"
              onClick={() => {
                if (!window.confirm(`Leave ${c.name}? Your teacher will stop seeing your progress.`)) return;
                leaveClassroom(c.id, userId)
                  .then(load)
                  .catch((e) => setError(e instanceof ClassroomError ? e.message : "couldn't leave the class"));
              }}
            >
              LEAVE
            </ActionButton>
          </li>
        ))}
      </ul>
      <ErrorLine message={error} />
    </Panel>
  );
}
