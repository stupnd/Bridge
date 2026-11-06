import { Link } from "react-router";
import { ArrowRight, Check, Minus } from "lucide-react";
import { buttonClass } from "../components/common";
import HandDiagram from "../components/HandDiagram";
import SpellingHand from "../components/landing/SpellingHand";
import Pipeline from "../components/landing/Pipeline";
import TryGlove from "../components/landing/TryGlove";
import Wordmark from "../components/Wordmark";
import { ALPHABET, getLetter, targetBends } from "../lib/asl";
import { handDistance, useSignModel } from "../lib/signModel";
import { faq, footer, hard, hero, how, learn, site, status, team, tryIt } from "../content/landing";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#try", label: "Try it" },
  { href: "#status", label: "Progress" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ground/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Bridge, home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Page">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <Link to="/app" className={buttonClass("primary", "sm")}>
            {hero.primary}
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
          <div>
            <h1 className="font-display text-display font-extrabold text-ink">{hero.title}</h1>
            <p className="mt-5 max-w-xl text-lead text-ink-muted">{hero.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app" className={buttonClass("primary", "lg")}>
                {hero.primary} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#try" className={buttonClass("secondary", "lg")}>
                {hero.secondary}
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{hero.primaryNote}</p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              {hero.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href === "codeUrl" ? site.codeUrl : l.href}
                    className="text-ink underline decoration-hairline decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink"
                    {...(l.href === "codeUrl" ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <SpellingHand word={hero.spell} replayLabel={hero.replay} />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-hairline bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <div className="mb-14 max-w-2xl">
              <h2 className="font-display text-title text-ink">{how.title}</h2>
              <p className="mt-3 text-lead text-ink-muted">{how.lead}</p>
            </div>
            <Pipeline steps={how.steps} />
          </div>
        </section>

        {/* Try it */}
        <section id="try" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-title text-ink">{tryIt.title}</h2>
            <p className="mt-3 text-lead text-ink-muted">{tryIt.lead}</p>
          </div>
          <TryGlove />
        </section>

        {/* Why it's hard */}
        <Lookalikes />

        {/* Progress */}
        <section id="status" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <h2 className="font-display text-title text-ink">{status.title}</h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-10">
              <StatusList title={status.works.title} items={status.works.items} icon="check" />
              <StatusList title={status.next.title} items={status.next.items} icon="next" />
            </div>
            <div id="limits" className="scroll-mt-24 self-start rounded-[var(--radius-card)] border-2 border-ink p-6">
              <h3 className="font-display text-heading text-ink">{status.limits.title}</h3>
              <ul className="mt-4 space-y-3">
                {status.limits.items.map((t) => (
                  <li key={t} className="flex gap-3 text-ink">
                    <Minus className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className="mt-16 font-display text-heading text-ink">{status.scorecard.title}</h3>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-hairline bg-surface">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-wash text-ink">
                <tr>
                  {status.scorecard.columns.map((c) => (
                    <th key={c} scope="col" className="px-4 py-3 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status.scorecard.rows.map((r) => (
                  <tr key={r.req} className="border-t border-hairline">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">{r.req}</th>
                    <td className="px-4 py-3 text-ink-muted">{r.target}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.state === "met" ? "bg-ok-wash text-ok" : r.state === "partial" ? "bg-warn-wash text-warn" : "bg-wash text-ink-muted"
                        }`}
                      >
                        {r.now}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-ink-muted">{status.scorecard.noise}</p>
        </section>

        {/* Learn */}
        <section className="border-y border-hairline bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-title text-ink">{learn.title}</h2>
              <p className="mt-3 text-lead text-ink-muted">{learn.lead}</p>
              <Link to="/app/learn" className={`${buttonClass("secondary", "md")} mt-6`}>
                {learn.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3">
              {ALPHABET.slice(0, 6).map((l) => (
                <li key={l.letter} className="flex flex-col items-center rounded-[var(--radius-card)] bg-ground p-3">
                  <HandDiagram bends={targetBends(l.fingers)} muted={l.fingers.map((f) => f === null)} className="w-16" />
                  <span className="mt-1 font-display text-xl font-bold text-ink">{l.letter}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Team */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <h2 className="font-display text-title text-ink">{team.title}</h2>
          <p className="mt-3 max-w-2xl text-lead text-ink-muted">{team.lead}</p>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-display text-heading text-ink">
            {site.team.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <h2 className="font-display text-title text-ink">{faq.title}</h2>
          <div className="mt-6 divide-y divide-hairline border-y border-hairline">
            {faq.items.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  {f.q}
                  <span className="text-xl leading-none text-ink-muted transition-transform duration-150 group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted sm:px-6">
          <Wordmark />
          <p>{footer.line}</p>
          <p>
            {site.group}, {site.course}, {site.school}, {site.term}
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatusList({ title, items, icon }: { title: string; items: string[]; icon: "check" | "next" }) {
  return (
    <div>
      <h3 className="font-display text-heading text-ink">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-ink">
            {icon === "check" ? (
              <Check className="mt-1 h-4 w-4 shrink-0 text-ok" aria-label="Done" />
            ) : (
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted" aria-label="Next" />
            )}
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The closed-fist letters drawn from the team's own recordings, with how close they really are. */
function Lookalikes() {
  const model = useSignModel();
  const bendsOf = (l: string) => model.samples.find((s) => s.label === l)?.bends ?? targetBends(getLetter(l)!.fingers);
  const d = Math.round(handDistance(bendsOf("E"), bendsOf("S")) * 100);
  return (
    <section className="border-y border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-title text-ink">{hard.title}</h2>
          <p className="mt-3 text-lead text-ink-muted">{hard.lead}</p>
        </div>
        <p className="mt-10 text-sm font-semibold text-ink-muted">{hard.groupLabel}</p>
        <ul className="mt-3 flex flex-wrap gap-4">
          {hard.group.map((l) => (
            <li key={l} className="flex w-28 flex-col items-center rounded-[var(--radius-card)] bg-ground p-3">
              <HandDiagram bends={bendsOf(l)} className="w-20" label={`Recorded handshape for ${l}`} />
              <span className="mt-1 font-display text-2xl font-bold text-ink">{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-ink">{hard.distance("E", "S", d)}</p>
        <p className="mt-2 max-w-2xl text-ink-muted">{hard.next}</p>
      </div>
    </section>
  );
}
