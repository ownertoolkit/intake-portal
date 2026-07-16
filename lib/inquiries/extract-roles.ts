import type { PortalField } from "@/lib/portal/config";
import type { AnswerValue } from "./validate";

/**
 * Pull the customer's name/email/phone out of the validated answers using
 * the role tags on the current portal.config.ts fields. The dashboard reads
 * these columns for search + card display without ever touching jsonb.
 */
export function extractRoleValues(
  fields: PortalField[],
  answers: Record<string, AnswerValue>,
): {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
} {
  const byRole: Record<string, string | null> = {
    customer_name: null,
    customer_email: null,
    customer_phone: null,
  };

  for (const field of fields) {
    if (!field.enabled || !field.role) continue;
    if (!(field.role in byRole)) continue;
    const value = answers[field.id];
    if (typeof value === "string" && value.trim()) {
      byRole[field.role] = value.trim();
    }
  }

  return {
    customer_name: byRole.customer_name ?? null,
    customer_email: byRole.customer_email ?? null,
    customer_phone: byRole.customer_phone ?? null,
  };
}
