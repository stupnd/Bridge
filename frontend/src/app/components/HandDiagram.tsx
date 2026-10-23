/**
 * A front-view hand silhouette whose fingers fold by bend amount
 * (0 straight → 1 bent). Straight fingers stand up; bent fingers shorten and
 * fold down over the palm, the way a fist looks from the front.
 * Used for the live glove view and for showing a letter's target handshape.
 */

// viewBox 0 0 200 220. Palm spans x 48–152, y 104–196.
const PALM = { x: 48, y: 104, w: 104, h: 92, r: 26 };
// Index → pinky: center x, full length, width.
const FINGERS = [
  { x: 63, len: 72, w: 22 },
  { x: 88, len: 82, w: 23 },
  { x: 113, len: 76, w: 22 },
  { x: 137, len: 58, w: 19 },
];
const FINGER_BASE_Y = PALM.y + 14;
const THUMB = { x: 58, y: 172, len: 58, w: 24 };

const SKIN = "#c7d2fe"; // indigo-200
const FOLD = "#818cf8"; // indigo-400: the parts folded over the palm
const WRONG = "#fbbf24"; // amber-400: a finger that doesn't match in practice

export default function HandDiagram({
  bends,
  highlight,
  muted,
  className = "w-40",
  label,
}: {
  bends: number[];
  /** Per finger: true draws it in the "wrong" color (used for practice feedback). */
  highlight?: boolean[];
  /** Per finger: drawn faded (the glove doesn't check that finger). */
  muted?: boolean[];
  className?: string;
  /** Accessible description; omit for decorative copies. */
  label?: string;
}) {
  const bend = (i: number) => Math.max(0, Math.min(1, bends[i] ?? 0));
  const opacity = (i: number) => (muted?.[i] ? 0.35 : 1);

  const thumbBend = bend(0);
  // Out to the side when straight (-40° from vertical), across the palm when bent (+75°).
  const thumbAngle = -40 + thumbBend * 115;
  const thumbLen = THUMB.len * (1 - 0.25 * thumbBend);
  const thumbColor = highlight?.[0] ? WRONG : thumbBend > 0.5 ? FOLD : SKIN;

  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {/* Wrist and palm */}
      <rect x={70} y={180} width={60} height={40} rx={10} fill={SKIN} />
      <rect x={PALM.x} y={PALM.y} width={PALM.w} height={PALM.h} rx={PALM.r} fill={SKIN} />

      {/* Fingers: upright part above the palm, folded part (when bent) over it */}
      {FINGERS.map((f, k) => {
        const i = k + 1;
        const b = bend(i);
        const upright = f.len * (1 - b) + f.w / 2;
        const folded = f.len * 0.42 * b;
        const color = highlight?.[i] ? WRONG : SKIN;
        const foldColor = highlight?.[i] ? WRONG : FOLD;
        return (
          <g key={i} opacity={opacity(i)}>
            <rect x={f.x - f.w / 2} y={FINGER_BASE_Y - upright} width={f.w} height={upright + 6} rx={f.w / 2} fill={color} />
            {folded > 2 && (
              <rect
                x={f.x - f.w / 2}
                y={FINGER_BASE_Y - f.w / 2}
                width={f.w}
                height={folded + f.w / 2}
                rx={f.w / 2}
                fill={foldColor}
              />
            )}
          </g>
        );
      })}

      {/* Thumb, drawn last so it sits over folded fingers like a real fist */}
      <g opacity={opacity(0)} transform={`rotate(${thumbAngle} ${THUMB.x} ${THUMB.y})`}>
        <rect
          x={THUMB.x - THUMB.w / 2}
          y={THUMB.y - thumbLen}
          width={THUMB.w}
          height={thumbLen + THUMB.w / 2}
          rx={THUMB.w / 2}
          fill={thumbColor}
          stroke="#eef2ff"
          strokeWidth={thumbBend > 0.5 ? 3 : 0}
        />
      </g>
    </svg>
  );
}
