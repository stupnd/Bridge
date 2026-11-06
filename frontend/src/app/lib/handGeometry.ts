/**
 * Geometry of the drawn hand (viewBox 0 0 200 220), shared by HandDiagram and the
 * animated hand on the landing page so both always draw the same shape.
 * Finger order: thumb, index, middle, ring, pinky. Bends are 0 (straight) to 1 (bent).
 */

export const PALM = { x: 48, y: 104, w: 104, h: 92, r: 26 };
export const WRIST = { x: 70, y: 180, w: 60, h: 40, r: 10 };
/** Index → pinky: center x, full length, width. */
export const LONG = [
  { x: 63, len: 72, w: 22 },
  { x: 88, len: 82, w: 23 },
  { x: 113, len: 76, w: 22 },
  { x: 137, len: 58, w: 19 },
];
export const FINGER_BASE_Y = PALM.y + 14;
export const THUMB = { x: 58, y: 172, len: 58, w: 24 };

const clamp01 = (b: number) => Math.max(0, Math.min(1, b));

export type Rect = { x: number; y: number; width: number; height: number; rx: number };

export function longFinger(k: number, bend: number): { up: Rect; folded: Rect | null; tip: [number, number] } {
  const f = LONG[k];
  const b = clamp01(bend);
  const upH = f.len * (1 - b) + f.w / 2;
  const foldH = f.len * 0.42 * b;
  return {
    up: { x: f.x - f.w / 2, y: FINGER_BASE_Y - upH, width: f.w, height: upH + 6, rx: f.w / 2 },
    // Below a quarter bend the fold is too small to read and shows as a stray stub.
    folded: b > 0.25 ? { x: f.x - f.w / 2, y: FINGER_BASE_Y - f.w / 2, width: f.w, height: foldH + f.w / 2, rx: f.w / 2 } : null,
    // A bent finger's visible end is the knuckle fold, low on the palm.
    tip: b > 0.6 ? [f.x, FINGER_BASE_Y + foldH * 0.6] : [f.x, FINGER_BASE_Y - upH + f.w / 2],
  };
}

export function thumb(bend: number): { angle: number; rect: Rect; tip: [number, number] } {
  const b = clamp01(bend);
  // Out to the side when straight (-40° from vertical), across the palm when bent (+75°).
  const angle = -40 + b * 115;
  const len = THUMB.len * (1 - 0.25 * b);
  const rad = (angle * Math.PI) / 180;
  const reach = len - THUMB.w / 2;
  return {
    angle,
    rect: { x: THUMB.x - THUMB.w / 2, y: THUMB.y - len, width: THUMB.w, height: len + THUMB.w / 2, rx: THUMB.w / 2 },
    tip: [THUMB.x + Math.sin(rad) * reach, THUMB.y - Math.cos(rad) * reach],
  };
}

/** Fingertip points for all five fingers, in hand coordinates. */
export function fingertips(bends: number[]): [number, number][] {
  return [thumb(bends[0] ?? 0).tip, ...LONG.map((_, k) => longFinger(k, bends[k + 1] ?? 0).tip)];
}
