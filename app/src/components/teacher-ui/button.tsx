import { cn } from "./cn";

const VARIANTS = {
  default: "bg-tc-primary text-tc-primary-foreground hover:bg-tc-primary/90",
  secondary: "bg-tc-secondary text-tc-secondary-foreground hover:bg-tc-secondary/80",
  outline: "border border-tc-input bg-tc-background shadow-xs hover:bg-tc-accent hover:text-tc-accent-foreground",
  ghost: "hover:bg-tc-accent hover:text-tc-accent-foreground",
  destructive: "bg-tc-destructive text-white hover:bg-tc-destructive/90",
  link: "text-tc-primary underline-offset-4 hover:underline",
} as const;

const SIZES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-6",
  icon: "size-9",
  "icon-sm": "size-8",
} as const;

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function buttonClasses(variant: keyof typeof VARIANTS = "default", size: keyof typeof SIZES = "default", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-tc-ring/50 disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
