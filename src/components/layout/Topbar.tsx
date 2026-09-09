import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { useMedicines } from "@/hooks/useMedicines";
import { SmartSearch } from "./SmartSearch";
import { cx } from "@/utils/helpers";

const NOTIFS = [
  { id: 1, title: "Low stock: Losartan", type: "warning" as const },
  { id: 2, title: "Amoxicillin marked completed", type: "success" as const },
  { id: 3, title: "Prescription expired: Amoxicillin", type: "error" as const },
];

export function Topbar({ setSidebarOpen }: { setSidebarOpen: (v: boolean) => void }) {
  const { medicines } = useMedicines();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 glass border-b border-white/60 px-4 lg:px-8 py-4 flex items-center gap-4">
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500">
        <Menu size={22} />
      </button>
      <SmartSearch medicines={medicines} />
      <div className="flex items-center gap-3 ml-auto">
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-10 h-10 rounded-2xl bg-white/70 border border-slate-200 flex items-center justify-center text-slate-500 relative"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-30">
              {NOTIFS.map((n) => (
                <div key={n.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
                  <div
                    className={cx(
                      "w-2 h-2 rounded-full shrink-0",
                      n.type === "error" && "bg-red-500",
                      n.type === "warning" && "bg-amber-500",
                      n.type === "success" && "bg-emerald-500"
                    )}
                  />
                  <p className="text-sm text-slate-700">{n.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
          MG
        </div>
      </div>
    </header>
  );
}
