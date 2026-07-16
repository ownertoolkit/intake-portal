"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/ui";
import { portalConfig } from "@/lib/portal/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { STATUS_META, STATUS_ORDER, type Inquiry, type Status } from "./types";
import { InquirySlideOver } from "./inquiry-slide-over";

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

type StatusFilter = "all" | Status;

interface InquiryRow {
  id: string;
  status: Status;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  answers: Record<string, unknown>;
  created_at: string;
}

function rowToInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    status: row.status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    answers: row.answers ?? {},
    createdAt: row.created_at,
  };
}

export default function DashboardPage() {
  const [ready, setReady] = React.useState(false);
  const [inquiries, setInquiries] = React.useState<Inquiry[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, status, customer_name, customer_email, customer_phone, answers, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
      } else {
        setInquiries((data ?? []).map((row) => rowToInquiry(row as InquiryRow)));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const selectedInquiry = React.useMemo(
    () => inquiries.find((i) => i.id === selectedId) ?? null,
    [inquiries, selectedId],
  );

  const activeInquiry = React.useMemo(
    () => inquiries.find((i) => i.id === activeDragId) ?? null,
    [inquiries, activeDragId],
  );

  const visibleInquiries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter(
      (i) =>
        (i.customerName ?? "").toLowerCase().includes(q) ||
        (i.customerEmail ?? "").toLowerCase().includes(q),
    );
  }, [inquiries, search]);

  const columns = React.useMemo(() => {
    const visibleStatuses =
      filter === "all" ? STATUS_ORDER : STATUS_ORDER.filter((s) => s === filter);
    return visibleStatuses.map((status) => ({
      status,
      items: visibleInquiries.filter((i) => i.status === status),
    }));
  }, [visibleInquiries, filter]);

  const updateStatus = async (id: string, status: Status) => {
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i)),
    );
    const { error } = await supabase
      .from("inquiries")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.error("[dashboard] status update failed:", error);
      // Optimistic update stays; the next load will reconcile.
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string): Status | null => {
    if (STATUS_ORDER.includes(id as Status)) return id as Status;
    const found = inquiries.find((i) => i.id === id);
    return found ? found.status : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;

    setInquiries((prev) => {
      const activeIndex = prev.findIndex((i) => i.id === activeId);
      if (activeIndex < 0) return prev;

      if (activeContainer === overContainer) {
        const overIndex = prev.findIndex((i) => i.id === overId);
        if (overIndex < 0) return prev;
        return arrayMove(prev, activeIndex, overIndex);
      }

      const next = prev.map((i, idx) =>
        idx === activeIndex ? { ...i, status: overContainer } : i,
      );
      const moved = next.splice(activeIndex, 1)[0]!;
      const insertIndex = STATUS_ORDER.includes(overId as Status)
        ? next.length
        : next.findIndex((i) => i.id === overId);
      next.splice(insertIndex < 0 ? next.length : insertIndex, 0, moved);
      return next;
    });

    if (activeContainer !== overContainer) {
      void updateStatus(activeId, overContainer);
    }
  };

  if (!ready) {
    return <main className="min-h-screen bg-[var(--color-surface-canvas)]" />;
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] flex flex-col">
      <TopBar />

      <div className="px-8 md:px-12 pt-14 pb-8 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              {portalConfig.businessName}
            </p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)] leading-[1]">
              Inquiries
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} />
            <StatusFilterButton value={filter} onChange={setFilter} />
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="px-8 md:px-12 max-w-[1600px] w-full mx-auto mb-4">
          <p className="rounded-[var(--radius-md)] border border-[var(--color-semantic-warning)] bg-[var(--color-semantic-warning-subtle)] px-4 py-3 text-sm text-[var(--color-semantic-warning-strong)]">
            We couldn't load inquiries: {loadError}
          </p>
        </div>
      ) : null}

      <ScrollableBoard>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5 items-start">
            {columns.map((col) => (
              <Column
                key={col.status}
                status={col.status}
                items={col.items}
                onOpen={setSelectedId}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeInquiry ? <InquiryCard inquiry={activeInquiry} isOverlay /> : null}
          </DragOverlay>
        </DndContext>

        {inquiries.length === 0 && !loadError ? (
          <EmptyBoard />
        ) : search && visibleInquiries.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">
              No inquiries match &ldquo;{search}&rdquo;.
            </p>
          </div>
        ) : null}
      </ScrollableBoard>

      <Footer />

      <InquirySlideOver
        inquiry={selectedInquiry}
        open={Boolean(selectedInquiry)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onStatusChange={(id, status) => void updateStatus(id, status)}
      />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Empty board                                 */
/* -------------------------------------------------------------------------- */

function EmptyBoard() {
  return (
    <div className="mt-20 text-center">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        Nothing yet
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-tight">
        Your first inquiry will show up here.
      </h2>
      <p className="mt-3 text-sm text-[var(--color-ink-soft)] max-w-md mx-auto">
        Share your portal URL with a customer or send yourself a test to see how it looks.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Scrollable board                             */
/* -------------------------------------------------------------------------- */

function ScrollableBoard({ children }: { children: React.ReactNode }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className="relative flex-1">
      <div ref={scrollerRef} className="overflow-x-auto pt-2 pb-16">
        <div className="px-8 md:px-12 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--color-surface-canvas)] to-transparent transition-opacity duration-[var(--motion-base)] ease-[var(--motion-standard)]"
        style={{ opacity: canScrollLeft ? 1 : 0 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--color-surface-canvas)] to-transparent transition-opacity duration-[var(--motion-base)] ease-[var(--motion-standard)]"
        style={{ opacity: canScrollRight ? 1 : 0 }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Top bar                                   */
/* -------------------------------------------------------------------------- */

function TopBar() {
  return (
    <header className="px-8 md:px-12 py-5 border-b border-[var(--color-line-subtle)] bg-[var(--color-surface)]">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <span className="font-sans text-xs font-medium tracking-wide text-[var(--color-ink-muted)]">
          {portalConfig.businessName}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/portal"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            View portal
            <ExternalIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Search                                    */
/* -------------------------------------------------------------------------- */

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        aria-hidden
      >
        <SearchIcon />
      </span>
      <input
        type="text"
        placeholder="Search by name or email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-[260px] pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Status filter                               */
/* -------------------------------------------------------------------------- */

function StatusFilterButton({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
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

  const label = value === "all" ? "All statuses" : STATUS_META[value].label;
  const color =
    value === "all"
      ? "var(--color-ink-placeholder)"
      : STATUS_META[value].dotVar;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 h-10 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
      >
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
        <ChevronDownIcon />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-10 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] py-1"
        >
          <FilterOption
            active={value === "all"}
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            color="var(--color-ink-placeholder)"
            label="All statuses"
          />
          <div className="my-1 border-t border-[var(--color-line-subtle)]" />
          {STATUS_ORDER.map((s) => (
            <FilterOption
              key={s}
              active={value === s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              color={STATUS_META[s].dotVar}
              label={STATUS_META[s].label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterOption({
  active,
  onClick,
  color,
  label,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
}) {
  return (
    <button
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
        active
          ? "bg-[var(--color-surface-sunken)] text-[var(--color-ink-strong)] font-medium"
          : "text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]",
      )}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Column                                    */
/* -------------------------------------------------------------------------- */

function Column({
  status,
  items,
  onOpen,
}: {
  status: Status;
  items: Inquiry[];
  onOpen: (id: string) => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="w-[300px] shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-1 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.dotVar }}
            aria-hidden
          />
          <p className="font-sans text-sm font-semibold tracking-tight text-[var(--color-ink-strong)]">
            {meta.label}
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-[var(--color-ink-muted)]">
          {items.length}
        </span>
      </div>

      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-col gap-3 min-h-[80px] p-1 rounded-[var(--radius-lg)] transition-colors",
            isOver && "bg-[var(--color-surface-sunken)]",
          )}
        >
          {items.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-4 py-8 text-center">
              <p className="text-xs text-[var(--color-ink-muted)]">
                Nothing here yet.
              </p>
            </div>
          ) : (
            items.map((inquiry) => (
              <SortableCard key={inquiry.id} inquiry={inquiry} onOpen={onOpen} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Sortable card                               */
/* -------------------------------------------------------------------------- */

function SortableCard({
  inquiry,
  onOpen,
}: {
  inquiry: Inquiry;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: inquiry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <InquiryCard inquiry={inquiry} onOpen={onOpen} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Card                                      */
/* -------------------------------------------------------------------------- */

function InquiryCard({
  inquiry,
  onOpen,
  isOverlay,
}: {
  inquiry: Inquiry;
  onOpen?: (id: string) => void;
  isOverlay?: boolean;
}) {
  const isNew = inquiry.status === "new";
  const summary = cardSummary(inquiry);

  const title = inquiry.customerName || inquiry.customerEmail || "Anonymous";

  return (
    <div
      onClick={() => {
        if (onOpen) onOpen(inquiry.id);
      }}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(inquiry.id);
        }
      }}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : -1}
      className={cn(
        "relative block w-full text-left bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-line)]",
        "transition-[border-color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
        onOpen && "hover:border-[var(--color-line-strong)] cursor-grab active:cursor-grabbing",
        isOverlay && "shadow-[var(--shadow-lg)] rotate-[0.5deg] cursor-grabbing",
      )}
    >
      {isNew ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-[var(--color-semantic-info)]"
        />
      ) : null}

      <div className="px-6 pt-5 pb-3">
        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-tight">
          {title}
        </h3>
        {summary.subtitle ? (
          <p className="mt-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] leading-snug">
            {summary.subtitle}
          </p>
        ) : null}
      </div>
      {summary.body ? (
        <div className="px-6 pb-4">
          <p className="text-[13px] text-[var(--color-ink-muted)] leading-snug line-clamp-2">
            {summary.body}
          </p>
        </div>
      ) : null}
      <div className="mx-6 pb-5 pt-3 flex items-center justify-between gap-3 border-t border-[var(--color-line-subtle)]">
        <span className="text-[11px] text-[var(--color-ink-muted)] tabular-nums">
          {relativeDate(inquiry.createdAt)}
        </span>
        {summary.aside ? (
          <span className="text-[11px] font-medium tabular-nums text-[var(--color-ink)]">
            {summary.aside}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compute a card's subtitle, body preview, and optional right-side aside
 * from the current portal.config.ts. Deterministic rules:
 *   - Subtitle = first enabled non-role short_answer answer.
 *   - Body    = first enabled non-role long_answer answer (or the second
 *               short answer if there's no long answer).
 *   - Aside   = first enabled short_answer whose label suggests budget/price.
 * Missing pieces are omitted.
 */
function cardSummary(inquiry: Inquiry): {
  subtitle: string | null;
  body: string | null;
  aside: string | null;
} {
  const enabled = portalConfig.fields.filter((f) => f.enabled);

  const shortAnswers = enabled.filter(
    (f) => !f.role && f.type === "short_answer",
  );
  const longAnswers = enabled.filter(
    (f) => !f.role && f.type === "long_answer",
  );

  const readString = (fieldId: string): string | null => {
    const raw = inquiry.answers[fieldId];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return null;
  };

  let subtitle: string | null = null;
  for (const f of shortAnswers) {
    const value = readString(f.id);
    if (value) {
      subtitle = value;
      break;
    }
  }

  let body: string | null = null;
  for (const f of longAnswers) {
    const value = readString(f.id);
    if (value) {
      body = value;
      break;
    }
  }
  if (!body) {
    let found = 0;
    for (const f of shortAnswers) {
      const value = readString(f.id);
      if (!value) continue;
      found++;
      if (found === 2) {
        body = value;
        break;
      }
    }
  }

  let aside: string | null = null;
  for (const f of shortAnswers) {
    if (!/budget|price|quote|cost/i.test(f.label)) continue;
    const value = readString(f.id);
    if (value) {
      aside = value;
      break;
    }
  }

  return { subtitle, body, aside };
}

/* -------------------------------------------------------------------------- */
/*                                  Footer                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-[var(--color-line-subtle)] px-8 md:px-12 py-6 bg-[var(--color-surface)]">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <div>
          <span className="font-medium">Built with The Owner Toolkit</span>
          <span className="mx-2">·</span>
          <span>theownertoolkit.co</span>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Icons                                     */
/* -------------------------------------------------------------------------- */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
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

function ExternalIcon() {
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
      <path d="M6 3.5H3.5v9h9V10" />
      <path d="M9 3.5h3.5V7" />
      <path d="M12.5 3.5L7 9" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hr ago" : `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
