import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Delete, Pause, Play, Space } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import { classify, modelLetters, useSignModel } from "../lib/signModel";

/** How long a letter must be held before it's added to the text. */
const HOLD_MS = 700;

export default function Translate() {
  const { connected, calibration, bends } = useSensor();
  const model = useSignModel();
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);

  const active = connected && !!calibration && !paused;
  const result = active ? classify(model, bends) : null;
  const current = result?.label ?? null;
  const runnerUp = result?.ranked.find((r) => r.label !== current);

  // A letter is committed once it's held for HOLD_MS. To type it twice, change
  // to another shape (or relax your hand) in between.
  const lastCommitted = useRef<string | null>(null);
  useEffect(() => {
    if (current !== lastCommitted.current) lastCommitted.current = null;
    setHoldProgress(0);
    if (!current || current === lastCommitted.current) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / HOLD_MS);
      setHoldProgress(p);
      if (p < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setText((t) => t + current);
        lastCommitted.current = current;
        setHoldProgress(0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [current]);

  return (
    <Page>
      <PageHeader
        title="Translate"
        description="Fingerspell with the glove. Hold each letter steady to type it."
        action={
          connected && calibration && (
            <Button variant="secondary" onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <GloveGate what="start translating">
            <div className="flex flex-col items-center py-6" aria-live="polite">
              <p className="text-sm text-gray-500">{paused ? "Paused" : "Current sign"}</p>
              <p className={`mt-2 text-8xl font-semibold tabular-nums ${current ? "text-indigo-600" : "text-gray-200"}`}>
                {current ?? "–"}
              </p>
              <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                <div className="h-full bg-indigo-500" style={{ width: `${holdProgress * 100}%` }} />
              </div>
              {current && runnerUp && (
                <p className="mt-3 text-xs text-gray-500 tabular-nums">
                  {Math.round(result!.confidence * 100)}% sure · next closest {runnerUp.label}
                </p>
              )}
            </div>
          </GloveGate>
        </Card>

        <Card
          title="Text"
          action={
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setText((t) => t + " ")} aria-label="Add space">
                <Space className="w-4 h-4" /> Space
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setText((t) => t.slice(0, -1))} disabled={!text} aria-label="Delete last letter">
                <Delete className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
                Clear
              </Button>
            </div>
          }
        >
          <p className={`min-h-[3rem] break-words text-3xl tracking-wide ${text ? "text-gray-900" : "text-gray-300"}`}>
            {text || "Letters you sign appear here"}
          </p>
        </Card>

        <p className="text-sm text-gray-500">
          Recognizes{" "}
          <span className="font-medium text-gray-700">{modelLetters(model).join(" ")}</span>, learned
          from recorded samples. Letters with similar finger bends (like E, S and T) are easy to
          mix up.{" "}
          <Link to="/app/lab" className="text-indigo-600 hover:underline">Test the model in the Lab →</Link>
        </p>
      </div>
    </Page>
  );
}
