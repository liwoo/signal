import { cn } from "./cn";

export function Progress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-tc-chart-1/20", className)}>
      <div className="h-full rounded-full bg-tc-chart-1 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-tc-accent", className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full shrink-0 bg-tc-border", className)} />;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <span className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full bg-tc-muted text-xs font-medium text-tc-muted-foreground", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote OAuth avatars; no loader configured
        <img src={src} alt="" className="aspect-square size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex size-full items-center justify-center">{initials(name)}</span>
      )}
    </span>
  );
}
