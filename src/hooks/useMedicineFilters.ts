import { useMemo, useState } from "react";
import type { FilterState, Medicine } from "@/types/medicine";

interface SortState {
  key: keyof Medicine;
  dir: "asc" | "desc";
}

export function useMedicineFilters(medicines: Medicine[]) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });

  const rows = useMemo(() => {
    let list = medicines.filter((m) => !m.deleted);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q)
      );
    }
    if (filters.category) list = list.filter((m) => m.category === filters.category);
    if (filters.time) {
      const slot = filters.time.toLowerCase();
      const isPM = slot === "evening" || slot === "night";
      list = list.filter((m) => m.reminderTime.toLowerCase().includes(isPM ? "pm" : "am"));
    }
    if (filters.food) list = list.filter((m) => m.foodTiming === filters.food);
    if (filters.status === "Low stock")
      list = list.filter((m) => m.remaining > 0 && m.remaining <= m.quantity * 0.2);
    if (filters.status === "Expired") list = list.filter((m) => m.status === "expired");
    if (filters.status === "Completed") list = list.filter((m) => m.status === "completed");

    list = [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? result : -result;
    });

    return list;
  }, [medicines, search, filters, sort]);

  return { rows, search, setSearch, filters, setFilters, sort, setSort };
}
