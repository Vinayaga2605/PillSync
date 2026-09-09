import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Grid3x3, List as ListIcon, Plus, PillBottle } from "lucide-react";
import { useMedicines } from "@/hooks/useMedicines";
import { useMedicineFilters } from "@/hooks/useMedicineFilters";
import { PrimaryButton, GhostButton } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Primitives";
import { notifySuccess } from "@/context/MedicineContext";
import { MedicineCard } from "./MedicineCard";
import { MedicineTable } from "./MedicineTable";
import { FilterPanel } from "./FilterPanel";
import { DeleteConfirm } from "./DeleteConfirm";
import type { Medicine } from "@/types/medicine";
import { cx } from "@/utils/helpers";

export default function MedicineList() {
  const navigate = useNavigate();
  const { medicines, softDeleteMedicine } = useMedicines();
  const { rows, search, setSearch, filters, setFilters, sort, setSort } = useMedicineFilters(medicines);

  const [layout, setLayout] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Medicine | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    softDeleteMedicine(pendingDelete.id);
    notifySuccess("Medicine moved to Trash", `${pendingDelete.name} · restore anytime within 30 days`);
    setPendingDelete(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-bold text-2xl text-slate-800">Medicine list</h1>
          <p className="text-slate-500 text-sm mt-0.5">{rows.length} medicines found</p>
        </div>
        <PrimaryButton icon={Plus} onClick={() => navigate("/medicines/add")}>
          Add medicine
        </PrimaryButton>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or generic name…"
            className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <GhostButton icon={Filter} onClick={() => setShowFilters(!showFilters)}>
          Filters
        </GhostButton>
        <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={() => setLayout("grid")}
            className={cx("px-3 py-2 rounded-xl", layout === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setLayout("table")}
            className={cx("px-3 py-2 rounded-xl", layout === "table" ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {showFilters && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}

      {rows.length === 0 ? (
        <Card className="p-0" hover={false}>
          <EmptyState
            icon={PillBottle}
            title="No medicines found"
            subtitle="Try adjusting your search or filters, or add a new medicine to get started."
            action={
              <PrimaryButton icon={Plus} onClick={() => navigate("/medicines/add")}>
                Add medicine
              </PrimaryButton>
            }
          />
        </Card>
      ) : layout === "grid" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((m) => (
            <MedicineCard key={m.id} m={m} onDelete={setPendingDelete} />
          ))}
        </div>
      ) : (
        <Card className="p-6" hover={false}>
          <MedicineTable rows={rows} onDelete={setPendingDelete} sort={sort} setSort={setSort} />
        </Card>
      )}

      <DeleteConfirm medicine={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
}
