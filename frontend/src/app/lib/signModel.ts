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
import { useRef, useSyncExternalStore } from "react";
import defaultCsv from "../data/asl-samples.csv?raw";
import type { CollectData } from "./collectData";

export type Sample = { label: string; bends: number[] };

export type SignModel = {
  samples: Sample[];
  /** Reject a match whose average finger difference (0–1) is above this. */
  maxDistance: number;
  /** Report "unsure" when the winner is less than this much closer than the runner-up (0–1). */
  minConfidence: number;
};

export type Ranked = { label: string; distance: number };

export type Classification = {
  /** The letter to act on; null unless `status` is "letter". */
  label: string | null;
  /**
   * letter: confident match · unsure: the two closest are too alike to call ·
   * far: nothing is close enough · rest: the hand looks like the "Rest" samples.
   */
  status: "letter" | "unsure" | "far" | "rest";
  /** Every label, closest first. */
  ranked: Ranked[];
  /** 0–1: how much closer the winner is than the runner-up. Low = easily confused. */
  confidence: number;
};

/** Samples with this label teach the model what "not signing" looks like. */
export const REST_LABEL = "REST";
export const DEFAULT_MAX_DISTANCE = 0.25;
export const DEFAULT_MIN_CONFIDENCE = 0.15;

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
  if (col("sample_id") >= 0 && col("frame_idx") >= 0) return parseFramesCsv(rows, col);
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

/**
 * Reads the Collect page's frames CSV (one row per packet, R_/L_ columns):
 * each sample becomes the average bend over its frames. "none" samples
 * become Rest; moving ones are skipped.
 */
function parseFramesCsv(rows: string[][], col: (name: string) => number): Sample[] {
  const idCol = col("sample_id");
  const labelCol = col("label");
  const typeCol = col("sign_type");
  const hands = ["r", "l"].map((h) => [1, 2, 3, 4, 5].map((i) => col(`${h}_pct_f${i}`)));
  if (labelCol < 0 || hands.some((h) => h.some((c) => c < 0))) {
    throw new Error("Expected label and R_/L_ pct_f1 … pct_f5 columns.");
  }
  const groups = new Map<string, { label: string; sum: number[]; n: number }>();
  for (const r of rows) {
    const type = typeCol >= 0 ? r[typeCol]?.trim().toLowerCase() : "static";
    if (type === "moving") continue;
    // Each row fills one hand's columns and leaves the other empty.
    const cols = hands.find((h) => r[h[0]]?.trim() !== "");
    if (!cols) continue;
    const pct = cols.map((c) => Number(r[c]) / 100);
    if (pct.some((v) => !Number.isFinite(v))) continue;
    const label = type === "none" ? REST_LABEL : r[labelCol]?.trim().toUpperCase();
    if (!label) continue;
    const g = groups.get(r[idCol]) ?? { label, sum: [0, 0, 0, 0, 0], n: 0 };
    pct.forEach((v, i) => (g.sum[i] += v));
    g.n++;
    groups.set(r[idCol], g);
  }
  return [...groups.values()].map((g) => ({ label: g.label, bends: g.sum.map((v) => clamp01(v / g.n)) }));
}

/** Same as the frames CSV, straight from the Collect page's saved data. */
export function samplesFromCollectData(data: CollectData): Sample[] {
  return data.samples
    .filter((s) => s.sign_type !== "moving" && s.frames.length > 0)
    .map((s) => ({
      label: s.sign_type === "none" ? REST_LABEL : s.label.toUpperCase(),
      bends: [0, 1, 2, 3, 4].map((i) => clamp01(s.frames.reduce((sum, f) => sum + f.pct[i], 0) / s.frames.length / 100)),
    }));
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
  const status: Classification["status"] =
    !first || first.distance > model.maxDistance ? "far"
    : first.label === REST_LABEL ? "rest"
    : confidence < model.minConfidence ? "unsure"
    : "letter";
  return { label: status === "letter" ? first.label : null, status, ranked, confidence };
}

/** How long a label must dominate before the smoothed prediction switches to it. */
export const SMOOTHING_MS = 300;

/**
 * classify() smoothed over the last SMOOTHING_MS: a label wins only if it was
 * the result for most of that time, so sensor noise doesn't make the letter
 * flicker (E → S → E). Returns the latest raw result alongside.
 */
export function useSmoothedClassification(model: SignModel, bends: number[], active: boolean) {
  const history = useRef<{ t: number; key: string }[]>([]);
  const raw = classify(model, bends);
  const now = performance.now();
  if (!active) {
    history.current = [];
    return { ...raw, label: null, status: "far" as const, raw };
  }
  const key = raw.status === "letter" ? raw.label! : raw.status;
  history.current = [...history.current.filter((h) => now - h.t < SMOOTHING_MS), { t: now, key }];
  const votes = new Map<string, number>();
  history.current.forEach((h) => votes.set(h.key, (votes.get(h.key) ?? 0) + 1));
  const [winner, n] = [...votes].sort((a, b) => b[1] - a[1])[0];
  if (n / history.current.length < 0.6) return { ...raw, label: null, status: "unsure" as const, raw };
  const isLetter = !["far", "rest", "unsure"].includes(winner);
  return {
    ...raw,
    label: isLetter ? winner : null,
    status: (isLetter ? "letter" : winner) as Classification["status"],
    raw,
  };
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
      const c = classify(model, jittered);
      const got = c.status === "letter" ? c.label! : c.status === "rest" ? REST_LABEL : c.status;
      r.trials++;
      if (got === s.label) r.correct++;
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
    const got = classify({ ...model, maxDistance: Infinity, minConfidence: 0 }, s.bends, s).ranked[0]?.label;
    return got === s.label;
  }).length;
  return { tested: testable.length, correct };
}

// ── Store (shared by Translate, Learn and Lab) ──────────────────────────────

const DEFAULT_SAMPLES = parseSamplesCsv(defaultCsv);

export function defaultModel(): SignModel {
  return { samples: DEFAULT_SAMPLES, maxDistance: DEFAULT_MAX_DISTANCE, minConfidence: DEFAULT_MIN_CONFIDENCE };
}

let model: SignModel = load();
const listeners = new Set<() => void>();

function load(): SignModel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Older saves don't have minConfidence.
      const m = JSON.parse(raw) as Partial<SignModel>;
      if (Array.isArray(m.samples) && typeof m.maxDistance === "number") {
        return { samples: m.samples, maxDistance: m.maxDistance, minConfidence: m.minConfidence ?? DEFAULT_MIN_CONFIDENCE };
      }
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
