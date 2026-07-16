export type Status = "new" | "contacted" | "quoted" | "booked" | "won" | "lost";

export const STATUS_ORDER: Status[] = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "won",
  "lost",
];

/**
 * Column meta — small, restrained. The dot color is the ONLY color that
 * appears on the board itself; cards and headers otherwise stay neutral.
 * Colors are used to signal outcome (won/lost) and attention (new/quoted),
 * not to decorate.
 *
 * Booked uses a restrained plum — considered, distinct from the other five
 * status colors, and readable at 8px. Not a full palette entry because it
 * only ever appears as a status dot.
 */
const BOOKED_PLUM = "hsl(292 32% 40%)";

export const STATUS_META: Record<
  Status,
  { label: string; dotVar: string }
> = {
  new: { label: "New", dotVar: "var(--color-semantic-info)" },
  contacted: { label: "Contacted", dotVar: "var(--color-ink-placeholder)" },
  quoted: { label: "Quoted", dotVar: "var(--color-semantic-warning)" },
  booked: { label: "Booked", dotVar: BOOKED_PLUM },
  won: { label: "Won", dotVar: "var(--color-semantic-success)" },
  lost: { label: "Lost", dotVar: "var(--color-semantic-danger)" },
};

export interface StoredFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
}

/**
 * The dashboard's view of an inquiry. Answers is the full jsonb from the
 * database; individual fields are looked up by id at render time via the
 * current portal.config.ts. Convenience columns from the database appear
 * as top-level fields so the pipeline board doesn't touch jsonb.
 */
export interface Inquiry {
  id: string;
  status: Status;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  answers: Record<string, unknown>;
  createdAt: string;
}
