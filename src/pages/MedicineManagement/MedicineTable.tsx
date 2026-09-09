import { useNavigate } from "react-router-dom";
import { Pill, Eye, Edit3, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { Medicine } from "@/types/medicine";
import { ProgressBar } from "@/components/ui/Primitives";
import { IconBtn } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";

interface SortState {
  key: keyof Medicine;
  dir: "asc" | "desc";
}

interface Props {
  rows: Medicine[];
  onDelete: (m: Medicine) => void;
  sort: SortState;
  setSort: React.Dispatch<React.SetStateAction<SortState>>;
}

export function MedicineTable({ rows, onDelete, sort, setSort }: Props) {
  const navigate = useNavigate();
  const sortBy = (key: keyof Medicine) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const Th = ({ label, k }: { label: string; k: keyof Medicine }) => (
    <th className="pb-3 font-medium cursor-pointer select-none" onClick={() => sortBy(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === k && (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
            <Th label="Medicine" k="name" />
            <Th label="Category" k="category" />
            <Th label="Dosage" k="dosage" />
            <Th label="Remaining" k="remaining" />
            <Th label="Reminder" k="reminderTime" />
            <Th label="Status" k="status" />
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Pill size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.genericName}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-slate-500">{m.category}</td>
              <td className="py-3 text-slate-500">
                {m.dosage}
                {m.unit}
              </td>
              <td className="py-3 text-slate-500 w-32">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-10">
                    {m.remaining}/{m.quantity}
                  </span>
                  <div className="flex-1">
                    <ProgressBar pct={(m.remaining / m.quantity) * 100} tone={m.remaining / m.quantity <= 0.2 ? "red" : "green"} />
                  </div>
                </div>
              </td>
              <td className="py-3 text-slate-500">{m.reminderTime}</td>
              <td className="py-3">
                <StatusBadge m={m} />
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <IconBtn icon={Eye} tone="blue" onClick={() => navigate(`/medicines/${m.id}`)} />
                  <IconBtn icon={Edit3} tone="gray" onClick={() => navigate(`/medicines/${m.id}/edit`)} />
                  <IconBtn icon={Trash2} tone="red" onClick={() => onDelete(m)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
