import { useNavigate } from "react-router-dom";
import { Pill, Clock, Eye, Edit3, Trash2 } from "lucide-react";
import type { Medicine } from "@/types/medicine";
import { Card, Badge, ProgressBar } from "@/components/ui/Primitives";
import { IconBtn } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";
import { stockPercent } from "@/utils/helpers";

export function MedicineCard({ m, onDelete }: { m: Medicine; onDelete: (m: Medicine) => void }) {
  const navigate = useNavigate();
  const pct = stockPercent(m.remaining, m.quantity);

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <Pill size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{m.name}</p>
          <p className="text-xs text-slate-400 truncate">{m.genericName}</p>
        </div>
        <StatusBadge m={m} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge tone="blue">{m.category}</Badge>
        <span className="text-xs text-slate-400">
          {m.dosage}
          {m.unit} · {m.frequency}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>
            {m.remaining} of {m.quantity} left
          </span>
          <span>{pct}%</span>
        </div>
        <ProgressBar pct={pct} tone={pct <= 20 ? "red" : pct <= 50 ? "amber" : "green"} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={12} />
          {m.reminderTime}
        </span>
        <div className="flex items-center gap-1.5">
          <IconBtn icon={Eye} tone="blue" title="View" onClick={() => navigate(`/medicines/${m.id}`)} />
          <IconBtn icon={Edit3} tone="gray" title="Edit" onClick={() => navigate(`/medicines/${m.id}/edit`)} />
          <IconBtn icon={Trash2} tone="red" title="Delete" onClick={() => onDelete(m)} />
        </div>
      </div>
    </Card>
  );
}
