import { cn } from "./cn";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-tc-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm",
        "placeholder:text-tc-muted-foreground focus-visible:border-tc-ring focus-visible:ring-[3px] focus-visible:ring-tc-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-tc-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("flex items-center gap-2 text-sm font-medium leading-none select-none", className)} {...props} />;
}
