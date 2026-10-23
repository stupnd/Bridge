import { useEffect, useMemo, useRef, useState } from "react";
import { useSensor } from "../context/SensorContext";
import { loadFlexCalibration } from "../lib/flexCalibrationStorage";
import {
  AXES,
  computeFeatures,
  evaluateKnn,
  Example,
  FEATURE_NAMES,
  featureVector,
  Features,
  Frame,
  MOTION_RULES,
  predictKnn,
  Prediction,
  trainKnn,
  upAxisLabel,
} from "../lib/imu";
import type { Recording } from "../lib/recordings";
import { Card } from "./common";

const LIVE_REFRESH_MS = 250;
const MIN_PER_LABEL = 2;

const FLEX_ONLY = [0, 1, 2, 3, 4];
const ALL_FEATURES = FEATURE_NAMES.map((_, i) => i);
const FEATURE_SETS = {
  flex: { name: "Flex only", use: FLEX_ONLY },
  all: { name: "Flex + 9-axis", use: ALL_FEATURES },
} as const;
type FeatureSetKey = keyof typeof FEATURE_SETS;

function liveCalibration() {
  const c = loadFlexCalibration();
  return c ? { open: c.straight, closed: c.bent } : null;
}

export default function MotionLab({ recordings }: { recordings: Recording[] }) {
  const { connected, subscribe } = useSensor();
  const featureSet: FeatureSetKey = "all";

  // ── Training data: labels with enough recordings ──
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of recordings) c[r.letter] = (c[r.letter] ?? 0) + 1;
    return c;
  }, [recordings]);
  const usable = useMemo(
    () => recordings.filter((r) => counts[r.letter] >= MIN_PER_LABEL),
    [recordings, counts]
  );
  const labels = useMemo(() => [...new Set(usable.map((r) => r.letter))].sort(), [usable]);
  const examples: Example[] = useMemo(
    () => usable.map((r) => ({ label: r.letter, vector: featureVector(r.features) })),
    [usable]
  );
  const canTrain = labels.length >= 2;

  // Accuracy for both feature sets, so you can see what the 9-axis sensor adds.
  const results = useMemo(() => {
    if (!canTrain) return null;
    return Object.fromEntries(
      (Object.keys(FEATURE_SETS) as FeatureSetKey[]).map((key) => {
        const model = trainKnn(examples, [...FEATURE_SETS[key].use]);
        return [key, { model, ...evaluateKnn(model, examples) }];
      })
    ) as Record<FeatureSetKey, { model: ReturnType<typeof trainKnn> } & ReturnType<typeof evaluateKnn>>;
  }, [examples, canTrain]);

  // Live window matches whatever kind of recording dominates the training data.
  const movementShare = usable.filter((r) => r.mode === "movement").length / (usable.length || 1);
  const liveWindowMs = movementShare > 0.5 ? 2000 : 1000;

  // ── Live analysis over a sliding window ──
  const buffer = useRef<Frame[]>([]);
  const [live, setLive] = useState<Features | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const modelRef = useRef(results?.[featureSet].model ?? null);
  modelRef.current = results?.[featureSet].model ?? null;

  useEffect(() => {
    if (!connected) {
      buffer.current = [];
      setLive(null);
      setPrediction(null);
      return;
    }
    const unsubscribe = subscribe((f) => {
      buffer.current.push(f);
      const cutoff = f.t - 2000;
      while (buffer.current.length && buffer.current[0].t < cutoff) buffer.current.shift();
    });
    const timer = setInterval(() => {
      const frames = buffer.current;
      if (frames.length < 5) return;
      const calib = liveCalibration();
      // Rules always look at the last 2 s; the model at the same length it was trained on.
      setLive(computeFeatures(frames, calib));
      const end = frames[frames.length - 1].t;
      const recent = frames.filter((f) => f.t >= end - liveWindowMs);
      const model = modelRef.current;
      setPrediction(model ? predictKnn(model, featureVector(computeFeatures(recent, calib))) : null);
    }, LIVE_REFRESH_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [connected, subscribe, liveWindowMs]);

  const activeRules = live ? MOTION_RULES.filter((r) => r.test(live)) : [];
  const chosen = results?.[featureSet];

  return (
    <Card
      title="Test the model"
      description="Recognizes signs by comparing the last few seconds from the glove with your recordings."
    >
      <div className="space-y-6">
        {/* ── Live ── */}
        <section className="rounded-xl bg-gray-50 p-4 text-center" aria-live="polite">
          {!connected ? (
            <p className="text-sm text-gray-500">Connect the glove to try the model live.</p>
          ) : !results ? (
            <p className="text-sm text-gray-500">
              Record at least {MIN_PER_LABEL} samples each for two or more signs to train the model.
            </p>
          ) : prediction ? (
            <>
              <p className="text-sm text-gray-500">The model thinks you're signing</p>
              <p className="text-5xl font-semibold text-indigo-600">{prediction.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                {Math.round(prediction.confidence * 100)}% of the {chosen?.model.k} closest recordings agree
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Waiting for readings…</p>
          )}
        </section>

        {/* ── Accuracy ── */}
        {results && chosen && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p>
                <span className="text-2xl font-semibold text-gray-900">{Math.round(results.all.accuracy * 100)}%</span>{" "}
                <span className="text-sm text-gray-600">accuracy with finger + motion data</span>
              </p>
              <p className="text-sm text-gray-500">
                {Math.round(results.flex.accuracy * 100)}% with finger data only
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Each recording is tested against all the others ({usable.length} recordings, {labels.length} signs
              {usable.length < recordings.length &&
                `; ${recordings.length - usable.length} skipped because their sign has fewer than ${MIN_PER_LABEL}`}
              ). Testing on the same person you trained on is optimistic; try someone new for the real number.
            </p>
            <ConfusionTable labels={labels} confusion={results.all.confusion} />
          </section>
        )}

        {/* ── Advanced ── */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">Advanced: motion features and rules</summary>
          <div className="mt-4 space-y-6">
            {connected && live && (
              <section className="space-y-2">
                <h3 className="font-medium text-gray-800">Live motion</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Stat label="Orientation" value={upAxisLabel(live.gravity)} />
                  <Stat label="Rotation speed" value={`${Math.round(live.gyroRms)}°/s`} />
                  <Stat
                    label="Turned (last 2 s)"
                    value={AXES.map((a, i) => `${a} ${Math.round(live.rotationDeg[i])}°`).join("  ")}
                  />
                  <Stat label="Direction changes" value={String(live.reversals)} />
                </div>
                <p className="text-xs text-gray-500">
                  Rules matching now: {activeRules.length ? activeRules.map((r) => r.label).join(", ") : "none"}
                </p>
              </section>
            )}
            <section className="space-y-2">
              <h3 className="font-medium text-gray-800">Motion per sign</h3>
              <FeatureTable recordings={recordings} />
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-gray-800">Hand-written rules</h3>
              <p className="text-xs text-gray-500">
                How often each rule in <code>lib/imu.ts</code> fires on each sign's recordings. A good rule is near
                100% on its own sign and near 0% elsewhere.
              </p>
              <RuleTable recordings={recordings} />
            </section>
          </div>
        </details>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-left">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800 tabular-nums">{value}</p>
    </div>
  );
}

function groupByLabel(recordings: Recording[]) {
  const groups: Record<string, Recording[]> = {};
  for (const r of recordings) (groups[r.letter] ??= []).push(r);
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function RuleTable({ recordings }: { recordings: Recording[] }) {
  const groups = groupByLabel(recordings);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 pr-2 font-medium">Rule</th>
            {groups.map(([label, rs]) => (
              <th key={label} className="py-1 px-2 font-medium text-right">
                {label} <span className="font-normal text-gray-400">({rs.length})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {MOTION_RULES.map((rule) => (
            <tr key={rule.label}>
              <td className="py-1 pr-2">
                <span className="font-medium text-gray-800">{rule.label}</span>
                <span className="block text-gray-400">{rule.description}</span>
              </td>
              {groups.map(([label, rs]) => {
                const pct = Math.round((rs.filter((r) => rule.test(r.features)).length / rs.length) * 100);
                return (
                  <td
                    key={label}
                    className={`py-1 px-2 text-right ${pct >= 50 ? "text-emerald-700 font-medium" : "text-gray-400"}`}
                  >
                    {pct}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {groups.length === 0 && <p className="text-xs text-gray-400 pt-1">No recordings yet.</p>}
    </div>
  );
}

function FeatureTable({ recordings }: { recordings: Recording[] }) {
  const groups = groupByLabel(recordings);
  if (groups.length === 0) return <p className="text-xs text-gray-400">No recordings yet.</p>;
  const avg = (rs: Recording[], get: (f: Features) => number) =>
    rs.reduce((s, r) => s + get(r.features), 0) / rs.length;
  const cols: [string, (rs: Recording[]) => string][] = [
    ["Orientation", (rs) => upAxisLabel(
      [0, 1, 2].map((i) => avg(rs, (f) => f.gravity[i])) as [number, number, number]
    )],
    ["Roll", (rs) => `${Math.round(avg(rs, (f) => f.rollDeg))}°`],
    ["Pitch", (rs) => `${Math.round(avg(rs, (f) => f.pitchDeg))}°`],
    ...AXES.map((a, i) => [`Turn ${a}`, (rs: Recording[]) => `${Math.round(avg(rs, (f) => f.rotationDeg[i]))}°`] as [string, (rs: Recording[]) => string]),
    ["Rotation speed", (rs) => `${Math.round(avg(rs, (f) => f.gyroRms))}°/s`],
    ["Dir. changes", (rs) => avg(rs, (f) => f.reversals).toFixed(1)],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 pr-2 font-medium">Label</th>
            {cols.map(([name]) => (
              <th key={name} className="py-1 px-2 font-medium text-right">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {groups.map(([label, rs]) => (
            <tr key={label}>
              <td className="py-1 pr-2 font-bold text-indigo-600">
                {label} <span className="font-normal text-gray-400">({rs.length})</span>
              </td>
              {cols.map(([name, fn]) => (
                <td key={name} className="py-1 px-2 text-right text-gray-700">{fn(rs)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 pt-1">
        Averages per label. Columns that differ a lot between two labels are the ones that can
        tell them apart, e.g. two handshapes with the same finger bends but different tilt.
      </p>
    </div>
  );
}

function ConfusionTable({
  labels,
  confusion,
}: {
  labels: string[];
  confusion: Record<string, Record<string, number>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs tabular-nums">
        <thead>
          <tr className="text-gray-500">
            <th className="py-1 pr-2 text-left font-medium">Actual ↓ / predicted →</th>
            {labels.map((l) => (
              <th key={l} className="py-1 px-2 font-medium">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((actual) => (
            <tr key={actual}>
              <td className="py-1 pr-2 font-bold text-indigo-600">{actual}</td>
              {labels.map((pred) => {
                const n = confusion[actual]?.[pred] ?? 0;
                return (
                  <td
                    key={pred}
                    className={`py-1 px-2 text-center ${
                      n === 0
                        ? "text-gray-300"
                        : pred === actual
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "bg-red-50 text-red-600 font-medium"
                    }`}
                  >
                    {n}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 pt-1">
        Red cells are mix-ups. If two letters only get confused under "Flex only", the 9-axis
        sensor is what separates them.
      </p>
    </div>
  );
}
