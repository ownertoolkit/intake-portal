"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Textarea, cn } from "@/lib/ui";
import { portalConfig, type PortalField } from "@/lib/portal/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { StoredFile } from "./types";
import { STATUS_META, STATUS_ORDER, type Inquiry, type Status } from "./types";

const BUCKET = "inquiry-files";
const NOTE_SAVE_DEBOUNCE_MS = 600;
const SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 min

/**
 * InquirySlideOver — the deep view of a single inquiry.
 *
 * Reads the current portal.config.ts to know how to display each answer:
 * contact roles surface in the Contact section, everything else falls into
 * the Submission section in wizard order, and file uploads are their own
 * section with signed download URLs. Notes are stored in a separate table,
 * autosaved as the owner types.
 */
export function InquirySlideOver({
  inquiry,
  open,
  onOpenChange,
  onStatusChange,
}: {
  inquiry: Inquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: Status) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="slide-over-overlay fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "slide-over-content fixed z-50 top-0 right-0 h-screen w-full max-w-[560px]",
            "bg-[var(--color-surface)] border-l border-[var(--color-line)] shadow-[var(--shadow-xl)]",
            "flex flex-col outline-none",
          )}
        >
          <Dialog.Title className="sr-only">
            {inquiry?.customerName ?? "Inquiry"} details
          </Dialog.Title>
          {inquiry ? (
            <SlideOverBody
              inquiry={inquiry}
              onStatusChange={(s) => onStatusChange(inquiry.id, s)}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Body                                      */
/* -------------------------------------------------------------------------- */

function SlideOverBody({
  inquiry,
  onStatusChange,
  onClose,
}: {
  inquiry: Inquiry;
  onStatusChange: (s: Status) => void;
  onClose: () => void;
}) {
  const summary = summarizeInquiry(inquiry);
  const displayTitle =
    inquiry.customerName || inquiry.customerEmail || "Anonymous";

  return (
    <>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--color-line-subtle)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Inquiry · {formatDate(inquiry.createdAt)}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.015em] text-[var(--color-ink-strong)] leading-tight">
              {displayTitle}
            </h2>
            {summary.headline ? (
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {summary.headline}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-[var(--radius-md)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6">
          <StatusChanger status={inquiry.status} onChange={onStatusChange} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ContactSection inquiry={inquiry} rows={summary.contact} />
        {summary.submission.length > 0 ? (
          <>
            <Divider />
            <SubmissionSection rows={summary.submission} />
          </>
        ) : null}
        {summary.files.length > 0 ? (
          <>
            <Divider />
            <FilesSection files={summary.files} />
          </>
        ) : null}
        <Divider />
        <NotesSection inquiryId={inquiry.id} />
      </div>
    </>
  );
}

function Divider() {
  return <div className="border-t border-[var(--color-line-subtle)]" />;
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-8 py-7">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-muted)] mb-4">
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Inquiry summarizer                                */
/* -------------------------------------------------------------------------- */

interface ContactRowData {
  label: string;
  value: string;
  copyable?: boolean;
}

interface SubmissionRowData {
  label: string;
  value: string;
}

interface Summary {
  headline: string | null;
  contact: ContactRowData[];
  submission: SubmissionRowData[];
  files: StoredFile[];
}

function summarizeInquiry(inquiry: Inquiry): Summary {
  const enabled = portalConfig.fields.filter((f) => f.enabled);

  const contact: ContactRowData[] = [];
  if (inquiry.customerName) {
    contact.push({ label: "Name", value: inquiry.customerName });
  }
  if (inquiry.customerEmail) {
    contact.push({ label: "Email", value: inquiry.customerEmail, copyable: true });
  }
  if (inquiry.customerPhone) {
    contact.push({ label: "Phone", value: inquiry.customerPhone, copyable: true });
  }
  // Company + any other role-tagged fields (e.g. customer_company)
  for (const field of enabled) {
    if (!field.role) continue;
    if (field.role === "customer_name" || field.role === "customer_email" || field.role === "customer_phone") continue;
    const value = readStringAnswer(inquiry, field.id);
    if (value) contact.push({ label: field.label, value });
  }

  const submission: SubmissionRowData[] = [];
  const files: StoredFile[] = [];

  for (const field of enabled) {
    if (field.role) continue;
    if (field.type === "file_upload") {
      const list = readFileArray(inquiry, field.id);
      files.push(...list);
      continue;
    }
    const value = readStringAnswer(inquiry, field.id);
    if (value) submission.push({ label: field.label, value });
  }

  // Headline: the first meaningful non-role answer (short then long).
  let headline: string | null = null;
  for (const field of enabled) {
    if (field.role) continue;
    if (field.type !== "short_answer" && field.type !== "long_answer") continue;
    const value = readStringAnswer(inquiry, field.id);
    if (value) {
      headline = value.length > 90 ? value.slice(0, 90).trimEnd() + "…" : value;
      break;
    }
  }

  return { headline, contact, submission, files };
}

function readStringAnswer(inquiry: Inquiry, fieldId: string): string | null {
  const raw = inquiry.answers[fieldId];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function readFileArray(inquiry: Inquiry, fieldId: string): StoredFile[] {
  const raw = inquiry.answers[fieldId];
  if (!Array.isArray(raw)) return [];
  const result: StoredFile[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== "string" || typeof e.path !== "string") continue;
    result.push({
      name: e.name,
      path: e.path,
      size: typeof e.size === "number" ? e.size : 0,
      contentType: typeof e.contentType === "string" ? e.contentType : "application/octet-stream",
    });
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/*                              Status changer                                */
/* -------------------------------------------------------------------------- */

function StatusChanger({
  status,
  onChange,
}: {
  status: Status;
  onChange: (s: Status) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const meta = STATUS_META[status];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 h-9 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
      >
        <StatusDot color={meta.dotVar} />
        {meta.label}
        <ChevronDownIcon />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-10 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] py-1"
        >
          {STATUS_ORDER.map((s) => {
            const m = STATUS_META[s];
            const active = s === status;
            return (
              <button
                key={s}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                  active
                    ? "bg-[var(--color-surface-sunken)] text-[var(--color-ink-strong)] font-medium"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]",
                )}
              >
                <StatusDot color={m.dotVar} />
                <span>{m.label}</span>
                {active ? (
                  <span className="ml-auto text-[var(--color-ink-muted)]">
                    <TinyCheckIcon />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Sections                                  */
/* -------------------------------------------------------------------------- */

function ContactSection({
  inquiry: _inquiry,
  rows,
}: {
  inquiry: Inquiry;
  rows: ContactRowData[];
}) {
  if (rows.length === 0) return null;
  return (
    <Section eyebrow="Contact">
      <dl className="space-y-3">
        {rows.map((row) => (
          <ContactRow key={row.label} label={row.label} value={row.value} copyable={row.copyable} />
        ))}
      </dl>
    </Section>
  );
}

function ContactRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr_auto] items-center gap-4">
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--color-ink)] truncate">{value}</dd>
      {copyable ? <CopyButton value={value} /> : <span />}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard may be blocked in some contexts */
        }
      }}
      aria-label={`Copy ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium border transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
        copied
          ? "border-[var(--color-semantic-success-strong)] text-[var(--color-semantic-success-strong)] bg-[var(--color-semantic-success-subtle)]"
          : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]",
      )}
    >
      {copied ? <TinyCheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SubmissionSection({ rows }: { rows: SubmissionRowData[] }) {
  return (
    <Section eyebrow="Submission">
      <dl className="space-y-6">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-[var(--color-ink-muted)]">{row.label}</dt>
            <dd className="mt-1.5 text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function FilesSection({ files }: { files: StoredFile[] }) {
  return (
    <Section eyebrow="Files">
      <ul className="space-y-2">
        {files.map((f) => (
          <FileRow key={f.path} file={f} />
        ))}
      </ul>
    </Section>
  );
}

function FileRow({ file }: { file: StoredFile }) {
  const [downloading, setDownloading] = React.useState(false);
  const [failedMessage, setFailedMessage] = React.useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setFailedMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(file.path, SIGNED_URL_TTL_SECONDS, { download: file.name });
      if (error || !data?.signedUrl) throw error ?? new Error("No URL returned");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err) {
      console.error(err);
      setFailedMessage("This file isn't available. It may have failed to upload.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li
      className="flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border border-[var(--color-line-subtle)] hover:border-[var(--color-line)] hover:bg-[var(--color-surface-sunken)] transition-colors"
    >
      <span className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-surface-canvas)] border border-[var(--color-line-subtle)] flex items-center justify-center text-[var(--color-ink-muted)]">
        <FileIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)] truncate">
          {file.name}
        </p>
        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
          {formatSize(file.size)}
          {failedMessage ? <span className="text-[var(--color-semantic-warning-strong)]"> · {failedMessage}</span> : null}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded-[var(--radius-sm)] disabled:opacity-60"
      >
        {downloading ? "Preparing…" : "Download"}
      </button>
    </li>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/*                                Notes section                               */
/* -------------------------------------------------------------------------- */

function NotesSection({ inquiryId }: { inquiryId: string }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  const [noteId, setNoteId] = React.useState<string | null>(null);
  const [value, setValue] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = React.useRef<number | null>(null);
  const inflightValueRef = React.useRef<string>("");

  React.useEffect(() => {
    let cancelled = false;
    setReady(false);
    setValue("");
    setNoteId(null);
    setSaveState("idle");
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, body")
        .eq("inquiry_id", inquiryId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[notes] load failed:", error);
      } else if (data) {
        setNoteId(data.id);
        setValue(data.body ?? "");
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [inquiryId, supabase]);

  const scheduleSave = React.useCallback(
    (next: string) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(async () => {
        if (inflightValueRef.current === next) return;
        inflightValueRef.current = next;
        setSaveState("saving");
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) {
            setSaveState("error");
            return;
          }
          if (noteId) {
            const { error } = await supabase
              .from("notes")
              .update({ body: next })
              .eq("id", noteId);
            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from("notes")
              .insert({ inquiry_id: inquiryId, author_id: user.user.id, body: next })
              .select("id")
              .single();
            if (error) throw error;
            setNoteId(data.id);
          }
          setSaveState("saved");
        } catch (err) {
          console.error("[notes] save failed:", err);
          setSaveState("error");
        }
      }, NOTE_SAVE_DEBOUNCE_MS);
    },
    [inquiryId, noteId, supabase],
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Section eyebrow="Private notes">
      <Textarea
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          scheduleSave(v);
        }}
        placeholder="Only you can see these."
        rows={4}
        className="text-sm"
        disabled={!ready}
      />
      <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
        {saveHint(saveState, ready)}
      </p>
    </Section>
  );
}

function saveHint(state: "idle" | "saving" | "saved" | "error", ready: boolean): string {
  if (!ready) return "Loading…";
  switch (state) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved.";
    case "error":
      return "Couldn't save. Try again in a moment.";
    case "idle":
    default:
      return "Saved automatically.";
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Icons                                     */
/* -------------------------------------------------------------------------- */

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-3.5 w-3.5 text-[var(--color-ink-muted)]"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      <rect x="5" y="5" width="8" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-5A1.5 1.5 0 0 0 3 3.5v6A1.5 1.5 0 0 0 4.5 11H5" />
    </svg>
  );
}

function TinyCheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      <path d="M3 8.5l3 3L13 5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
