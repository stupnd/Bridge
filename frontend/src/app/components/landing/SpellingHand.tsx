/**
 * The landing hero: the drawn hand forms each letter of a word using the
 * handshapes the team recorded (the bundled model samples), and five finger-ink
 * ribbons run from the fingertips to the letter it makes. Plays once; replayable.
 * Reduced motion: the finished word and the last handshape, no animation.
 */
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { RotateCcw } from "lucide-react";
import { FINGERS } from "../../lib/fingers";
import { LONG, PALM, THUMB, WRIST, fingertips, longFinger, thumb } from "../../lib/handGeometry";
import { getLetter, targetBends } from "../../lib/asl";
import { useSignModel } from "../../lib/signModel";
import { PALM_FILL, uprightFill } from "../HandDiagram";

gsap.registerPlugin(useGSAP);

// Hand placement inside the 640×440 drawing.
const HAND = { x: 24, y: 70, s: 1.5 };
const RIB_END_X = 470;
const LETTER = { x: 556, y: 250 };

const toSvg = ([x, y]: [number, number]): [number, number] => [HAND.x + x * HAND.s, HAND.y + y * HAND.s];

function ribbonPath(i: number, bends: number[], tip: [number, number]) {
  const [tx, ty] = toSvg(tip);
  const b = bends[i] ?? 0;
  const lane = 140 + i * 38 + (b - 0.5) * 70;
  const endY = 214 + i * 9;
  return `M${tx.toFixed(1)} ${ty.toFixed(1)} C${(tx + 110).toFixed(1)} ${ty.toFixed(1)}, 360 ${lane.toFixed(1)}, ${RIB_END_X} ${endY}`;
}

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SpellingHand({ word, replayLabel }: { word: string; replayLabel: string }) {
  const model = useSignModel();
  const root = useRef<HTMLDivElement>(null);
  const up = useRef<(SVGRectElement | null)[]>([]);
  const fold = useRef<(SVGRectElement | null)[]>([]);
  const thumbG = useRef<SVGGElement>(null);
  const thumbR = useRef<SVGRectElement>(null);
  const ribs = useRef<(SVGPathElement | null)[]>([]);
  const letter = useRef<SVGTextElement>(null);
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);

  const letters = word.split("");
  const shapeFor = (l: string) => {
    const s = model.samples.find((x) => x.label === l);
    if (s) return s.bends;
    const def = getLetter(l);
    return def ? targetBends(def.fingers) : [0, 0, 0, 0, 0];
  };

  /** Writes a handshape straight to the SVG: no React render per frame. */
  function draw(bends: number[]) {
    LONG.forEach((_, k) => {
      const g = longFinger(k, bends[k + 1]);
      const u = up.current[k];
      if (u) {
        u.setAttribute("y", String(g.up.y));
        u.setAttribute("height", String(g.up.height));
        u.setAttribute("fill", uprightFill(k + 1, bends[k + 1]));
      }
      const f = fold.current[k];
      if (f) {
        f.setAttribute("height", String(g.folded ? g.folded.height : 0));
        f.setAttribute("opacity", g.folded ? "1" : "0");
      }
    });
    const t = thumb(bends[0]);
    thumbG.current?.setAttribute("transform", `rotate(${t.angle} ${THUMB.x} ${THUMB.y})`);
    if (thumbR.current) {
      thumbR.current.setAttribute("y", String(t.rect.y));
      thumbR.current.setAttribute("height", String(t.rect.height));
      thumbR.current.setAttribute("fill", bends[0] > 0.5 ? FINGERS[0].color : uprightFill(0, bends[0]));
    }
    const tips = fingertips(bends);
    ribs.current.forEach((p, i) => p?.setAttribute("d", ribbonPath(i, bends, tips[i])));
  }

  useGSAP(
    () => {
      const last = shapeFor(letters[letters.length - 1]);
      if (prefersReduced()) {
        draw(last);
        if (letter.current) letter.current.textContent = letters[letters.length - 1];
        setShown(letters.length);
        return;
      }
      const state = { b0: 0.1, b1: 0.1, b2: 0.1, b3: 0.1, b4: 0.1 };
      const read = () => [state.b0, state.b1, state.b2, state.b3, state.b4];
      draw(read());
      setShown(0);
      if (letter.current) letter.current.textContent = "";

      const tl = gsap.timeline({ delay: 0.2 });
      // The five lines draw out of the fingertips first.
      tl.fromTo(
        ribs.current,
        { strokeDasharray: 600, strokeDashoffset: 600 },
        { strokeDashoffset: 0, duration: 0.9, ease: "sine.inOut", stagger: 0.06 },
      ).set(ribs.current, { strokeDasharray: "none" });

      letters.forEach((l, n) => {
        const [b0, b1, b2, b3, b4] = shapeFor(l);
        tl.to(state, { b0, b1, b2, b3, b4, duration: 0.7, ease: "sine.inOut", onUpdate: () => draw(read()) }, n === 0 ? "-=0.2" : "+=0.45")
          .call(() => {
            if (letter.current) letter.current.textContent = l;
            setShown(n + 1);
          })
          .fromTo(letter.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" }, "<");
      });
    },
    { scope: root, dependencies: [run], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="relative">
      <svg viewBox="0 0 640 440" className="w-full" role="img" aria-label={`A drawn hand spelling ${word}, one ASL letter at a time, with a line from each finger to the letter.`}>
        <g fill="none" strokeWidth={6} strokeLinecap="round">
          {FINGERS.map((f, i) => (
            <path key={f.key} ref={(el) => (ribs.current[i] = el)} stroke={f.color} />
          ))}
        </g>
        <g transform={`translate(${HAND.x} ${HAND.y}) scale(${HAND.s})`}>
          <rect x={WRIST.x} y={WRIST.y} width={WRIST.w} height={WRIST.h} rx={WRIST.r} fill={PALM_FILL} />
          <rect x={PALM.x} y={PALM.y} width={PALM.w} height={PALM.h} rx={PALM.r} fill={PALM_FILL} />
          {LONG.map((f, k) => (
            <g key={k}>
              <rect ref={(el) => (up.current[k] = el)} x={f.x - f.w / 2} width={f.w} rx={f.w / 2} />
              <rect ref={(el) => (fold.current[k] = el)} x={f.x - f.w / 2} y={104 + 14 - f.w / 2} width={f.w} rx={f.w / 2} fill={FINGERS[k + 1].color} />
            </g>
          ))}
          <g ref={thumbG}>
            <rect ref={thumbR} x={THUMB.x - THUMB.w / 2} width={THUMB.w} rx={THUMB.w / 2} stroke="var(--surface)" strokeWidth={3} />
          </g>
        </g>
        <text
          ref={letter}
          x={LETTER.x}
          y={LETTER.y}
          textAnchor="middle"
          className="font-display"
          fontWeight={800}
          fontSize={132}
          fill="var(--ink)"
        />
      </svg>
      <div className="mt-2 flex items-center justify-between gap-4 px-2">
        <p className="font-display text-2xl font-bold tracking-[0.35em] text-ink tabular" aria-hidden>
          {letters.map((l, i) => (
            <span key={i} className={i < shown ? "opacity-100" : "opacity-15"}>
              {l}
            </span>
          ))}
        </p>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> {replayLabel}
        </button>
      </div>
    </div>
  );
}
