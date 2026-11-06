/** Shared building blocks so every page uses the same buttons, cards and headings. */
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { Bluetooth, SlidersHorizontal } from "lucide-react";
import { useSensor } from "../context/SensorContext";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-title text-ink">{title}</h1>
        {description && <p className="mt-2 text-lead text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Page({ children, width = "max-w-5xl" }: { children: ReactNode; width?: string }) {
  return <div className={`${width} mx-auto px-4 pt-8 pb-28 sm:px-6 md:pt-12 md:pb-16`}>{children}</div>;
}

export function Card({ title, description, action, children, className = "" }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-display text-heading text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#33313d] active:bg-ink",
  secondary: "bg-surface text-ink border border-[#cfcac1] hover:border-ink",
  ghost: "text-ink-muted hover:text-ink hover:bg-wash",
  danger: "bg-surface text-danger border border-[#f1c4bf] hover:bg-danger-wash",
};
const SIZES = { sm: "h-11 px-3 text-sm md:h-9", md: "h-11 px-4 text-[0.95rem]", lg: "h-12 px-6 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZES = "md", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
}) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

/** Reports a real state only (connected, calibrated, motion sensor). */
export function StatusDot({ tone }: { tone: "ok" | "warn" | "off" }) {
  const color = { ok: "bg-ok", warn: "bg-caution", off: "bg-ink-faint" }[tone];
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

/**
 * Shown in place of glove-dependent content. Covers the two things every
 * glove feature needs: a connection, then a calibration.
 */
export function GloveGate({ children, needsCalibration = true, what }: {
  children: ReactNode;
  needsCalibration?: boolean;
  /** e.g. "see live translation" */
  what: string;
}) {
  const { connected, connect, calibration } = useSensor();
  if (!connected) {
    return (
      <EmptyState
        icon={<Bluetooth className="h-5 w-5" />}
        title="Connect your glove"
        body={`Connect the glove over Bluetooth to ${what}. Works in Chrome or Edge on a computer.`}
        action={<Button onClick={connect}>Connect glove</Button>}
      />
    );
  }
  if (needsCalibration && !calibration) {
    return (
      <EmptyState
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title="Calibrate first"
        body="Calibration records your open hand and your fist, so every bend reads 0 to 100% for you. It takes about 10 seconds."
        action={<Link to="/app/glove" className={buttonClass()}>Go to calibration</Link>}
      />
    );
  }
  return <>{children}</>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {icon && <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-wash text-ink">{icon}</div>}
      <p className="font-display text-heading text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
