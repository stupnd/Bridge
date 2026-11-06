import { FINGERS } from "../lib/fingers";

/** The Bridge mark: five finger lines meeting in one, next to the name. */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 28 24" className="h-6 w-7" aria-hidden>
        <g fill="none" strokeWidth={2.4} strokeLinecap="round">
          {FINGERS.map((f, i) => (
            <path key={f.key} d={`M2 ${3 + i * 4.5} C12 ${3 + i * 4.5}, 14 12, 26 12`} stroke={f.color} />
          ))}
        </g>
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">Bridge</span>
    </span>
  );
}
