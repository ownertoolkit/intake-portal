"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button, cn } from "@/lib/ui";
import { portalConfig } from "@/lib/portal/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * /login — magic link sign-in for the portal owner.
 *
 * First person to complete this flow becomes the owner (see
 * /auth/callback). Everyone else is signed out with a friendly message.
 */
export default function LoginPage() {
  return (
    <React.Suspense fallback={<main className="min-h-screen bg-[var(--color-surface-canvas)]" />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const initialError = searchParams.get("error");
  const nextUrl = searchParams.get("next") ?? "/dashboard";

  const banner = React.useMemo(() => bannerFor(initialError), [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setErrorMessage("Please enter a valid email.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextUrl);
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo.toString(),
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Could not send the sign-in link.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface-canvas)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)] text-center">
            {portalConfig.businessName}
          </p>
          <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05] text-center">
            Sign in
          </h1>
          <p className="mt-5 text-center text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
            We'll email you a link to open your dashboard.
          </p>

          {banner ? (
            <p
              className={cn(
                "mt-8 rounded-[var(--radius-md)] border px-4 py-3 text-sm",
                "border-[var(--color-semantic-warning)] bg-[var(--color-semantic-warning-subtle)] text-[var(--color-semantic-warning-strong)]",
              )}
            >
              {banner}
            </p>
          ) : null}

          {status === "sent" ? (
            <div className="mt-10 text-center">
              <p className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--color-ink-strong)]">
                Check your inbox.
              </p>
              <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
                A sign-in link is on its way to{" "}
                <span className="font-medium text-[var(--color-ink)]">{email.trim()}</span>.
                Click it to open your dashboard.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-6 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Use a different email
              </button>
            </div>
          ) : (
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
                  className="mt-2 w-full h-12 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-placeholder)] focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20"
                />
              </label>

              {status === "error" && errorMessage ? (
                <p className="text-xs text-[var(--color-semantic-danger-strong)]">
                  {errorMessage}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Send sign-in link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function bannerFor(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "already_claimed":
      return "This portal has already been claimed by another owner. If that's you, sign in from the same email you used the first time.";
    case "exchange_failed":
    case "missing_code":
      return "That sign-in link isn't valid anymore. Send a new one below.";
    case "no_user":
    case "lookup_failed":
    case "claim_failed":
      return "Something went wrong while signing you in. Please try again.";
    default:
      return null;
  }
}
