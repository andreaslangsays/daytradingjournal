import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-[13px] text-foreground outline-none ring-offset-background transition focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
