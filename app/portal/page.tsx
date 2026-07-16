"use client";

import * as React from "react";
import Link from "next/link";
import { Button, cn } from "@/lib/ui";
import { readableTextOn } from "../setup/color-utils";
import type { FormField } from "../setup/form-fields-editor";
import { loadPortalConfig, type PortalConfig } from "./config";

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

/**
 * /portal — the real customer-facing portal.
 *
 * Reads the owner's configuration from localStorage (the wizard-to-portal
 * handoff; will be a Supabase read in v2) and renders the actual, working
 * intake form the customer sees. No Owner Toolkit branding anywhere — the
 * portal belongs to the business.
 */
export default function PortalPage() {
  const [config, setConfig] = React.useState<PortalConfig | null | undefined>(
    undefined,
  );
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    setConfig(loadPortalConfig());
  }, []);

  // Loading (avoid hydration mismatch)
  if (config === undefined) {
    return <main className="min-h-screen bg-[var(--color-surface-canvas)]" />;
  }

  // No portal published yet
  if (config === null) return <EmptyState />;

  // Submitted — show success
  if (submitted) return <SuccessScreen config={config} />;

  return <PortalForm config={config} onSubmit={() => setSubmitted(true)} />;
}

/* -------------------------------------------------------------------------- */
/*                                Empty state                                 */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Nothing here yet
        </p>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05]">
          This portal hasn't been created yet.
        </h1>
        <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
          Create yours in a few minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/setup">
            <Button size="lg">Create My Portal</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Portal form                                 */
/* -------------------------------------------------------------------------- */

type Values = Record<string, string>;
type Errors = Record<string, string | undefined>;

function PortalForm({
  config,
  onSubmit,
}: {
  config: PortalConfig;
  onSubmit: () => void;
}) {
  const enabledFields = React.useMemo(
    () => config.fields.filter((f) => f.enabled),
    [config.fields],
  );

  const [values, setValues] = React.useState<Values>(() => {
    const initial: Values = {};
    enabledFields.forEach((f) => {
      initial[f.id] = "";
    });
    return initial;
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const firstErrorRef = React.useRef<HTMLElement | null>(null);

  const brandText = readableTextOn(config.color);

  const setValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    for (const f of enabledFields) {
      const raw = values[f.id] ?? "";
      const v = raw.trim();
      if (f.required && !v) {
        next[f.id] = "Please answer this.";
        continue;
      }
      if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) {
        next[f.id] = "That doesn't look like a valid email.";
      }
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    const hasErrors = Object.values(next).some(Boolean);
    if (hasErrors) {
      // Scroll to first error field
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>("[data-field-error='true']");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      onSubmit();
    }, 700);
  };

  return (
    <main
      className="min-h-screen bg-[var(--color-surface-canvas)]"
      // Scope brand color as a CSS var so focus rings and other accents pick it up.
      style={{ ["--brand-color" as string]: config.color }}
    >
      <div className="max-w-[560px] mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-24">
        <PortalHeader config={config} />

        <form onSubmit={handleSubmit} className="mt-14 space-y-10" noValidate>
          {enabledFields.map((field) => (
            <PortalField
              key={field.id}
              field={field}
              value={values[field.id] ?? ""}
              error={errors[field.id]}
              onChange={(v) => setValue(field.id, v)}
              brandColor={config.color}
            />
          ))}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full h-12 rounded-[var(--radius-md)] text-base font-medium",
                "transition-[background-color,opacity] duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                "disabled:opacity-70 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--brand-color)]/24",
              )}
              style={{
                backgroundColor: config.color,
                color: brandText.cssColor,
              }}
            >
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

function PortalHeader({ config }: { config: PortalConfig }) {
  return (
    <header className="flex flex-col items-center text-center">
      {config.logoDataUrl ? (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logoDataUrl}
            alt=""
            className="h-14 md:h-16 w-auto object-contain"
          />
        </div>
      ) : null}
      <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05]">
        {config.businessName}
      </h1>
      <p className="mt-5 max-w-md text-base md:text-lg text-[var(--color-ink-soft)] leading-relaxed">
        {config.welcomeMessage}
      </p>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Portal field                                */
/* -------------------------------------------------------------------------- */

