/**
 * Color helpers for the setup wizard.
 *
 * Accepts either an `hsl(h s% l%)` string (from the curated palette) or a
 * `#rrggbb` hex string (from the custom picker) and computes the readable
 * text color for that background using WCAG relative luminance.
 *
 * Owner Toolkit rule: an owner cannot create an inaccessible portal. If the
 * chosen brand color would render white button text at contrast < 4.5:1,
 * we automatically use dark ink instead. The owner never has to think about
 * accessibility.
 */

type Rgb = { r: number; g: number; b: number };

const WHITE = "hsl(0 0% 100%)";
const INK = "hsl(30 8% 10%)"; // matches --color-neutral-900

/* -------------------------------- Parsing --------------------------------- */

export function parseHex(input: string): Rgb | null {
  const s = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(s)) return null;
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

export function isValidHex(input: string): boolean {
  return parseHex(input) !== null;
}

export function normalizeHex(input: string): string {
  const s = input.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return `#${full}`;
}

function parseHsl(input: string): Rgb | null {
  // Accepts "hsl(220 52% 22%)" (modern space-separated syntax).
  const m = input.match(
    /^hsl\(\s*([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)%(?:\s*\/\s*[^)]+)?\s*\)$/i,
  );
  if (!m) return null;
  const h = parseFloat(m[1]!) / 360;
  const s = parseFloat(m[2]!) / 100;
  const l = parseFloat(m[3]!) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

export function parseColor(input: string): Rgb | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (trimmed.startsWith("hsl")) return parseHsl(trimmed);
  return null;
}

/* --------------------------------- WCAG ---------------------------------- */

function toLinear(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };
const INK_RGB: Rgb = { r: 25, g: 24, b: 23 }; // approximation of --color-neutral-900

/**
 * Pick the readable text color for a given background. Prefers white for
 * darker brands; falls back to ink for pale brands so a pastel doesn't
 * produce unreadable buttons.
 */
export function readableTextOn(bg: string): {
  cssColor: string;
  onLight: boolean; // true = ink text, false = white text
  contrast: number;
} {
  const rgb = parseColor(bg);
  if (!rgb) {
    return { cssColor: WHITE, onLight: false, contrast: 1 };
  }
  const whiteContrast = contrastRatio(rgb, WHITE_RGB);
  const inkContrast = contrastRatio(rgb, INK_RGB);
  if (whiteContrast >= 4.5) {
    return { cssColor: WHITE, onLight: false, contrast: whiteContrast };
  }
  return { cssColor: INK, onLight: true, contrast: inkContrast };
}
