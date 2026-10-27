"use client";

/**
 * /teach — the teacher console. Three gates, in order:
 *   1. signed in with Google            → else TeacherSignIn
 *   2. has a teacher account (teachers) → else TeacherOnboarding
 *   3. the dashboard
 * Teacher accounts are separate from player accounts: the database only lets
 * teachers create classes, and won't let a teacher join one as a student.
 */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { ClassroomError, getTeacherAccount } from "@/lib/classroom/api";
import type { TeacherAccount } from "@/types/classroom";
import { Button } from "@/components/teacher-ui/button";
import { Skeleton } from "@/components/teacher-ui/misc";
import { TeacherSignIn } from "./TeacherSignIn";
import { TeacherOnboarding } from "./TeacherOnboarding";
import { TeacherDashboard } from "./TeacherDashboard";
import { sentence } from "./status";

type AccountState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "ready"; account: TeacherAccount }
  | { kind: "error"; message: string };

export function TeacherConsole() {
  const { user, loading } = useAuth();
  if (loading) return <ConsoleSkeleton />;
  if (!user) return <TeacherSignIn />;
  // Keyed so switching Google accounts never shows the previous account's state.
  return <TeacherAccountGate key={user.id} user={user} />;
}

function TeacherAccountGate({ user }: { user: User }) {
  const [state, setState] = useState<AccountState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getTeacherAccount(user.id).then(
      (account) => live && setState(account ? { kind: "ready", account } : { kind: "none" }),
      (e) => live && setState({ kind: "error", message: e instanceof ClassroomError ? sentence(e.message) : "Couldn't load your account." }),
    );
    return () => {
      live = false;
    };
  }, [user.id, attempt]);

  switch (state.kind) {
    case "loading":
      return <ConsoleSkeleton />;
    case "error":
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-tc-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={() => { setState({ kind: "loading" }); setAttempt((n) => n + 1); }}>Try again</Button>
        </div>
      );
    case "none":
      return <TeacherOnboarding user={user} onCreated={(account) => setState({ kind: "ready", account })} />;
    case "ready":
      return <TeacherDashboard user={user} account={state.account} onAccountChange={(account) => setState({ kind: "ready", account })} />;
  }
}

function ConsoleSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r bg-tc-sidebar p-4 md:block">
        <Skeleton className="mb-6 h-6 w-32" />
        <Skeleton className="mb-2 h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    </div>
  );
}
