"use client";

import * as React from "react";
import Link from "next/link";
import { HexColorPicker } from "react-colorful";
import { portalPalette } from "@/lib/tokens";
import { Button, Field, Input, Textarea, cn } from "@/lib/ui";
import { PortalPreview } from "./preview";
import {
  DEFAULT_FIELDS,
  FormFieldsEditor,
  type FormField,
} from "./form-fields-editor";
import {
  isValidHex,
  normalizeHex,
  parseColor,
  readableTextOn,
} from "./color-utils";
import { savePortalConfig } from "../portal/config";

/* -------------------------------------------------------------------------- */
/*                                    State                                   */
/* -------------------------------------------------------------------------- */

const TOTAL_STEPS = 5;

type Status = "editing" | "publishing" | "published";

interface WizardState {
  step: number;
  status: Status;
  businessName: string;
  logoDataUrl: string | null;
  color: string;
  fields: FormField[];
  welcomeMessage: string;
}

const DEFAULT_STATE: WizardState = {
  step: 1,
  status: "editing",
  businessName: "",
  logoDataUrl: null,
  color: portalPalette[0].value,
  fields: DEFAULT_FIELDS,
  welcomeMessage: "",
};

const DEFAULT_WELCOME_MESSAGE =
  "Tell us a little about your project and we'll be in touch within a business day.";

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function SetupWizardPage() {
  const [state, setState] = React.useState<WizardState>(DEFAULT_STATE);

  if (state.status === "publishing") {
    return <PublishingScreen />;
  }

  if (state.status === "published") {
    return <PublishedScreen state={state} />;
  }

  return <EditingLayout state={state} setState={setState} />;
}

/* -------------------------------------------------------------------------- */
/*                                Editing view                                */
/* -------------------------------------------------------------------------- */

