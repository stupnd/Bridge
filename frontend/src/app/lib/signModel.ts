/**
 * Letter recognition learned from recorded samples instead of hand-written rules.
 *
 * The model is just a list of labeled handshapes (five calibrated bends each).
 * A live hand is classified as the label of its nearest sample, unless even the
 * nearest one is further than `maxDistance` (then it's "no letter", e.g. a
 * relaxed hand or a transition between letters).
 *
 * The bundled samples come from data/asl-samples.csv (exported from the Collect
 * page). Users can replace or extend them from the Lab page; that copy is kept in
 * this browser.
 *
 * Finger order everywhere: [thumb, index, middle, ring, pinky].
 */
import { useSyncExternalStore } from "react";
import defaultCsv from "../data/asl-samples.csv?raw";

export type Sample = { label: string; bends: number[] };

export type SignModel = {
  samples: Sample[];
  /** Reject a match whose average finger difference (0–1) is above this. */
  maxDistance: number;
};

export type Ranked = { label: string; distance: number };

export type Classification = {
  /** null when nothing is close enough, or the closest is "Rest". */
  label: string | null;
  /** Every label, closest first. */
  ranked: Ranked[];
  /** 0–1: how much closer the winner is than the runner-up. Low = easily confused. */
  confidence: number;
};

/** Samples with this label teach the model what "not signing" looks like. */
export const REST_LABEL = "REST";
export const DEFAULT_MAX_DISTANCE = 0.25;

const STORAGE_KEY = "bridge-sign-model-v1";

// ── CSV ─────────────────────────────────────────────────────────────────────

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/**
 * Reads the Collect page's summary CSV: a `letter` (or `label`) column and
 * `pct_f1`..`pct_f5` bend percentages. Movement samples (J, Z) are skipped,
 * since a single averaged handshape can't describe them.
 */
export function parseSamplesCsv(text: string): Sample[] {
  const [header, ...rows] = parseCsvRows(text);
  if (!header) throw new Error("The file is empty.");
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const labelCol = col("letter") >= 0 ? col("letter") : col("label");
  const pctCols = [1, 2, 3, 4, 5].map((i) => col(`pct_f${i}`));
  const modeCol = col("mode");
  if (labelCol < 0 || pctCols.some((c) => c < 0)) {
    throw new Error("Expected a 'letter' column and pct_f1 … pct_f5 columns.");
  }
  const samples: Sample[] = [];
  for (const r of rows) {
    const mode = modeCol >= 0 ? r[modeCol]?.trim().toLowerCase() : "static";
    if (mode && mode !== "static") continue;
    const label = r[labelCol]?.trim().toUpperCase();
    const bends = pctCols.map((c) => Number(r[c]) / 100);
    if (!label || bends.some((b) => !Number.isFinite(b))) continue;
    samples.push({ label, bends: bends.map(clamp01) });
  }
  return samples;
}

export function samplesToCsv(samples: Sample[]): string {
  const lines = ["letter,mode,pct_f1,pct_f2,pct_f3,pct_f4,pct_f5"];
  for (const s of samples) {
    lines.push([s.label, "static", ...s.bends.map((b) => (b * 100).toFixed(1))].join(","));
  }
  return lines.join("\n");
}

// ── Classifier ──────────────────────────────────────────────────────────────

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** RMS difference across the five fingers, 0–1. 0.1 ≈ "each finger off by 10%". */
export function handDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 5; i++) sum += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  return Math.sqrt(sum / 5);
}

/** `skip` leaves one sample out (for leave-one-out testing). */
export function classify(model: SignModel, bends: number[], skip?: Sample): Classification {
  const best = new Map<string, number>();
  for (const s of model.samples) {
    if (s === skip) continue;
    const d = handDistance(bends, s.bends);
    if (d < (best.get(s.label) ?? Infinity)) best.set(s.label, d);
  }
  const ranked = [...best].map(([label, distance]) => ({ label, distance })).sort((a, b) => a.distance - b.distance);
  const [first, second] = ranked;
  const confidence = first && second && second.distance > 0 ? 1 - first.distance / second.distance : first ? 1 : 0;
  const label = first && first.distance <= model.maxDistance && first.label !== REST_LABEL ? first.label : null;
  return { label, ranked, confidence };
}

/** Labels the model can output, alphabetical. */
export function modelLetters(model: SignModel): string[] {
  return [...new Set(model.samples.map((s) => s.label))].filter((l) => l !== REST_LABEL).sort();
}

/** The sample of `label` nearest to the current hand, or null if the model has none. */
export function nearestSample(model: SignModel, label: string, bends: number[]): Sample | null {
  let best: Sample | null = null;
  for (const s of model.samples) {
    if (s.label === label && (!best || handDistance(bends, s.bends) < handDistance(bends, best.bends))) best = s;
  }
  return best;
}

export type LetterResult = { label: string; trials: number; correct: number; confusedWith: Record<string, number> };

/**
 * Robustness test: jitter every sample by up to ±`noise` per finger and see if it
 * still classifies as itself. Shows which letters sit too close to a neighbour.
 */
export function noiseTest(model: SignModel, noise: number, trialsPerSample = 40): LetterResult[] {
  const results = new Map<string, LetterResult>();
  for (const s of model.samples) {
    const r = results.get(s.label) ?? { label: s.label, trials: 0, correct: 0, confusedWith: {} };
    for (let t = 0; t < trialsPerSample; t++) {
      const jittered = s.bends.map((b) => clamp01(b + (Math.random() * 2 - 1) * noise));
      const got = classify(model, jittered).label ?? "none";
      r.trials++;
      if (got === (s.label === REST_LABEL ? "none" : s.label)) r.correct++;
      else r.confusedWith[got] = (r.confusedWith[got] ?? 0) + 1;
    }
    results.set(s.label, r);
  }
  return [...results.values()].sort((a, b) => a.correct / a.trials - b.correct / b.trials);
}

/**
 * Leave-one-out: classify each sample using all the others. Only labels with at
 * least two samples can be tested this way. Returns null if none qualify.
 */
export function leaveOneOut(model: SignModel): { tested: number; correct: number } | null {
  const counts = new Map<string, number>();
  model.samples.forEach((s) => counts.set(s.label, (counts.get(s.label) ?? 0) + 1));
  const testable = model.samples.filter((s) => (counts.get(s.label) ?? 0) >= 2);
  if (!testable.length) return null;
  const correct = testable.filter((s) => {
    const got = classify({ ...model, maxDistance: Infinity }, s.bends, s).ranked[0]?.label;
    return got === s.label;
  }).length;
  return { tested: testable.length, correct };
}

// ── Store (shared by Translate, Learn and Lab) ──────────────────────────────

const DEFAULT_SAMPLES = parseSamplesCsv(defaultCsv);

export function defaultModel(): SignModel {
  return { samples: DEFAULT_SAMPLES, maxDistance: DEFAULT_MAX_DISTANCE };
}

let model: SignModel = load();
const listeners = new Set<() => void>();

function load(): SignModel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const m = JSON.parse(raw) as SignModel;
      if (Array.isArray(m.samples) && typeof m.maxDistance === "number") return m;
    }
  } catch {
    /* fall through to the bundled samples */
  }
  return defaultModel();
}

export function setModel(update: (prev: SignModel) => SignModel) {
  model = update(model);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch {
    /* storage full or blocked; the model still works for this visit */
  }
  listeners.forEach((fn) => fn());
}

export function resetModel() {
  model = defaultModel();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSignModel(): SignModel {
  return useSyncExternalStore(subscribe, () => model);
}
