/**
 * Color tokens for the Owner Toolkit design system.
 *
 * Neutrals: a warm gray scale (12 steps) that anchors every screen.
 * Ink: text tones from strong headings to soft placeholder text.
 * Surface: backgrounds, from page canvas to elevated cards.
 * Line: borders and dividers, calibrated soft.
 * Accent: the platform's own default brand color, used when a portal's
 *   custom color is not in scope (dashboard chrome, focus rings, links).
 * Semantic: success / warning / danger / info — each with a subtle background
 *   variant for badges and a strong variant for icons and text.
 *
 * All values are HSL so consumers can define CSS custom properties that
 * Tailwind v4 can resolve at build time.
 */

export const neutral = {
  0: "hsl(0 0% 100%)",
  25: "hsl(30 20% 99%)",
  50: "hsl(30 12% 97%)",
  100: "hsl(30 8% 94%)",
  200: "hsl(30 6% 88%)",
  300: "hsl(30 5% 80%)",
  400: "hsl(30 4% 62%)",
  500: "hsl(30 4% 46%)",
  600: "hsl(30 5% 34%)",
  700: "hsl(30 6% 24%)",
  800: "hsl(30 7% 16%)",
  900: "hsl(30 8% 10%)",
  1000: "hsl(30 10% 6%)",
} as const;

export const ink = {
  strong: neutral[900],
  DEFAULT: neutral[800],
  soft: neutral[600],
  muted: neutral[500],
  placeholder: neutral[400],
  inverse: neutral[0],
} as const;

export const surface = {
  canvas: neutral[25],
  DEFAULT: neutral[0],
  raised: neutral[0],
  sunken: neutral[50],
  overlay: "hsl(30 10% 6% / 0.48)",
} as const;

export const line = {
  subtle: neutral[100],
  DEFAULT: neutral[200],
  strong: neutral[300],
  focus: "hsl(220 90% 56%)",
} as const;

/**
 * Platform accent — a considered blue-black used for the Owner Toolkit's own
 * chrome. Not the customer portal color. Portal color is chosen per-portal
 * by the owner in the setup wizard.
 */
export const accent = {
  50: "hsl(220 40% 97%)",
  100: "hsl(220 40% 93%)",
  200: "hsl(220 32% 84%)",
  300: "hsl(220 28% 70%)",
  400: "hsl(220 24% 52%)",
  500: "hsl(220 32% 36%)",
  600: "hsl(220 40% 26%)",
  700: "hsl(220 48% 18%)",
  800: "hsl(220 52% 12%)",
  900: "hsl(220 56% 8%)",
} as const;

export const semantic = {
  success: {
    subtle: "hsl(152 60% 96%)",
    DEFAULT: "hsl(152 60% 36%)",
    strong: "hsl(152 68% 24%)",
  },
  warning: {
    subtle: "hsl(38 92% 96%)",
    DEFAULT: "hsl(30 88% 44%)",
    strong: "hsl(24 84% 32%)",
  },
  danger: {
    subtle: "hsl(4 82% 97%)",
    DEFAULT: "hsl(4 74% 52%)",
    strong: "hsl(4 74% 38%)",
  },
  info: {
    subtle: "hsl(210 90% 97%)",
    DEFAULT: "hsl(210 82% 48%)",
    strong: "hsl(210 82% 34%)",
  },
} as const;

/**
 * Curated portal color palette — six primaries an owner picks from in the
 * setup wizard. Chosen for their versatility across customer-facing forms:
 * readable on light backgrounds, calm at scale, unmistakably considered.
 * Custom colors will be an advanced option later.
 *
 * Six is the discipline. Do not extend without an equally considered reason.
 */
export const portalPalette = [
  { name: "Black", value: "hsl(30 8% 10%)" },
  { name: "Navy", value: "hsl(220 52% 22%)" },
  { name: "Forest", value: "hsl(158 42% 22%)" },
  { name: "Plum", value: "hsl(320 34% 26%)" },
  { name: "Clay", value: "hsl(18 32% 38%)" },
  { name: "Olive", value: "hsl(72 22% 30%)" },
] as const;

export type PortalColorName = (typeof portalPalette)[number]["name"];

export const colors = {
  neutral,
  ink,
  surface,
  line,
  accent,
  semantic,
  portalPalette,
};
