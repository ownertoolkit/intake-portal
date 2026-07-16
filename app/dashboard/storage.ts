import type { Inquiry } from "./types";
import { SAMPLE_INQUIRIES } from "./mock-data";

const STORAGE_KEY = "ownertoolkit:dashboard:inquiries";

/**
 * Persist inquiries + private notes to localStorage so the review flow
 * survives a refresh. Becomes a Supabase read/write when the backend is
 * wired.
 */

export function loadInquiries(): Inquiry[] {
  if (typeof window === "undefined") return SAMPLE_INQUIRIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_INQUIRIES;
    const parsed = JSON.parse(raw) as Inquiry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_INQUIRIES;
    return parsed;
  } catch {
    return SAMPLE_INQUIRIES;
  }
}

export function saveInquiries(inquiries: Inquiry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
  } catch {
    /* ignore quota errors in review */
  }
}

export function resetInquiries(): Inquiry[] {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return SAMPLE_INQUIRIES;
}
