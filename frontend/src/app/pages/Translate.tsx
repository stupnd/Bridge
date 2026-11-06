import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Delete, Pause, Play, Space, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import HandDiagram from "../components/HandDiagram";
import FingerBars from "../components/FingerBars";
import { modelLetters, useSignModel, useSmoothedClassification } from "../lib/signModel";

gsap.registerPlugin(useGSAP);

/** How long a letter must be held before it's added to the text. */
const HOLD_MS = 700;

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Translate() {
  const { connected, calibration, bends } = useSensor();
  const model = useSignModel();
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);

  const active = connected && !!calibration && !paused;
  const result = useSmoothedClassification(model, bends, active);
  const current = result.label;
  const runnerUp = result.ranked.find((r) => r.label !== current);
  // Two letters too close to call: show both instead of typing a guess.
  const unsureOf = result.status === "unsure" ? result.ranked.slice(0, 2).map((r) => r.label) : null;

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

  // Display only: the held letter has just been typed and is waiting for a new shape.
  const justTyped = !!current && lastCommitted.current === current;
  const ready = connected && !!calibration;

  // A short ease-out entry whenever the shown reading changes (letter, unsure pair, or none).
  const readingKey = paused ? "paused" : current ?? (unsureOf ? `unsure-${unsureOf.join("")}` : result.status);
  const letterScope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReduced()) return;
      gsap.fromTo(
        ".js-reading",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.22, ease: "power2.out", overwrite: true },
      );
    },
    { scope: letterScope, dependencies: [readingKey] },
  );

  const statusLine = paused
    ? "Paused. Your hand is still shown, but nothing is typed."
    : current
      ? justTyped
        ? "Typed. Change shape, or relax your hand, to type it again."
        : "Hold steady to type it."
      : unsureOf
        ? `Not sure: ${unsureOf.join(" or ")}? Hold the shape more clearly.`
        : result.status === "rest"
          ? "Your hand is relaxed. Make a letter shape."
          : "No letter matches this shape yet.";

  return (
    <Page width="max-w-6xl">
      <PageHeader
        title="Translate"
        description="Fingerspell with the glove. Hold each letter steady to type it."
        action={
          ready && (
            <Button variant={paused ? "primary" : "secondary"} onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              {paused ? "Resume" : "Pause"}
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        {/* The reading: the one thing to glance at while signing */}
        <Card className="order-1">
          <GloveGate what="start translating">
            <div ref={letterScope} className="flex flex-col items-center justify-center py-2 text-center lg:min-h-[22rem]">
              <div aria-live="polite" aria-atomic="true" className="flex w-full flex-col items-center">
                <p className="text-sm font-semibold text-ink-muted">
                  {paused ? "Paused" : unsureOf ? "Two letters are close" : "Reading"}
                </p>

                <div className="mt-2 flex h-[9rem] items-center justify-center sm:h-[11.5rem]">
                  {unsureOf && !paused ? (
                    <div className="js-reading flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed border-warn/45 bg-warn-wash px-6 py-3 sm:gap-6 sm:px-8">
                      <span className="font-display text-[5rem] font-extrabold leading-none text-ink sm:text-[6.5rem]">
                        {unsureOf[0]}
                      </span>
                      <span className="font-display text-heading font-bold text-warn">or</span>
                      <span className="font-display text-[5rem] font-extrabold leading-none text-ink sm:text-[6.5rem]">
                        {unsureOf[1]}
                      </span>
                    </div>
                  ) : current ? (
                    <span className="js-reading font-display text-[8.5rem] font-extrabold leading-none text-ink sm:text-[11rem]">
                      {current}
                    </span>
                  ) : (
                    <span className="js-reading block h-1.5 w-14 rounded-full bg-hairline" aria-hidden />
                  )}
                </div>

                {/* Fixed height so the card doesn't jump as this line comes and goes. */}
                <p className={`mt-4 min-h-[1.5rem] text-sm tabular ${unsureOf && !paused ? "font-semibold text-warn" : "text-ink-muted"}`}>
                  {current && runnerUp && `${Math.round(result.confidence * 100)}% sure, next closest ${runnerUp.label}`}
                  {unsureOf && "Not typing until one letter wins."}
                </p>
              </div>

              {/* Hold-to-type progress */}
              <div className="mt-5 w-full max-w-xs">
                <div className="h-2 w-full overflow-hidden rounded-full bg-wash" aria-hidden>
                  <div
                    className="h-full origin-left rounded-full bg-ink"
                    style={{ transform: `scaleX(${current ? (justTyped ? 1 : holdProgress) : 0})`, opacity: justTyped ? 0.25 : 1 }}
                  />
                </div>
                <p className="mt-2.5 min-h-[2.5rem] text-sm text-ink-muted">{statusLine}</p>
              </div>
            </div>
          </GloveGate>
        </Card>

        {/* Why it read that: the live hand and its five bends */}
        {ready && (
          <Card
            className="order-3 lg:order-2 lg:flex lg:flex-col"
            title="Your hand"
            description="Live from the glove. The letter comes from these five bends."
          >
            <div className="grid items-center gap-6 lg:flex-1 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)]">
              <HandDiagram bends={bends} className="mx-auto w-32 sm:w-36" label="Live view of your hand from the glove" />
              <FingerBars bends={bends} compact />
            </div>
          </Card>
        )}

        {/* The typed text */}
        <Card className="order-2 lg:order-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-heading text-ink">Text</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setText((t) => t + " ")} aria-label="Add space">
                <Space className="h-4 w-4" aria-hidden /> Space
              </Button>
              <Button variant="secondary" onClick={() => setText((t) => t.slice(0, -1))} disabled={!text} aria-label="Delete last letter">
                <Delete className="h-4 w-4" aria-hidden /> Delete
              </Button>
              <Button variant="ghost" onClick={() => setText("")} disabled={!text}>
                <X className="h-4 w-4" aria-hidden /> Clear
              </Button>
            </div>
          </div>
          <div className="mt-4 min-h-[7.5rem] rounded-[var(--radius-control)] bg-wash px-4 py-4 sm:px-5">
            <p
              className={`whitespace-pre-wrap break-words font-display text-[2rem] font-semibold leading-tight tracking-wide sm:text-[2.5rem] ${
                text ? "text-ink" : "text-ink-faint"
              }`}
            >
              {text || "Letters you sign appear here"}
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-6 max-w-3xl text-sm text-ink-muted">
        Recognizes{" "}
        <span className="font-semibold text-ink">{modelLetters(model).join(" ")}</span>, learned from recorded samples.
        Letters with similar finger bends (like E, S and T) are easy to mix up.{" "}
        <Link to="/app/lab" className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
          Test the model in the Lab <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    </Page>
  );
}
