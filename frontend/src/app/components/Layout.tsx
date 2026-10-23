import { Outlet, NavLink, Link } from "react-router";
import { MessageSquareText, BookOpen, User, Hand, ClipboardList, FlaskConical } from "lucide-react";
import GloveStatus from "./GloveStatus";

const NAV_ITEMS = [
  { path: "/app", label: "Translate", icon: MessageSquareText, end: true },
  { path: "/app/learn", label: "Learn", icon: BookOpen, end: false },
  { path: "/app/glove", label: "Glove", icon: Hand, end: false },
  { path: "/app/collect", label: "Collect", icon: ClipboardList, end: false },
  { path: "/app/lab", label: "Lab", icon: FlaskConical, end: false },
  { path: "/app/profile", label: "Account", icon: User, end: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/app" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Hand className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold">Bridge</span>
          </Link>

          <nav className="hidden md:flex gap-1" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
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
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-gray-200 bg-white md:hidden"
        aria-label="Main"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? "text-indigo-600" : "text-gray-500"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
