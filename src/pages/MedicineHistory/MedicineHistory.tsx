import { useMemo, useState } from "react";
import { Search, Download, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui/Primitives";
import { GhostButton } from "@/components/ui/Button";
import { HISTORY_LOG } from "@/utils/dummyData";
import { notifySuccess, notifyInfo } from "@/context/MedicineContext";
import { cx } from "@/utils/helpers";

type Mode = "table" | "timeline" | "calendar";

export default function MedicineHistory() {
  const [mode, setMode] = useState<Mode>("table");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    let rows = HISTORY_LOG.filter((r) => r.medicine.toLowerCase().includes(search.toLowerCase()));
    if (status !== "All") rows = rows.filter((r) => r.status === status);
    return rows;
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const calendarDays = Array.from({ length: 35 }).map((_, i) => {
    const d = new Date(2026, 6, i - 3);
    const dayLogs = HISTORY_LOG.filter((h) => h.date === d.toISOString().slice(0, 10));
    const takenRatio = dayLogs.length ? dayLogs.filter((h) => h.status === "Taken").length / dayLogs.length : null;
    return { date: d, takenRatio };
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-bold text-2xl text-slate-800">Medicine history</h1>
          <p className="text-slate-500 text-sm mt-0.5">Full record across every medicine.</p>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton icon={Download} onClick={() => notifySuccess("Exported as PDF")}>
            PDF
          </GhostButton>
          <GhostButton icon={Download} onClick={() => notifySuccess("Exported as Excel")}>
            Excel
          </GhostButton>
          <GhostButton icon={Printer} onClick={() => notifyInfo("Sending to printer…")}>
            Print
          </GhostButton>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 mb-4 w-fit">
        {(
          [
            ["table", "Table"],
            ["timeline", "Timeline"],
            ["calendar", "Calendar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cx("px-4 py-2 rounded-xl text-sm font-medium transition-all", mode === id ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "table" && (
        <Card className="p-6" hover={false}>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search medicine…"
                className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {["All", "Taken", "Missed", "Snoozed"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Medicine</th>
                <th className="pb-3 font-medium">Dosage</th>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="py-3 text-slate-600">{r.date}</td>
                  <td className="py-3 font-medium text-slate-700">{r.medicine}</td>
                  <td className="py-3 text-slate-500">{r.dosage}</td>
                  <td className="py-3 text-slate-500">{r.time}</td>
                  <td className="py-3">
                    <Badge tone={r.status === "Taken" ? "green" : r.status === "Missed" ? "red" : "amber"}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-5 text-sm">
            <p className="text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Card>
      )}

      {mode === "timeline" && (
        <Card className="p-7" hover={false}>
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-100" />
            {filtered.slice(0, 15).map((h) => (
              <div key={h.id} className="relative pb-5 last:pb-0">
                <div
                  className={cx(
                    "absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                    h.status === "Taken" ? "bg-emerald-500" : h.status === "Missed" ? "bg-red-400" : "bg-amber-400"
                  )}
                />
                <p className="text-xs text-slate-400">
                  {h.date} · {h.time}
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {h.medicine} <span className="text-slate-400 font-normal">— {h.status}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {mode === "calendar" && (
        <Card className="p-7" hover={false}>
          <p className="text-sm font-semibold text-slate-500 mb-4">Adherence heatmap — July 2026</p>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => (
              <div
                key={i}
                title={d.date.toISOString().slice(0, 10)}
                className={cx(
                  "aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium",
                  d.takenRatio === null
                    ? "bg-slate-50 text-slate-300"
                    : d.takenRatio >= 0.8
                    ? "bg-emerald-500 text-white"
                    : d.takenRatio >= 0.4
                    ? "bg-amber-400 text-white"
                    : "bg-red-400 text-white"
                )}
              >
                {d.date.getDate()}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              High adherence
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-400 inline-block" />
              Low
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
