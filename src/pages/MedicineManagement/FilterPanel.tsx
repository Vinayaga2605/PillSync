import { X } from "lucide-react";
import type { FilterState } from "@/types/medicine";
import { Card } from "@/components/ui/Primitives";
import { CATEGORIES } from "@/constants";
import { cx } from "@/utils/helpers";

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClose: () => void;
}

export function FilterPanel({ filters, setFilters, onClose }: Props) {
  const toggle = (key: keyof FilterState, val: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === val ? null : val }));

  const timeSlots = ["Morning", "Afternoon", "Evening", "Night"];

  const Group = ({
    title,
    options,
    filterKey,
  }: {
    title: string;
    options: string[];
    filterKey: keyof FilterState;
  }) => (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => (
          <button
            key={c}
            onClick={() => toggle(filterKey, c)}
            className={cx(
              "px-2.5 py-1 rounded-full text-xs font-medium border",
              filters[filterKey] === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-5 mb-4" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-slate-800 text-sm">Advanced filters</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Group title="Category" options={CATEGORIES} filterKey="category" />
        <Group title="Reminder time" options={timeSlots} filterKey="time" />
        <Group title="Food timing" options={["Before food", "After food"]} filterKey="food" />
        <Group title="Status" options={["Low stock", "Expired", "Completed"]} filterKey="status" />
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={() => setFilters({})} className="text-xs font-semibold text-slate-400 hover:text-red-500">
          Clear all filters
        </button>
      </div>
    </Card>
  );
}
