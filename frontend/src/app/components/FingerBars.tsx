import { FINGERS, fingerTint } from "../lib/fingers";

/** One horizontal bar per finger, in that finger's ink, showing how bent it is. */
export default function FingerBars({ bends, compact = false }: { bends: number[]; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3.5"}>
      {FINGERS.map((f, i) => {
        const pct = Math.round((bends[i] ?? 0) * 100);
        return (
          <div key={f.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} aria-hidden />
                {f.name}
              </span>
              <span className="tabular text-ink-muted">{pct}% bent</span>
            </div>
            <div
              className={`w-full overflow-hidden rounded-full ${compact ? "h-2" : "h-3"}`}
              style={{ background: fingerTint(f.color, 16) }}
              role="meter"
              aria-label={`${f.name} bend`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full origin-left rounded-full transition-transform duration-100 ease-out"
                style={{ background: f.color, transform: `scaleX(${pct / 100})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
