"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronsUpDown, GraduationCap, LogOut, Menu, Plus, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ClassroomError,
  countStudents,
  createClassroom,
  listTeachingClassrooms,
  updateTeacherAccount,
} from "@/lib/classroom/api";
import type { Classroom, TeacherAccount } from "@/types/classroom";
import { Button } from "@/components/teacher-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/teacher-ui/card";
import { cn } from "@/components/teacher-ui/cn";
import { Input, Label } from "@/components/teacher-ui/input";
import { Avatar, Skeleton } from "@/components/teacher-ui/misc";
import { Dialog, DropdownMenu, Sheet } from "@/components/teacher-ui/overlay";
import { Logo } from "./brand";
import { ClassPage } from "./ClassPage";
import { sentence } from "./status";

export function TeacherDashboard({ user, account, onAccountChange }: {
  user: User;
  account: TeacherAccount;
  onAccountChange: (account: TeacherAccount) => void;
}) {
  const { signOut } = useAuth();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const load = useCallback(
    () =>
      listTeachingClassrooms(user.id)
        .then(async (list) => ({ list, counts: await countStudents(list.map((c) => c.id)) }))
        .then(
          ({ list, counts: next }) => {
            setClasses(list);
            setCounts(next);
            setSelectedId((cur) => (cur && list.some((c) => c.id === cur) ? cur : list[0]?.id ?? null));
            setError(null);
          },
          (e) => {
            setClasses((cur) => cur ?? []);
            setError(e instanceof ClassroomError ? sentence(e.message) : "Couldn't load your classes.");
          },
        ),
    [user.id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onStudentCount = useCallback((classroomId: string, n: number) => {
    setCounts((cur) => (cur[classroomId] === n ? cur : { ...cur, [classroomId]: n }));
  }, []);

  const selected = classes?.find((c) => c.id === selectedId) ?? null;

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="p-2"><Logo /></div>
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-xs font-medium text-tc-muted-foreground">Classes</span>
        <Button variant="ghost" size="icon-sm" aria-label="New class" title="New class" onClick={() => { setNavOpen(false); setCreating(true); }}>
          <Plus />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {classes === null ? (
          <>
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </>
        ) : classes.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-tc-muted-foreground">No classes yet</p>
        ) : (
          classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelectedId(c.id); setNavOpen(false); }}
              className={cn(
                "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-tc-accent",
                c.id === selectedId && "bg-tc-accent font-medium",
              )}
            >
              <GraduationCap className="size-4 shrink-0 text-tc-muted-foreground" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs tabular-nums text-tc-muted-foreground">{counts[c.id] ?? 0}</span>
            </button>
          ))
        )}
      </nav>
      <DropdownMenu
        align="start"
        label={user.email ?? undefined}
        items={[
          { label: "Account details", icon: <UserRound />, onSelect: () => setEditingAccount(true) },
          { label: "Sign out", icon: <LogOut />, onSelect: () => void signOut(), separatorBefore: true },
        ]}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left hover:bg-tc-accent"
          >
            <Avatar name={account.fullName} src={user.user_metadata?.avatar_url as string | undefined} className="rounded-lg" />
            <span className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{account.fullName}</span>
              <span className="truncate text-xs text-tc-muted-foreground">{account.school || user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 text-tc-muted-foreground" />
          </button>
        )}
      />
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-tc-sidebar md:block">{sidebar}</aside>
      <Sheet open={navOpen} onClose={() => setNavOpen(false)} side="left" label="Navigation" className="w-72 bg-tc-sidebar">
        {sidebar}
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-tc-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
            <Menu />
          </Button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-tc-muted-foreground">
            <span>Classes</span>
            {selected && (
              <>
                <span aria-hidden>/</span>
                <span className="truncate font-medium text-tc-foreground">{selected.name}</span>
              </>
            )}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {error && <p className="mb-4 text-sm text-tc-destructive">{error}</p>}
          {classes === null ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : selected ? (
            <ClassPage
              key={selected.id}
              classroom={selected}
              onChanged={(next) => setClasses((cur) => (cur ?? []).map((c) => (c.id === next.id ? next : c)))}
              onDeleted={() => {
                setClasses((cur) => (cur ?? []).filter((c) => c.id !== selected.id));
                setSelectedId(null);
                void load();
              }}
              onStudentCount={onStudentCount}
            />
          ) : (
            <GettingStarted name={account.fullName} onCreate={() => setCreating(true)} />
          )}
        </main>
      </div>

      <CreateClassDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (name) => {
          const c = await createClassroom(user.id, name);
          setClasses((cur) => [...(cur ?? []), c]);
          setSelectedId(c.id);
          setCreating(false);
        }}
      />
      {editingAccount && <AccountDialog
        open
        account={account}
        email={user.email ?? ""}
        onClose={() => setEditingAccount(false)}
        onSave={async (details) => {
          await updateTeacherAccount(user.id, details);
          onAccountChange({ ...account, fullName: details.fullName.trim(), school: details.school.trim() });
          setEditingAccount(false);
        }}
      />}
    </div>
  );
}

function GettingStarted({ name, onCreate }: { name: string; onCreate: () => void }) {
  const steps: [string, string][] = [
    ["Create a class", "Name it after the period or group. Make as many as you need."],
    ["Invite students", "Share the join link or 6-character code. Students sign in with their own Google accounts."],
    ["Track progress", "See who's playing, which step each student is on, and who's stuck."],
  ];
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Welcome, {name.split(" ")[0]}</CardTitle>
        <CardDescription>Set up your first class in under a minute.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ol className="flex flex-col gap-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums">{i + 1}</span>
              <div>
                <div className="text-sm font-medium">{title}</div>
                <p className="text-sm text-tc-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button className="self-start" onClick={onCreate}><Plus /> Create your first class</Button>
      </CardContent>
    </Card>
  );
}

function CreateClassDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setName(""); setError(null); onClose(); };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="New class"
      description="Students join with a code that's generated for this class."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          setError(null);
          try {
            await onCreate(name);
            setName("");
          } catch (err) {
            setError(err instanceof ClassroomError ? sentence(err.message) : "Couldn't create the class.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="tc-class-name">Class name</Label>
          <Input id="tc-class-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Period 3 · Intro to CS" />
        </div>
        {error && <p className="text-sm text-tc-destructive">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create class"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function AccountDialog({ open, account, email, onClose, onSave }: {
  open: boolean;
  account: TeacherAccount;
  email: string;
  onClose: () => void;
  onSave: (details: { fullName: string; school: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(account.fullName);
  const [school, setSchool] = useState(account.school);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose} title="Account details" description={`Teacher account · ${email}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSave({ fullName, school });
          } catch (err) {
            setError(err instanceof ClassroomError ? sentence(err.message) : "Couldn't save your details.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="tc-acct-name">Your name</Label>
          <Input id="tc-acct-name" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tc-acct-school">School or organization</Label>
          <Input id="tc-acct-school" value={school} maxLength={160} onChange={(e) => setSchool(e.target.value)} />
        </div>
        {error && <p className="text-sm text-tc-destructive">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !fullName.trim() || !school.trim()}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
