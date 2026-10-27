"use client";

/**
 * Building blocks for the student join flow — the game's terminal look, sized
 * for reading. (The teacher console has its own design system: components/teacher-ui.)
 */

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    // Own scroll container: the game locks body scroll on small screens.
    <div className="fixed inset-0 overflow-y-auto" style={{ background: "var(--color-background)" }}>
      <div
        className="fixed inset-0 opacity-[.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(var(--signal-rgb),.4) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--signal-rgb),.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Panel({ title, right, children, className = "" }: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-[var(--color-border)] ${className}`}
      style={{ background: "color-mix(in srgb, var(--color-panel) 85%, transparent)" }}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)]">
          {title && <h2 className="text-[10px] tracking-[3px] text-[var(--color-dim)]">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "signal" | "danger" | "alert" | "info" | "dim";

const TONE_VAR: Record<Tone, string> = {
  signal: "var(--color-signal)",
  danger: "var(--color-danger)",
  alert: "var(--color-alert)",
  info: "var(--color-info)",
  dim: "var(--color-dim)",
};

export function ActionButton({ children, onClick, tone = "signal", solid = false, disabled = false, type = "button", title }: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: Tone;
  solid?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const color = TONE_VAR[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-3 py-2 text-[10px] tracking-[2px] cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)] whitespace-nowrap"
      style={{
        color: solid ? "var(--color-background)" : color,
        background: solid ? color : "transparent",
        border: `1px solid ${color}`,
      }}
    >
      {children}
    </button>
  );
}

export function Loading({ label = "LOADING" }: { label?: string }) {
  return (
    <div className="py-16 text-center text-[var(--color-dim)] text-[10px] tracking-[3px]">
      {label}
      <span className="cursor-blink">...</span>
    </div>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="text-[var(--color-alert)] text-[11px] tracking-[1px] mt-2">{message}</div>;
}
