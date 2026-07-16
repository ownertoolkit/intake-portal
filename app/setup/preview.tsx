"use client";

import * as React from "react";
import { readableTextOn } from "./color-utils";
import type { FormField } from "./form-fields-editor";

/**
 * Portal preview — the live customer-facing view rendered from wizard state.
 *
 * Shown in two frames (browser and phone). Everything updates in real time:
 * business name, logo, primary color, welcome message, and the form fields
 * the owner chose to include (in order, with their custom labels).
 *
 * Button text color is chosen automatically based on WCAG contrast so the
 * owner cannot create an inaccessible portal.
 */

export interface PortalPreviewState {
  businessName: string;
  logoDataUrl: string | null;
  color: string;
  welcomeMessage: string;
  fields: FormField[];
}

const PLACEHOLDER_NAME = "Your business";
const PLACEHOLDER_WELCOME =
  "Tell us a little about your project and we'll be in touch within a business day.";

type Frame = "desktop" | "mobile";

export function PortalPreview({
  state,
  frame,
}: {
  state: PortalPreviewState;
  frame: Frame;
}) {
  return frame === "desktop" ? (
    <DesktopFrame>
      <PortalContent state={state} scale="desktop" />
    </DesktopFrame>
  ) : (
    <MobileFrame>
      <PortalContent state={state} scale="mobile" />
    </MobileFrame>
  );
}

/* -------------------------------- Frames ---------------------------------- */

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[880px] mx-auto rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-lg)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-line-subtle)] bg-[var(--color-surface-sunken)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-neutral-300)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-neutral-300)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-neutral-300)]" />
        <div className="flex-1" />
        <div className="text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface)] rounded-[var(--radius-full)] px-3 py-1 border border-[var(--color-line-subtle)]">
          your-portal.ownertoolkit.co
        </div>
        <div className="flex-1" />
      </div>
      <div className="min-h-[500px]">{children}</div>
    </div>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div className="rounded-[36px] border border-[var(--color-line)] bg-[var(--color-neutral-900)] p-2 shadow-[var(--shadow-lg)]">
        <div className="rounded-[28px] bg-[var(--color-surface)] overflow-hidden">
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-16 rounded-full bg-[var(--color-neutral-200)]" />
          </div>
          <div className="min-h-[520px] max-h-[560px] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Portal content ---------------------------- */

function PortalContent({
  state,
  scale,
}: {
  state: PortalPreviewState;
  scale: Frame;
}) {
  const name = state.businessName.trim() || PLACEHOLDER_NAME;
  const welcome = state.welcomeMessage.trim() || PLACEHOLDER_WELCOME;
  const isPlaceholderName = !state.businessName.trim();
  const isPlaceholderWelcome = !state.welcomeMessage.trim();
  const textOnBrand = readableTextOn(state.color);

  const pad = scale === "desktop" ? "px-16 pt-14 pb-16" : "px-6 pt-8 pb-10";
  const nameSize = scale === "desktop" ? "text-3xl" : "text-xl";
  const welcomeSize = scale === "desktop" ? "text-base" : "text-sm";

  const enabledFields = state.fields.filter((f) => f.enabled);
  const hasFields = enabledFields.length > 0;

  return (
    <div className={pad}>
      {/* Header: logo + business name */}
      <div className="flex flex-col items-center text-center">
        {state.logoDataUrl ? (
          <div className="mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.logoDataUrl}
              alt=""
              className={
                scale === "desktop"
                  ? "h-14 w-auto object-contain"
                  : "h-10 w-auto object-contain"
              }
            />
          </div>
        ) : null}
        <p
          className={`font-display font-semibold tracking-[-0.015em] leading-tight ${nameSize} ${
            isPlaceholderName
              ? "text-[var(--color-ink-placeholder)]"
              : "text-[var(--color-ink-strong)]"
          }`}
        >
          {name}
        </p>
      </div>

      {/* Welcome message */}
      <p
        className={`mt-6 max-w-md mx-auto text-center leading-relaxed ${welcomeSize} ${
          isPlaceholderWelcome
            ? "text-[var(--color-ink-placeholder)]"
            : "text-[var(--color-ink-soft)]"
        }`}
      >
        {welcome}
      </p>

      {/* Form preview */}
      {hasFields ? (
        <div className="mt-10 max-w-md mx-auto space-y-5">
          {enabledFields.map((field) => (
            <PreviewFieldRenderer key={field.id} field={field} brandColor={state.color} />
          ))}
          <div className="pt-2">
            <button
              type="button"
              tabIndex={-1}
              className="w-full h-11 rounded-[var(--radius-md)] text-sm font-medium transition-[background-color] duration-[var(--motion-fast)] ease-[var(--motion-standard)]"
              style={{
                backgroundColor: state.color,
                color: textOnBrand.cssColor,
              }}
            >
              Send inquiry
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-10 max-w-md mx-auto p-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Turn a field on to see it here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Field renderer ------------------------------ */

function PreviewFieldRenderer({
  field,
  brandColor,
}: {
  field: FormField;
  brandColor: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-[var(--color-ink)]">
          {field.label || " "}
        </span>
        {!field.required ? (
          <span className="text-[10px] text-[var(--color-ink-muted)]">Optional</span>
        ) : null}
      </div>
      <PreviewInput field={field} brandColor={brandColor} />
    </div>
  );
}

function PreviewInput({ field, brandColor }: { field: FormField; brandColor: string }) {
  const containerBase =
    "w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 flex items-center text-xs text-[var(--color-ink-placeholder)]";

  switch (field.type) {
    case "long_answer":
      return (
        <div className={`${containerBase} h-20 items-start pt-3`}>
          <span>A paragraph or two…</span>
        </div>
      );
    case "email":
      return (
        <div className={`${containerBase} h-10`}>
          <span>name@company.com</span>
        </div>
      );
    case "phone":
      return (
        <div className={`${containerBase} h-10`}>
          <span>(555) 555-0123</span>
        </div>
      );
    case "date":
      return (
        <div className={`${containerBase} h-10 justify-between`}>
          <span>Select a date</span>
          <CalendarGlyph />
        </div>
      );
    case "dropdown":
      return (
        <div className={`${containerBase} h-10 justify-between`}>
          <span>Choose one…</span>
          <ChevronGlyph />
        </div>
      );
    case "multiple_choice":
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? ["Option 1", "Option 2", "Option 3"]).map((opt, i) => (
            <label
              key={`${field.id}-opt-${i}`}
              className="flex items-center gap-2.5 text-xs text-[var(--color-ink-soft)]"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border"
                style={{
                  borderColor: i === 0 ? brandColor : "var(--color-line-strong)",
                  boxShadow:
                    i === 0
                      ? `inset 0 0 0 3px var(--color-surface), inset 0 0 0 6px ${brandColor}`
                      : "none",
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "file_upload":
      return (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-3.5 py-4 text-center text-xs text-[var(--color-ink-muted)]">
          Drop files or click to upload
        </div>
      );
    case "short_answer":
    default:
      return (
        <div className={`${containerBase} h-10`}>
          <span>Type here…</span>
        </div>
      );
  }
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-3 w-3 text-[var(--color-ink-muted)]"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-3.5 w-3.5 text-[var(--color-ink-muted)]"
      aria-hidden
    >
      <rect x="2.5" y="4" width="11" height="9" rx="1.5" />
      <path d="M5.5 2.5v3M10.5 2.5v3M2.5 7.5h11" strokeLinecap="round" />
    </svg>
  );
}
