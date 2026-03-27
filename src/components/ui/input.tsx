import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-[13px] text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
