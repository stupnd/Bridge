import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, X } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import HandDiagram from "../components/HandDiagram";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { FINGERS } from "../lib/fingers";
import { ALPHABET, FINGER_NAMES, Letter, fingerHint, fingerMatches, getLetter, targetBends } from "../lib/asl";
import { isLearned, letterProgress, recordPractice, recordQuiz, useLearnProgress } from "../lib/learnProgress";
import { nearestSample, useSignModel, useSmoothedClassification } from "../lib/signModel";

gsap.registerPlugin(useGSAP);

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Tab = "alphabet" | "practice" | "quiz";
const TABS: { id: Tab; label: string }[] = [
  { id: "alphabet", label: "Alphabet" },
  { id: "practice", label: "Practice with glove" },
  { id: "quiz", label: "Quiz" },
];

export default function Learn() {
  const [tab, setTab] = useState<Tab>("alphabet");
  const [practiceLetter, setPracticeLetter] = useState("A");
  const progress = useLearnProgress();
  const learned = ALPHABET.filter((l) => isLearned(letterProgress(progress, l.letter))).length;

  function practice(letter: string) {
    setPracticeLetter(letter);
    setTab("practice");
  }

  return (
    <Page width="max-w-5xl">
      <PageHeader
        title="Learn"
        description="The ASL fingerspelling alphabet. Study each handshape, then practice it with the glove or quiz yourself."
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Learn mode" className="flex rounded-[calc(var(--radius-control)+4px)] bg-wash p-1 sm:inline-flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-colors duration-150 sm:flex-none sm:px-4 ${
                tab === t.id ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--hairline)]" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="tabular">
            <span className="font-semibold text-ink">{learned}</span> of {ALPHABET.length} learned
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-wash sm:w-36 sm:flex-none" aria-hidden>
            <div
              className="h-full origin-left rounded-full bg-ok transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${learned / ALPHABET.length})` }}
            />
          </div>
        </div>
      </div>

      {tab === "alphabet" && <AlphabetTab onPractice={practice} />}
      {tab === "practice" && <PracticeTab letter={practiceLetter} onLetter={setPracticeLetter} />}
      {tab === "quiz" && <QuizTab />}
    </Page>
  );
}

// ── Alphabet ────────────────────────────────────────────────────────────────

