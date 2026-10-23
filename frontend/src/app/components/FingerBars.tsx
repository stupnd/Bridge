import { FINGER_NAMES } from "../lib/asl";

/** One horizontal bar per finger showing how bent it is. */
export default function FingerBars({ bends, compact = false }: { bends: number[]; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {FINGER_NAMES.map((name, i) => {
        const pct = Math.round((bends[i] ?? 0) * 100);
        return (
          <div key={name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">{name}</span>
              <span className="tabular-nums text-gray-500">{pct}% bent</span>
            </div>
            <div
              className={`w-full rounded-full bg-gray-100 ${compact ? "h-2" : "h-3"}`}
              role="meter"
              aria-label={`${name} bend`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-100" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
