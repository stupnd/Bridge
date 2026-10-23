/** Data model + CSV export for the Collect page. */

export type Hand = "L" | "R";
export type SignType = "static" | "moving" | "none";

export const SIGN_TYPE_WINDOW_MS: Record<SignType, number> = {
  static: 1500,
  moving: 2500,
  none: 2000,
};

export const MIN_RATE_HZ = 15;

export type CollectFrame = {
  frame_idx: number;
  /** ms since this recording started */
  t_ms: number;
  raw: number[]; // 5
  pct: number[]; // 5, 0–100
  imu: number[]; // 9: ax ay az (mg), gx gy gz (dps), mx my mz (µT)
};

export type CollectSession = {
  session_id: string;
  participant_id: string;
  hand: Hand;
  calibrated_at: string;
  open: number[];
  closed: number[];
};

export type CollectSample = {
  sample_id: string;
  session_id: string;
  participant_id: string;
  hand: Hand;
  label: string;
  sign_type: SignType;
  rep: number;
  window_ms: number;
  recorded_at: string;
  notes: string;
  frames: CollectFrame[];
};

export type CollectData = {
  sessions: CollectSession[];
  samples: CollectSample[];
};

export function nextRep(samples: CollectSample[], sessionId: string, label: string): number {
  return (
    samples.reduce(
      (max, s) => (s.session_id === sessionId && s.label === label ? Math.max(max, s.rep) : max),
      0
    ) + 1
  );
}

export function sampleRateHz(s: CollectSample): number {
  return s.window_ms > 0 ? s.frames.length / (s.window_ms / 1000) : 0;
}

export function sampleWarnings(s: CollectSample): string[] {
  if (s.frames.length === 0) return ["No frames"];
  const warnings: string[] = [];
  if (sampleRateHz(s) < MIN_RATE_HZ) warnings.push("Low rate");
  if (s.frames.every((f) => f.imu.every((v) => v === 0))) warnings.push("IMU not reporting");
  return warnings;
}

// ── CSV ──

export function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const FINGER_IDS = [1, 2, 3, 4, 5];
const IMU_COLS = ["ax", "ay", "az", "gx", "gy", "gz", "mx", "my", "mz"];

function handColumns(hand: Hand): string[] {
  return [
    ...FINGER_IDS.map((n) => `${hand}_raw_f${n}`),
    ...FINGER_IDS.map((n) => `${hand}_pct_f${n}`),
    ...IMU_COLS.map((c) => `${hand}_${c}`),
  ];
}

export const FRAME_CSV_HEADER = [
  "sample_id",
  "session_id",
  "participant_id",
  "label",
  "sign_type",
  "rep",
  "window_ms",
  "recorded_at",
  "notes",
  "frame_idx",
  "t_ms",
  ...handColumns("R"),
  ...handColumns("L"),
];

const EMPTY_HAND: null[] = new Array(handColumns("R").length).fill(null);

/** Long format: one row per frame. The other hand's columns are left empty. */
export function buildFramesCsv(samples: CollectSample[]): string {
  const lines = [FRAME_CSV_HEADER.join(",")];
  for (const s of samples) {
    const meta = [
      s.sample_id,
      s.session_id,
      s.participant_id,
      s.label,
      s.sign_type,
      s.rep,
      s.window_ms,
      s.recorded_at,
      s.notes,
    ];
    for (const f of s.frames) {
      const values = [...f.raw, ...f.pct, ...f.imu];
      const right = s.hand === "R" ? values : EMPTY_HAND;
      const left = s.hand === "L" ? values : EMPTY_HAND;
      lines.push([...meta, f.frame_idx, f.t_ms, ...right, ...left].map(csvCell).join(","));
    }
  }
  return lines.join("\n");
}

export function buildCalibrationCsv(sessions: CollectSession[]): string {
  const header = [
    "session_id",
    "participant_id",
    "hand",
    "calibrated_at",
    ...FINGER_IDS.map((n) => `open_f${n}`),
    ...FINGER_IDS.map((n) => `closed_f${n}`),
  ];
  const rows = sessions.map((s) =>
    [s.session_id, s.participant_id, s.hand, s.calibrated_at, ...s.open, ...s.closed]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Delay so back-to-back downloads aren't cancelled before the browser picks them up.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
