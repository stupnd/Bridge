/**
 * The five fingers, in sensor order, with the ink each one is drawn in everywhere.
 * Colour means a finger and nothing else (see .bunshin/direction.md).
 */
export const FINGERS = [
  { key: "thumb", name: "Thumb", color: "var(--finger-thumb)" },
  { key: "index", name: "Index", color: "var(--finger-index)" },
  { key: "middle", name: "Middle", color: "var(--finger-middle)" },
  { key: "ring", name: "Ring", color: "var(--finger-ring)" },
  { key: "pinky", name: "Pinky", color: "var(--finger-pinky)" },
] as const;

export type FingerKey = (typeof FINGERS)[number]["key"];

/** A finger's ink mixed toward the ground, for tracks and resting states. */
export const fingerTint = (color: string, pct = 18) => `color-mix(in srgb, ${color} ${pct}%, var(--ground))`;
