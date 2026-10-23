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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Rounds
              <select
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={withRest} onChange={(e) => setWithRest(e.target.checked)} className="accent-indigo-600" />
              Include a relaxed "Rest" hand
            </label>
            <Button onClick={run}>Start</Button>
            <span className="text-xs text-gray-500">
              About {Math.ceil(((STATIC_LETTERS.length + (withRest ? 1 : 0)) * reps * (READY_S + HOLD_MS / 1000)) / 60)} min
            </span>
            {msg && <p className="w-full text-sm text-green-700">{msg}</p>}
          </div>
        )}

        {phase === "running" && step && (
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_auto]">
            <div aria-live="polite">
              <p className="text-sm text-gray-500 tabular-nums">
                {index + 1} of {steps.length} · round {step.rep}
              </p>
              <p className="mt-1 text-6xl font-semibold text-indigo-600">{step.label === REST_LABEL ? "Rest" : step.label}</p>
              <p className="mt-2 text-gray-800">{letter?.shape ?? "Let your hand relax naturally, the way it sits between letters."}</p>
              <p className="mt-3 text-sm font-medium tabular-nums">
                {countdown > 0 ? <span className="text-gray-600">Get ready… {countdown}</span> : <span className="text-green-700">Hold still</span>}
              </p>
              <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                <div className="h-full bg-green-500" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => (skip.current = true)}>Skip</Button>
                <Button variant="ghost" size="sm" onClick={() => (stop.current = true)}>Stop</Button>
              </div>
            </div>
            {letter && (
              <figure className="text-center">
                <HandDiagram bends={targetBends(letter.fingers)} muted={letter.fingers.map((f) => f === null)} className="w-24" label={`Target for ${letter.letter}`} />
                <figcaption className="text-xs text-gray-500">Target</figcaption>
              </figure>
            )}
            <figure className="text-center">
              <HandDiagram bends={bends} className="w-24" label="Your hand" />
              <figcaption className="text-xs text-gray-500">You</figcaption>
            </figure>
          </div>
        )}

        {phase === "review" && (
          <div>
            <p className="text-gray-900">
              Recorded {captured.length} sample{captured.length === 1 ? "" : "s"}.
              {ownCheck && ` Checked against each other, ${ownCheck.correct} of ${ownCheck.tested} are recognized (${Math.round((ownCheck.correct / ownCheck.tested) * 100)}%).`}
            </p>
            {msg && <p className="mt-1 text-sm text-amber-700">{msg}</p>}
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {captured.map((s, i) => (
                <li key={i} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 text-sm">
                  <span className="font-semibold text-gray-800">{s.label === REST_LABEL ? "Rest" : s.label}</span>
                  <button
                    onClick={() => setCaptured((c) => c.filter((_, k) => k !== i))}
                    aria-label={`Remove this ${s.label} sample`}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-500">Remove any you flubbed, then choose how to use them.</p>
            <div className="mt-4 flex flex-wrap gap-2">
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
