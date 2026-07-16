/**
 * Password strength validation for the owner account.
 *
 * Deliberately not draconian. Research shows complex-character requirements
 * lead to weaker passwords in practice (people tack a "1!" on the end).
 * We enforce meaningful length and block the very obvious guesses instead.
 */

const MIN_PASSWORD_LENGTH = 10;

// A very small blocklist of the most common weak passwords. This is not
// a security control on its own; Supabase rate-limits login attempts.
const OBVIOUSLY_WEAK = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty1234",
  "qwertyuiop",
  "letmein123",
  "welcome1234",
  "abc12345",
  "admin1234",
  "hunter2000",
]);

export function validatePassword(pw: string): { ok: true } | { ok: false; message: string } {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (OBVIOUSLY_WEAK.has(pw.toLowerCase())) {
    return {
      ok: false,
      message: "That password is too common. Pick something less guessable.",
    };
  }
  return { ok: true };
}

export function validateEmail(email: string): { ok: true } | { ok: false; message: string } {
  const trimmed = email.trim();
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (trimmed.length > 320) {
    return { ok: false, message: "That email is too long." };
  }
  return { ok: true };
}
