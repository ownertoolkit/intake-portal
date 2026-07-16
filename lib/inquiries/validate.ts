import type { PortalField } from "@/lib/portal/config";

export type AnswerValue = string | string[] | null;

export interface FilePlaceholder {
  filename: string;
  contentType: string;
  size: number;
}

export interface RawSubmission {
  answers: Record<string, unknown>;
  files: Record<string, FilePlaceholder[]>; // keyed by field id
}

export interface ValidationError {
  fieldId: string;
  message: string;
}

export interface ValidatedSubmission {
  answers: Record<string, AnswerValue>;
  files: Record<string, FilePlaceholder[]>;
}

const MAX_SHORT = 500;
const MAX_LONG = 10_000;
const MAX_FILES_PER_FIELD = 10;

/**
 * Validate a raw submission against the current portal.config.ts.
 *
 * Rules:
 *   - Only fields that are enabled in the config are accepted; anything
 *     else is silently ignored.
 *   - Required fields must have a non-empty value.
 *   - Emails must look like emails.
 *   - Multiple-choice / dropdown values must match a declared option.
 *   - File uploads carry per-file metadata; actual upload happens after
 *     insert via signed URLs.
 */
export function validateSubmission(
  fields: PortalField[],
  raw: RawSubmission,
): { ok: true; data: ValidatedSubmission } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const cleanedAnswers: Record<string, AnswerValue> = {};
  const cleanedFiles: Record<string, FilePlaceholder[]> = {};

  for (const field of fields) {
    if (!field.enabled) continue;

    if (field.type === "file_upload") {
      const files = raw.files[field.id] ?? [];
      if (field.required && files.length === 0) {
        errors.push({ fieldId: field.id, message: "Please attach at least one file." });
        continue;
      }
      if (files.length > MAX_FILES_PER_FIELD) {
        errors.push({
          fieldId: field.id,
          message: `Please attach no more than ${MAX_FILES_PER_FIELD} files.`,
        });
        continue;
      }
      cleanedFiles[field.id] = files;
      continue;
    }

    const raw_value = raw.answers[field.id];
    const value = typeof raw_value === "string" ? raw_value.trim() : "";

    if (field.required && !value) {
      errors.push({ fieldId: field.id, message: "Please answer this." });
      continue;
    }

    if (!value) {
      cleanedAnswers[field.id] = null;
      continue;
    }

    switch (field.type) {
      case "email":
        if (!/^\S+@\S+\.\S+$/.test(value)) {
          errors.push({
            fieldId: field.id,
            message: "That doesn't look like a valid email.",
          });
        } else if (value.length > MAX_SHORT) {
          errors.push({ fieldId: field.id, message: "That's a very long email." });
        } else {
          cleanedAnswers[field.id] = value;
        }
        break;

      case "long_answer":
        if (value.length > MAX_LONG) {
          errors.push({ fieldId: field.id, message: "That's too long." });
        } else {
          cleanedAnswers[field.id] = value;
        }
        break;

      case "multiple_choice":
      case "dropdown": {
        const options = field.options ?? [];
        if (!options.includes(value)) {
          errors.push({
            fieldId: field.id,
            message: "Please pick one of the listed options.",
          });
        } else {
          cleanedAnswers[field.id] = value;
        }
        break;
      }

      case "date":
        // Accept ISO date; reject anything else.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          errors.push({ fieldId: field.id, message: "Please pick a valid date." });
        } else {
          cleanedAnswers[field.id] = value;
        }
        break;

      case "phone":
      case "short_answer":
      default:
        if (value.length > MAX_SHORT) {
          errors.push({ fieldId: field.id, message: "That's too long." });
        } else {
          cleanedAnswers[field.id] = value;
        }
        break;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { answers: cleanedAnswers, files: cleanedFiles } };
}
