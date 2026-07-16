"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type FieldType =
  | "short_answer"
  | "long_answer"
  | "email"
  | "phone"
  | "multiple_choice"
  | "dropdown"
  | "date"
  | "file_upload";

/**
 * Field role — the stable, hidden canonical purpose of a field.
 *
 * The owner can rename the label, reorder, or add fields freely. The role
 * is what the server and dashboard rely on to know "this is the customer's
 * email regardless of what the owner calls it." Custom fields the owner
 * adds have no role — they're extra questions.
 *
 * Required roles (see REQUIRED_ROLES) cannot be removed or fully disabled
 * from the wizard — every portal must always collect at least one name and
 * one email.
 */
export type FieldRole =
  | "customer_name"
  | "customer_email"
  | "customer_phone"
  | "customer_company";

export const REQUIRED_ROLES: FieldRole[] = ["customer_name", "customer_email"];

const ROLE_HUMAN: Record<FieldRole, string> = {
  customer_name: "name",
  customer_email: "email",
  customer_phone: "phone",
  customer_company: "company",
};

export interface FormField {
  id: string;
  type: FieldType;
  /** Stable canonical purpose; undefined for owner-added custom fields */
  role?: FieldRole;
  label: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
}

export const DEFAULT_FIELDS: FormField[] = [
  {
    id: "name",
    type: "short_answer",
    role: "customer_name",
    label: "Your name",
    required: true,
    enabled: true,
  },
  {
    id: "email",
    type: "email",
    role: "customer_email",
    label: "Email",
    required: true,
    enabled: true,
  },
  {
    id: "phone",
    type: "phone",
    role: "customer_phone",
    label: "Phone",
    required: false,
    enabled: true,
  },
  {
    id: "company",
    type: "short_answer",
    role: "customer_company",
    label: "Company",
    required: false,
    enabled: true,
  },
  {
    id: "service",
    type: "short_answer",
    label: "Service or project type",
    required: false,
    enabled: true,
  },
  {
    id: "project",
    type: "long_answer",
    label: "Project details",
    required: true,
    enabled: true,
  },
  { id: "budget", type: "short_answer", label: "Budget", required: false, enabled: true },
  {
    id: "timeline",
    type: "short_answer",
    label: "Desired timeline",
    required: false,
    enabled: true,
  },
  { id: "files", type: "file_upload", label: "Files", required: false, enabled: true },
  {
    id: "contact_method",
    type: "multiple_choice",
    label: "Preferred contact method",
    required: false,
    enabled: true,
    options: ["Email", "Phone", "Text message"],
  },
  {
    id: "anything_else",
    type: "long_answer",
    label: "Anything else we should know?",
    required: false,
    enabled: true,
  },
];

const ADDABLE_TYPES: { type: FieldType; label: string; description: string }[] = [
  { type: "short_answer", label: "Short answer", description: "A single line of text" },
  { type: "long_answer", label: "Long answer", description: "A paragraph or two" },
  { type: "multiple_choice", label: "Multiple choice", description: "Pick one from a list" },
  { type: "dropdown", label: "Dropdown", description: "Pick one from a menu" },
  { type: "date", label: "Date", description: "A single calendar date" },
  { type: "file_upload", label: "File upload", description: "Photos, PDFs, docs" },
];

const TYPE_LABEL: Record<FieldType, string> = {
  short_answer: "Short answer",
  long_answer: "Long answer",
  email: "Email",
  phone: "Phone",
  multiple_choice: "Multiple choice",
  dropdown: "Dropdown",
  date: "Date",
  file_upload: "File upload",
};

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

