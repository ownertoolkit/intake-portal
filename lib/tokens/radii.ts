/**
 * Border radii.
 *
 * The default radius across the app is `md` (10px) — softer than most
 * design systems, calibrated to feel premium without going pill-shaped.
 * Reserve `full` for pills and avatars, `xl`+ for large decorative surfaces.
 */

export const radii = {
  none: "0px",
  xs: "4px",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  "2xl": "28px",
  "3xl": "36px",
  full: "9999px",
} as const;
