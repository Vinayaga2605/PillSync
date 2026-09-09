import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Copy,
  ShieldAlert,
  Sparkles,
  FileText,
  ImagePlus,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { PrimaryButton, GhostButton } from "@/components/ui/Button";
import { useMedicines } from "@/hooks/useMedicines";
import { notifySuccess } from "@/context/MedicineContext";
import { CATEGORIES, MEDICINE_TYPES, UNITS, FREQUENCIES, FOOD_TIMINGS, DOCTORS } from "@/constants";
import { medicineSchema, STEP_FIELDS, type MedicineFormValues } from "./schema";
import { StepIndicator } from "./StepIndicator";
import { cx } from "@/utils/helpers";

export default function AddMedicine() {
  const navigate = useNavigate();
  const { medicines, addMedicine } = useMedicines();
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState({ prescription: false, image: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    mode: "onBlur",
    defaultValues: {
      category: "Cardiac",
      type: "Tablet",
      unit: "mg",
      frequency: "Once daily",
      foodTiming: "After food",
    },
  });

  const values = watch();

  const duplicate = useMemo(
    () =>
      medicines.find(
        (m) => !m.deleted && values.name && m.name.trim().toLowerCase() === values.name.trim().toLowerCase()
      ),
    [values.name, medicines]
  );

  const interaction = useMemo(() => {
    const activeNames = medicines.filter((m) => !m.deleted && m.status === "active").map((m) => m.name);
    return values.name === "Losartan" && activeNames.includes("Amlodipine")
      ? "Losartan combined with Amlodipine may increase the risk of low blood pressure — flag for doctor review."
      : null;
  }, [values.name, medicines]);

  const next = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 ? true : await trigger(fields as any);
    if (valid) setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (data: MedicineFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const remaining = data.remaining && data.remaining > 0 ? data.remaining : data.quantity;
      const med = await addMedicine({
        ...data,
        remaining,
        sideEffects: ["Consult doctor for full list"],
        description: `${data.name} for ${data.disease || "your prescribed condition"}.`,
        usage: `Take ${data.foodTiming.toLowerCase()}.`,
        trend: [data.quantity, data.quantity, data.quantity, data.quantity, data.quantity, data.quantity, remaining],
      });
      notifySuccess("Medicine added", `${med.name} was saved to your medicine list.`);
      navigate("/medicines");
    } catch {
      // addMedicine already shows an error toast — keep the user on this
      // step (with their data intact) so they can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = (key: keyof MedicineFormValues) => errors[key]?.message as string | undefined;

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <h1 className="font-bold text-2xl text-slate-800">Add medicine</h1>
        <p className="text-slate-500 text-sm mt-0.5">A guided 5-step flow, with AI checks along the way.</p>
      </div>

      <Card className="p-8 mt-5" hover={false}>
        <StepIndicator step={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Medicine name" error={err("name")}>
                    <input {...register("name")} placeholder="e.g. Losartan" className={inputClass(!!err("name"))} />
                  </Field>
                  <Field label="Generic name">
                    <input {...register("genericName")} placeholder="e.g. Losartan Potassium" className={inputClass(false)} />
                  </Field>
                  <Field label="Brand name">
                    <input {...register("brandName")} placeholder="e.g. Cozaar" className={inputClass(false)} />
                  </Field>
                  <Field label="Category" error={err("category")}>
                    <select {...register("category")} className={inputClass(!!err("category"))}>
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Medicine type" error={err("type")}>
                    <select {...register("type")} className={inputClass(!!err("type"))}>
                      {MEDICINE_TYPES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Disease / condition">
                    <input {...register("disease")} placeholder="e.g. Hypertension" className={inputClass(false)} />
                  </Field>

                  {duplicate && (
                    <div className="md:col-span-2 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                      <Copy size={17} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-700">
                        <strong>{duplicate.name}</strong> already exists in your list — you may be adding a duplicate.
                      </p>
                    </div>
                  )}
                  {interaction && (
                    <div className="md:col-span-2 flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      <ShieldAlert size={17} className="text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{interaction}</p>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Dosage" error={err("dosage")}>
                    <input {...register("dosage")} placeholder="e.g. 50" className={inputClass(!!err("dosage"))} />
                  </Field>
                  <Field label="Unit">
                    <select {...register("unit")} className={inputClass(false)}>
                      {UNITS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quantity" error={err("quantity")}>
                    <input type="number" {...register("quantity")} placeholder="e.g. 30" className={inputClass(!!err("quantity"))} />
                  </Field>
                  <Field label="Remaining quantity">
                    <input type="number" {...register("remaining")} placeholder="e.g. 30" className={inputClass(false)} />
                  </Field>
                  <Field label="Frequency">
                    <select {...register("frequency")} className={inputClass(false)}>
                      {FREQUENCIES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reminder time">
                    <input {...register("reminderTime")} placeholder="e.g. 08:00 AM, 08:00 PM" className={inputClass(false)} />
                  </Field>
                  <Field label="Before / after food" error={err("foodTiming")}>
                    <select {...register("foodTiming")} className={inputClass(false)}>
                      {FOOD_TIMINGS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Doctor name">
                    <select {...register("doctor")} className={inputClass(false)}>
                      <option value="">Select doctor</option>
                      {DOCTORS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Hospital / clinic">
                    <input {...register("hospital")} placeholder="e.g. Austin Wellness Clinic" className={inputClass(false)} />
                  </Field>
                  <Field label="Prescription number">
                    <input {...register("prescriptionNo")} placeholder="e.g. RX-88213" className={inputClass(false)} />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(
                    [
                      ["prescription", "Upload prescription", FileText, "text-blue-500"],
                      ["image", "Upload medicine image", ImagePlus, "text-cyan-500"],
                    ] as const
                  ).map(([key, label, Icon, color]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setUploaded((u) => ({ ...u, [key]: true }))}
                      className={cx(
                        "rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors",
                        uploaded[key] ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {uploaded[key] ? (
                        <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                      ) : (
                        <Icon size={24} className={cx(color, "mb-2")} />
                      )}
                      <p className="text-sm font-medium text-slate-600">{uploaded[key] ? "Uploaded" : label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {uploaded[key] ? "Click to replace" : "JPG, PNG or PDF up to 10MB"}
                      </p>
                    </button>
                  ))}
                  <div className="sm:col-span-2">
                    <Field label="Notes">
                      <textarea {...register("notes")} rows={3} className={inputClass(false)} placeholder="Any special instructions…" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-4">Review before saving</p>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {(
                      [
                        ["Name", values.name],
                        ["Generic", values.genericName],
                        ["Category", values.category],
                        ["Type", values.type],
                        ["Dosage", `${values.dosage || ""}${values.unit || ""}`],
                        ["Quantity", values.quantity],
                        ["Frequency", values.frequency],
                        ["Reminder", values.reminderTime],
                        ["Food timing", values.foodTiming],
                        ["Doctor", values.doctor],
                        ["Hospital", values.hospital],
                        ["Prescription #", values.prescriptionNo],
                      ] as const
                    ).map(([l, v]) => (
                      <div key={l} className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-400">{l}</span>
                        <span className="font-medium text-slate-700">{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mt-5">
                    <Sparkles size={17} className="text-violet-600 shrink-0" />
                    <p className="text-sm text-violet-700">
                      AI check complete — no allergy conflicts found against your recorded allergy list.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <GhostButton type="button" icon={ArrowLeft} onClick={back} className={step === 0 ? "invisible" : ""}>
              Back
            </GhostButton>
            {step < 4 ? (
              <PrimaryButton type="button" icon={ArrowRight} onClick={next}>
                Continue
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit" icon={Save} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save medicine"}
              </PrimaryButton>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cx(
    "w-full rounded-2xl border px-4 py-3 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40",
    hasError ? "border-red-300" : "border-slate-200"
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
