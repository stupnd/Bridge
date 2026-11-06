/**
 * The landing page's virtual glove: one slider per finger, drawn in that finger's
 * ink, feeding the same recogniser the real glove uses (lib/signModel).
 * Hovering or focusing a finger's control thickens its line.
 */
import { useState } from "react";
import HandDiagram from "../HandDiagram";
import { FINGERS, fingerTint } from "../../lib/fingers";
import { classify, useSignModel } from "../../lib/signModel";
import { tryIt } from "../../content/landing";

const PRESETS = ["A", "B", "L", "Y", "E", "S"];

export default function TryGlove() {
  const model = useSignModel();
  const [bends, setBends] = useState<number[]>(() => model.samples.find((s) => s.label === "L")?.bends ?? [0.1, 0.1, 0.9, 0.9, 0.9]);
  const [hot, setHot] = useState<number | null>(null);
  const r = classify(model, bends);
  const top = r.ranked.slice(0, 3);

  const load = (l: string) => {
    const s = model.samples.find((x) => x.label === l);
    if (s) setBends([...s.bends]);
  };

  return (
    <div className="grid gap-8 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
      <div className="space-y-5">
        {FINGERS.map((f, i) => (
          <label
            key={f.key}
            className="block"
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
          >
            <span className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold text-ink">{f.name}</span>
              <span className="tabular text-ink-muted">{Math.round(bends[i] * 100)}% bent</span>
            </span>
            <span className="relative block h-7">
              <span
                aria-hidden
                className="absolute inset-x-0 top-[11px] h-1.5 rounded-full transition-transform duration-150 ease-out"
                style={{ transform: `scaleY(${hot === i ? 1.7 : 1})`, background: fingerTint(f.color, 22) }}
              />
              <span
                aria-hidden
                className="absolute inset-x-0 top-[11px] h-1.5 origin-left rounded-full transition-transform duration-150 ease-out"
                style={{ transform: `scale(${bends[i]}, ${hot === i ? 1.7 : 1})`, background: f.color }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(bends[i] * 100)}
                onChange={(e) => setBends((b) => b.map((v, k) => (k === i ? Number(e.target.value) / 100 : v)))}
                className="try-range absolute inset-0 w-full"
                style={{ ["--thumb-color" as string]: f.color }}
                aria-label={`${f.name} bend`}
              />
            </span>
          </label>
        ))}
        <div>
          <p className="mb-2 text-sm text-ink-muted">{tryIt.presets}</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => load(l)}
                className="h-10 w-10 rounded-[var(--radius-control)] border border-hairline bg-ground font-display text-lg font-bold text-ink transition-colors duration-150 hover:border-ink"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <HandDiagram bends={bends} className="mx-auto w-44 sm:w-52" label="The hand your sliders make" />

      <div className="text-center lg:text-left" aria-live="polite">
        <p className="text-sm text-ink-muted">Reads as</p>
        <p className={`font-display text-[7rem] font-extrabold leading-none ${r.label ? "text-ink" : "text-ink-faint"}`}>
          {r.label ?? (r.status === "unsure" ? `${top[0]?.label}?` : "–")}
        </p>
        <p className="mt-2 min-h-[1.5rem] text-sm font-semibold text-ink">
          {r.status === "unsure" && top[1] ? tryIt.unsure(top[0].label, top[1].label) : r.label ? `${Math.round(r.confidence * 100)}% sure` : tryIt.none}
        </p>
        <p className="mt-5 text-sm text-ink-muted">{tryIt.closest}</p>
        <ul className="mt-1 space-y-1 text-sm">
          {top.map((t) => (
            <li key={t.label} className="flex items-center gap-3 lg:justify-start justify-center">
              <span className="w-6 font-display font-bold text-ink">{t.label}</span>
              <span className="tabular text-ink-muted">{Math.round(t.distance * 100)}% off</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-ink-muted lg:col-span-3">{tryIt.note}</p>
    </div>
  );
}
