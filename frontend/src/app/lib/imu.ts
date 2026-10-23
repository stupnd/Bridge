/**
 * 9-axis (ICM-20948) helpers: turning a window of glove frames into features,
 * hand-written movement rules, and a small k-nearest-neighbours classifier.
 *
 * Units match the firmware: acc in mg, gyr in deg/s, mag in uT.
 * Axis names (X/Y/Z) are the sensor's own axes. What "palm down" means in
 * those axes depends on how the sensor is mounted on the glove.
 */
import { rawToBendNormalized } from "./flexCalibrationStorage";

export type Vec3 = [number, number, number];

export type ImuReading = { acc: Vec3; gyr: Vec3; mag: Vec3 };

export const EMPTY_IMU: ImuReading = { acc: [0, 0, 0], gyr: [0, 0, 0], mag: [0, 0, 0] };

/** One BLE packet. `t` is ms (performance.now() live, relative to window start once recorded). */
export type Frame = ImuReading & { t: number; fingers: number[] };

export type FlexCalibration = { open: number[]; closed: number[] };

export type Features = {
  /** 0 = straight, 1 = fully bent; mean over the window. */
  bend: number[];
  /** Unit vector of the mean accelerometer reading: which way is "up" for the sensor. */
  gravity: Vec3;
  rollDeg: number;
  pitchDeg: number;
  /** RMS of the gyro magnitude, deg/s. ~0 when still. */
  gyroRms: number;
  gyroPeak: number;
  /** Gyro integrated over the window, degrees turned about each axis. */
  rotationDeg: Vec3;
  /** Standard deviation of |acc|, mg. Picks up jerks/shakes the gyro misses. */
  accStd: number;
  /** Direction changes on the busiest gyro axis. Back-and-forth motions (Z, waving) score high. */
  reversals: number;
  durationMs: number;
  frameCount: number;
};

export const AXES = ["X", "Y", "Z"] as const;

const REVERSAL_DEADBAND_DPS = 30; // ignore wobble below this when counting direction changes
const MAX_DT_S = 0.1; // cap gaps from dropped packets so one gap doesn't dominate the integral

export function imuLooksDisconnected(r: ImuReading): boolean {
  return [...r.acc, ...r.gyr, ...r.mag].every((v) => v === 0);
}

export function mag3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Roll/pitch from a gravity reading. Only meaningful when the hand isn't accelerating hard. */
export function tiltFromAcc(acc: Vec3): { rollDeg: number; pitchDeg: number } {
  const [x, y, z] = acc;
  return {
    rollDeg: (Math.atan2(y, z) * 180) / Math.PI,
    pitchDeg: (Math.atan2(-x, Math.hypot(y, z)) * 180) / Math.PI,
  };
}

/** Plain-language "which sensor axis points up", e.g. "+Z up". */
export function upAxisLabel(gravity: Vec3): string {
  let best = 0;
  for (let i = 1; i < 3; i++) if (Math.abs(gravity[i]) > Math.abs(gravity[best])) best = i;
  if (Math.abs(gravity[best]) < 0.6) return "tilted (between axes)";
  return `${gravity[best] > 0 ? "+" : "−"}${AXES[best]} up`;
}

export function computeFeatures(frames: Frame[], calib: FlexCalibration | null): Features {
  const n = frames.length;
  const bend = [0, 1, 2, 3, 4].map((i) =>
    mean(
      frames.map((f) =>
        calib
          ? rawToBendNormalized(f.fingers[i], calib.open[i], calib.closed[i])
          : f.fingers[i] / 4095
      )
    )
  );

  const accMean: Vec3 = [0, 1, 2].map((a) => mean(frames.map((f) => f.acc[a]))) as Vec3;
  const g = mag3(accMean) || 1;
  const gravity: Vec3 = [accMean[0] / g, accMean[1] / g, accMean[2] / g];

  const gyroMags = frames.map((f) => mag3(f.gyr));
  const rotationDeg: Vec3 = [0, 0, 0];
  for (let k = 1; k < n; k++) {
    const dt = Math.min((frames[k].t - frames[k - 1].t) / 1000, MAX_DT_S);
    for (let a = 0; a < 3; a++) rotationDeg[a] += frames[k].gyr[a] * dt;
  }

  // Busiest gyro axis, then count sign flips on it with a deadband.
  const energy = [0, 1, 2].map((a) => frames.reduce((s, f) => s + f.gyr[a] ** 2, 0));
  const axis = energy.indexOf(Math.max(...energy));
  let reversals = 0;
  let lastSign = 0;
  for (const f of frames) {
    const v = f.gyr[axis];
    if (Math.abs(v) < REVERSAL_DEADBAND_DPS) continue;
    const sign = Math.sign(v);
    if (lastSign !== 0 && sign !== lastSign) reversals++;
    lastSign = sign;
  }

  return {
    bend,
    gravity,
    ...tiltFromAcc(accMean),
    gyroRms: Math.sqrt(mean(gyroMags.map((m) => m * m))),
    gyroPeak: n ? Math.max(...gyroMags) : 0,
    rotationDeg,
    accStd: std(frames.map((f) => mag3(f.acc))),
    reversals,
    durationMs: n > 1 ? frames[n - 1].t - frames[0].t : 0,
    frameCount: n,
  };
}

