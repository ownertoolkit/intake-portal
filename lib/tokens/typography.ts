/**
 * Typography tokens.
 *
 * Two families:
 *   sans  — Inter — the workhorse for every UI surface. Excellent legibility
 *           at product sizes, tight letterforms at large sizes.
 *   display — Plus Jakarta Sans — used for editorial brand moments. Setup
 *           wizard hero copy, "Portal created" success state, empty states,
 *           anywhere the app should feel warmer and more distinct.
 *
 * Sizes follow a musical scale (1.125 major second) tuned for restraint.
 * We do not need every step from Tailwind's default scale.
 */

export const fontFamily = {
  sans: "var(--font-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display:
    "var(--font-display), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const;

export const fontSize = {
  xs: { size: "0.75rem", lineHeight: "1rem" },
  sm: { size: "0.8125rem", lineHeight: "1.25rem" },
  base: { size: "0.9375rem", lineHeight: "1.5rem" },
  md: { size: "1rem", lineHeight: "1.5rem" },
  lg: { size: "1.125rem", lineHeight: "1.75rem" },
  xl: { size: "1.25rem", lineHeight: "1.875rem" },
  "2xl": { size: "1.5rem", lineHeight: "2rem" },
  "3xl": { size: "1.875rem", lineHeight: "2.25rem" },
  "4xl": { size: "2.375rem", lineHeight: "2.75rem" },
  "5xl": { size: "3rem", lineHeight: "3.25rem" },
  "6xl": { size: "3.75rem", lineHeight: "4rem" },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const letterSpacing = {
  tighter: "-0.02em",
  tight: "-0.01em",
  normal: "0",
  wide: "0.01em",
  wider: "0.04em",
} as const;

/**
 * Semantic text styles. Reach for these before mixing raw tokens.
 * Each returns a Tailwind class string so consumers can compose freely.
 */
export const textStyle = {
  display: "font-display text-5xl font-semibold tracking-tighter",
  h1: "font-display text-4xl font-semibold tracking-tight",
  h2: "font-display text-3xl font-semibold tracking-tight",
  h3: "font-sans text-xl font-semibold tracking-tight",
  h4: "font-sans text-lg font-semibold",
  body: "font-sans text-base",
  bodyLg: "font-sans text-md",
  bodySm: "font-sans text-sm",
  eyebrow: "font-sans text-xs font-medium uppercase tracking-wider",
  caption: "font-sans text-xs",
} as const;

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  textStyle,
};