function EditingLayout({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const [frame, setFrame] = React.useState<"desktop" | "mobile">("desktop");

  const goNext = () => {
    if (state.step < TOTAL_STEPS) {
      setState({ ...state, step: state.step + 1 });
    } else {
      // Persist to localStorage so /portal can render the real customer view.
      // Becomes a Supabase insert when the backend comes online.
      savePortalConfig({
        businessName: state.businessName,
        logoDataUrl: state.logoDataUrl,
        color: state.color,
        welcomeMessage: state.welcomeMessage.trim() || DEFAULT_WELCOME_MESSAGE,
        fields: state.fields,
        publishedAt: new Date().toISOString(),
      });
      setState({ ...state, status: "publishing" });
      window.setTimeout(() => {
        setState((s) => ({ ...s, status: "published" }));
      }, 1600);
    }
  };
  const goBack = () => {
    if (state.step > 1) setState({ ...state, step: state.step - 1 });
  };

  const canContinue = isStepValid(state);
  const isLastStep = state.step === TOTAL_STEPS;
  const isWide = state.step === 4; // form-fields step gets a roomier column

  return (
    <div
      className={cn(
        "min-h-screen grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        isWide && "md:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]",
      )}
    >
      {/* ------------ Wizard column ------------ */}
      <div className="flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-line-subtle)]">
        <TopBar />

        <div className="flex-1 flex flex-col justify-center px-10 md:px-16 py-14">
          <div className={cn("w-full", isWide ? "max-w-2xl" : "max-w-md")}>
            <StepEyebrow current={state.step} total={TOTAL_STEPS} />
            <div className="mt-6">
              <StepContent state={state} setState={setState} />
            </div>
          </div>
        </div>

        <div className="px-10 md:px-16 pb-10 pt-6 border-t border-[var(--color-line-subtle)] flex items-center justify-between">
          {state.step > 1 ? (
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button size="lg" onClick={goNext} disabled={!canContinue}>
            {isLastStep ? "Publish Portal" : "Continue"}
          </Button>
        </div>
      </div>

      {/* ------------ Preview column ------------ */}
      <div className="hidden md:flex flex-col bg-[var(--color-surface-canvas)]">
        <div className="flex items-center justify-between px-12 pt-10 pb-6">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Live preview
          </p>
          <FrameToggle frame={frame} onChange={setFrame} />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 pb-16">
          <PortalPreview
            state={{
              businessName: state.businessName,
              logoDataUrl: state.logoDataUrl,
              color: state.color,
              welcomeMessage: state.welcomeMessage,
              fields: state.fields,
            }}
            frame={frame}
          />
        </div>
      </div>
    </div>
  );
}

function isStepValid(state: WizardState): boolean {
  switch (state.step) {
    case 1:
      return state.businessName.trim().length > 0;
    case 2:
      return true; // logo optional
    case 3:
      return Boolean(state.color) && parseColor(state.color) !== null;
    case 4:
      return state.fields.some((f) => f.enabled); // at least one field must be on
    case 5:
      return true; // welcome optional
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Top bar                                    */
/* -------------------------------------------------------------------------- */

function TopBar() {
  return (
    <div className="flex items-center justify-between px-10 md:px-16 py-6 border-b border-[var(--color-line-subtle)]">
      <Link
        href="/"
        className="font-sans text-xs font-medium tracking-wide text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
      >
        The Owner Toolkit
      </Link>
      <span className="text-xs font-mono text-[var(--color-ink-muted)]">
        Customer Intake Portal
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Step eyebrow                               */
/* -------------------------------------------------------------------------- */

function StepEyebrow({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        Step {current} of {total}
      </span>
      <div
        className="flex-1 h-px bg-[var(--color-line)] max-w-[240px] overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full bg-[var(--color-ink-strong)] transition-all duration-[var(--motion-slow)] ease-[var(--motion-standard)]"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Frame toggle                                */
/* -------------------------------------------------------------------------- */

function FrameToggle({
  frame,
  onChange,
}: {
  frame: "desktop" | "mobile";
  onChange: (f: "desktop" | "mobile") => void;
}) {
  return (
    <div className="inline-flex items-center p-1 rounded-[var(--radius-full)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <FrameOption
        active={frame === "desktop"}
        onClick={() => onChange("desktop")}
        label="Desktop"
      >
        <DesktopIcon />
      </FrameOption>
      <FrameOption
        active={frame === "mobile"}
        onClick={() => onChange("mobile")}
        label="Phone"
      >
        <PhoneIcon />
      </FrameOption>
    </div>
  );
}

function FrameOption({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-8 w-8 rounded-[var(--radius-full)] flex items-center justify-center transition-colors duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
        active
          ? "bg-[var(--color-ink-strong)] text-[var(--color-ink-inverse)]"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
    </button>
  );
}

function DesktopIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M6 13.5h4" />
      <path d="M8 11v2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="5" y="2" width="6" height="12" rx="1.5" />
      <path d="M7.25 12h1.5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Step content                                */
/* -------------------------------------------------------------------------- */

function StepContent({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  switch (state.step) {
    case 1:
      return (
        <StepShell
          title="Let's create your portal."
          description="First, what should customers see at the top?"
        >
          <Field htmlFor="business-name" label="Business name">
            <Input
              id="business-name"
              autoFocus
              placeholder="e.g. True Glow Cleaning"
              value={state.businessName}
              onChange={(e) => setState({ ...state, businessName: e.target.value })}
            />
          </Field>
        </StepShell>
      );

    case 2:
      return (
        <StepShell
          title="Add your logo."
          description="It'll sit above your business name. You can add or change it later."
        >
          <LogoUploader
            dataUrl={state.logoDataUrl}
            onChange={(url) => setState({ ...state, logoDataUrl: url })}
          />
        </StepShell>
      );

    case 3:
      return (
        <StepShell
          title="Choose your color."
          description="This is the primary color customers see on your portal — buttons, focus states, small brand accents."
        >
          <ColorStep
            color={state.color}
            onChange={(color) => setState({ ...state, color })}
          />
        </StepShell>
      );

    case 4:
      return (
        <StepShell
          title="Choose what you want to ask."
          description="These are the questions customers answer when they get in touch. Rename them, drag to reorder, mark what's required, or turn off anything you don't need."
        >
          <FormFieldsEditor
            fields={state.fields}
            onChange={(fields) => setState({ ...state, fields })}
          />
        </StepShell>
      );

    case 5:
      return (
        <StepShell
          title="Write a welcome message."
          description="The first thing customers read. Warm and short works best."
        >
          <Field
            htmlFor="welcome-message"
            label="Welcome message"
            optional
            hint={
              state.welcomeMessage.trim()
                ? undefined
                : "Leave blank and we'll use a good default."
            }
          >
            <Textarea
              id="welcome-message"
              rows={4}
              placeholder={DEFAULT_WELCOME_MESSAGE}
              value={state.welcomeMessage}
              onChange={(e) =>
                setState({ ...state, welcomeMessage: e.target.value })
              }
            />
          </Field>
        </StepShell>
      );

    default:
      return null;
  }
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.05]">
        {title}
      </h1>
      <p className="mt-4 text-base text-[var(--color-ink-soft)] leading-relaxed max-w-md">
        {description}
      </p>
      <div className="mt-10">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Color step                                */
/* -------------------------------------------------------------------------- */

function ColorStep({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const paletteMatch = React.useMemo(
    () => portalPalette.find((c) => c.value === color) ?? null,
    [color],
  );
  const isCustom = paletteMatch === null;

  // Custom hex input: keep the string form separate so users can type freely.
  const initialHex = React.useMemo(() => {
    if (color.startsWith("#")) return normalizeHex(color);
    return "#7b1f2a";
  }, [color]);
  const [customHex, setCustomHex] = React.useState<string>(initialHex);
  const [hexInput, setHexInput] = React.useState<string>(initialHex);

  React.useEffect(() => {
    if (color.startsWith("#")) {
      setCustomHex(normalizeHex(color));
      setHexInput(normalizeHex(color));
    }
  }, [color]);

  const commitHex = (raw: string) => {
    if (isValidHex(raw)) {
      const clean = normalizeHex(raw);
      setCustomHex(clean);
      onChange(clean);
    }
  };

  const textForBrand = readableTextOn(color);

  return (
    <div className="space-y-10">
      {/* Quick choices */}
      <div>
        <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)] mb-4">
          Quick choices
        </p>
        <div
          className="grid grid-cols-3 gap-4"
          role="radiogroup"
          aria-label="Portal color"
        >
          {portalPalette.map((c) => {
            const isSelected = c.value === color;
            return (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(c.value)}
                className={cn(
                  "group flex flex-col items-center gap-3 rounded-[var(--radius-lg)] p-3 -m-1 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
                )}
              >
                <span
                  className={cn(
                    "relative block aspect-square w-full rounded-[var(--radius-xl)] transition-transform duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
                    isSelected ? "" : "group-hover:scale-[0.98]",
                  )}
                  style={{
                    background: c.value,
                    boxShadow: isSelected
                      ? `0 0 0 3px var(--color-surface), 0 0 0 5px var(--color-ink-strong)`
                      : "inset 0 0 0 1px var(--color-line-subtle)",
                  }}
                >
                  {isSelected ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <CheckIcon />
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected
                      ? "text-[var(--color-ink-strong)]"
                      : "text-[var(--color-ink-soft)]",
                  )}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom brand color */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Use your brand color
          </p>
          {isCustom ? (
            <span className="text-[11px] text-[var(--color-ink-muted)]">Selected</span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[auto_1fr] items-start">
          <div className="w-full max-w-[200px] color-picker-frame">
            <HexColorPicker
              color={customHex}
              onChange={(c) => {
                setCustomHex(c);
                setHexInput(c);
                onChange(c);
              }}
            />
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <Field htmlFor="hex-input" label="Hex code">
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-[var(--radius-xs)] border border-[var(--color-line-subtle)]"
                  style={{
                    backgroundColor: isValidHex(hexInput) ? normalizeHex(hexInput) : "transparent",
                  }}
                  aria-hidden
                />
                <input
                  id="hex-input"
                  type="text"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="w-full bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line)] rounded-[var(--radius-md)] pl-11 pr-3 h-11 text-sm font-mono tracking-wider focus-visible:outline-none focus-visible:border-[var(--color-line-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/20"
                  value={hexInput}
                  onChange={(e) => {
                    setHexInput(e.target.value);
                    commitHex(e.target.value);
                  }}
                  onBlur={() => {
                    if (isValidHex(hexInput)) {
                      setHexInput(normalizeHex(hexInput));
                    } else {
                      setHexInput(customHex);
                    }
                  }}
                />
              </div>
            </Field>

            {/* Small live sample */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-canvas)] p-4 space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Applied to
              </p>
              <button
                type="button"
                tabIndex={-1}
                className="w-full h-10 rounded-[var(--radius-md)] text-sm font-medium"
                style={{
                  backgroundColor: color,
                  color: textForBrand.cssColor,
                }}
              >
                Send inquiry
              </button>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-sm underline decoration-2 underline-offset-4"
                  style={{ color, textDecorationColor: color }}
                >
                  A link in your color
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-ink-muted)] pt-1">
                We'll automatically use {textForBrand.onLight ? "dark" : "white"} text
                so your buttons stay readable
                {textForBrand.onLight
                  ? " when the brand color is pale."
                  : "."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles for react-colorful — override to match the design language */}
      <style>{`
        .color-picker-frame .react-colorful {
          width: 100%;
          height: 180px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: inset 0 0 0 1px var(--color-line-subtle);
        }
        .color-picker-frame .react-colorful__saturation {
          border-radius: 0;
          border-bottom: 1px solid var(--color-line-subtle);
        }
        .color-picker-frame .react-colorful__hue {
          height: 14px;
        }
        .color-picker-frame .react-colorful__pointer {
          width: 16px;
          height: 16px;
          border-width: 2px;
        }
      `}</style>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <path d="M5 12.5l4 4L19 7" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Logo uploader                               */
/* -------------------------------------------------------------------------- */

function LogoUploader({
  dataUrl,
  onChange,
}: {
  dataUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (dataUrl) {
    return (
      <div className="flex items-center gap-5 p-5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="h-16 w-16 rounded-[var(--radius-md)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-canvas)] flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="" className="max-h-14 max-w-14 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink-strong)]">
            Logo ready
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Shown centered above your business name.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center text-center cursor-pointer",
          "border border-dashed rounded-[var(--radius-lg)] px-6 py-14",
          "transition-colors duration-[var(--motion-fast)] ease-[var(--motion-standard)]",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-line-focus)]/24",
          isDragging
            ? "border-[var(--color-line-focus)] bg-[var(--color-surface)]"
            : "border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)]",
        )}
      >
        <UploadIcon />
        <p className="mt-4 text-sm font-medium text-[var(--color-ink)]">
          Drop a logo, or click to browse
        </p>
        <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
          PNG or SVG. Square works best.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
        Don't have one handy? You can skip this step and add a logo later.
      </p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-[var(--color-ink-muted)]"
      aria-hidden
    >
      <path d="M12 15V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Publishing screen                             */
/* -------------------------------------------------------------------------- */

function PublishingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="text-center">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          The Owner Toolkit
        </p>
        <p className="mt-8 font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-ink-strong)] leading-[1.1] publishing-pulse">
          Building your portal…
        </p>
      </div>
      <style>{`
        @keyframes portalPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .publishing-pulse {
          animation: portalPulse 1.6s var(--motion-standard) infinite;
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Published screen                              */
/* -------------------------------------------------------------------------- */

function PublishedScreen({ state }: { state: WizardState }) {
  const welcomeMessage = state.welcomeMessage.trim() || DEFAULT_WELCOME_MESSAGE;
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 flex flex-col items-center px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Portal created
          </p>
          <h1 className="mt-6 font-display text-5xl md:text-6xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)] leading-[0.98]">
            Your portal is live.
          </h1>
          <p className="mt-6 text-base text-[var(--color-ink-soft)] leading-relaxed max-w-lg mx-auto">
            Share the link with a customer and see what they see. You can
            change anything about it at any time.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/portal" target="_blank" rel="noopener">
              <Button size="lg">Open Portal</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                Open Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 w-full flex items-center justify-center">
          <PortalPreview
            state={{
              businessName: state.businessName,
              logoDataUrl: state.logoDataUrl,
              color: state.color,
              welcomeMessage,
              fields: state.fields,
            }}
            frame="desktop"
          />
        </div>
      </div>
    </div>
  );
}