// ── Hand-written rules ─────────────────────────────────────────────────────
// Each rule looks at one window of features. They're deliberately simple
// starting points; tune the thresholds against the per-label table on the
// Collect page once you have recordings.

export type MotionRule = {
  label: string;
  description: string;
  test: (f: Features) => boolean;
};

const bent = (b: number) => b > 0.6;
const straight = (b: number) => b < 0.4;
const maxAbsRotation = (f: Features) => Math.max(...f.rotationDeg.map(Math.abs));

export const MOTION_RULES: MotionRule[] = [
  {
    label: "Still",
    description: "Gyro under 20°/s and no jerks: a held static pose",
    test: (f) => f.gyroRms < 20 && f.accStd < 50,
  },
  {
    label: "Turn",
    description: "Hand rotates more than 60° in one direction",
    test: (f) => maxAbsRotation(f) > 60 && f.reversals <= 1,
  },
  {
    label: "Shake / wave",
    description: "Fast back-and-forth: 3+ direction changes above 60°/s",
    test: (f) => f.reversals >= 3 && f.gyroRms > 60,
  },
  {
    label: "J",
    description: "Pinky up, other fingers curled (I handshape) + a turn of 60°+",
    test: (f) =>
      straight(f.bend[4]) && bent(f.bend[1]) && bent(f.bend[2]) && bent(f.bend[3]) &&
      maxAbsRotation(f) > 60,
  },
  {
    label: "Z",
    description: "Index up, middle/ring/pinky curled + 2+ direction changes (tracing a Z)",
    test: (f) =>
      straight(f.bend[1]) && bent(f.bend[2]) && bent(f.bend[3]) && bent(f.bend[4]) &&
      f.reversals >= 2 && f.gyroRms > 40,
  },
];

// ── k-nearest-neighbours ───────────────────────────────────────────────────

export const FEATURE_NAMES = [
  "bend thumb", "bend index", "bend middle", "bend ring", "bend pinky",
  "gravity X", "gravity Y", "gravity Z",
  "turn X", "turn Y", "turn Z",
  "gyro RMS", "acc jerk", "reversals",
] as const;

export function featureVector(f: Features): number[] {
  return [
    ...f.bend,
    ...f.gravity,
    ...f.rotationDeg,
    f.gyroRms,
    f.accStd,
    f.reversals,
  ];
}

export type Example = { label: string; vector: number[] };

export type KnnModel = {
  k: number;
  mean: number[];
  scale: number[];
  examples: { label: string; z: number[] }[];
  /** Feature indices in use (lets you train on flex-only vs. everything). */
  use: number[];
};

export function trainKnn(data: Example[], use: number[], k = 3): KnnModel {
  const cols = use.map((i) => data.map((d) => d.vector[i]));
  const m = cols.map(mean);
  // A feature that never varies gets scale 1 so it doesn't divide by zero.
  const s = cols.map((c) => std(c) || 1);
  return {
    k,
    mean: m,
    scale: s,
    use,
    examples: data.map((d) => ({
      label: d.label,
      z: use.map((i, j) => (d.vector[i] - m[j]) / s[j]),
    })),
  };
}

export type Prediction = { label: string; confidence: number; votes: Record<string, number> };

export function predictKnn(model: KnnModel, vector: number[], skip = -1): Prediction | null {
  const z = model.use.map((i, j) => (vector[i] - model.mean[j]) / model.scale[j]);
  const ranked = model.examples
    .map((e, idx) => ({ label: e.label, idx, d: Math.hypot(...e.z.map((v, j) => v - z[j])) }))
    .filter((r) => r.idx !== skip)
    .sort((a, b) => a.d - b.d)
    .slice(0, model.k);
  if (!ranked.length) return null;
  const votes: Record<string, number> = {};
  for (const r of ranked) votes[r.label] = (votes[r.label] ?? 0) + 1;
  const label = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
  return { label, confidence: votes[label] / ranked.length, votes };
}

/** Leave-one-out: classify each example using all the others. Honest accuracy for tiny datasets. */
export function evaluateKnn(model: KnnModel, data: Example[]) {
  const confusion: Record<string, Record<string, number>> = {};
  let correct = 0;
  data.forEach((d, i) => {
    const p = predictKnn(model, d.vector, i);
    const got = p?.label ?? "?";
    confusion[d.label] ??= {};
    confusion[d.label][got] = (confusion[d.label][got] ?? 0) + 1;
    if (got === d.label) correct++;
  });
  return { accuracy: data.length ? correct / data.length : 0, confusion };
}
