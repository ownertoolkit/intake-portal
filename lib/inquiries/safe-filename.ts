/**
 * Convert an arbitrary filename into a filesystem- and URL-safe form. Used
 * when scoping a file inside the private storage bucket under
 * `{inquiry_id}/{safe-filename}`.
 */
export function safeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "file";
  // Split off extension
  const dot = trimmed.lastIndexOf(".");
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const ext = dot > 0 ? trimmed.slice(dot + 1) : "";
  const cleanBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const cleanExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8);
  const safeBase = cleanBase || "file";
  return cleanExt ? `${safeBase}.${cleanExt}` : safeBase;
}
