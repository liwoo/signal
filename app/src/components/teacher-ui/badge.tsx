import { cn } from "./cn";

const VARIANTS = {
  default: "border-transparent bg-tc-primary text-tc-primary-foreground",
  secondary: "border-transparent bg-tc-secondary text-tc-secondary-foreground",
  outline: "text-tc-foreground",
  destructive: "border-transparent bg-tc-destructive text-white",
} as const;

export function Badge({ variant = "default", className, ...props }: React.ComponentProps<"span"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium [&>svg]:size-3",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
