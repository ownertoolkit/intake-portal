"use client";

import * as React from "react";
import { Button, cn } from "@/lib/ui";
import { portalConfig } from "@/lib/portal/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "loading" | "signup" | "signin";

/**
 * /login — email + password sign-in for the portal owner.
 *
 * On mount, asks the server whether this portal has an owner yet:
 *   - No owner  → "Create your owner account" form. First-signup-wins.
 *   - Has owner → "Sign in" form. Password only; if credentials don't
 *                 belong to the owner, we sign them right back out.
 *   - You are the owner (already signed in) → straight to /dashboard.
 */
export default function LoginPage() {
  const [mode, setMode] = React.useState<Mode>("loading");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setMode("signup"); // conservative fallback
          return;
        }
        const { hasOwner, isOwner } = (await res.json()) as {
          hasOwner: boolean;
          isOwner: boolean;
        };
        if (cancelled) return;
        if (isOwner) {
          window.location.href = "/dashboard";
          return;
        }
        setMode(hasOwner ? "signin" : "signup");
      } catch {
        if (!cancelled) setMode("signup");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(body.error ?? "Could not create your account.");
          setBusy(false);
          return;
        }
        window.location.href = "/dashboard";
        return;
      }

      // signin
      const supabase = createSupabaseBrowserClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setError(friendlySignInError(signInErr.message));
        setBusy(false);
        return;
      }

      // Verify the signed-in user is actually the owner of THIS portal.
      // (Someone could technically hold a valid Supabase login for a
      // different email; we don't want to leak the "logged in but not
      // authorized" state past this point.)
      const statusRes = await fetch("/api/auth/status", { cache: "no-store" });
      const status = (await statusRes.json().catch(() => ({ isOwner: false }))) as {
        isOwner?: boolean;
      };
      if (!status.isOwner) {
        await supabase.auth.signOut();
        setError(
          "That account isn't the owner of this portal. Sign in with the email you originally created the portal with.",
        );
        setBusy(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  if (mode === "loading") {
    return <main className="min-h-screen bg-[var(--color-surface-canvas)]" />;
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)] text-center">
            {portalConfig.businessName}
          </p>
          <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05] text-center">
            {mode === "signup" ? "Claim your portal" : "Sign in"}
          </h1>
          <p className="mt-5 text-center text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
            {mode === "signup"
              ? "Create the owner account. Whoever completes this first becomes the permanent owner of this portal."
              : "Sign in to your inquiry dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-ink-strong)]">
                Email
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full h-12 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--color-ink-strong)]">
                Password
              </span>
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 10 : undefined}
                className="mt-2 w-full h-12 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20"
              />
              {mode === "signup" ? (
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  At least 10 characters. A password manager is a good idea.
                </p>
              ) : null}
            </label>

            {error ? (
              <p
                className={cn(
                  "rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm",
                  "border-[var(--color-semantic-danger)] bg-[var(--color-semantic-danger-subtle)] text-[var(--color-semantic-danger-strong)]",
                )}
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy
                ? mode === "signup"
                  ? "Creating your account…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create owner account"
                  : "Sign in"}
            </Button>
          </form>

          {mode === "signin" ? (
            <p className="mt-6 text-center text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Lost your password? Contact the person who set this portal up for you.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function friendlySignInError(message: string): string {
  if (/Invalid login credentials/i.test(message)) {
    return "That email and password don't match. Try again.";
  }
  if (/Email not confirmed/i.test(message)) {
    return "This account hasn't been confirmed yet. Check your inbox.";
  }
  return message || "Could not sign in. Please try again.";
}
