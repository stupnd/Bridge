import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { supabase } from "../../supabaseClient";
import { buttonClass } from "../components/common";
import Wordmark from "../components/Wordmark";

gsap.registerPlugin(useGSAP);

const inputClass =
  "block h-12 w-full rounded-[var(--radius-control)] border border-[#cfcac1] bg-surface px-4 text-base text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-ink-muted focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Already signed in: skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/app", { replace: true });
    });
  }, [navigate]);

  // A short settle-in for the panel; nothing moves under reduced motion.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".login-enter", { opacity: 0, y: 12, duration: 0.3, ease: "power2.out", stagger: 0.06 });
    },
    { scope: root },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Check your email for a confirmation link.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        navigate("/app");
      }
    }
    setLoading(false);
  };

  return (
    <div ref={root} className="flex min-h-screen flex-col bg-ground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Bridge, home" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)]">
          <Wordmark />
        </Link>
        <Link to="/" className={buttonClass("ghost", "sm", "min-h-11 -mr-2")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:px-6 sm:pt-0">
        <div className="w-full max-w-[26rem]">
          <div className="login-enter">
            <h1 className="font-display text-title font-extrabold text-ink">
              {isSignUp ? "Create your account" : "Sign in to Bridge"}
            </h1>
            <p className="mt-3 text-lead text-ink-muted">
              Bridge turns your fingerspelling into text. Sign in to translate, learn the alphabet and calibrate your glove.
            </p>
          </div>

          <div className="login-enter mt-8 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={isSignUp ? 6 : undefined}
                  aria-describedby={isSignUp ? "password-hint" : undefined}
                  required
                />
                {isSignUp && (
                  <p id="password-hint" className="mt-1.5 text-sm text-ink-muted">At least 6 characters.</p>
                )}
              </div>

              {error && (
                <p className="rounded-[var(--radius-control)] bg-danger-wash px-3 py-2.5 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-[var(--radius-control)] bg-ok-wash px-3 py-2.5 text-sm text-ok" role="status">
                  {info}
                </p>
              )}

              <button type="submit" disabled={loading} className={buttonClass("primary", "lg", "w-full")}>
                {loading ? (isSignUp ? "Creating account…" : "Signing in…") : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="login-enter mt-6 text-center text-sm text-ink-muted">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setInfo(""); }}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-1 font-semibold text-ink underline decoration-hairline decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
          <p className="login-enter mt-2 text-center text-sm text-ink-muted">
            The glove connects in Chrome or Edge on a computer.
          </p>
        </div>
      </main>
    </div>
  );
}
