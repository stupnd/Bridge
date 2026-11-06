/**
 * Guided recording for the Lab: walks through every static letter, captures
 * the wearer's own handshape for each, and offers to train the model on them.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { ALPHABET, getLetter, targetBends } from "../lib/asl";
import { captureFrames } from "../lib/captureFrames";
import { rawToBendNormalized } from "../lib/flexCalibrationStorage";
import { leaveOneOut, REST_LABEL, Sample, setModel, SignModel } from "../lib/signModel";
import { Button, Card, GloveGate } from "./common";
import HandDiagram from "./HandDiagram";

const STATIC_LETTERS = ALPHABET.filter((l) => !l.movement).map((l) => l.letter);
const READY_S = 2;
const HOLD_MS = 1000;

type Phase = "setup" | "running" | "review";
type Step = { label: string; rep: number };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TeachHand() {
  const { subscribe, calibration, bends } = useSensor();
  const [phase, setPhase] = useState<Phase>("setup");
  const [reps, setReps] = useState(2);
  const [withRest, setWithRest] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [captured, setCaptured] = useState<Sample[]>([]);
  const [msg, setMsg] = useState("");
  const stop = useRef(false);
  const skip = useRef(false);

  // Leaving the page ends a recording in progress.
  useEffect(() => () => {
    stop.current = true;
  }, []);

  async function run() {
    if (!calibration) return;
    const labels = withRest ? [...STATIC_LETTERS, REST_LABEL] : STATIC_LETTERS;
    // Go through the whole alphabet once per rep, so reps aren't back to back.
    const plan = Array.from({ length: reps }, (_, r) => labels.map((label) => ({ label, rep: r + 1 }))).flat();
    setSteps(plan);
    setCaptured([]);
    setMsg("");
    stop.current = false;
    setPhase("running");

    const got: Sample[] = [];
    for (let i = 0; i < plan.length && !stop.current; i++) {
      setIndex(i);
      setProgress(0);
      skip.current = false;
      for (let s = READY_S; s > 0 && !skip.current && !stop.current; s--) {
        setCountdown(s);
        await wait(1000);
      }
      setCountdown(0);
      if (skip.current || stop.current) continue;
      const { frames } = await captureFrames(subscribe, HOLD_MS, setProgress);
      if (skip.current || stop.current) continue;
      if (!frames.length) {
        setMsg("No data from the glove: is it still connected?");
        break;
      }
      const avg = [0, 1, 2, 3, 4].map(
        (f) =>
          frames.reduce((sum, fr) => sum + rawToBendNormalized(fr.fingers[f], calibration.open[f], calibration.closed[f]), 0) /
          frames.length
      );
      got.push({ label: plan[i].label, bends: avg });
      setCaptured([...got]);
    }
    setPhase("review");
  }

  function finish(mode: "replace" | "add") {
    setModel((m) => ({ ...m, samples: mode === "replace" ? captured : [...m.samples, ...captured] }));
    setMsg(`${mode === "replace" ? "The model now uses only your" : "Added your"} ${captured.length} samples.`);
    setCaptured([]);
    setPhase("setup");
  }

  const step = steps[index];
  const letter = step && step.label !== REST_LABEL ? getLetter(step.label) : undefined;
  const ownCheck = captured.length ? leaveOneOut({ samples: captured, maxDistance: Infinity, minConfidence: 0 } as SignModel) : null;

  return (
    <Card
      title="Teach it your hand"
      description="Records your own version of every letter without movement. Everyone's hand and fit is different, so this is the quickest way to make recognition work for you."
    >
      <GloveGate what="record your handshapes">
        {phase === "setup" && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              Rounds
              <select
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="tabular h-11 rounded-[var(--radius-control)] border border-[#cfcac1] bg-surface px-3 text-base font-normal text-ink transition-colors duration-150 hover:border-ink sm:h-10 sm:text-sm"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={withRest} onChange={(e) => setWithRest(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--ink)]" />
              Include a relaxed "Rest" hand
            </label>
            <Button onClick={run}>Start</Button>
            <span className="tabular text-sm text-ink-muted">
              About {Math.ceil(((STATIC_LETTERS.length + (withRest ? 1 : 0)) * reps * (READY_S + HOLD_MS / 1000)) / 60)} min
            </span>
            {msg && <p className="w-full text-sm text-ok" aria-live="polite">{msg}</p>}
          </div>
        )}

        {phase === "running" && step && (
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_auto] md:gap-8">
            <div aria-live="polite">
              <p className="tabular text-sm text-ink-muted">
                {index + 1} of {steps.length} · round {step.rep}
              </p>
              <p className="mt-1 font-display text-[4.5rem] font-extrabold leading-none text-ink">{step.label === REST_LABEL ? "Rest" : step.label}</p>
              <p className="mt-3 max-w-md text-lead text-ink">{letter?.shape ?? "Let your hand relax naturally, the way it sits between letters."}</p>
              <p className="tabular mt-4 text-sm font-semibold">
                {countdown > 0 ? <span className="text-ink-muted">Get ready… {countdown}</span> : <span className="text-ok">Hold still</span>}
              </p>
              <div className="mt-2 h-2 w-48 max-w-full overflow-hidden rounded-full bg-wash" aria-hidden>
                <div className="h-full origin-left rounded-full bg-ok" style={{ transform: `scaleX(${progress})` }} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="max-sm:h-11" onClick={() => (skip.current = true)}>Skip</Button>
                <Button variant="ghost" size="sm" className="max-sm:h-11" onClick={() => (stop.current = true)}>Stop</Button>
              </div>
            </div>
            {letter && (
              <figure className="rounded-[var(--radius-card)] bg-ground p-3 text-center">
                <HandDiagram bends={targetBends(letter.fingers)} muted={letter.fingers.map((f) => f === null)} className="mx-auto w-24 sm:w-28" label={`Target for ${letter.letter}`} />
                <figcaption className="mt-1 text-sm text-ink-muted">Target</figcaption>
              </figure>
            )}
            <figure className="rounded-[var(--radius-card)] bg-ground p-3 text-center">
              <HandDiagram bends={bends} className="mx-auto w-24 sm:w-28" label="Your hand" />
              <figcaption className="mt-1 text-sm text-ink-muted">You</figcaption>
            </figure>
          </div>
        )}

        {phase === "review" && (
          <div>
            <p className="tabular text-ink">
              Recorded {captured.length} sample{captured.length === 1 ? "" : "s"}.
              {ownCheck && ` Checked against each other, ${ownCheck.correct} of ${ownCheck.tested} are recognized (${Math.round((ownCheck.correct / ownCheck.tested) * 100)}%).`}
            </p>
            {msg && <p className="mt-1 text-sm text-warn" aria-live="polite">{msg}</p>}
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {captured.map((s, i) => (
                <li key={i} className="flex items-center gap-1 rounded-[var(--radius-control)] border border-hairline bg-ground pl-3 text-sm">
                  <span className="font-display text-base font-bold text-ink">{s.label === REST_LABEL ? "Rest" : s.label}</span>
                  <button
                    onClick={() => setCaptured((c) => c.filter((_, k) => k !== i))}
                    aria-label={`Remove this ${s.label} sample`}
                    className="flex h-11 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink sm:h-9 sm:w-8"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-muted">Remove any you flubbed, then choose how to use them.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => finish("replace")} disabled={!captured.length}>Use only my samples</Button>
              <Button variant="secondary" onClick={() => finish("add")} disabled={!captured.length}>Add to current samples</Button>
              <Button variant="ghost" onClick={() => { setCaptured([]); setMsg(""); setPhase("setup"); }}>Discard</Button>
            </div>
          </div>
        )}
      </GloveGate>
    </Card>
  );
}
