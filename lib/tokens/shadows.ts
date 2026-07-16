/**
 * Shadow tokens — restrained by design.
 *
 * The aesthetic leans on borders and whitespace far more than shadows.
 * These exist for genuine elevation (slide-overs, dropdowns, toasts)
 * and should not be sprinkled on cards for decoration.
 */

export const shadows = {
  none: "none",
  xs: "0 1px 2px 0 hsl(30 8% 10% / 0.04)",
  sm: "0 1px 3px 0 hsl(30 8% 10% / 0.05), 0 1px 2px -1px hsl(30 8% 10% / 0.05)",
  md: "0 4px 6px -1px hsl(30 8% 10% / 0.06), 0 2px 4px -2px hsl(30 8% 10% / 0.05)",
  lg: "0 10px 15px -3px hsl(30 8% 10% / 0.07), 0 4px 6px -4px hsl(30 8% 10% / 0.05)",
  xl: "0 20px 25px -5px hsl(30 8% 10% / 0.08), 0 8px 10px -6px hsl(30 8% 10% / 0.05)",
  focus: "0 0 0 3px hsl(220 90% 56% / 0.24)",
} as const;
