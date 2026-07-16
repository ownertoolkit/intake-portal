import * as React from "react";
import { cn } from "./utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium select-none whitespace-nowrap " +
  "transition-[background-color,color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-standard)] " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24 " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink-strong)] text-[var(--color-ink-inverse)] " +
    "hover:bg-[var(--color-neutral-800)] active:bg-[var(--color-neutral-900)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line)] " +
    "hover:bg-[var(--color-surface-sunken)] active:bg-[var(--color-neutral-100)]",
  ghost:
    "bg-transparent text-[var(--color-ink)] " +
    "hover:bg-[var(--color-surface-sunken)] active:bg-[var(--color-neutral-100)]",
  danger:
    "bg-[var(--color-semantic-danger)] text-[var(--color-ink-inverse)] " +
    "hover:bg-[var(--color-semantic-danger-strong)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
  lg: "h-12 px-5 text-base rounded-[var(--radius-md)]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
