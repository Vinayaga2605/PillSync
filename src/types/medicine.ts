export type MedicineStatus = "active" | "completed" | "expired";

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  brandName: string;
  category: string;
  type: string;
  disease: string;
  dosage: string;
  unit: string;
  quantity: number;
  remaining: number;
  frequency: string;
  reminderTime: string;
  foodTiming: string;
  doctor: string;
  hospital: string;
  prescriptionNo: string;
  description: string;
  usage: string;
  sideEffects: string[];
  notes: string;
  status: MedicineStatus;
  createdAt: string;
  deleted: boolean;
  deletedAt?: string;
  trend: number[];
}

export interface HistoryEntry {
  id: number;
  date: string;
  medicine: string;
  dosage: string;
  time: string;
  status: "Taken" | "Missed" | "Snoozed";
}

export type ToastType = "success" | "error" | "warning" | "info";

export interface FilterState {
  category?: string | null;
  time?: string | null;
  food?: string | null;
  status?: string | null;
}
