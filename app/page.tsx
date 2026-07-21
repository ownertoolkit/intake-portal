"use client";

import * as React from "react";
import { cn } from "@/lib/ui";
import { portalConfig, type PortalField } from "@/lib/portal/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

/**
 * Customer-facing intake portal, served at the bare domain.
 *
 * Reads the owner's configuration directly from portal.config.ts (the file
 * shipped in the ZIP by the Owner Toolkit customizer) and posts submissions
 * to /api/inquiries. No Owner Toolkit branding — the portal belongs to the
 * business.
 */
export default function PortalPage() {
  const [submitted, setSubmitted] = React.useState(false);
  if (submitted) return <SuccessScreen />;
  return <PortalForm onSubmit={() => setSubmitted(true)} />;
}

/* -------------------------------------------------------------------------- */
/*                                Portal form                                 */
/* -------------------------------------------------------------------------- */

type StringValues = Record<string, string>;
type FileValues = Record<string, File[]>;
type Errors = Record<string, string | undefined>;

const BUCKET = "inquiry-files";

function PortalForm({ onSubmit }: { onSubmit: () => void }) {
  const enabledFields = React.useMemo(
    () => portalConfig.fields.filter((f) => f.enabled),
    [],
  );

  const [values, setValues] = React.useState<StringValues>(() => {
    const initial: StringValues = {};
    enabledFields.forEach((f) => {
      initial[f.id] = "";
    });
    return initial;
  });
  const [fileValues, setFileValues] = React.useState<FileValues>({});
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const setValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const setFiles = (id: string, files: File[]) => {
    setFileValues((prev) => ({ ...prev, [id]: files }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    for (const f of enabledFields) {
      if (f.type === "file_upload") {
        const files = fileValues[f.id] ?? [];
        if (f.required && files.length === 0) {
          next[f.id] = "Please attach at least one file.";
        }
        continue;
      }
      const raw = values[f.id] ?? "";
      const v = raw.trim();
      if (f.required && !v) {
        next[f.id] = "Please answer this.";
        continue;
      }
      if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) {
        next[f.id] = "That doesn't look like a valid email.";
      }
      if ((f.type === "multiple_choice" || f.type === "dropdown") && v) {
        if (!(f.options ?? []).includes(v)) {
          next[f.id] = "Please pick one of the listed options.";
        }
      }
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setSubmitError(null);
    if (Object.values(next).some(Boolean)) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>("[data-field-error='true']");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    try {
      const filesPayload: {
        fieldId: string;
        filename: string;
        contentType: string;
        size: number;
      }[] = [];
      for (const [fieldId, files] of Object.entries(fileValues)) {
        for (const file of files) {
          filesPayload.push({
            fieldId,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          });
        }
      }

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: values, files: filesPayload }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: { fieldId: string; message: string }[];
        };
        if (body.details) {
          const serverErrors: Errors = {};
          for (const d of body.details) serverErrors[d.fieldId] = d.message;
          setErrors(serverErrors);
        }
        setSubmitError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const result = (await response.json()) as {
        ok: true;
        inquiryId: string;
        uploads: { fieldId: string; filename: string; path: string; token: string }[];
      };

      if (result.uploads.length > 0) {
        const supabase = createSupabaseBrowserClient();
        // Match each upload back to its File by filename + field id order.
        const uploadTasks: Promise<unknown>[] = [];
        for (const [fieldId, files] of Object.entries(fileValues)) {
          const uploadsForField = result.uploads.filter((u) => u.fieldId === fieldId);
          for (let i = 0; i < files.length && i < uploadsForField.length; i++) {
            const upload = uploadsForField[i]!;
            const file = files[i]!;
            uploadTasks.push(
              supabase.storage
                .from(BUCKET)
                .uploadToSignedUrl(upload.path, upload.token, file, {
                  contentType: file.type || "application/octet-stream",
                }),
            );
          }
        }
        // If uploads fail we still confirm the inquiry — the row exists with
        // the file paths, so the dashboard will surface any missing files.
        await Promise.allSettled(uploadTasks);
      }

      onSubmit();
    } catch (err) {
      console.error(err);
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen"
      style={{
        ["--brand-color" as string]: portalConfig.brandColor,
        backgroundColor: portalConfig.backgroundColor,
      }}
    >
      <div className="max-w-[560px] mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-24">
        <PortalHeader />

        <form onSubmit={handleSubmit} className="mt-14 space-y-10" noValidate>
          {enabledFields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              value={values[field.id] ?? ""}
              files={fileValues[field.id] ?? []}
              error={errors[field.id]}
              onChangeValue={(v) => setValue(field.id, v)}
              onChangeFiles={(f) => setFiles(field.id, f)}
              brandColor={portalConfig.brandColor}
            />
          ))}

          {submitError ? (
            <p className="text-sm text-[var(--color-semantic-danger-strong)]">
              {submitError}
            </p>
          ) : null}

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
                backgroundColor: portalConfig.brandColor,
                color: "#ffffff",
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

/**
 * Font-family stack for each `businessNameFont` config value. Every font is
 * loaded in app/layout.tsx via next/font/google, exposing a CSS variable we
 * reference here.
 */
const BUSINESS_NAME_FONT: Record<string, string> = {
  jakarta: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif",
  playfair: "var(--font-playfair), Georgia, serif",
  bodoni: "var(--font-bodoni), Georgia, serif",
  "dm-serif": "var(--font-dm-serif), Georgia, serif",
};

function PortalHeader() {
  const logo = portalConfig.logo;
  const fontFamily =
    BUSINESS_NAME_FONT[portalConfig.businessNameFont] ?? BUSINESS_NAME_FONT.jakarta;
  return (
    <header className="flex flex-col items-center text-center">
      {logo ? (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.path}
            alt={logo.alt}
            className="h-14 md:h-16 w-auto object-contain"
          />
        </div>
      ) : null}
      <h1
        className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05]"
        style={{ fontFamily }}
      >
        {portalConfig.businessName}
      </h1>
      <p className="mt-5 max-w-md text-base md:text-lg text-[var(--color-ink-soft)] leading-relaxed">
        {portalConfig.welcomeMessage}
      </p>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Field row                                 */
/* -------------------------------------------------------------------------- */

function FieldRow({
  field,
  value,
  files,
  error,
  onChangeValue,
  onChangeFiles,
  brandColor,
}: {
  field: PortalField;
  value: string;
  files: File[];
  error?: string;
  onChangeValue: (v: string) => void;
  onChangeFiles: (files: File[]) => void;
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
        files={files}
        onChangeValue={onChangeValue}
        onChangeFiles={onChangeFiles}
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
  files,
  onChangeValue,
  onChangeFiles,
  brandColor,
  hasError,
}: {
  field: PortalField;
  inputId: string;
  value: string;
  files: File[];
  onChangeValue: (v: string) => void;
  onChangeFiles: (files: File[]) => void;
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
          onChange={(e) => onChangeValue(e.target.value)}
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
          onChange={(e) => onChangeValue(e.target.value)}
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
          onChange={(e) => onChangeValue(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );

    case "date":
      return (
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          className={cn(baseInput, border, focusRing)}
        />
      );

    case "dropdown":
      return (
        <div className="relative">
          <select
            id={inputId}
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
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
                  onChange={() => onChangeValue(opt)}
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
          files={files}
          onChange={onChangeFiles}
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
          onChange={(e) => onChangeValue(e.target.value)}
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
  files,
  onChange,
  brandColor,
}: {
  inputId: string;
  files: File[];
  onChange: (files: File[]) => void;
  brandColor: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const addFiles = (incoming: FileList | null | undefined) => {
    if (!incoming || !incoming.length) return;
    const merged = [...files, ...Array.from(incoming)];
    onChange(merged);
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    if (inputRef.current) inputRef.current.value = "";
  };

  if (files.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {files.map((f, i) => (
          <div
            key={`${f.name}-${i}`}
            className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
          >
            <div
              className="h-10 w-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: brandColor,
                color: "#ffffff",
              }}
            >
              <FileGlyph />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink-strong)] truncate">
                {f.name}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                {formatSize(f.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded-[var(--radius-sm)]"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1"
        >
          Add another
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
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
          addFiles(e.dataTransfer.files);
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
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/*                               Success screen                               */
/* -------------------------------------------------------------------------- */

function SuccessScreen() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: portalConfig.backgroundColor }}
    >
      <div className="max-w-md text-center">
        <div
          className="mx-auto h-16 w-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: portalConfig.brandColor,
            color: "#ffffff",
          }}
        >
          <CheckGlyph />
        </div>
        <p className="mt-8 font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {portalConfig.businessName}
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)] leading-[0.98]">
          Thanks.
        </h1>
        <p className="mt-6 text-base text-[var(--color-ink-soft)] leading-relaxed">
          We got your inquiry. {portalConfig.businessName} will be in touch
          within a business day.
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

