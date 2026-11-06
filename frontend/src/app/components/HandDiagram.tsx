/**
 * A front-view hand whose fingers fold by bend amount (0 straight → 1 bent),
 * each finger drawn in its own ink (lib/fingers). Straight fingers stand up in a
 * light tint; bending deepens the ink and folds the finger over the palm.
 * Used for the live glove view and for showing a letter's target handshape.
 * Drawn as a left hand (thumb on the right) to match the glove.
 */
import { FINGERS, fingerTint } from "../lib/fingers";
import { LONG, PALM, THUMB, WRIST, longFinger, thumb } from "../lib/handGeometry";

export const PALM_FILL = "#ece8e1";

/** The tint of a finger's upright part: lighter when straight, deeper as it bends. */
export const uprightFill = (i: number, bend: number) =>
  fingerTint(FINGERS[i].color, Math.round(28 + 52 * Math.max(0, Math.min(1, bend))));

export default function HandDiagram({
  bends,
  highlight,
  muted,
  className = "w-40",
  label,
}: {
  bends: number[];
  /** Per finger: true outlines it in ink with a dashed line (practice: "this one is off"). */
  highlight?: boolean[];
  /** Per finger: drawn faded (the glove doesn't check that finger). */
  muted?: boolean[];
  className?: string;
  /** Accessible description; omit for decorative copies. */
  label?: string;
}) {
  const opacity = (i: number) => (muted?.[i] ? 0.3 : 1);
  const outline = (i: number) =>
    highlight?.[i] ? { stroke: "var(--ink)", strokeWidth: 2.5, strokeDasharray: "4 3" } : {};
  const t = thumb(bends[0] ?? 0);
  const thumbBent = (bends[0] ?? 0) > 0.5;

  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {/* handGeometry draws a right hand; flip it across the 200-wide viewBox. */}
      <g transform="matrix(-1 0 0 1 200 0)">
        <rect x={WRIST.x} y={WRIST.y} width={WRIST.w} height={WRIST.h} rx={WRIST.r} fill={PALM_FILL} />
        <rect x={PALM.x} y={PALM.y} width={PALM.w} height={PALM.h} rx={PALM.r} fill={PALM_FILL} />

        {LONG.map((_, k) => {
          const i = k + 1;
          const g = longFinger(k, bends[i] ?? 0);
          return (
            <g key={i} opacity={opacity(i)}>
              <rect {...g.up} fill={uprightFill(i, bends[i] ?? 0)} {...outline(i)} />
              {g.folded && <rect {...g.folded} fill={FINGERS[i].color} {...outline(i)} />}
            </g>
          );
        })}

        {/* Thumb, drawn last so it sits over folded fingers like a real fist */}
        <g opacity={opacity(0)} transform={`rotate(${t.angle} ${THUMB.x} ${THUMB.y})`}>
          <rect
            {...t.rect}
            fill={thumbBent ? FINGERS[0].color : uprightFill(0, bends[0] ?? 0)}
            stroke={highlight?.[0] ? "var(--ink)" : "var(--surface)"}
            strokeWidth={highlight?.[0] ? 2.5 : thumbBent ? 3 : 0}
            strokeDasharray={highlight?.[0] ? "4 3" : undefined}
          />
        </g>
      </g>
    </svg>
  );
}
