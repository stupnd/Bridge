import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LogOut, User } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button, Card, Page, PageHeader } from "../components/common";
import { ALPHABET } from "../lib/asl";
import { isLearned, letterProgress, useLearnProgress } from "../lib/learnProgress";
import { useRecordings } from "../lib/recordings";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; joined: string } | null>(null);
  const progress = useLearnProgress();
  const { recordings } = useRecordings();

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
    navigate("/");
  }

  const perLetter = ALPHABET.map((l) => letterProgress(progress, l.letter));
  const learned = perLetter.filter(isLearned).length;
  const practiced = perLetter.reduce((s, p) => s + p.practiced, 0);
  const quizRight = perLetter.reduce((s, p) => s + p.quizCorrect, 0);
  const quizTotal = quizRight + perLetter.reduce((s, p) => s + p.quizWrong, 0);

  const stats = [
    { label: "Letters learned", value: `${learned} / ${ALPHABET.length}` },
    { label: "Glove practice reps", value: String(practiced) },
    { label: "Quiz accuracy", value: quizTotal ? `${Math.round((quizRight / quizTotal) * 100)}%` : "–" },
    { label: "Samples recorded", value: String(recordings.length) },
  ];

  return (
    <Page>
      <PageHeader title="Account" />

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              <User className="h-7 w-7 text-indigo-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{user?.email ?? "…"}</p>
              {user && <p className="text-sm text-gray-500">Member since {user.joined}</p>}
            </div>
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </Card>

        <Card title="Your progress" description="Saved in this browser.">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse rounded-xl bg-gray-50 p-4">
                <dt className="mt-1 text-sm text-gray-500">{s.label}</dt>
                <dd className="text-2xl font-semibold text-gray-900 tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </Page>
  );
}
