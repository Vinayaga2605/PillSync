import { useMedicineContext } from "@/context/MedicineContext";

/**
 * Convenience hook so pages/components don't need to know the data lives in
 * context. If you move state fully into React Query later, this is the only
 * file that needs to change.
 */
export function useMedicines() {
  return useMedicineContext();
}
