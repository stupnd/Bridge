/**
 * The team's to-do list (content/roadmap.ts), read through its dependencies:
 * what can start now, what is blocked and by what, and which tasks unblock
 * the most other work.
 */
import { useMemo, useState } from "react";
import { CircleCheck, CircleDashed, CircleDot, Lock } from "lucide-react";
import { Card, Page, PageHeader } from "../components/common";
import { AREAS, Area, ROADMAP_UPDATED, Status, Task, TASKS, TEAM } from "../content/roadmap";

const BY_ID = new Map(TASKS.map((t) => [t.id, t]));

const openBlockers = (t: Task) => (t.needs ?? []).map((id) => BY_ID.get(id)!).filter((d) => d.status !== "done");

/** Unfinished tasks that wait on `id`, directly or further down the chain. */
function dependents(id: string, seen = new Set<string>()): Set<string> {
  for (const t of TASKS) {
    if (t.status !== "done" && t.needs?.includes(id) && !seen.has(t.id)) {
      seen.add(t.id);
      dependents(t.id, seen);
    }
  }
  return seen;
}

const UNBLOCKS = new Map(TASKS.map((t) => [t.id, dependents(t.id).size]));

const byImpact = (a: Task, b: Task) => UNBLOCKS.get(b.id)! - UNBLOCKS.get(a.id)!;

const STATUS_ICON: Record<Status, { icon: typeof CircleCheck; className: string; label: string }> = {
  done: { icon: CircleCheck, className: "text-ok", label: "Done" },
  doing: { icon: CircleDot, className: "text-caution", label: "In progress" },
  todo: { icon: CircleDashed, className: "text-ink-faint", label: "To do" },
};

function TaskRow({ task, showArea }: { task: Task; showArea?: boolean }) {
  const blockers = task.status === "todo" ? openBlockers(task) : [];
  const unblocks = UNBLOCKS.get(task.id)!;
  const { icon: Icon, className, label } = blockers.length
    ? { icon: Lock, className: "text-ink-faint", label: "Blocked" }
    : STATUS_ICON[task.status];

  return (
    <li className="flex gap-3 py-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} aria-label={label} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${task.status === "done" ? "text-ink-muted" : "text-ink"}`}>{task.title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {[showArea && AREAS[task.area], task.owners.join(", "), task.status !== "done" && task.due].filter(Boolean).join(" · ")}
          {task.status !== "done" && unblocks > 0 && (
            <span className="ml-2 font-semibold text-ink">Unblocks {unblocks} task{unblocks === 1 ? "" : "s"}</span>
          )}
        </p>
        {blockers.length > 0 && (
          <p className="mt-1 text-sm text-ink-muted">Waiting on: {blockers.map((b) => b.title).join("; ")}</p>
        )}
        {task.note && task.status !== "done" && <p className="mt-1 text-sm text-ink-muted">{task.note}</p>}
      </div>
    </li>
  );
}

function TaskList({ tasks, showArea, empty }: { tasks: Task[]; showArea?: boolean; empty: string }) {
  if (!tasks.length) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="-my-3 divide-y divide-hairline">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} showArea={showArea} />
      ))}
    </ul>
  );
}

export default function Todo() {
  const [person, setPerson] = useState<string | null>(null);

  const mine = useMemo(() => TASKS.filter((t) => !person || t.owners.includes(person)), [person]);
  const ready = mine.filter((t) => t.status === "todo" && !openBlockers(t).length).sort(byImpact);
  const doing = mine.filter((t) => t.status === "doing").sort(byImpact);

  const doneCount = TASKS.filter((t) => t.status === "done").length;
  const areas = Object.keys(AREAS) as Area[];

  return (
    <Page width="max-w-5xl">
      <PageHeader
        title="To-do"
        description={`Where Bridge stands and what to do next, from the midterm report, meeting notes and glove testing. ${doneCount} of ${TASKS.length} tasks done. Updated ${ROADMAP_UPDATED}.`}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {areas.map((a) => {
          const tasks = TASKS.filter((t) => t.area === a);
          const done = tasks.filter((t) => t.status === "done").length;
          return (
            <div key={a} className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
              <p className="text-sm font-semibold text-ink">{AREAS[a]}</p>
              <p className="tabular mt-1 text-sm text-ink-muted">{done} of {tasks.length} done</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wash" aria-hidden>
                <div className="h-full origin-left rounded-full bg-ok" style={{ transform: `scaleX(${done / tasks.length})` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Show tasks for">
        {[null, ...TEAM].map((p) => (
          <button
            key={p ?? "all"}
            type="button"
            onClick={() => setPerson(p)}
            aria-pressed={person === p}
            className={`h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 md:h-9 ${
              person === p ? "bg-ink text-white" : "border border-hairline bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {p ?? "Everyone"}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <Card
          title="Ready to start"
          description="Nothing is blocking these. The ones that unblock the most other work are first."
        >
          <TaskList tasks={ready} showArea empty="Nothing is ready to start right now." />
        </Card>

        <Card title="In progress">
          <TaskList tasks={doing} showArea empty="Nothing in progress." />
        </Card>

        {areas.map((a) => {
          const tasks = mine.filter((t) => t.area === a);
          if (!tasks.length) return null;
          return (
            <Card key={a} title={AREAS[a]}>
              <TaskList tasks={tasks} empty="" />
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
