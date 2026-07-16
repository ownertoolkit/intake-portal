import Link from "next/link";
import { Button } from "@/lib/ui";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          The Owner Toolkit
        </p>
        <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)] leading-[0.98]">
          Customer Intake Portal
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
          A beautifully designed portal for the inquiries that come into your
          business. Create yours in a few minutes.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/setup">
            <Button size="lg">Create My Portal</Button>
          </Link>
          <Link href="/design">
            <Button size="lg" variant="ghost">
              Design Language
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
