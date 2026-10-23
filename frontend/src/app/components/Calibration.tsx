/** The open-hand / fist calibration flow, shared by the Glove and Collect pages. */
import { useState } from "react";
import { useSensor } from "../context/SensorContext";
import type { FlexCalibration } from "../lib/imu";

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

/** Big, glanceable instruction while calibration runs. Renders nothing when idle. */
export function CalibrationPrompt({ step, countdown }: { step: Step; countdown: number }) {
  if (step === "idle") return null;
  const open = step === "open" || step === "open_hold";
  const holding = step.endsWith("_hold");
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center" role="status" aria-live="polite">
      <p className="text-4xl" aria-hidden>{open ? "🖐️" : "✊"}</p>
      <p className="mt-2 font-semibold text-indigo-900">
        {open ? "Spread your hand open" : "Make a fist"}
        <span className="ml-2 text-sm font-normal text-indigo-600">Step {open ? 1 : 2} of 2</span>
      </p>
      {holding ? (
        <p className="mt-2 text-sm text-indigo-700">Hold still…</p>
      ) : (
        <p className="mt-2 text-4xl font-bold text-indigo-600 tabular-nums">{countdown}</p>
      )}
    </div>
  );
}
