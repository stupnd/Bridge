import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Check, LogOut, User } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { supabase } from "../../supabaseClient";
import { Button, Card, Page, PageHeader } from "../components/common";
import { ALPHABET } from "../lib/asl";
import { isLearned, letterProgress, useLearnProgress } from "../lib/learnProgress";
import { useSignModel } from "../lib/signModel";

gsap.registerPlugin(useGSAP);

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; joined: string } | null>(null);
  const progress = useLearnProgress();
  const model = useSignModel();
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        setUser({
          email: u.email ?? "",
          joined: new Date(u.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        });
      }
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const perLetter = ALPHABET.map((l) => letterProgress(progress, l.letter));
  const learned = perLetter.filter(isLearned).length;
  const practiced = perLetter.reduce((s, p) => s + p.practiced, 0);
  const quizRight = perLetter.reduce((s, p) => s + p.quizCorrect, 0);
  const quizTotal = quizRight + perLetter.reduce((s, p) => s + p.quizWrong, 0);

  const stats = [
    { label: "Glove practice reps", value: String(practiced), note: "Handshapes held right with the glove" },
    {
      label: "Quiz accuracy",
      value: quizTotal ? `${Math.round((quizRight / quizTotal) * 100)}%` : "–",
      note: quizTotal ? `${quizRight} of ${quizTotal} answers right` : "No quiz answers yet",
    },
  ];

  const initial = user?.email?.[0]?.toUpperCase() ?? "";

  // Entry only: the progress line draws to its length, the letter tiles settle in.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-progress-line]", { scaleX: 0, duration: 0.7, ease: "sine.inOut", transformOrigin: "left center" });
      gsap.from("[data-letter-tile]", { opacity: 0, y: 6, duration: 0.24, ease: "power2.out", stagger: 0.012 });
    },
    { scope },
  );

  return (
    <Page>
      <PageHeader title="Account" description="Who is signed in, and the progress this browser has saved for you." />

      <div ref={scope} className="space-y-6">
        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-wash font-display text-2xl font-bold text-ink"
              >
                {initial || <User className="h-6 w-6 text-ink-muted" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Signed in as</p>
                <p className="truncate text-lg font-semibold text-ink">{user?.email ?? "…"}</p>
                {user && <p className="text-sm text-ink-muted">Member since {user.joined}</p>}
              </div>
            </div>
            <Button variant="secondary" onClick={signOut} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </Button>
          </div>
        </Card>

        <Card title="Your progress" description="Saved in this browser only. Another browser or computer starts from zero.">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-title font-bold text-ink tabular">{learned}</span>
              <span className="text-lead text-ink-muted tabular">of {ALPHABET.length} letters learned</span>
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-wash"
              role="progressbar"
              aria-label="Letters learned"
              aria-valuemin={0}
              aria-valuemax={ALPHABET.length}
              aria-valuenow={learned}
            >
              <div
                data-progress-line
                className="h-full origin-left rounded-full bg-ink"
                style={{ transform: `scaleX(${learned / ALPHABET.length})` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              A letter counts as learned once you sign it right with the glove or answer it right in the quiz.
            </p>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{s.label}</span>
                  <span className="block">{s.note}</span>
                </dt>
                <dd className="font-display text-heading font-bold text-ink tabular">{s.value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-8 font-display text-lg text-ink">Letter by letter</h3>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {ALPHABET.map((l, i) => {
              const p = perLetter[i];
              const done = isLearned(p);
              const quiz = p.quizCorrect + p.quizWrong;
              const tried = p.practiced > 0 || quiz > 0;
              return (
                <li
                  key={l.letter}
                  data-letter-tile
                  className={`rounded-[var(--radius-control)] border px-3 py-2.5 ${
                    done ? "border-transparent bg-ok-wash" : "border-hairline bg-ground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-display text-2xl font-bold ${tried ? "text-ink" : "text-ink-faint"}`}>
                      {l.letter}
                    </span>
                    {done && <Check className="h-4 w-4 text-ok" aria-hidden />}
                    <span className="sr-only">{done ? "learned" : "not learned yet"}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-ink-muted tabular">
                    {tried ? (
                      <>
                        {p.practiced} {p.practiced === 1 ? "rep" : "reps"}
                        <span className="block">
                          Quiz {p.quizCorrect}/{quiz}
                        </span>
                      </>
                    ) : (
                      "Not tried yet"
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Training samples" description="Labelled handshapes the translator compares your hand against, as stored in this browser.">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-title font-bold text-ink tabular">{model.samples.length}</span>
              <span className="text-ink-muted">{model.samples.length === 1 ? "sample" : "samples"}</span>
            </p>
            <Link to="/app/lab" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
              Review or record samples in the Lab
            </Link>
          </div>
        </Card>
      </div>
    </Page>
  );
}