function AlphabetTab({ onPractice }: { onPractice: (letter: string) => void }) {
  const progress = useLearnProgress();
  const [open, setOpen] = useState<Letter | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  // Tiles settle in once when the tab opens (transform and opacity only).
  useGSAP(
    () => {
      if (prefersReduced()) return;
      gsap.from("[data-tile]", { opacity: 0, y: 8, duration: 0.3, ease: "power2.out", stagger: 0.012, clearProps: "all" });
    },
    { scope: grid }
  );

  return (
    <>
      <div ref={grid} className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {ALPHABET.map((l) => {
          const done = isLearned(letterProgress(progress, l.letter));
          return (
            <button
              key={l.letter}
              data-tile
              onClick={() => setOpen(l)}
              className="group relative flex aspect-[5/6] flex-col rounded-[var(--radius-card)] border border-hairline bg-surface p-3 text-left transition-colors duration-150 hover:border-ink"
              aria-label={`Letter ${l.letter}${l.movement ? ", moving letter" : ""}${done ? ", learned" : ""}`}
            >
              <span className="flex items-start justify-between gap-1">
                <span className="font-display text-[1.75rem] font-bold leading-none text-ink">{l.letter}</span>
                {done ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ok-wash text-ok" aria-hidden>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : l.movement ? (
                  <span className="rounded-full bg-wash px-2 py-0.5 text-xs font-semibold text-ink-muted">moves</span>
                ) : null}
              </span>
              <HandDiagram bends={targetBends(l.fingers)} muted={l.fingers.map((f) => f === null)} className="mx-auto mt-1 w-[86%] flex-1" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="gap-5 sm:max-w-md">
          {open && (
            <>
              <div className="flex items-center gap-6 pr-10">
                <span className="font-display text-[5.5rem] font-extrabold leading-none text-ink" aria-hidden>
                  {open.letter}
                </span>
                <HandDiagram
                  bends={targetBends(open.fingers)}
                  muted={open.fingers.map((f) => f === null)}
                  className="w-28 sm:w-32"
                  label={`Hand diagram for ${open.letter}`}
                />
              </div>
              <DialogTitle className="sr-only">Letter {open.letter}</DialogTitle>
              <DialogDescription className="text-base text-ink">{open.shape}</DialogDescription>
              {open.tip && <Tip text={open.tip} />}
              <FingerChecklist letter={open} />
              {open.lookalikes.length > 0 && (
                <p className="text-sm text-ink-muted">
                  To the glove's finger sensors this looks like {open.lookalikes.join(", ")}. The
                  difference is in {open.movement ? "the movement" : "thumb placement or hand angle"}.
                </p>
              )}
              <Button size="lg" onClick={() => { onPractice(open.letter); setOpen(null); }}>
                Practice {open.letter} with the glove
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tip({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`rounded-[var(--radius-control)] bg-wash px-3 py-2 text-sm text-ink ${className}`}>
      <span className="font-semibold">Tip: </span>
      {text}
    </p>
  );
}

/** What each finger does for this letter, each one marked in its own ink. */
function FingerChecklist({ letter }: { letter: Letter }) {
  return (
    <ul className="grid grid-cols-5 gap-1.5 text-center text-xs" aria-label="Each finger">
      {FINGER_NAMES.map((name, i) => (
        <li key={name} className="rounded-[var(--radius-control)] bg-ground px-1 pb-2">
          <span className="mx-auto block h-1 w-8 rounded-b-full" style={{ background: FINGERS[i].color }} aria-hidden />
          <span className="mt-1.5 block text-ink-muted">{name}</span>
          <span className="font-semibold text-ink">{letter.fingers[i] ?? "any"}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Practice ────────────────────────────────────────────────────────────────

/** How long the correct handshape must be held to count. */
const PRACTICE_HOLD_MS = 1000;
/** How far (0–1) a finger can be from the recorded sample before it gets a hint. */
const FINGER_TOLERANCE = 0.2;

function sampleHint(target: number, bend: number, name: string): string | null {
  const n = name.toLowerCase();
  if (bend - target > FINGER_TOLERANCE) return `Straighten your ${n} a little`;
  if (target - bend > FINGER_TOLERANCE) return `Bend your ${n} more`;
  return null;
}

function PracticeTab({ letter, onLetter }: { letter: string; onLetter: (l: string) => void }) {
  const { bends, connected, calibration } = useSensor();
  const progress = useLearnProgress();
  const model = useSignModel();
  const target = getLetter(letter)!;
  // Letters with recorded samples are checked by the same model Translate uses.
  // Others (J and Z, which move) fall back to the finger description.
  const sample = nearestSample(model, letter, bends);
  const result = useSmoothedClassification(model, bends, connected && !!calibration);
  const predicted = result.label;
  const closest = result.ranked[0]?.label;
  const ok = sample
    ? sample.bends.map((b, i) => Math.abs(bends[i] - b) <= FINGER_TOLERANCE)
    : target.fingers.map((s, i) => fingerMatches(s, bends[i]));
  const allOk = connected && !!calibration && (sample ? predicted === letter : ok.every(Boolean));
  const [hold, setHold] = useState(0);
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const successFor = useRef<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuccess(false);
    successFor.current = null;
  }, [letter]);

  // Fill the hold bar while the shape is right; count it once per letter attempt.
  useEffect(() => {
    setHold(0);
    if (!allOk || successFor.current === letter) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / PRACTICE_HOLD_MS);
      setHold(p);
      if (p < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        successFor.current = letter;
        setSuccess(true);
        recordPractice(letter);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [allOk, letter, attempt]);

  // The success mark arrives with a short ease-out (no bounce).
  useGSAP(
    () => {
      if (!success || prefersReduced()) return;
      gsap.from("[data-success-mark]", { scale: 0.85, opacity: 0, duration: 0.28, ease: "power2.out" });
      gsap.from("[data-success-body]", { y: 6, opacity: 0, duration: 0.28, delay: 0.06, ease: "power2.out" });
    },
    { scope: successRef, dependencies: [success] }
  );

  const index = ALPHABET.findIndex((l) => l.letter === letter);
  const next = ALPHABET[(index + 1) % ALPHABET.length].letter;
  // Each hint keeps the finger it is about, so it can be marked in that finger's ink.
  const hints: { finger: number | null; text: string }[] = (
    sample
      ? sample.bends.map((b, i) => sampleHint(b, bends[i], FINGER_NAMES[i]))
      : target.fingers.map((s, i) => fingerHint(s, bends[i], FINGER_NAMES[i]))
  )
    .map((text, finger) => ({ finger: finger as number | null, text }))
    .filter((h): h is { finger: number | null; text: string } => !!h.text);
  // Every finger is close, but the model still prefers a lookalike.
  if (sample && !hints.length && predicted !== letter && closest) {
    hints.push({
      finger: null,
      text:
        closest === letter
          ? `Almost: it could also be ${result.ranked[1]?.label}. Hold the shape more clearly.`
          : `Close! It reads as ${closest}. Check your thumb.`,
    });
  }

  return (
    <div className="space-y-6">
      <LetterPicker selected={letter} onSelect={onLetter} progress={progress} />

      <div className="grid gap-5 md:grid-cols-2">
        <Card title={`Make the letter ${letter}`}>
          <div className="flex items-center gap-6">
            <span className="font-display text-[5.5rem] font-extrabold leading-none text-ink" aria-hidden>
              {letter}
            </span>
            <HandDiagram
              bends={targetBends(target.fingers)}
              muted={target.fingers.map((f) => f === null)}
              className="w-28 sm:w-32"
              label={`Target handshape for ${letter}`}
            />
          </div>
          <p className="mt-5 text-ink">{target.shape}</p>
          {target.tip && <Tip text={target.tip} className="mt-3" />}
          {sample ? (
            target.lookalikes.length > 0 && (
              <p className="mt-4 text-sm text-ink-muted">
                Easy to mix up with {target.lookalikes.join(", ")}: the finger bends are nearly the same.
              </p>
            )
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              No recorded samples for {letter} yet, so the glove checks finger bends only
              {target.movement ? ", not the movement" : ""}.
            </p>
          )}
        </Card>

        <Card title="Your hand">
          <GloveGate what="check your handshape">
            {success ? (
              <div ref={successRef} className="flex flex-col items-center py-8 text-center" role="status">
                <span data-success-mark className="flex h-16 w-16 items-center justify-center rounded-full bg-ok-wash text-ok">
                  <Check className="h-8 w-8" strokeWidth={2.75} aria-hidden />
                </span>
                <div data-success-body>
                  <p className="mt-4 font-display text-heading text-ink">That's {letter}!</p>
                  <p className="mt-1 text-sm text-ink-muted">Saved to your progress.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" onClick={() => { setSuccess(false); successFor.current = null; setAttempt((a) => a + 1); }}>
                      Try again
                    </Button>
                    <Button onClick={() => onLetter(next)}>Next: {next}</Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <HandDiagram bends={bends} highlight={ok.map((v) => !v)} className="w-36 sm:w-40" label="Your hand right now" />
                </div>
                <div className="mt-4 min-h-[4.25rem]" aria-live="polite">
                  {allOk ? (
                    <p className="text-center font-display text-heading text-ok">Hold it…</p>
                  ) : (
                    <ul className="mx-auto max-w-xs space-y-2">
                      {hints.slice(0, 2).map((h) => (
                        <li key={h.text} className="flex items-center gap-3 text-ink">
                          {h.finger !== null ? (
                            <span className="h-3.5 w-1.5 shrink-0 rounded-full" style={{ background: FINGERS[h.finger].color }} aria-hidden />
                          ) : (
                            <span className="h-3.5 w-1.5 shrink-0 rounded-full bg-hairline" aria-hidden />
                          )}
                          <span>{h.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mx-auto mt-3 max-w-xs">
                  <div className="h-2 overflow-hidden rounded-full bg-wash" aria-hidden>
                    <div className="h-full origin-left rounded-full bg-ok" style={{ transform: `scaleX(${hold})` }} />
                  </div>
                  <p className="mt-2 text-center text-xs text-ink-muted">Hold the shape for a second to count it.</p>
                </div>
              </>
            )}
          </GloveGate>
        </Card>
      </div>
    </div>
  );
}

function LetterPicker({ selected, onSelect, progress }: {
  selected: string;
  onSelect: (l: string) => void;
  progress: ReturnType<typeof useLearnProgress>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a letter">
      {ALPHABET.map((l) => {
        const done = isLearned(letterProgress(progress, l.letter));
        return (
          <button
            key={l.letter}
            onClick={() => onSelect(l.letter)}
            aria-pressed={selected === l.letter}
            aria-label={`${l.letter}${done ? ", learned" : ""}`}
            className={`h-11 w-11 rounded-[var(--radius-control)] font-display text-base font-bold transition-colors duration-150 md:h-10 md:w-10 ${
              selected === l.letter
                ? "bg-ink text-white"
                : done
                  ? "bg-ok-wash text-ok hover:shadow-[inset_0_0_0_1px_var(--ok)]"
                  : "border border-hairline bg-surface text-ink hover:border-ink"
            }`}
          >
            {l.letter}
          </button>
        );
      })}
    </div>
  );
}

// ── Quiz ────────────────────────────────────────────────────────────────────

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

function newQuestion(previous?: string) {
  const pool = ALPHABET.filter((l) => l.letter !== previous);
  const answer = pool[Math.floor(Math.random() * pool.length)];
  // Wrong options never include lookalikes: the diagram alone couldn't separate them.
  const wrong = shuffle(
    ALPHABET.filter((l) => l.letter !== answer.letter && !answer.lookalikes.includes(l.letter))
  ).slice(0, 3);
  return { answer, options: shuffle([answer, ...wrong]).map((l) => l.letter) };
}

function QuizTab() {
  const [q, setQ] = useState(() => newQuestion());
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const correct = picked === q.answer.letter;

  function pick(letter: string) {
    if (picked) return;
    setPicked(letter);
    const right = letter === q.answer.letter;
    recordQuiz(q.answer.letter, right);
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    setQ(newQuestion(q.answer.letter));
    setPicked(null);
  }

  return (
    <Card
      title="Which letter is this?"
      description="No glove needed."
      action={score.total > 0 && <span className="tabular text-sm font-semibold text-ink">{score.right} / {score.total} correct</span>}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-[var(--radius-card)] bg-ground p-4">
          <HandDiagram bends={targetBends(q.answer.fingers)} muted={q.answer.fingers.map((f) => f === null)} className="w-32 sm:w-36" label="Mystery handshape" />
        </div>
        <p className="max-w-md text-lead text-ink">{q.answer.shape.replace(new RegExp(`\\b${q.answer.letter}\\b`, "g"), "___")}</p>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
        {q.options.map((letter) => {
          const isAnswer = letter === q.answer.letter;
          const style = !picked
            ? "border-hairline bg-surface text-ink hover:border-ink"
            : isAnswer
              ? "border-ok bg-ok-wash text-ok"
              : letter === picked
                ? "border-danger bg-danger-wash text-danger"
                : "border-hairline bg-surface text-ink opacity-45";
          return (
            <button
              key={letter}
              onClick={() => pick(letter)}
              disabled={!!picked}
              className={`relative min-h-16 rounded-[var(--radius-card)] border-2 py-4 font-display text-3xl font-bold transition-colors duration-150 ${style}`}
            >
              {letter}
              {picked && isAnswer && <Check className="absolute top-1.5 right-1.5 h-4 w-4" strokeWidth={3} aria-hidden />}
              {picked && !isAnswer && letter === picked && <X className="absolute top-1.5 right-1.5 h-4 w-4" strokeWidth={3} aria-hidden />}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-5 flex items-center justify-between gap-4" aria-live="polite">
          <p className={`font-semibold ${correct ? "text-ok" : "text-danger"}`}>
            {correct ? "Correct!" : `Not quite. That was ${q.answer.letter}.`}
          </p>
          <Button onClick={next} autoFocus>Next</Button>
        </div>
      )}
    </Card>
  );
}