function PortalField({
  field,
  value,
  error,
  onChange,
  brandColor,
}: {
  field: FormField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  brandColor: string;
}) {
  const inputId = `portal-${field.id}`;
  const hasError = Boolean(error);

  return (
    <div data-field-error={hasError} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-ink-strong)]"
        >
          {field.label}
        </label>
        {!field.required ? (
          <span className="text-xs text-[var(--color-ink-muted)]">Optional</span>
        ) : null}
      </div>

      <FieldInput
        field={field}
        inputId={inputId}
        value={value}
        onChange={onChange}
        brandColor={brandColor}
        hasError={hasError}
      />

      {error ? (
        <p className="text-xs text-[var(--color-semantic-danger-strong)]">{error}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Field renderers                               */
/* -------------------------------------------------------------------------- */

const baseInput =
  "w-full bg-[var(--color-surface)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] " +
  "border rounded-[var(--radius-md)] px-3.5 h-12 text-sm " +
  "transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-standard)] " +
  "focus-visible:outline-none focus-visible:ring-[3px]";

const okBorder = "border-[var(--color-line)]";
const errBorder = "border-[var(--color-semantic-danger)]";

function FieldInput({
  field,
  inputId,
  value,
  onChange,
  brandColor,
  hasError,
}: {
  field: FormField;
  inputId: string;
  value: string;
  onChange: (v: string) => void;
  brandColor: string;
  hasError: boolean;
}) {
  const border = hasError ? errBorder : okBorder;
  const focusRing =
    "focus-visible:border-[color:var(--brand-color)] focus-visible:ring-[color:var(--brand-color)]/20";

  switch (field.type) {
    case "long_answer":
      return (
        <textarea
          id={inputId}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInput, "h-auto py-3 leading-relaxed resize-y", border, focusRing)}
        />
      );

    case "email":
      return (
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );

    case "phone":
      return (
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );

    case "date":
      return (
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );

    case "dropdown":
      return (
        <div className="relative">
          <select
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              baseInput,
              border,
              focusRing,
              "appearance-none pr-10",
              !value && "text-[var(--color-ink-placeholder)]",
            )}
          >
            <option value="" disabled>
              Choose one…
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
            aria-hidden
          >
            <ChevronDownIcon />
          </span>
        </div>
      );

    case "multiple_choice":
      return (
        <div role="radiogroup" aria-labelledby={inputId} className="flex flex-col gap-2 pt-1">
          {(field.options ?? []).map((opt) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border cursor-pointer",
                  "transition-colors duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                  selected
                    ? "bg-[var(--color-surface)]"
                    : "border-[var(--color-line)] hover:bg-[var(--color-surface-sunken)]",
                )}
                style={
                  selected
                    ? { borderColor: brandColor, boxShadow: `inset 0 0 0 1px ${brandColor}` }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name={inputId}
                  value={opt}
                  checked={selected}
                  onChange={() => onChange(opt)}
                  className="sr-only"
                />
                <span
                  className="relative h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: selected ? brandColor : "var(--color-line-strong)",
                  }}
                >
                  {selected ? (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: brandColor }}
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    selected
                      ? "text-[var(--color-ink-strong)] font-medium"
                      : "text-[var(--color-ink)]",
                  )}
                >
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      );

    case "file_upload":
      return (
        <FileField
          inputId={inputId}
          value={value}
          onChange={onChange}
          brandColor={brandColor}
        />
      );

    case "short_answer":
    default:
      return (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );
  }
}

/* -------------------------------------------------------------------------- */
/*                                File field                                  */
/* -------------------------------------------------------------------------- */

function FileField({
  inputId,
  value,
  onChange,
  brandColor,
}: {
  inputId: string;
  value: string;
  onChange: (v: string) => void;
  brandColor: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileName = value || "";

  const handleFiles = (files: FileList | null | undefined) => {
    if (!files || !files.length) return;
    const names = Array.from(files)
      .map((f) => f.name)
      .join(", ");
    onChange(names);
  };

  if (fileName) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div
          className="h-10 w-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: brandColor, color: readableTextOn(brandColor).cssColor }}
        >
          <FileGlyph />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink-strong)] truncate">
            {fileName}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Ready to send</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange("");
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded-[var(--radius-sm)]"
        >
          Remove
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center text-center cursor-pointer",
          "border border-dashed rounded-[var(--radius-md)] px-6 py-8 transition-colors",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--brand-color)]/20",
          isDragging
            ? "border-[color:var(--brand-color)] bg-[var(--color-surface)]"
            : "border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)]",
        )}
      >
        <UploadGlyph />
        <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
          Drop files or click to upload
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          You can attach more than one.
        </p>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Success screen                               */
/* -------------------------------------------------------------------------- */

function SuccessScreen({ config }: { config: PortalConfig }) {
  const brandText = readableTextOn(config.color);
  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div
          className="mx-auto h-16 w-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.color, color: brandText.cssColor }}
        >
          <CheckGlyph />
        </div>
        <p className="mt-8 font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {config.businessName}
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)] leading-[0.98]">
          Thanks.
        </h1>
        <p className="mt-6 text-base text-[var(--color-ink-soft)] leading-relaxed">
          We got your inquiry. {config.businessName} will be in touch within a
          business day.
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Icons                                     */
/* -------------------------------------------------------------------------- */

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-[var(--color-ink-muted)]"
      aria-hidden
    >
      <path d="M12 15V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden
    >
      <path d="M5 12.5l4 4L19 7" />
    </svg>
  );
}