export function FormFieldsEditor({
  fields,
  onChange,
}: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [warning, setWarning] = React.useState<string | null>(null);
  const warningTimeoutRef = React.useRef<number | null>(null);
  const flashWarning = (msg: string) => {
    setWarning(msg);
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = window.setTimeout(() => setWarning(null), 4000);
  };
  React.useEffect(
    () => () => {
      if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    },
    [],
  );

  const wouldOrphanRole = (
    field: FormField,
    kind: "disable" | "delete",
  ): FieldRole | null => {
    if (!field.role || !REQUIRED_ROLES.includes(field.role)) return null;
    const others = fields.filter((f) => f.id !== field.id && f.role === field.role);
    if (kind === "delete") return others.length === 0 ? field.role : null;
    // disable
    const otherEnabled = others.filter((f) => f.enabled);
    return field.enabled && otherEnabled.length === 0 ? field.role : null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(fields, oldIndex, newIndex));
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const orphaned = wouldOrphanRole(field, "delete");
    if (orphaned) {
      flashWarning(
        `Every portal needs at least one ${ROLE_HUMAN[orphaned]} field. Add another before removing this one.`,
      );
      return;
    }
    onChange(fields.filter((f) => f.id !== id));
  };

  const toggleEnabled = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const orphaned = wouldOrphanRole(field, "disable");
    if (orphaned) {
      flashWarning(
        `Every portal needs at least one ${ROLE_HUMAN[orphaned]} field. Turn on another before turning this one off.`,
      );
      return;
    }
    updateField(id, { enabled: !field.enabled });
  };

  const addField = (type: FieldType) => {
    const id = `custom_${Date.now()}`;
    const label = TYPE_LABEL[type];
    const base: FormField = {
      id,
      type,
      label,
      required: false,
      enabled: true,
    };
    const withOptions =
      type === "multiple_choice" || type === "dropdown"
        ? { ...base, options: ["Option 1", "Option 2"] }
        : base;
    onChange([...fields, withOptions]);
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden">
            {fields.map((field, idx) => (
              <SortableFieldRow
                key={field.id}
                field={field}
                isLast={idx === fields.length - 1}
                onLabelChange={(label) => updateField(field.id, { label })}
                onRequiredToggle={() =>
                  updateField(field.id, { required: !field.required })
                }
                onEnabledToggle={() => toggleEnabled(field.id)}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddQuestion onAdd={addField} />

      {warning ? (
        <p
          role="status"
          className="mt-3 text-xs text-[var(--color-semantic-warning-strong)] transition-opacity"
        >
          {warning}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Field row                                   */
/* -------------------------------------------------------------------------- */

function SortableFieldRow({
  field,
  isLast,
  onLabelChange,
  onRequiredToggle,
  onEnabledToggle,
  onRemove,
}: {
  field: FormField;
  isLast: boolean;
  onLabelChange: (label: string) => void;
  onRequiredToggle: () => void;
  onEnabledToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5",
        !isLast && "border-b border-[var(--color-line-subtle)]",
        !field.enabled && "opacity-45",
        isDragging &&
          "bg-[var(--color-surface)] shadow-[var(--shadow-lg)] rounded-[var(--radius-md)]",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 rounded-[var(--radius-sm)] text-[var(--color-ink-placeholder)] hover:text-[var(--color-ink-muted)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
      >
        <GripIcon />
      </button>

      <div className="min-w-0">
        <input
          value={field.label}
          onChange={(e) => onLabelChange(e.target.value)}
          disabled={!field.enabled}
          className="w-full bg-transparent text-sm font-medium text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] focus:outline-none focus:bg-[var(--color-surface-sunken)] rounded-[var(--radius-xs)] px-1.5 py-1 -mx-1.5"
          aria-label={`${field.label} label`}
        />
        <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 px-0">
          {TYPE_LABEL[field.type]}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <RequiredChip required={field.required} onClick={onRequiredToggle} disabled={!field.enabled} />
        <Switch on={field.enabled} onToggle={onEnabledToggle} label={`${field.label} on/off`} />
        <RowMenu onRemove={onRemove} />
      </div>
    </div>
  );
}

/* --------------------------------- Chips ---------------------------------- */

function RequiredChip({
  required,
  onClick,
  disabled,
}: {
  required: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={required}
      className={cn(
        "inline-flex items-center h-6 px-2.5 rounded-[var(--radius-full)] text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
        required
          ? "bg-[var(--color-ink-strong)] text-[var(--color-ink-inverse)]"
          : "bg-transparent text-[var(--color-ink-muted)] border border-[var(--color-line)] hover:text-[var(--color-ink)]",
      )}
    >
      {required ? "Required" : "Optional"}
    </button>
  );
}

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative w-9 h-5 rounded-[var(--radius-full)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
        on ? "bg-[var(--color-ink-strong)]" : "bg-[var(--color-neutral-200)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
          on ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------- Row menu --------------------------------- */

function RowMenu({ onRemove }: { onRemove: () => void }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Field options"
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-ink-placeholder)] hover:text-[var(--color-ink-muted)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
      >
        <DotsIcon />
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] py-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-[var(--color-semantic-danger-strong)] hover:bg-[var(--color-surface-sunken)]"
          >
            Delete field
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- Add question ------------------------------- */

function AddQuestion({ onAdd }: { onAdd: (type: FieldType) => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-4">
      {open ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Pick a question type
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ADDABLE_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  onAdd(t.type);
                  setOpen(false);
                }}
                className="text-left rounded-[var(--radius-md)] border border-[var(--color-line-subtle)] hover:border-[var(--color-line)] hover:bg-[var(--color-surface-sunken)] p-3 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
              >
                <p className="text-sm font-medium text-[var(--color-ink)]">{t.label}</p>
                <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24"
        >
          <PlusIcon />
          Add a question
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- Icons -------------------------------- */

function GripIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="6" cy="4" r="1" />
      <circle cx="10" cy="4" r="1" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <circle cx="6" cy="12" r="1" />
      <circle cx="10" cy="12" r="1" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M8 3.5v9" />
      <path d="M3.5 8h9" />
    </svg>
  );
}
