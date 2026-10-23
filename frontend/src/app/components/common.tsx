/** Small shared building blocks so every page uses the same buttons, cards and headings. */
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { Bluetooth, SlidersHorizontal } from "lucide-react";
import { useSensor } from "../context/SensorContext";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-gray-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Page({ children, width = "max-w-4xl" }: { children: ReactNode; width?: string }) {
  return <div className={`${width} mx-auto p-6 pb-28 md:pb-10`}>{children}</div>;
}

export function Card({ title, description, action, children, className = "" }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
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
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100",
  danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    />
  );
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "off" }) {
  const color = { ok: "bg-green-500", warn: "bg-amber-400", off: "bg-gray-300" }[tone];
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} aria-hidden />;
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
        icon={<Bluetooth className="w-6 h-6 text-indigo-600" />}
        title="Connect your glove"
        body={`Connect the glove over Bluetooth to ${what}.`}
        action={<Button onClick={connect}>Connect glove</Button>}
      />
    );
  }
  if (needsCalibration && !calibration) {
    return (
      <EmptyState
        icon={<SlidersHorizontal className="w-6 h-6 text-indigo-600" />}
        title="Calibrate first"
        body="Calibration teaches the app what your open hand and fist look like. It takes about 10 seconds."
        action={
          <Link to="/app/glove" className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Go to calibration
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      {icon && <div className="mb-3 w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">{icon}</div>}
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
