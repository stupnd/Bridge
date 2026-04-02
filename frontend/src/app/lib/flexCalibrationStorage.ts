/** Shared flex calibration for Hand Visualizer + Sensor page (localStorage). */

export const FLEX_CALIB_STORAGE_KEY = "bridge-hand-flex-calibration";

export type FlexCalibrationStored = {
  straight: number[];
  bent: number[];
};

export function defaultStraight(): number[] {
  return [0, 0, 0, 0, 0];
}

export function defaultBent(): number[] {
  return [4095, 4095, 4095, 4095, 4095];
}

/** Returns null if nothing saved yet. */
export function loadFlexCalibration(): FlexCalibrationStored | null {
  try {
    const raw = localStorage.getItem(FLEX_CALIB_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { straight?: number[]; bent?: number[] };
    if (
      Array.isArray(p.straight) &&
      Array.isArray(p.bent) &&
      p.straight.length === 5 &&
      p.bent.length === 5
    ) {
      return { straight: [...p.straight], bent: [...p.bent] };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function loadFlexCalibrationWithDefaults(): FlexCalibrationStored {
  return loadFlexCalibration() ?? {
    straight: defaultStraight(),
    bent: defaultBent(),
  };
}

export function saveFlexCalibration(straight: number[], bent: number[]) {
  localStorage.setItem(
    FLEX_CALIB_STORAGE_KEY,
    JSON.stringify({ straight, bent })
  );
}

export function clearFlexCalibrationStorage() {
  localStorage.removeItem(FLEX_CALIB_STORAGE_KEY);
}

/** Map raw ADC to 0–1 bend: straight → 0, bent → 1 (either polarity). */
export function rawToBendNormalized(
  raw: number,
  straight: number,
  bent: number
): number {
  const span = bent - straight;
  if (Math.abs(span) < 1) {
    return Math.max(0, Math.min(1, raw / 4095));
  }
  return Math.max(0, Math.min(1, (raw - straight) / span));
}
