"use client";

/**
 * One class: header + invite, stat cards, chapter chart, students table.
 * Refreshes every minute while the tab is visible, so it can stay open on a
 * screen during a lab session.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, Copy, Download, Lock, LockOpen, MoreHorizontal, Pencil, Presentation, RefreshCw, RotateCcw, Trash2, UserPlus,
} from "lucide-react";
import {
  ClassroomError, deleteClassroom, fetchRoster, removeStudent, rotateJoinCode, updateClassroom,
} from "@/lib/classroom/api";
import { rosterToCsv, summarizeClass, summarizeStudent } from "@/lib/classroom/summary";
import type { Classroom, RosterRow } from "@/types/classroom";
import { Badge } from "@/components/teacher-ui/badge";
import { Button } from "@/components/teacher-ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/teacher-ui/card";
import { Input, Label } from "@/components/teacher-ui/input";
import { Skeleton } from "@/components/teacher-ui/misc";
import { Dialog, DropdownMenu } from "@/components/teacher-ui/overlay";
import { ChapterProgressChart } from "./charts";
import { StudentsTable } from "./StudentsTable";
import { StudentSheet } from "./StudentSheet";
import { sentence } from "./status";

const REFRESH_MS = 60_000;

type Confirm = { title: string; description: string; action: string; destructive?: boolean; run: () => Promise<void> };

export function ClassPage({ classroom, onChanged, onDeleted, onStudentCount }: {
  classroom: Classroom;
  onChanged: (next: Classroom) => void;
  onDeleted: () => void;
  /** Must be stable (useCallback) — it's a dependency of the roster loader. */
  onStudentCount: (classroomId: string, n: number) => void;
}) {
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const load = useCallback(
    () =>
      fetchRoster(classroom.id).then(
        (next) => {
          setRows(next);
          setNow(Date.now());
          onStudentCount(classroom.id, next.length);
          setError(null);
        },
        (e) => {
          setRows((cur) => cur ?? []);
          setError(e instanceof ClassroomError ? sentence(e.message) : "Couldn't load the roster.");
        },
      ),
    [classroom.id, onStudentCount],
  );

  useEffect(() => {
    void load();
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => clearInterval(iv);
  }, [load]);

  const students = useMemo(() => (rows ?? []).map((r) => summarizeStudent(r, now)), [rows, now]);
  const summary = useMemo(() => summarizeClass(students, now), [students, now]);
  const selectedRow = rows?.find((r) => r.profile.id === selectedId) ?? null;
  const selectedStudent = students.find((s) => s.studentId === selectedId) ?? null;

  function downloadCsv() {
    const blob = new Blob([rosterToCsv(students)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classroom.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "class"}-progress.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function guarded(run: () => Promise<void>) {
    try {
      await run();
    } catch (e) {
      setError(e instanceof ClassroomError ? sentence(e.message) : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{classroom.name}</h1>
            {!classroom.joiningOpen && <Badge variant="secondary"><Lock /> Joining closed</Badge>}
          </div>
          <p className="mt-1 text-sm text-tc-muted-foreground">
            Created {new Date(classroom.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · Join code{" "}
            <span className="font-tc-mono font-medium text-tc-foreground">{classroom.joinCode}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => setInviting(true)}><UserPlus /> Invite students</Button>
          <DropdownMenu
            items={[
              { label: "Rename class", icon: <Pencil />, onSelect: () => setRenaming(true) },
              {
                label: classroom.joiningOpen ? "Close joining" : "Reopen joining",
                icon: classroom.joiningOpen ? <Lock /> : <LockOpen />,
                onSelect: () =>
                  void guarded(async () => {
                    await updateClassroom(classroom.id, { joiningOpen: !classroom.joiningOpen });
                    onChanged({ ...classroom, joiningOpen: !classroom.joiningOpen });
                  }),
              },
              {
                label: "Reset join code",
                icon: <RotateCcw />,
                onSelect: () =>
                  setConfirm({
                    title: "Reset join code?",
                    description: "A new code is issued. The current code and invite link stop working immediately. Students already in the class aren't affected.",
                    action: "Reset code",
                    run: async () => onChanged({ ...classroom, joinCode: await rotateJoinCode(classroom.id) }),
                  }),
              },
              {
                label: "Delete class",
                icon: <Trash2 />,
                destructive: true,
                separatorBefore: true,
                onSelect: () =>
                  setConfirm({
                    title: `Delete “${classroom.name}”?`,
                    description: "The class and its roster are removed. Students keep their own game progress. This can't be undone.",
                    action: "Delete class",
                    destructive: true,
                    run: async () => {
                      await deleteClassroom(classroom.id);
                      onDeleted();
                    },
                  }),
              },
            ]}
            trigger={(props) => (
              <Button variant="outline" size="icon" aria-label="Class settings" {...props}>
                <MoreHorizontal />
              </Button>
            )}
          />
        </div>
      </div>

      {error && <p className="text-sm text-tc-destructive">{error}</p>}

      {rows === null ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-tc-muted"><UserPlus className="size-5" /></div>
            <div>
              <div className="font-medium">No students yet</div>
              <p className="mt-1 max-w-sm text-sm text-tc-muted-foreground">
                Share the invite link or join code. Students appear here as soon as they join.
              </p>
            </div>
            <Button onClick={() => setInviting(true)}>Invite students</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <StatCard title="Students" value={summary.studentCount} footnote={`${summary.notStarted} not started yet`} />
            <StatCard title="Active this week" value={summary.activeThisWeek} footnote={`${pct(summary.activeThisWeek, summary.studentCount)}% of the class`} />
            <StatCard title="Avg. chapters cleared" value={summary.avgChaptersCompleted} footnote="In each student's language" />
            <StatCard
              title="Need help now"
              value={summary.stuck}
              footnote={summary.stuck ? "5+ failed tries on one step" : "Nobody is stuck"}
              alert={summary.stuck > 0}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chapter progress</CardTitle>
              <CardDescription>How far the class has got through the story, chapter by chapter.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChapterProgressChart funnel={summary.funnel} studentCount={summary.studentCount} />
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Updated {new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every minute
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    void load().finally(() => setRefreshing(false));
                  }}
                >
                  <RefreshCw className={refreshing ? "animate-spin" : undefined} /> <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                  <Download /> <span className="hidden sm:inline">Export CSV</span>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <StudentsTable students={students} now={now} onSelect={setSelectedId} />
            </CardContent>
          </Card>
        </>
      )}

      {selectedRow && selectedStudent && (
        <StudentSheet
          row={selectedRow}
          student={selectedStudent}
          now={now}
          onClose={() => setSelectedId(null)}
          onRemove={() =>
            setConfirm({
              title: `Remove ${selectedStudent.name}?`,
              description: "They leave this class and you lose access to their progress. Their own game progress is kept.",
              action: "Remove student",
              destructive: true,
              run: async () => {
                await removeStudent(classroom.id, selectedStudent.studentId);
                setSelectedId(null);
                await load();
              },
            })
          }
        />
      )}

      {inviting && <InviteDialog classroom={classroom} onClose={() => setInviting(false)} />}
      {renaming && (
        <RenameDialog
          name={classroom.name}
          onClose={() => setRenaming(false)}
          onSave={async (name) => {
            await updateClassroom(classroom.id, { name });
            onChanged({ ...classroom, name: name.trim() });
            setRenaming(false);
          }}
        />
      )}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

function StatCard({ title, value, footnote, alert = false }: { title: string; value: number; footnote: string; alert?: boolean }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-2xl font-semibold tabular-nums md:text-3xl ${alert ? "text-tc-critical" : ""}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-tc-muted-foreground md:text-sm">{footnote}</CardContent>
    </Card>
  );
}

function CopyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const id = `copy-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} readOnly value={value} className={mono ? "font-tc-mono tracking-widest" : undefined} onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function InviteDialog({ classroom, onClose }: { classroom: Classroom; onClose: () => void }) {
  const [origin] = useState(() => window.location.origin);
  const [projecting, setProjecting] = useState(false);
  const link = `${origin}/join/${classroom.joinCode}`;

  if (projecting) {
    return (
      <div
        role="dialog"
        aria-label="Join code"
        onClick={() => setProjecting(false)}
        className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-tc-background p-8 text-center"
      >
        <div className="text-xl text-tc-muted-foreground">Join <span className="font-semibold text-tc-foreground">{classroom.name}</span></div>
        <div className="text-3xl font-medium">{origin.replace(/^https?:\/\//, "")}/join</div>
        <div className="font-tc-mono font-bold tracking-[0.15em]" style={{ fontSize: "clamp(64px, 15vw, 200px)" }}>{classroom.joinCode}</div>
        <div className="text-sm text-tc-muted-foreground">Sign in with Google, then enter the code · Click anywhere to close</div>
      </div>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Invite students"
      description="Students sign in with their own Google account, then join with this link or code."
      footer={
        <>
          <Button variant="outline" onClick={() => setProjecting(true)}><Presentation /> Show on projector</Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {!classroom.joiningOpen && (
        <p className="rounded-md border border-tc-warning/50 bg-tc-warning/10 px-3 py-2 text-sm">
          Joining is closed. Reopen it from the class menu before students can join.
        </p>
      )}
      <CopyField label="Invite link" value={link} />
      <CopyField label="Join code" value={classroom.joinCode} mono />
    </Dialog>
  );
}

function RenameDialog({ name: initial, onClose, onSave }: { name: string; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} title="Rename class">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            await onSave(name);
          } catch (err) {
            setError(err instanceof ClassroomError ? sentence(err.message) : "Couldn't rename the class.");
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="tc-rename">Class name</Label>
          <Input id="tc-rename" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        {error && <p className="text-sm text-tc-destructive">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim()}>Save</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmDialog({ confirm, onClose }: { confirm: Confirm; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open
      onClose={onClose}
      title={confirm.title}
      description={confirm.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={confirm.destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await confirm.run();
                onClose();
              } catch (e) {
                setError(e instanceof ClassroomError ? sentence(e.message) : "Something went wrong.");
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : confirm.action}
          </Button>
        </>
      }
    >
      {error && <p className="text-sm text-tc-destructive">{error}</p>}
    </Dialog>
  );
}
