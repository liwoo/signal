import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock } from "lucide-react";
import { Badge } from "@/components/teacher-ui/badge";
import type { StudentStatus } from "@/types/classroom";

/** Status = state, so it wears the reserved status hues — always with an icon + label. */
export const STATUS_META: Record<StudentStatus, { label: string; description: string; icon: typeof CircleDot; iconClass: string }> = {
  stuck: { label: "Stuck", description: "5+ failed tries on the same step", icon: AlertTriangle, iconClass: "text-tc-critical" },
  idle: { label: "Idle", description: "No activity for 7+ days", icon: Clock, iconClass: "text-tc-warning" },
  not_started: { label: "Not started", description: "Joined but hasn't played yet", icon: CircleDashed, iconClass: "text-tc-muted-foreground" },
  active: { label: "Active", description: "Playing this week", icon: CircleDot, iconClass: "text-tc-good" },
  finished: { label: "Finished", description: "Cleared every chapter available", icon: CheckCircle2, iconClass: "text-tc-chart-1" },
};

export const STATUS_ORDER: Record<StudentStatus, number> = { stuck: 0, idle: 1, not_started: 2, active: 3, finished: 4 };

export function StatusBadge({ status }: { status: StudentStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" title={meta.description} className="text-tc-muted-foreground">
      <Icon className={meta.iconClass} />
      <span className="text-tc-foreground">{meta.label}</span>
    </Badge>
  );
}

/** Capitalise API messages ("couldn't load…" → "Couldn't load…."). */
export function sentence(message: string): string {
  const s = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}
