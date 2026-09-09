import { z } from "zod";

export const medicineSchema = z.object({
  // Step 1 — Medicine information
  name: z.string().min(2, "Medicine name is required"),
  genericName: z.string().optional().default(""),
  brandName: z.string().optional().default(""),
  category: z.string().min(1, "Select a category"),
  type: z.string().min(1, "Select a medicine type"),
  disease: z.string().optional().default(""),

  // Step 2 — Dosage
  dosage: z.string().min(1, "Dosage is required"),
  unit: z.string().min(1),
  quantity: z.coerce.number({ invalid_type_error: "Quantity is required" }).positive("Quantity must be greater than 0"),
  remaining: z.coerce.number().nonnegative().optional(),
  frequency: z.string().min(1),
  reminderTime: z.string().optional().default(""),
  foodTiming: z.string().min(1),

  // Step 3 — Doctor information
  doctor: z.string().optional().default(""),
  hospital: z.string().optional().default(""),
  prescriptionNo: z.string().optional().default(""),

  // Step 4 — Uploads / notes
  notes: z.string().optional().default(""),
});

export type MedicineFormValues = z.infer<typeof medicineSchema>;

// Each wizard step only needs to validate its own slice of fields.
export const STEP_FIELDS: (keyof MedicineFormValues)[][] = [
  ["name", "category", "type"],
  ["dosage", "quantity", "frequency", "foodTiming"],
  [],
  [],
  [],
];
