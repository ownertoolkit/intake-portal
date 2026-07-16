import { portalPalette } from "@/lib/tokens";
import { DEFAULT_FIELDS, type FormField } from "../setup/form-fields-editor";

/**
 * Portal configuration.
 *
 * For this review the config lives in localStorage so the wizard-to-portal
 * handoff works without a backend. When Supabase comes online this becomes
 * a row in a `portals` table; the shape stays the same.
 */

const STORAGE_KEY = "ownertoolkit:portal:default";

export interface PortalConfig {
  businessName: string;
  logoDataUrl: string | null;
  color: string;
  welcomeMessage: string;
  fields: FormField[];
  publishedAt: string;
}

export const DEFAULT_WELCOME_MESSAGE =
  "Tell us a little about your project and we'll be in touch within a business day.";

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  businessName: "Untitled Portal",
  logoDataUrl: null,
  color: portalPalette[0].value,
  welcomeMessage: DEFAULT_WELCOME_MESSAGE,
  fields: DEFAULT_FIELDS,
  publishedAt: new Date().toISOString(),
};

export function loadPortalConfig(): PortalConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalConfig;
  } catch {
    return null;
  }
}

export function savePortalConfig(config: PortalConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
