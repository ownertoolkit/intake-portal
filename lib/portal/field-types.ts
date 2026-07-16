/**
 * Field types for the customer intake form.
 *
 * These types describe the shape of `portal.config.ts`. The customizer at
 * theownertoolkit.co produces a config that matches this shape.
 */

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
 * Field role — the stable canonical purpose of a field. Owners can rename
 * the label, reorder, or add fields freely; role is what tells the server
 * "this is the customer's email regardless of what the owner calls it."
 * Custom questions the owner adds have no role.
 */
export type FieldRole =
  | "customer_name"
  | "customer_email"
  | "customer_phone"
  | "customer_company";

export interface PortalField {
  id: string;
  type: FieldType;
  role?: FieldRole;
  label: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
}

export interface PortalLogo {
  path: string; // e.g. "/logo.png" — resolved from /public/
  alt: string;
}

export interface PortalConfigShape {
  businessName: string;
  brandColor: string;
  welcomeMessage: string;
  logo: PortalLogo | null;
  fields: PortalField[];
}
