import { Outlet, NavLink, Link } from "react-router";
import { MessageSquareText, BookOpen, User, Hand, ClipboardList, FlaskConical, ListTodo } from "lucide-react";
import GloveStatus from "./GloveStatus";
import Wordmark from "./Wordmark";

const NAV_ITEMS = [
  { path: "/app", label: "Translate", icon: MessageSquareText, end: true },
  { path: "/app/learn", label: "Learn", icon: BookOpen, end: false },
  { path: "/app/glove", label: "Glove", icon: Hand, end: false },
  { path: "/app/collect", label: "Collect", icon: ClipboardList, end: false },
  { path: "/app/lab", label: "Lab", icon: FlaskConical, end: false },
  { path: "/app/todo", label: "To-do", icon: ListTodo, end: false },
  { path: "/app/profile", label: "Account", icon: User, end: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-ground">
      <header className="sticky top-0 z-40 border-b border-hairline bg-ground/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Bridge, home page">
            <Wordmark />
          </Link>

          <nav className="hidden gap-1 md:flex" aria-label="App">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--hairline)]" : "text-ink-muted hover:text-ink"
                  }`
                }
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <GloveStatus />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="App"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                isActive ? "text-ink" : "text-ink-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-5 w-5" aria-hidden strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
