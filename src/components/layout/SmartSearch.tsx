import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mic, Pill } from "lucide-react";
import type { Medicine } from "@/types/medicine";
import { AnimatePresence, motion } from "framer-motion";

const RECENT_SEARCHES = ["Losartan", "Metformin refill", "Cardiac medicines"];
const POPULAR_SEARCHES = ["Atorvastatin", "Vitamin D3", "Blood pressure"];

export function SmartSearch({ medicines }: { medicines: Medicine[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);

  const results = q
    ? medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          m.genericName.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const startVoice = () => {
    setListening(true);
    setTimeout(() => {
      setQ("Losartan");
      setListening(false);
    }, 1200);
  };

  const pick = (m: Medicine) => {
    setOpen(false);
    navigate(`/medicines/${m.id}`);
  };

  return (
    <div className="relative flex-1 max-w-md hidden sm:block">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search medicines, doctors, categories…"
        className="w-full bg-white/70 rounded-2xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <button
        onClick={startVoice}
        className={
          "absolute right-3 top-1/2 -translate-y-1/2 " +
          (listening ? "text-red-500 animate-pulse" : "text-slate-400 hover:text-blue-600")
        }
      >
        <Mic size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-30"
          >
            {q === "" ? (
              <>
                <p className="text-xs font-semibold text-slate-400 px-1 mb-1.5">Recent searches</p>
                {RECENT_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => setQ(s)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
                <p className="text-xs font-semibold text-slate-400 px-1 mt-2 mb-1.5">Popular</p>
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => setQ(s)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </>
            ) : results.length === 0 ? (
              <p className="text-sm text-slate-400 px-2 py-2">No matches for &ldquo;{q}&rdquo;</p>
            ) : (
              results.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={() => pick(m)}
                  className="w-full flex items-center gap-3 text-left px-2 py-2 rounded-lg hover:bg-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Pill size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{m.name}</p>
                    <p className="text-xs text-slate-400">
                      {m.category} · {m.dosage}
                      {m.unit}
                    </p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
