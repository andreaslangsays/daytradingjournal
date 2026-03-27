import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "accent";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:brightness-110",
        variant === "secondary" && "border-border/80 bg-secondary text-secondary-foreground hover:bg-muted",
        variant === "ghost" && "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "accent" && "border-border/80 bg-accent text-accent-foreground hover:brightness-105",
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
