import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import HandDiagram from "../components/HandDiagram";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { ALPHABET, FINGER_NAMES, Letter, fingerHint, fingerMatches, getLetter, targetBends } from "../lib/asl";
import { isLearned, letterProgress, recordPractice, recordQuiz, useLearnProgress } from "../lib/learnProgress";
import { nearestSample, useSignModel, useSmoothedClassification } from "../lib/signModel";

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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Learn mode" className="inline-flex rounded-lg bg-gray-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            <span className="font-semibold text-gray-900">{learned}</span> of {ALPHABET.length} learned
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200" aria-hidden>
            <div className="h-full bg-green-500" style={{ width: `${(learned / ALPHABET.length) * 100}%` }} />
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

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {ALPHABET.map((l) => {
          const done = isLearned(letterProgress(progress, l.letter));
          return (
            <button
              key={l.letter}
              onClick={() => setOpen(l)}
              className="relative flex aspect-square flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`Letter ${l.letter}${l.movement ? ", moving letter" : ""}${done ? ", learned" : ""}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl font-semibold leading-none text-gray-900">{l.letter}</span>
                {done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                ) : l.movement ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    moves
                  </span>
                ) : null}
              </div>
              <HandDiagram bends={targetBends(l.fingers)} muted={l.fingers.map((f) => f === null)} className="mx-auto w-[88%] flex-1" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          {open && (
            <>
              <div className="flex items-center gap-5">
                <span className="text-7xl font-semibold text-indigo-600">{open.letter}</span>
                <HandDiagram
                  bends={targetBends(open.fingers)}
                  muted={open.fingers.map((f) => f === null)}
                  className="w-28"
                  label={`Hand diagram for ${open.letter}`}
                />
              </div>
              <DialogTitle className="sr-only">Letter {open.letter}</DialogTitle>
              <DialogDescription className="text-base text-gray-800">{open.shape}</DialogDescription>
              {open.tip && <p className="text-sm text-gray-600">💡 {open.tip}</p>}
              <FingerChecklist letter={open} />
              {open.lookalikes.length > 0 && (
                <p className="text-sm text-gray-500">
                  To the glove's finger sensors this looks like {open.lookalikes.join(", ")}. The
                  difference is in {open.movement ? "the movement" : "thumb placement or hand angle"}.
                </p>
              )}
              <Button onClick={() => { onPractice(open.letter); setOpen(null); }}>
                Practice {open.letter} with the glove
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FingerChecklist({ letter }: { letter: Letter }) {
  return (
    <ul className="grid grid-cols-5 gap-1 text-center text-xs">
      {FINGER_NAMES.map((name, i) => (
        <li key={name} className="rounded-md bg-gray-50 px-1 py-1.5">
          <span className="block text-gray-500">{name}</span>
          <span className="font-medium text-gray-800">{letter.fingers[i] ?? "any"}</span>
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

  const index = ALPHABET.findIndex((l) => l.letter === letter);
  const next = ALPHABET[(index + 1) % ALPHABET.length].letter;
  const hints = (
    sample
      ? sample.bends.map((b, i) => sampleHint(b, bends[i], FINGER_NAMES[i]))
      : target.fingers.map((s, i) => fingerHint(s, bends[i], FINGER_NAMES[i]))
  ).filter((h): h is string => !!h);
  // Every finger is close, but the model still prefers a lookalike.
  if (sample && !hints.length && predicted !== letter && closest) {
    hints.push(
      closest === letter
        ? `Almost: it could also be ${result.ranked[1]?.label}. Hold the shape more clearly.`
        : `Close! It reads as ${closest}. Check your thumb.`
    );
  }

  return (
    <div className="space-y-6">
      <LetterPicker selected={letter} onSelect={onLetter} progress={progress} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card title={`Make the letter ${letter}`}>
          <div className="flex items-center gap-4">
            <span className="text-7xl font-semibold text-indigo-600">{letter}</span>
            <HandDiagram
              bends={targetBends(target.fingers)}
              muted={target.fingers.map((f) => f === null)}
              className="w-28"
              label={`Target handshape for ${letter}`}
            />
          </div>
          <p className="mt-4 text-gray-800">{target.shape}</p>
          {target.tip && <p className="mt-2 text-sm text-gray-600">💡 {target.tip}</p>}
          {sample ? (
            target.lookalikes.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Easy to mix up with {target.lookalikes.join(", ")}: the finger bends are nearly the same.
              </p>
            )
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              No recorded samples for {letter} yet, so the glove checks finger bends only
              {target.movement ? ", not the movement" : ""}.
            </p>
          )}
        </Card>

        <Card title="Your hand">
          <GloveGate what="check your handshape">
            {success ? (
              <div className="flex flex-col items-center py-6 text-center" role="status">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-8 w-8 text-white" />
                </span>
                <p className="mt-3 text-lg font-semibold text-gray-900">That's {letter}!</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => { setSuccess(false); successFor.current = null; setAttempt((a) => a + 1); }}>
                    Try again
                  </Button>
                  <Button onClick={() => onLetter(next)}>Next: {next}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <HandDiagram bends={bends} highlight={ok.map((v) => !v)} className="w-36" label="Your hand right now" />
                </div>
                <div className="mt-3 min-h-[3rem] text-center" aria-live="polite">
                  {allOk ? (
                    <p className="font-medium text-green-700">Hold it…</p>
                  ) : (
                    hints.slice(0, 2).map((h) => (
                      <p key={h} className="text-sm text-amber-700">{h}</p>
                    ))
                  )}
                </div>
                <div className="mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                  <div className="h-full bg-green-500" style={{ width: `${hold * 100}%` }} />
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
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
              selected === l.letter
                ? "bg-indigo-600 text-white"
                : done
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
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
      action={score.total > 0 && <span className="text-sm text-gray-600">{score.right} / {score.total} correct</span>}
    >
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <HandDiagram bends={targetBends(q.answer.fingers)} muted={q.answer.fingers.map((f) => f === null)} className="w-32 shrink-0" label="Mystery handshape" />
        <p className="text-gray-800">{q.answer.shape.replace(new RegExp(`\\b${q.answer.letter}\\b`, "g"), "___")}</p>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {q.options.map((letter) => {
          const isAnswer = letter === q.answer.letter;
          const style = !picked
            ? "border-gray-200 bg-white hover:border-indigo-300"
            : isAnswer
              ? "border-green-500 bg-green-50 text-green-800"
              : letter === picked
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-200 bg-white opacity-50";
          return (
            <button
              key={letter}
              onClick={() => pick(letter)}
              disabled={!!picked}
              className={`rounded-xl border-2 py-4 text-3xl font-semibold transition-colors ${style}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-4 flex items-center justify-between" aria-live="polite">
          <p className={correct ? "text-green-700" : "text-red-700"}>
            {correct ? "Correct!" : `Not quite — that was ${q.answer.letter}.`}
          </p>
          <Button onClick={next} autoFocus>Next</Button>
        </div>
      )}
    </Card>
  );
}
