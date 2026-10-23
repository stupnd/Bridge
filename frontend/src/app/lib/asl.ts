/**
 * The ASL fingerspelling alphabet: how to form each letter, plus a rough
 * per-finger description used to draw it and coach it in Learn.
 * Live recognition doesn't use these; it's learned from samples (signModel.ts).
 *
 * Finger order everywhere: [thumb, index, middle, ring, pinky].
 */

/** What one finger should be doing. null = the glove doesn't check this finger. */
export type FingerState = "straight" | "bent" | "half" | null;
export type FingerStates = [FingerState, FingerState, FingerState, FingerState, FingerState];

export type Letter = {
  letter: string;
  /** How to form it, in plain language. */
  shape: string;
  /** A common mistake or a detail that's easy to miss. */
  tip?: string;
  fingers: FingerStates;
  /** J and Z are traced in the air; the rest are held still. */
  movement: boolean;
  /** Letters with the same finger bends (they differ in thumb placement,
   * orientation, or motion), so they're easy to mix up. */
  lookalikes: string[];
};

export const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;

const S = "straight" as const;
const B = "bent" as const;
const H = "half" as const;

export const ALPHABET: Letter[] = [
  { letter: "A", shape: "Make a fist with your thumb resting against the side of your index finger.", tip: "Keep the thumb on the side, not across the front (that's S).", fingers: [S, B, B, B, B], movement: false, lookalikes: [] },
  { letter: "B", shape: "Hold four fingers straight up and together, with your thumb folded across your palm.", fingers: [B, S, S, S, S], movement: false, lookalikes: [] },
  { letter: "C", shape: "Curve all your fingers and thumb into a C shape, like holding a cup.", fingers: [H, H, H, H, H], movement: false, lookalikes: ["O"] },
  { letter: "D", shape: "Point your index finger up. Curl the other fingers so they touch your thumb.", fingers: [B, S, B, B, B], movement: false, lookalikes: ["Z"] },
  { letter: "E", shape: "Curl all four fingertips down to touch your thumb, which is tucked under them.", tip: "Fingertips rest on the thumb; it's tighter than a C.", fingers: [B, B, B, B, B], movement: false, lookalikes: ["M", "N", "S", "T"] },
  { letter: "F", shape: "Touch your index fingertip to your thumb in a circle. Hold the other three fingers up.", fingers: [B, B, S, S, S], movement: false, lookalikes: [] },
  { letter: "G", shape: "Point your index finger sideways with your thumb parallel above it. Curl the other fingers.", fingers: [S, S, B, B, B], movement: false, lookalikes: ["L", "Q"] },
  { letter: "H", shape: "Point your index and middle fingers sideways, together. Curl the others.", fingers: [null, S, S, B, B], movement: false, lookalikes: ["U", "V", "R"] },
  { letter: "I", shape: "Raise your pinky. Curl the other fingers with your thumb across them.", fingers: [B, B, B, B, S], movement: false, lookalikes: ["J"] },
  { letter: "J", shape: "Make an I, then trace a J in the air with your pinky by twisting your wrist.", fingers: [B, B, B, B, S], movement: true, lookalikes: ["I"] },
  { letter: "K", shape: "Raise your index and middle fingers in a V with your thumb touching the middle finger between them.", fingers: [S, S, S, B, B], movement: false, lookalikes: ["P"] },
  { letter: "L", shape: "Raise your index finger and stick your thumb out to make an L. Curl the rest.", fingers: [S, S, B, B, B], movement: false, lookalikes: ["G", "Q"] },
  { letter: "M", shape: "Fold your index, middle and ring fingers over your thumb.", tip: "Three fingers over the thumb; N uses two.", fingers: [B, B, B, B, B], movement: false, lookalikes: ["E", "N", "S", "T"] },
  { letter: "N", shape: "Fold your index and middle fingers over your thumb.", fingers: [B, B, B, B, B], movement: false, lookalikes: ["E", "M", "S", "T"] },
  { letter: "O", shape: "Curve all your fingers to touch your thumb, forming an O.", fingers: [H, H, H, H, H], movement: false, lookalikes: ["C"] },
  { letter: "P", shape: "Make a K and point it downward.", fingers: [S, S, S, B, B], movement: false, lookalikes: ["K"] },
  { letter: "Q", shape: "Make a G and point it downward.", fingers: [S, S, B, B, B], movement: false, lookalikes: ["G", "L"] },
  { letter: "R", shape: "Cross your middle finger over your index finger. Curl the rest.", fingers: [B, S, S, B, B], movement: false, lookalikes: ["U", "V", "H"] },
  { letter: "S", shape: "Make a fist with your thumb wrapped across the front of your fingers.", fingers: [B, B, B, B, B], movement: false, lookalikes: ["E", "M", "N", "T"] },
  { letter: "T", shape: "Make a fist with your thumb tucked between your index and middle fingers.", fingers: [B, B, B, B, B], movement: false, lookalikes: ["E", "M", "N", "S"] },
  { letter: "U", shape: "Raise your index and middle fingers, pressed together. Curl the rest.", fingers: [B, S, S, B, B], movement: false, lookalikes: ["V", "R", "H"] },
  { letter: "V", shape: "Raise your index and middle fingers spread apart in a V. Curl the rest.", fingers: [B, S, S, B, B], movement: false, lookalikes: ["U", "R", "H"] },
  { letter: "W", shape: "Raise your index, middle and ring fingers spread apart. Hold your pinky down with your thumb.", fingers: [B, S, S, S, B], movement: false, lookalikes: [] },
  { letter: "X", shape: "Raise your index finger and bend it into a hook. Curl the rest.", fingers: [B, H, B, B, B], movement: false, lookalikes: [] },
  { letter: "Y", shape: "Stick out your thumb and pinky. Curl the three middle fingers.", fingers: [S, B, B, B, S], movement: false, lookalikes: [] },
  { letter: "Z", shape: "Point your index finger and trace a Z in the air.", fingers: [B, S, B, B, B], movement: true, lookalikes: ["D"] },
];

export function getLetter(letter: string): Letter | undefined {
  return ALPHABET.find((l) => l.letter === letter);
}

/** Bend (0 straight → 1 fully bent) at which a finger counts as bent. */
const BENT_AT = 0.45;

/** Does one finger's bend satisfy the target state? */
export function fingerMatches(state: FingerState, bend: number): boolean {
  if (state === null) return true;
  if (state === "half") return bend > 0.2 && bend < 0.8;
  return state === "bent" ? bend >= BENT_AT : bend < BENT_AT;
}

/** A hint for a finger that doesn't match, e.g. "Bend your index more". */
export function fingerHint(state: FingerState, bend: number, name: string): string | null {
  if (fingerMatches(state, bend)) return null;
  const n = name.toLowerCase();
  if (state === "straight") return `Straighten your ${n}`;
  if (state === "bent") return `Bend your ${n} more`;
  return bend <= 0.2 ? `Curve your ${n} a little` : `Relax your ${n} a little`;
}

/** Bend values to draw a target handshape (unchecked fingers drawn straight). */
export function targetBends(fingers: FingerStates): number[] {
  return fingers.map((s) => (s === "bent" ? 1 : s === "half" ? 0.5 : 0));
}
