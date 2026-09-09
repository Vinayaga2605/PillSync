import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PillBottle,
  Plus,
  ClipboardList,
  BarChart3,
  Trash2,
  Pill,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { cx } from "@/utils/helpers";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/medicines", label: "Medicine list", icon: PillBottle },
  { to: "/medicines/add", label: "Add medicine", icon: Plus },
  { to: "/history", label: "Medicine history", icon: ClipboardList },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/trash", label: "Trash", icon: Trash2 },
];

interface SidebarProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

export function Sidebar({ open, setOpen, theme, setTheme }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cx(
          "fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Pill size={19} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-tight">PillSync</p>
            <p className="text-[11px] text-slate-400 leading-tight">Medicine Module</p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
      </aside>
    </>
  );
}
