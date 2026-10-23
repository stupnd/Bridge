import { useMemo, useRef, useState } from "react";
import { Database, Download, Plus, RotateCcw, Shuffle, Upload, X } from "lucide-react";
import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader } from "../components/common";
import HandDiagram from "../components/HandDiagram";
import TeachHand from "../components/TeachHand";
import { loadCollectData } from "../lib/collectStorage";
import { FINGER_NAMES } from "../lib/asl";
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Hand"
          action={
            <div role="tablist" aria-label="Input" className="inline-flex rounded-lg bg-gray-100 p-1">
              {(["virtual", "live"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={source === s}
                  onClick={() => setSource(s)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    source === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
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
              <div className="flex justify-center">
                <HandDiagram bends={liveBends} className="w-40" label="Live view of your hand" />
              </div>
              <ul className="mt-4 grid grid-cols-5 gap-1 text-center text-xs tabular-nums">
                {FINGER_NAMES.map((name, i) => (
                  <li key={name} className="rounded-md bg-gray-50 py-1.5">
                    <span className="block text-gray-500">{name}</span>
                    <span className="font-medium text-gray-800">{pct(liveBends[i])}</span>
                  </li>
                ))}
              </ul>
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

// ── Virtual glove ───────────────────────────────────────────────────────────

function VirtualGlove({ bends, onChange, model }: { bends: number[]; onChange: (b: number[]) => void; model: SignModel }) {
  const [noise, setNoise] = useState(0.1);
  const letters = modelLetters(model);

  function loadLetter(letter: string) {
    const samples = model.samples.filter((s) => s.label === letter);
    if (samples.length) onChange([...samples[Math.floor(Math.random() * samples.length)].bends]);
  }

  return (
    <div>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <HandDiagram bends={bends} className="mx-auto w-36" label="Virtual hand" />
        <div className="space-y-3">
          {FINGER_NAMES.map((name, i) => (
            <label key={name} className="block">
              <span className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">{name}</span>
                <span className="tabular-nums text-gray-500">{pct(bends[i])} bent</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(bends[i] * 100)}
                onChange={(e) => onChange(bends.map((b, k) => (k === i ? Number(e.target.value) / 100 : b)))}
                className="w-full accent-indigo-600"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm text-gray-600">Start from a recorded letter</p>
        <div className="flex flex-wrap gap-1">
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => loadLetter(l)}
              className="h-8 w-8 rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(bends.map((b) => clamp01(b + (Math.random() * 2 - 1) * noise)))}
          >
            <Shuffle className="h-3.5 w-3.5" /> Wiggle ±{pct(noise)}
          </Button>
          <input
            type="range"
            min={0}
            max={30}
            value={Math.round(noise * 100)}
            onChange={(e) => setNoise(Number(e.target.value) / 100)}
            aria-label="Wiggle amount"
            className="w-28 accent-indigo-600"
          />
          <Button variant="ghost" size="sm" onClick={() => onChange(RELAXED)}>
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
      <div className="flex items-center gap-6" aria-live="polite">
        <span
          className={`w-24 text-center text-7xl font-semibold ${
            result.label ? "text-indigo-600" : result.status === "unsure" ? "text-amber-400" : "text-gray-200"
          }`}
        >
          {result.label ?? (result.status === "unsure" ? `${result.ranked[0].label}?` : "–")}
        </span>
        <div className="text-sm">
          {result.status === "letter" ? (
            <>
              <p className="text-gray-900">{Math.round(result.confidence * 100)}% sure</p>
              <p className="text-gray-500">How much closer it is than the next letter</p>
            </>
          ) : result.status === "rest" ? (
            <p className="text-gray-600">Resting hand</p>
          ) : result.status === "unsure" ? (
            <p className="text-amber-700">
              Unsure: {result.ranked[0].label} or {result.ranked[1].label}? Only{" "}
              {Math.round(result.confidence * 100)}% sure, under the {pct(model.minConfidence)} minimum.
            </p>
          ) : (
            <p className="text-gray-600">
              No letter: the closest ({closest?.label ?? "none"}) is {closest ? pct(closest.distance) : "–"} off,
              over the {pct(model.maxDistance)} limit.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {top.map((r) => (
          <li key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-12 font-semibold text-gray-800">{r.label === REST_LABEL ? "Rest" : r.label}</span>
            <div className="relative h-2 flex-1 rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${r.distance <= model.maxDistance ? "bg-indigo-500" : "bg-gray-300"}`}
                style={{ width: `${Math.max(2, (1 - r.distance / scale) * 100)}%` }}
              />
            </div>
            <span className="w-14 text-right tabular-nums text-gray-500">{pct(r.distance)} off</span>
          </li>
        ))}
      </ul>

      <label className="mt-5 block border-t border-gray-100 pt-4">
        <span className="mb-1 flex justify-between text-sm">
          <span className="text-gray-600">Reject matches further than</span>
          <span className="tabular-nums text-gray-500">{pct(model.maxDistance)}</span>
        </span>
        <input
          type="range"
          min={5}
          max={50}
          value={Math.round(model.maxDistance * 100)}
          onChange={(e) => setModel((m) => ({ ...m, maxDistance: Number(e.target.value) / 100 }))}
          className="w-full accent-indigo-600"
        />
        <span className="text-xs text-gray-500">Lower is stricter.</span>
      </label>

      <label className="mt-4 block">
        <span className="mb-1 flex justify-between text-sm">
          <span className="text-gray-600">Say "unsure" below this confidence</span>
          <span className="tabular-nums text-gray-500">{pct(model.minConfidence)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={50}
          value={Math.round(model.minConfidence * 100)}
          onChange={(e) => setModel((m) => ({ ...m, minConfidence: Number(e.target.value) / 100 }))}
          className="w-full accent-indigo-600"
        />
        <span className="text-xs text-gray-500">
          Higher means fewer wrong letters but more "unsure". Both settings are also used by Translate and Learn.
        </span>
      </label>
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

  function exportCsv() {
    const blob = new Blob([samplesToCsv(model.samples)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bridge-model-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card
      title="Training data"
      description={`${model.samples.length} samples. The recognizer is only as good as these: record more reps per letter to make it sturdier.`}
      action={
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={importCollect}>
            <Database className="h-3.5 w-3.5" /> Add from Collect
          </Button>
          <Button variant="ghost" size="sm" onClick={() => pickFile("add")}>
            <Upload className="h-3.5 w-3.5" /> Add CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => pickFile("replace")}>
            <Upload className="h-3.5 w-3.5" /> Replace with CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { resetModel(); setMsg({ ok: true, text: "Back to the bundled samples." }); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      }
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

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSample();
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Save the current hand as</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. E, or Rest"
            maxLength={12}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <Button type="submit" disabled={!label.trim()}>
          <Plus className="h-4 w-4" /> Add sample
        </Button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {counts.map(([l, n]) => (
          <li key={l} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 text-sm">
            <span className="font-semibold text-gray-800">{l === REST_LABEL ? "Rest" : l}</span>
            <span className="text-xs text-gray-500">×{n}</span>
            <button
              onClick={() => removeLabel(l)}
              aria-label={`Remove all samples for ${l}`}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
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
      description="Wiggles every sample's fingers at random and checks it's still recognized. Letters that fail sit too close to a neighbour."
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Wiggle up to ±{pct(noise)}
          <input
            type="range"
            min={1}
            max={30}
            value={Math.round(noise * 100)}
            onChange={(e) => setNoise(Number(e.target.value) / 100)}
            className="w-32 accent-indigo-600"
          />
        </label>
        <Button onClick={() => setResults(noiseTest(model, noise))} disabled={!model.samples.length}>
          Run test
        </Button>
        {results && (
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{share(correct)} right</span> · {share(held)} unsure or no
            letter · <span className="font-medium text-red-700">{share(total - correct - held)} wrong letter</span>
          </span>
        )}
      </div>

      {results && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1 font-normal">Letter</th>
              <th className="py-1 font-normal">Recognized</th>
              <th className="py-1 font-normal">Mistaken for</th>
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
                <tr key={r.label} className="border-t border-gray-100">
                  <td className="py-1.5 font-semibold text-gray-800">{r.label === REST_LABEL ? "Rest" : r.label}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${rate >= 0.9 ? "bg-green-500" : rate >= 0.6 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${rate * 100}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-gray-600">{Math.round(rate * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-gray-600">{mistakes.join(", ") || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {loo
          ? `Leave-one-out on real recordings: ${loo.correct} of ${loo.tested} samples recognized (${Math.round((loo.correct / loo.tested) * 100)}%). Each sample is classified using all the others.`
          : "Record at least two samples of a letter to also get a leave-one-out score on real recordings."}
      </p>
    </Card>
  );
}
