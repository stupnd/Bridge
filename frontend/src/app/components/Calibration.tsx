/** The open-hand / fist calibration flow, shared by the Glove and Collect pages. */
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import HandDiagram from "./HandDiagram";
import type { FlexCalibration } from "../lib/imu";

gsap.registerPlugin(useGSAP);

type Step = "idle" | "open" | "open_hold" | "closed" | "closed_hold";

const COUNTDOWN_S = 3;
const SAMPLES = 15;
const SAMPLE_INTERVAL_MS = 100;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCalibration() {
  const { fingersRef, saveCalibration } = useSensor();
  const [step, setStep] = useState<Step>("idle");
  const [countdown, setCountdown] = useState(0);

  async function average(): Promise<number[]> {
    const readings: number[][] = [];
    for (let i = 0; i < SAMPLES; i++) {
      readings.push([...fingersRef.current]);
      await wait(SAMPLE_INTERVAL_MS);
    }
    return readings[0].map((_, f) => Math.round(readings.reduce((s, r) => s + r[f], 0) / readings.length));
  }

  async function count() {
    for (let i = COUNTDOWN_S; i > 0; i--) {
      setCountdown(i);
      await wait(1000);
    }
  }

  /** Runs both poses, saves the result app-wide, and returns it. */
  async function run(): Promise<FlexCalibration> {
    setStep("open");
    await count();
    setStep("open_hold");
    const open = await average();
    setStep("closed");
    await count();
    setStep("closed_hold");
    const closed = await average();
    setStep("idle");
    const c = { open, closed };
    saveCalibration(c);
    return c;
  }

  return { run, step, countdown, running: step !== "idle" };
}

/** The two poses calibration records, drawn rather than described. */
export const OPEN_HAND = [0, 0, 0, 0, 0];
export const FIST = [1, 1, 1, 1, 1];

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Big, glanceable instruction while calibration runs. Renders nothing when idle. */
export function CalibrationPrompt({ step, countdown }: { step: Step; countdown: number }) {
  const root = useRef<HTMLDivElement>(null);
  const open = step === "open" || step === "open_hold";
  const holding = step.endsWith("_hold");

  // Each new count number lands softly; while holding, a thin ink line fills
  // over the sampling window so the wait has a visible end.
  useGSAP(
    () => {
      if (step === "idle" || prefersReduced()) return;
      if (holding) {
        gsap.fromTo(
          ".calib-hold",
          { scaleX: 0 },
          { scaleX: 1, duration: (SAMPLES * SAMPLE_INTERVAL_MS) / 1000, ease: "none" },
        );
      } else {
        gsap.fromTo(".calib-count", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" });
      }
    },
    { scope: root, dependencies: [step, countdown], revertOnUpdate: true },
  );

  if (step === "idle") return null;

  const poses = [
    { key: "open", bends: OPEN_HAND, title: "Spread your hand open", short: "Open hand", active: open, done: !open },
    { key: "fist", bends: FIST, title: "Make a fist", short: "Fist", active: !open, done: false },
  ];
  const current = poses[open ? 0 : 1];

  return (
    <div
      ref={root}
      className="rounded-[var(--radius-card)] border border-hairline bg-ground p-5 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex shrink-0 items-end gap-3" aria-hidden>
          {poses.map((p) => (
            <figure
              key={p.key}
              className={`flex flex-col items-center rounded-[var(--radius-control)] border px-2 pt-2 pb-1.5 transition-[opacity,border-color,background-color] duration-[240ms] ease-out ${
                p.active ? "border-ink bg-surface opacity-100" : "border-transparent opacity-40"
              }`}
            >
              <HandDiagram bends={p.bends} className={p.active ? "w-24 sm:w-28" : "w-16 sm:w-20"} />
              <figcaption className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink">
                {p.done && <Check className="h-3.5 w-3.5 text-ok" aria-hidden />}
                {p.short}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm text-ink-muted">Step {open ? 1 : 2} of 2</p>
          <p className="mt-0.5 font-display text-heading font-bold text-ink">{current.title}</p>
          {holding ? (
            <div className="mt-3">
              <p className="font-display text-[2.75rem] font-extrabold leading-none text-ink">Hold still</p>
              <div className="mt-4 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-wash sm:max-w-64 mx-auto sm:mx-0">
                <div className="calib-hold h-full w-full origin-left rounded-full bg-ink" />
              </div>
              <p className="mt-2 text-sm text-ink-muted">Reading your sensors…</p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="calib-count font-display text-[4.5rem] font-extrabold leading-none text-ink tabular">{countdown}</p>
              <p className="mt-2 text-sm text-ink-muted">
                {open ? "Keep every finger straight until the count ends." : "Fold every finger in, thumb over the top."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
