"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, KeyRound, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/teacher-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/teacher-ui/card";
import { Separator } from "@/components/teacher-ui/misc";
import { GoogleMark, Logo } from "./brand";

const FEATURES = [
  { icon: Users, title: "Create classes", body: "One class per period or group, each with its own join code." },
  { icon: KeyRound, title: "Onboard in seconds", body: "Students open your link, sign in with Google, and they're on your roster." },
  { icon: BarChart3, title: "Track progress", body: "See who's playing, which step they're on, and who's stuck." },
];

/** `checking`: the session is still resolving — show the page, hold the button. */
export function TeacherSignIn({ checking = false }: { checking?: boolean }) {
  const { signInWithGoogle, authAvailable } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-tc-muted/40 p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo className="self-center" />
        <Card>
          <CardHeader className="text-center">
            <h1 className="sr-only">SIGNAL for teachers</h1>
            <CardTitle className="text-xl">Teacher sign in</CardTitle>
            <CardDescription>
              Run SIGNAL with your class: students learn Go, Python or JavaScript by playing, and you see who&apos;s
              progressing and who&apos;s stuck. Use the Google account you teach with.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Button
              variant="outline"
              className="w-full"
              disabled={checking || busy || !authAvailable}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await signInWithGoogle("/teach");
                } catch {
                  setError("Sign-in failed. Please try again.");
                  setBusy(false);
                }
              }}
            >
              <GoogleMark />
              {checking ? "Checking sign-in…" : busy ? "Redirecting…" : "Continue with Google"}
            </Button>
            {!checking && !authAvailable && <p className="text-center text-sm text-tc-destructive">Sign-in isn&apos;t configured on this deployment.</p>}
            {error && <p className="text-center text-sm text-tc-destructive">{error}</p>}
            <Separator />
            <ul className="flex flex-col gap-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-tc-muted">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <p className="text-sm text-tc-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-tc-muted-foreground">
          Act I is free for every student. Teachers can&apos;t see students&apos; code or chats.{" "}
          <Link href="/faq" className="font-medium text-tc-foreground underline underline-offset-4">FAQ</Link>
          {" · "}
          <Link href="/privacy" className="font-medium text-tc-foreground underline underline-offset-4">Privacy</Link>
        </p>
        <p className="text-center text-sm text-tc-muted-foreground">
          Are you a student?{" "}
          <Link href="/join" className="font-medium text-tc-foreground underline underline-offset-4">Join a class</Link>
        </p>
      </div>
    </div>
  );
}
