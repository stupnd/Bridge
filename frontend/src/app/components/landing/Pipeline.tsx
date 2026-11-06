/**
 * "How it works": five finger strands run down beside the steps and merge into
 * one ink line at Recognise, drawn by the scroll (ScrollTrigger scrub). Each step
 * lights up as the line reaches it. Reduced motion: the line is drawn in full.
 */
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FINGERS } from "../../lib/fingers";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Step = { key: string; title: string; body: string; fact: string };

const GUTTER = 72;
const MERGE_STEP = 2; // strands become one line at "Recognise"

export default function Pipeline({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const [geo, setGeo] = useState<{ h: number; ys: number[] } | null>(null);

  // Node positions follow the real layout of the steps.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const ys = items.current.map((li) => (li ? li.getBoundingClientRect().top - top + 22 : 0));
      setGeo({ h: el.offsetHeight, ys });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = GUTTER / 2;
  const strand = (i: number) => {
    if (!geo) return "";
    const off = (i - 2) * 7;
    const [y0, , yM] = [geo.ys[0], geo.ys[1], geo.ys[MERGE_STEP]];
    return `M${cx + off} ${y0} L${cx + off} ${yM - 70} C${cx + off} ${yM - 30}, ${cx} ${yM - 30}, ${cx} ${yM}`;
  };
  const tail = geo ? `M${cx} ${geo.ys[MERGE_STEP]} L${cx} ${geo.ys[geo.ys.length - 1]}` : "";

  useGSAP(
    () => {
      if (!geo) return;
      const paths = gsap.utils.toArray<SVGPathElement>(".pl-line", root.current);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
      });
      if (reduced) {
        items.current.forEach((li) => li?.classList.add("is-on"));
        return;
      }
      const strands = paths.filter((p) => p.dataset.part === "strand");
      const tailP = paths.filter((p) => p.dataset.part === "tail");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 65%", end: "bottom 70%", scrub: 0.6 },
      });
      tl.to(strands, { strokeDashoffset: 0, ease: "none", duration: 0.6 }).to(tailP, { strokeDashoffset: 0, ease: "none", duration: 0.4 });
      items.current.forEach((li) => {
        if (!li) return;
        ScrollTrigger.create({
          trigger: li,
          start: "top 62%",
          onToggle: (self) => li.classList.toggle("is-on", self.isActive || self.progress > 0),
          onLeaveBack: () => li.classList.remove("is-on"),
          onEnter: () => li.classList.add("is-on"),
        });
      });
    },
    { scope: root, dependencies: [geo], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="relative">
      {geo && (
        <svg className="pointer-events-none absolute left-0 top-0" width={GUTTER} height={geo.h} aria-hidden>
          <g fill="none" strokeLinecap="round">
            {FINGERS.map((f, i) => (
              <path key={f.key} className="pl-line" data-part="strand" d={strand(i)} stroke={f.color} strokeWidth={4} />
            ))}
            <path className="pl-line" data-part="tail" d={tail} stroke="var(--ink)" strokeWidth={6} />
          </g>
          {geo.ys.map((y, i) => (
            <circle key={i} cx={cx} cy={y} r={9} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2.5} />
          ))}
        </svg>
      )}
      <ol className="space-y-14 md:space-y-20" style={{ paddingLeft: GUTTER + 8 }}>
        {steps.map((s, i) => (
          <li
            key={s.key}
            ref={(el) => (items.current[i] = el)}
            className="group max-w-xl"
          >
            {/* Large titles may sit at 3.4:1 before the line reaches them; body text never dims. */}
            <h3 className="font-display text-title text-ink-faint transition-colors duration-300 ease-out group-[.is-on]:text-ink">{s.title}</h3>
            <p className="mt-2 text-lead text-ink-muted">{s.body}</p>
            <p className="mt-3 inline-block rounded-full bg-wash px-3 py-1 text-sm font-semibold text-ink tabular">{s.fact}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
