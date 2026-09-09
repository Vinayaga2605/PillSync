import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Edit3,
  RefreshCw,
  Pill,
  Stethoscope,
  Hospital,
  FileText,
  Sparkles,
  FlaskConical,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card, Badge, ProgressBar, ProgressCircle, EmptyState } from "@/components/ui/Primitives";
import { PrimaryButton, GhostButton } from "@/components/ui/Button";
import { useMedicines } from "@/hooks/useMedicines";
import { notifyInfo } from "@/context/MedicineContext";
import { StatusBadge } from "@/pages/MedicineManagement/StatusBadge";
import { HISTORY_LOG } from "@/utils/dummyData";
import { addDaysISO, stockPercent } from "@/utils/helpers";

export default function MedicineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById } = useMedicines();
  const medicine = id ? getById(id) : undefined;

  if (!medicine) {
    return (
      <EmptyState
        icon={Pill}
        title="No medicine selected"
        subtitle="Pick a medicine from the list to view its details."
        action={<PrimaryButton onClick={() => navigate("/medicines")}>Go to medicine list</PrimaryButton>}
      />
    );
  }

  const pct = stockPercent(medicine.remaining, medicine.quantity);
  const daysLeft = Math.max(1, medicine.remaining);
  const finish = addDaysISO(daysLeft);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/medicines")}
          className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          <GhostButton icon={Edit3} onClick={() => navigate(`/medicines/${medicine.id}/edit`)}>
            Edit
          </GhostButton>
          <PrimaryButton icon={RefreshCw} onClick={() => notifyInfo("Reminder re-scheduled.")}>
            Reschedule reminder
          </PrimaryButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-7" hover={false}>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Pill size={28} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-xl text-slate-800">{medicine.name}</h2>
                  <StatusBadge m={medicine} />
                </div>
                <p className="text-sm text-slate-400">
                  {medicine.genericName} · {medicine.brandName}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge tone="blue">{medicine.category}</Badge>
                  <Badge tone="purple">{medicine.type}</Badge>
                  <Badge tone="gray">{medicine.disease}</Badge>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-5">{medicine.description}</p>
          </Card>

          <Card className="p-7" hover={false}>
            <h3 className="font-semibold text-slate-800 mb-4">Dosage and usage</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Row label="Dosage" value={`${medicine.dosage}${medicine.unit}`} />
              <Row label="Frequency" value={medicine.frequency} />
              <Row label="Reminder time" value={medicine.reminderTime} />
              <Row label="Food timing" value={medicine.foodTiming} />
            </div>
            <p className="text-sm text-slate-500 mt-4">{medicine.usage}</p>
          </Card>

          <Card className="p-7" hover={false}>
            <h3 className="font-semibold text-slate-800 mb-4">Side effects</h3>
            <div className="flex flex-wrap gap-2">
              {medicine.sideEffects.map((s) => (
                <Badge key={s} tone="amber">
                  {s}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-7" hover={false}>
            <h3 className="font-semibold text-slate-800 mb-4">Medicine timeline</h3>
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-100" />
              {HISTORY_LOG.filter((h) => h.medicine === medicine.name)
                .slice(0, 5)
                .map((h, i) => (
                  <div key={i} className="relative pb-5 last:pb-0">
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        h.status === "Taken" ? "bg-emerald-500" : h.status === "Missed" ? "bg-red-400" : "bg-amber-400"
                      }`}
                    />
                    <p className="text-xs text-slate-400">
                      {h.date} · {h.time}
                    </p>
                    <p className="text-sm font-medium text-slate-700">{h.status}</p>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 flex flex-col items-center" hover={false}>
            <ProgressCircle percent={pct} color={pct <= 20 ? "#EF4444" : pct <= 50 ? "#F59E0B" : "#10B981"} label="Remaining stock" />
            <p className="text-xs text-slate-400 mt-2">
              {medicine.remaining} of {medicine.quantity} units
            </p>
          </Card>

          <Card className="p-6" hover={false}>
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Refill prediction</h3>
            <p className="text-xs text-slate-400">Estimated finish</p>
            <p className="font-semibold text-slate-700">{finish}</p>
            <p className="text-xs text-slate-400 mt-3">Confidence</p>
            <ProgressBar pct={91} tone="blue" />
          </Card>

          <Card className="p-6" hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-violet-600" />
              <h3 className="font-semibold text-slate-800 text-sm">AI suggestions</h3>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <FlaskConical size={15} className="text-violet-500 mt-0.5 shrink-0" />
                Generic alternative available: {medicine.genericName}.
              </li>
              <li className="flex gap-2">
                <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                Best taken {medicine.foodTiming.toLowerCase()} for optimal absorption.
              </li>
              <li className="flex gap-2">
                <ShieldAlert size={15} className="text-amber-500 mt-0.5 shrink-0" />
                No known allergy conflicts on file.
              </li>
            </ul>
          </Card>

          <Card className="p-6" hover={false}>
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Doctor & prescription</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Stethoscope size={15} className="text-slate-400" />
                {medicine.doctor}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Hospital size={15} className="text-slate-400" />
                {medicine.hospital}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FileText size={15} className="text-slate-400" />
                {medicine.prescriptionNo}
              </div>
            </div>
          </Card>

          {medicine.notes && (
            <Card className="p-6" hover={false}>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">Notes</h3>
              <p className="text-sm text-slate-500">{medicine.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-50 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
