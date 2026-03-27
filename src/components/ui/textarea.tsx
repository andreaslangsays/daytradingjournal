import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[96px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
