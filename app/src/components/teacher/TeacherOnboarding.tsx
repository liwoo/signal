"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { ClassroomError, createTeacherAccount } from "@/lib/classroom/api";
import type { TeacherAccount } from "@/types/classroom";
import { Button } from "@/components/teacher-ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/teacher-ui/card";
import { Input, Label } from "@/components/teacher-ui/input";
import { Avatar } from "@/components/teacher-ui/misc";
import { Logo } from "./brand";
import { sentence } from "./status";

/** First visit to /teach: turn this Google sign-in into a teacher account. */
export function TeacherOnboarding({ user, onCreated }: { user: User; onCreated: (account: TeacherAccount) => void }) {
  const { signOut } = useAuth();
  const meta = user.user_metadata ?? {};
  const [fullName, setFullName] = useState<string>((meta.full_name as string) || (meta.name as string) || "");
  const [school, setSchool] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = fullName.trim().length > 0 && school.trim().length > 0 && confirmed;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(await createTeacherAccount(user.id, { fullName, school }));
    } catch (err) {
      setError(err instanceof ClassroomError ? sentence(err.message) : "Couldn't create your teacher account.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-tc-muted/40 p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Logo className="self-center" />
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-6">
            <CardHeader>
              <CardTitle className="text-xl">Create your teacher account</CardTitle>
              <CardDescription>
                Teacher accounts manage classes and see student progress. They&apos;re kept separate from student accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar name={fullName || user.email || "?"} src={meta.avatar_url as string | undefined} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.email}</div>
                  <div className="text-xs text-tc-muted-foreground">Signed in with Google</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>Switch</Button>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tc-name">Your name</Label>
                <Input id="tc-name" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} placeholder="Ms. Okafor" autoComplete="name" />
                <p className="text-xs text-tc-muted-foreground">Shown to students when they join your classes.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tc-school">School or organization</Label>
                <Input id="tc-school" value={school} maxLength={160} onChange={(e) => setSchool(e.target.value)} placeholder="Lincoln High School" autoComplete="organization" />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-tc-primary"
                />
                <span className="text-tc-muted-foreground">
                  I&apos;m a teacher or educator, and I&apos;ll only invite students I teach.
                </span>
              </label>
              {error && <p className="text-sm text-tc-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={!valid || busy}>
                {busy ? "Creating account…" : "Create teacher account"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
