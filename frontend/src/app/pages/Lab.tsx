import { useMemo, useRef, useState } from "react";
import { Database, Download, Plus, RotateCcw, Shuffle, Upload, Users, X } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import FingerBars from "../components/FingerBars";
import HandDiagram from "../components/HandDiagram";
import TeachHand from "../components/TeachHand";
import { loadCollectData } from "../lib/collectStorage";
import { fetchTeamData } from "../lib/teamRecordings";
import { FINGERS, fingerTint } from "../lib/fingers";
import {
  classify,
  leaveOneOut,
  LetterResult,
  modelLetters,
  noiseTest,
  parseSamplesCsv,
  resetModel,
  REST_LABEL,
  samplesFromCollectData,
  samplesToCsv,
  setModel,
  SignModel,
  useSignModel,
} from "../lib/signModel";

type Source = "virtual" | "live";

const RELAXED = [0.1, 0.1, 0.1, 0.1, 0.1];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Neutral border for inputs and chips that need more weight than a hairline. */
const CONTROL_BORDER = "border-[#cfcac1]";

export default function Lab() {
  const model = useSignModel();
  const { bends: liveBends } = useSensor();
  const [source, setSource] = useState<Source>("virtual");
  const [virtual, setVirtual] = useState<number[]>(RELAXED);
  const bends = source === "virtual" ? virtual : liveBends;
  const result = classify(model, bends);

  return (
    <Page width="max-w-6xl">
      <PageHeader
        title="Lab"
        description="Test the letter recognizer with a virtual glove or the real one, and edit the samples it learns from."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card
          title="Hand"
          action={
            <div role="tablist" aria-label="Input" className="inline-flex shrink-0 rounded-[var(--radius-control)] bg-wash p-1">
              {(["virtual", "live"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={source === s}
                  onClick={() => setSource(s)}
                  className={`min-h-11 rounded-[8px] px-3 text-sm font-semibold transition-colors duration-150 ease-out sm:min-h-9 ${
                    source === s ? "border border-hairline bg-surface text-ink" : "border border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {s === "virtual" ? "Virtual glove" : "Live glove"}
                </button>
              ))}
            </div>
          }
        >
          {source === "virtual" ? (
            <VirtualGlove bends={virtual} onChange={setVirtual} model={model} />
          ) : (
            <GloveGate what="test with your real hand">
              <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                <HandDiagram bends={liveBends} className="mx-auto w-36 sm:w-40" label="Live view of your hand" />
                <FingerBars bends={liveBends} />
              </div>
            </GloveGate>
          )}
        </Card>

        <Prediction model={model} result={result} />
      </div>

      <div className="mt-6 space-y-6">
        <TeachHand />
        <TrainingData model={model} bends={bends} />
        <RobustnessTest model={model} />
      </div>
    </Page>
  );
}

// ── Sliders ─────────────────────────────────────────────────────────────────

/**
 * A native range drawn over a track: the input stays for keyboard and touch,
 * only its thumb shows (.try-range in theme.css). `color` is a finger's ink for
 * finger sliders, or plain ink for settings.
 */
function InkRange({
  value,
  min,
  max,
  onChange,
  color = "var(--ink)",
  track = "var(--wash)",
  thick = false,
  ariaLabel,
  className = "",
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
  track?: string;
  thick?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const fill = (value - min) / (max - min);
  const y = thick ? 1.7 : 1;
  return (
    <span className={`relative block h-7 ${className}`}>
      <span
        aria-hidden
        className="absolute inset-x-0 top-[11px] h-1.5 rounded-full transition-transform duration-150 ease-out"
        style={{ transform: `scaleY(${y})`, background: track }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-[11px] h-1.5 origin-left rounded-full transition-transform duration-150 ease-out"
        style={{ transform: `scale(${fill}, ${y})`, background: color }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="try-range absolute inset-0 w-full"
        style={{ ["--thumb-color" as string]: color }}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      />
    </span>
  );
}

// ── Virtual glove ───────────────────────────────────────────────────────────

function VirtualGlove({ bends, onChange, model }: { bends: number[]; onChange: (b: number[]) => void; model: SignModel }) {
  const [noise, setNoise] = useState(0.1);
  const [hot, setHot] = useState<number | null>(null);
  const letters = modelLetters(model);

  function loadLetter(letter: string) {
    const samples = model.samples.filter((s) => s.label === letter);
    if (samples.length) onChange([...samples[Math.floor(Math.random() * samples.length)].bends]);
  }

  return (
    <div>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <HandDiagram bends={bends} className="mx-auto w-36 sm:w-40" label="Virtual hand" />
        <div className="space-y-3">
          {FINGERS.map((f, i) => (
            <label
              key={f.key}
              className="block"
              onMouseEnter={() => setHot(i)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(i)}
              onBlur={() => setHot(null)}
            >
              <span className="mb-0.5 flex justify-between text-sm">
                <span className="font-semibold text-ink">{f.name}</span>
                <span className="tabular text-ink-muted">{pct(bends[i])} bent</span>
              </span>
              <InkRange
                value={Math.round(bends[i] * 100)}
                min={0}
                max={100}
                onChange={(v) => onChange(bends.map((b, k) => (k === i ? v / 100 : b)))}
                color={f.color}
                track={fingerTint(f.color, 22)}
                thick={hot === i}
                ariaLabel={`${f.name} bend`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <p className="mb-2 text-sm text-ink-muted">Start from a recorded letter</p>
        <div className="flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => loadLetter(l)}
              className="h-11 w-11 rounded-[var(--radius-control)] border border-hairline bg-ground font-display text-lg font-bold text-ink transition-colors duration-150 ease-out hover:border-ink sm:h-10 sm:w-10"
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            variant="secondary"
            size="sm"
            className="max-sm:h-11"
            onClick={() => onChange(bends.map((b) => clamp01(b + (Math.random() * 2 - 1) * noise)))}
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden /> Wiggle ±{pct(noise)}
          </Button>
          <InkRange
            value={Math.round(noise * 100)}
            min={0}
            max={30}
            onChange={(v) => setNoise(v / 100)}
            ariaLabel="Wiggle amount"
            className="w-28"
          />
          <Button variant="ghost" size="sm" className="max-sm:h-11" onClick={() => onChange(RELAXED)}>
            Relax hand
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Prediction ──────────────────────────────────────────────────────────────

function Prediction({ model, result }: { model: SignModel; result: ReturnType<typeof classify> }) {
  const top = result.ranked.slice(0, 5);
  const scale = Math.max(model.maxDistance * 1.5, ...top.map((r) => r.distance));
  const closest = result.ranked[0];

  return (
    <Card title="Prediction" description="Nearest recorded sample, measured as the average difference per finger.">
      <div className="flex items-center gap-5 sm:gap-6" aria-live="polite">
        <span
          className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-[var(--radius-card)] font-display text-[4.5rem] font-extrabold leading-none ${
            result.label
              ? "bg-ground text-ink"
              : result.status === "unsure"
                ? "bg-warn-wash text-warn"
                : "bg-ground text-ink-faint"
          }`}
        >
          {result.label ?? (result.status === "unsure" ? `${result.ranked[0].label}?` : "–")}
        </span>
        <div className="min-w-0 text-sm">
          {result.status === "letter" ? (
            <>
              <p className="tabular font-display text-heading text-ink">{Math.round(result.confidence * 100)}% sure</p>
              <p className="mt-0.5 text-ink-muted">How much closer it is than the next letter</p>
            </>
          ) : result.status === "rest" ? (
            <p className="font-display text-heading text-ink">Resting hand</p>
          ) : result.status === "unsure" ? (
            <>
              <p className="font-display text-heading text-warn">
                Unsure: {result.ranked[0].label} or {result.ranked[1].label}?
              </p>
              <p className="tabular mt-0.5 text-ink-muted">
                Only {Math.round(result.confidence * 100)}% sure, under the {pct(model.minConfidence)} minimum.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-heading text-ink">No letter</p>
              <p className="tabular mt-0.5 text-ink-muted">
                The closest ({closest?.label ?? "none"}) is {closest ? pct(closest.distance) : "–"} off, over the{" "}
                {pct(model.maxDistance)} limit.
              </p>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-muted">Closest letters</p>
      <ul className="mt-2 space-y-2.5">
        {top.map((r) => {
          const within = r.distance <= model.maxDistance;
          return (
            <li key={r.label} className="flex items-center gap-3 text-sm">
              <span className="w-12 font-display text-base font-bold text-ink">{r.label === REST_LABEL ? "Rest" : r.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-wash">
                <div
                  className={`h-full origin-left rounded-full transition-transform duration-150 ease-out ${within ? "bg-ink" : "bg-[#cfcac1]"}`}
                  style={{ transform: `scaleX(${Math.max(0.02, 1 - r.distance / scale)})` }}
                />
              </div>
              <span className={`tabular w-16 text-right ${within ? "text-ink" : "text-ink-muted"}`}>{pct(r.distance)} off</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-5 border-t border-hairline pt-5">
        <label className="block">
          <span className="mb-0.5 flex justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">Reject matches further than</span>
            <span className="tabular text-ink-muted">{pct(model.maxDistance)}</span>
          </span>
          <InkRange
            value={Math.round(model.maxDistance * 100)}
            min={5}
            max={50}
            onChange={(v) => setModel((m) => ({ ...m, maxDistance: v / 100 }))}
          />
          <span className="text-xs text-ink-muted">Lower is stricter.</span>
        </label>

        <label className="block">
          <span className="mb-0.5 flex justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">Say "unsure" below this confidence</span>
            <span className="tabular text-ink-muted">{pct(model.minConfidence)}</span>
          </span>
          <InkRange
            value={Math.round(model.minConfidence * 100)}
            min={0}
            max={50}
            onChange={(v) => setModel((m) => ({ ...m, minConfidence: v / 100 }))}
          />
          <span className="text-xs text-ink-muted">
            Higher means fewer wrong letters but more "unsure". Both settings are also used by Translate and Learn.
          </span>
        </label>
      </div>
    </Card>
  );
}

// ── Training data ───────────────────────────────────────────────────────────

function TrainingData({ model, bends }: { model: SignModel; bends: number[] }) {
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMode = useRef<"add" | "replace">("add");

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    model.samples.forEach((s) => c.set(s.label, (c.get(s.label) ?? 0) + 1));
    return [...c].sort(([a], [b]) => a.localeCompare(b));
  }, [model.samples]);

  function addSample() {
    const l = label.trim().toUpperCase();
    if (!l) return;
    setModel((m) => ({ ...m, samples: [...m.samples, { label: l, bends: [...bends] }] }));
    setMsg({ ok: true, text: `Added a sample for ${l === REST_LABEL ? "Rest" : l}.` });
  }

  function removeLabel(l: string) {
    setModel((m) => ({ ...m, samples: m.samples.filter((s) => s.label !== l) }));
  }

  function pickFile(mode: "add" | "replace") {
    importMode.current = mode;
    fileRef.current?.click();
  }

  async function importFile(file: File) {
    try {
      const samples = parseSamplesCsv(await file.text());
      if (!samples.length) throw new Error("No static samples found in that file.");
      const replace = importMode.current === "replace";
      setModel((m) => ({ ...m, samples: replace ? samples : [...m.samples, ...samples] }));
      setMsg({ ok: true, text: `${replace ? "Replaced the data with" : "Added"} ${samples.length} samples from ${file.name}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't read that file." });
    }
  }

  async function importCollect() {
    try {
      const data = await loadCollectData();
      const samples = data ? samplesFromCollectData(data) : [];
      if (!samples.length) throw new Error("No static or rest samples on the Collect page yet.");
      setModel((m) => ({ ...m, samples: [...m.samples, ...samples] }));
      setMsg({ ok: true, text: `Added ${samples.length} samples from the Collect page.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't read the Collect page's data." });
    }
  }

  async function importTeam() {
    try {
      setMsg({ ok: true, text: "Loading the team dataset…" });
      const samples = samplesFromCollectData(await fetchTeamData());
      if (!samples.length) throw new Error("The team dataset has no static or rest samples yet (or this account isn't on the team).");
      setModel((m) => ({ ...m, samples: [...m.samples, ...samples] }));
      setMsg({ ok: true, text: `Added ${samples.length} samples from the team dataset.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't load the team dataset." });
    }
  }

  function exportCsv() {
    const blob = new Blob([samplesToCsv(model.samples)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bridge-model-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const tool = "max-sm:h-11";

  return (
    <Card
      title="Training data"
      description={`${model.samples.length} samples. The recognizer is only as good as these: record more reps per letter to make it sturdier.`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addSample();
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Save the current hand as</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. E, or Rest"
              maxLength={12}
              className={`h-11 w-40 rounded-[var(--radius-control)] border ${CONTROL_BORDER} bg-surface px-3 text-base text-ink placeholder:text-ink-muted transition-colors duration-150 hover:border-ink focus:border-ink sm:text-sm`}
            />
          </label>
          <Button type="submit" disabled={!label.trim()}>
            <Plus className="h-4 w-4" aria-hidden /> Add sample
          </Button>
        </form>

        <div className="flex flex-wrap gap-1.5 md:justify-end">
          <Button variant="secondary" size="sm" className={tool} onClick={importTeam}>
            <Users className="h-3.5 w-3.5" aria-hidden /> Add from team
          </Button>
          <Button variant="secondary" size="sm" className={tool} onClick={importCollect}>
            <Database className="h-3.5 w-3.5" aria-hidden /> Add from Collect
          </Button>
          <Button variant="secondary" size="sm" className={tool} onClick={() => pickFile("add")}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> Add CSV
          </Button>
          <Button variant="secondary" size="sm" className={tool} onClick={() => pickFile("replace")}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> Replace with CSV
          </Button>
          <Button variant="secondary" size="sm" className={tool} onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={tool}
            onClick={() => { resetModel(); setMsg({ ok: true, text: "Back to the bundled samples." }); }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </Button>
        </div>
      </div>

      <p aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>

      <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline pt-5">
        {counts.map(([l, n]) => (
          <li key={l} className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-hairline bg-ground pl-3 text-sm">
            <span className="font-display text-base font-bold text-ink">{l === REST_LABEL ? "Rest" : l}</span>
            <span className="tabular text-xs text-ink-muted">×{n}</span>
            <button
              onClick={() => removeLabel(l)}
              aria-label={`Remove all samples for ${l}`}
              className="flex h-11 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink sm:h-9 sm:w-8"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Robustness test ─────────────────────────────────────────────────────────

function RobustnessTest({ model }: { model: SignModel }) {
  const [noise, setNoise] = useState(0.1);
  const [results, setResults] = useState<LetterResult[] | null>(null);
  const loo = useMemo(() => leaveOneOut(model), [model]);

  const total = results?.reduce((s, r) => s + r.trials, 0) ?? 0;
  const correct = results?.reduce((s, r) => s + r.correct, 0) ?? 0;
  // "Unsure" and "no letter" are safe misses; a wrong letter is the costly one.
  const held = results?.reduce((s, r) => s + (r.confusedWith.unsure ?? 0) + (r.confusedWith.far ?? 0), 0) ?? 0;
  const share = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <Card
      title="Robustness test"
      description="Wiggles every sample's fingers at random and checks it's still recognized. Letters that fail sit too close to a neighbour. A simulation, not real-world accuracy."
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="block w-full max-w-56 text-sm">
          <span className="mb-0.5 flex justify-between gap-3">
            <span className="font-semibold text-ink">Wiggle up to</span>
            <span className="tabular text-ink-muted">±{pct(noise)}</span>
          </span>
          <InkRange value={Math.round(noise * 100)} min={1} max={30} onChange={(v) => setNoise(v / 100)} />
        </label>
        <Button onClick={() => setResults(noiseTest(model, noise))} disabled={!model.samples.length}>
          Run test
        </Button>
      </div>

      {results && (
        <dl className="mt-6 grid grid-cols-3 gap-2 sm:max-w-lg">
          <div className="rounded-[var(--radius-control)] bg-ok-wash px-3 py-2.5">
            <dt className="text-xs text-ok">Right</dt>
            <dd className="tabular font-display text-heading text-ink">{share(correct)}</dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-warn-wash px-3 py-2.5">
            <dt className="text-xs text-warn">Unsure or no letter</dt>
            <dd className="tabular font-display text-heading text-ink">{share(held)}</dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-danger-wash px-3 py-2.5">
            <dt className="text-xs text-danger">Wrong letter</dt>
            <dd className="tabular font-display text-heading text-danger">{share(total - correct - held)}</dd>
          </div>
        </dl>
      )}

      {results && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="py-1.5 pr-3 font-semibold">Letter</th>
                <th className="py-1.5 pr-3 font-semibold">Recognized</th>
                <th className="py-1.5 font-semibold">Mistaken for</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const rate = r.correct / r.trials;
                const mistakes = Object.entries(r.confusedWith)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([l, n]) => `${l === "far" ? "no letter" : l === REST_LABEL ? "Rest" : l} ${Math.round((n / r.trials) * 100)}%`);
                return (
                  <tr key={r.label} className="border-t border-hairline">
                    <td className="py-2 pr-3 font-display text-base font-bold text-ink">{r.label === REST_LABEL ? "Rest" : r.label}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-wash sm:w-24">
                          <div
                            className={`h-full origin-left rounded-full ${rate >= 0.9 ? "bg-ok" : rate >= 0.6 ? "bg-warn" : "bg-danger"}`}
                            style={{ transform: `scaleX(${rate})` }}
                          />
                        </div>
                        <span className="tabular text-ink">{Math.round(rate * 100)}%</span>
                      </div>
                    </td>
                    <td className="tabular py-2 text-ink-muted">{mistakes.join(", ") || "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="tabular mt-5 text-sm text-ink-muted">
        {loo
          ? `Leave-one-out on real recordings: ${loo.correct} of ${loo.tested} samples recognized (${Math.round((loo.correct / loo.tested) * 100)}%). Each sample is classified using all the others.`
          : "Record at least two samples of a letter to also get a leave-one-out score on real recordings."}
      </p>
    </Card>
  );
}
