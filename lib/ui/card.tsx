import * as React from "react";
import { cn } from "./utils";

/**
 * Card — the signature primitive.
 *
 * Owner Toolkit cards are meant to be recognizable at a glance the way
 * Linear Issues or Notion pages are. The signature is: softer corners (20px),
 * generous padding (28px), Plus Jakarta Sans in the title, hairline dividers
 * where they belong. Do not shrink any of these values to save space —
 * the whitespace IS the design.
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, no border — for cards floating inside a bordered container */
  bare?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, bare, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-[var(--color-surface)] rounded-[var(--radius-xl)]",
          bare ? "" : "border border-[var(--color-line)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-7 pt-7 pb-5", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-7 py-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-7 pt-5 pb-7 border-t border-[var(--color-line-subtle)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        // Plus Jakarta Sans in the title — the editorial signature.
        "font-display text-xl font-semibold tracking-[-0.015em] text-[var(--color-ink-strong)] leading-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm text-[var(--color-ink-muted)] mt-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

/**
 * CardMetric — the small stat / value chip used in a Card footer.
 * Standardizes the "$500 – $1,000" style of ancillary card data so it stays
 * consistent across every Tool.
 */
export function CardMetric({
  label,
  value,
  className,
}: {
  label?: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      {label ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          {label}
        </span>
      ) : null}
      <span className="text-sm font-medium tabular-nums text-[var(--color-ink)]">
        {value}
      </span>
    </div>
  );
}
