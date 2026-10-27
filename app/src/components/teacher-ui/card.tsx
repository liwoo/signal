import { cn } from "./cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-6 rounded-xl border bg-tc-card py-6 text-tc-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid auto-rows-min items-start gap-1.5 px-6 has-[[data-slot=card-action]]:grid-cols-[1fr_auto]", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-semibold leading-none", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-tc-muted-foreground", className)} {...props} />;
}

export function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center px-6", className)} {...props} />;
}
