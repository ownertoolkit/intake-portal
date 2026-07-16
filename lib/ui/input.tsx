import * as React from "react";
import { cn } from "./utils";

const base =
  "w-full bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] " +
  "border border-[var(--color-line)] rounded-[var(--radius-md)] " +
  "px-3.5 h-11 text-sm " +
  "transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-standard)] " +
  "focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return <input ref={ref} type={type} className={cn(base, className)} {...props} />;
  },
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(base, "h-auto py-3 leading-relaxed resize-y", className)}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

/**
 * Field — the standard composition of Label + Input + optional Hint + Error.
 * This is the primitive owners will see most often, so it carries a lot of
 * the "premium and calm" feeling of the app. Keep vertical rhythm generous.
 */
export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, optional, htmlFor, children, className }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-[var(--color-ink-muted)]">Optional</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-[var(--color-semantic-danger-strong)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[var(--color-ink-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
