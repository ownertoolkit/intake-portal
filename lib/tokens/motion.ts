/**
 * Motion tokens — quiet, precise, never bouncy.
 *
 * Durations run short (120–260ms). Easings favor `standard` for most UI
 * transitions and `emphasized` for entering elements (modals, toasts).
 */

export const duration = {
  instant: "80ms",
  fast: "140ms",
  base: "180ms",
  slow: "240ms",
  slower: "320ms",
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.3, 0, 0, 1)",
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const;

export const motion = { duration, easing };
