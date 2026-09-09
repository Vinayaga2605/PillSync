import { Trash2, RotateCcw, Pill } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Primitives";
import { GhostButton } from "@/components/ui/Button";
import { useMedicines } from "@/hooks/useMedicines";
import { notifySuccess } from "@/context/MedicineContext";
import { todayISO } from "@/utils/helpers";

export default function Trash() {
  const { medicines, restoreMedicine } = useMedicines();
  const trashed = medicines.filter((m) => m.deleted);

  const restore = (id: string, name: string) => {
    restoreMedicine(id);
    notifySuccess("Medicine restored", `${name} is back in your list.`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bold text-2xl text-slate-800">Trash</h1>
        <p className="text-slate-500 text-sm mt-0.5">Deleted medicines are kept for 30 days before permanent removal.</p>
      </div>

      {trashed.length === 0 ? (
        <Card className="p-0" hover={false}>
          <EmptyState icon={Trash2} title="Trash is empty" subtitle="Deleted medicines will show up here so you can restore them if needed." />
        </Card>
      ) : (
        <div className="space-y-3">
          {trashed.map((m) => (
            <Card key={m.id} className="p-4 flex items-center justify-between" hover={false}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Pill size={16} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-600">{m.name}</p>
                  <p className="text-xs text-slate-400">Deleted on {m.deletedAt || todayISO()}</p>
                </div>
              </div>
              <GhostButton icon={RotateCcw} onClick={() => restore(m.id, m.name)}>
                Restore
              </GhostButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
