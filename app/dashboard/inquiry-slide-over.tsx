"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Textarea, cn } from "@/lib/ui";
import { STATUS_META, STATUS_ORDER, type Inquiry, type Status } from "./types";

/**
 * InquirySlideOver — the deep view of a single inquiry.
 *
 * Slides in from the right using Radix Dialog (which gives us the focus
 * trap, ESC-to-close, and ARIA machinery for free). Everything the owner
 * needs to review an inquiry lives here: contact info with copy-to-clipboard,
 * the full submission, uploaded files, a status changer, and a private
 * notes textarea.
 */

export function InquirySlideOver({
  inquiry,
  open,
  onOpenChange,
  onStatusChange,
  onNotesChange,
}: {
  inquiry: Inquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: Status) => void;
  onNotesChange: (id: string, notes: string) => void;
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
              onNotesChange={(n) => onNotesChange(inquiry.id, n)}
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
  onNotesChange,
  onClose,
}: {
  inquiry: Inquiry;
  onStatusChange: (s: Status) => void;
  onNotesChange: (n: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--color-line-subtle)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              Inquiry · {formatDate(inquiry.submittedAt)}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.015em] text-[var(--color-ink-strong)] leading-tight">
              {inquiry.customerName}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {inquiry.serviceType}
            </p>
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <ContactSection inquiry={inquiry} />
        <Divider />
        <SubmissionSection inquiry={inquiry} />
        {inquiry.files && inquiry.files.length > 0 ? (
          <>
            <Divider />
            <FilesSection files={inquiry.files} />
          </>
        ) : null}
        <Divider />
        <NotesSection value={inquiry.ownerNotes} onChange={onNotesChange} />
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

function ContactSection({ inquiry }: { inquiry: Inquiry }) {
  return (
    <Section eyebrow="Contact">
      <dl className="space-y-3">
        <ContactRow label="Name" value={inquiry.customerName} />
        <ContactRow label="Email" value={inquiry.email} copyable />
        {inquiry.phone ? <ContactRow label="Phone" value={inquiry.phone} copyable /> : null}
        {inquiry.company ? <ContactRow label="Company" value={inquiry.company} /> : null}
        {inquiry.preferredContact ? (
          <ContactRow label="Prefers" value={inquiry.preferredContact} />
        ) : null}
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

function SubmissionSection({ inquiry }: { inquiry: Inquiry }) {
  const rows: { label: string; value: string }[] = [
    { label: "Service or project type", value: inquiry.serviceType },
    { label: "Project details", value: inquiry.projectDetails },
  ];
  if (inquiry.budget) rows.push({ label: "Budget", value: inquiry.budget });
  if (inquiry.timeline) rows.push({ label: "Desired timeline", value: inquiry.timeline });
  if (inquiry.otherNotes)
    rows.push({ label: "Anything else", value: inquiry.otherNotes });

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

function FilesSection({ files }: { files: { name: string; size: string }[] }) {
  return (
    <Section eyebrow="Files">
      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.name}
            className="flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border border-[var(--color-line-subtle)] hover:border-[var(--color-line)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            <span className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-surface-canvas)] border border-[var(--color-line-subtle)] flex items-center justify-center text-[var(--color-ink-muted)]">
              <FileIcon />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                {f.name}
              </p>
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{f.size}</p>
            </div>
            <button
              type="button"
              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded-[var(--radius-sm)]"
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function NotesSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Section eyebrow="Private notes">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Only you can see these."
        rows={4}
        className="text-sm"
      />
      <p className="text-[11px] text-[var(--color-ink-muted)] mt-2">
        Saved automatically.
      </p>
    </Section>
  );
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
