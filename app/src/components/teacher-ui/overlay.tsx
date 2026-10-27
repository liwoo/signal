"use client";

/**
 * Dialog, Sheet and DropdownMenu in the shadcn mould. Rendered in place (no
 * portal) so they stay inside `.teacher-ui` and keep its theme tokens.
 */

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/** Move focus into a freshly opened panel (first field, else the panel itself). */
function useInitialFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const target = ref.current.querySelector<HTMLElement>("[autofocus], input, textarea, select") ?? ref.current;
    target.focus();
  }, [open]);
  return ref;
}

export function Dialog({ open, onClose, title, description, children, footer, className }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEscape(open, onClose);
  const ref = useInitialFocus(open);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("relative grid w-full max-w-lg gap-4 rounded-lg border bg-tc-background p-6 shadow-lg outline-none", className)}
      >
        <div className="flex flex-col gap-2 pr-6">
          <h2 id={titleId} className="text-lg font-semibold leading-none">{title}</h2>
          {description && <p className="text-sm text-tc-muted-foreground">{description}</p>}
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, side = "right", children, className, label }: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "left";
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  useEscape(open, onClose);
  const ref = useInitialFocus(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 flex h-full w-3/4 flex-col overflow-y-auto bg-tc-background shadow-lg outline-none sm:max-w-md",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          className,
        )}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export function DropdownMenu({ trigger, items, align = "end", label }: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-md border bg-tc-popover p-1 text-tc-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {label && <div className="px-2 py-1.5 text-sm font-medium">{label}</div>}
          {label && <div className="-mx-1 my-1 h-px bg-tc-border" />}
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <div className="-mx-1 my-1 h-px bg-tc-border" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-tc-accent focus-visible:bg-tc-accent [&_svg]:size-4 [&_svg]:text-tc-muted-foreground",
                  item.destructive && "text-tc-destructive [&_svg]:!text-tc-destructive",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
