import * as React from "react";
import { cn } from "./utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--color-neutral-100)] text-[var(--color-ink-soft)]",
  success:
    "bg-[var(--color-semantic-success-subtle)] text-[var(--color-semantic-success-strong)]",
  warning:
    "bg-[var(--color-semantic-warning-subtle)] text-[var(--color-semantic-warning-strong)]",
  danger:
    "bg-[var(--color-semantic-danger-subtle)] text-[var(--color-semantic-danger-strong)]",
  info: "bg-[var(--color-semantic-info-subtle)] text-[var(--color-semantic-info-strong)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "neutral", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 h-6 rounded-[var(--radius-full)] text-xs font-medium",
          tones[tone],
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";
