import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Save, Undo2, CheckCircle2 } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Primitives";
import { PrimaryButton, GhostButton } from "@/components/ui/Button";
import { useMedicines } from "@/hooks/useMedicines";
import { notifySuccess, notifyInfo } from "@/context/MedicineContext";
import type { Medicine } from "@/types/medicine";
import { Edit3 } from "lucide-react";

type FormValues = Pick<
  Medicine,
  "name" | "genericName" | "dosage" | "quantity" | "remaining" | "frequency" | "reminderTime" | "doctor" | "notes"
>;

export default function EditMedicine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById, updateMedicine } = useMedicines();
  const medicine = id ? getById(id) : undefined;

  if (!medicine) {
    return (
      <EmptyState
        icon={Edit3}
        title="No medicine selected"
        subtitle="Pick a medicine from the list to edit it."
        action={
          <PrimaryButton onClick={() => navigate("/medicines")}>Go to medicine list</PrimaryButton>
        }
      />
    );
  }

  return <EditForm medicine={medicine} updateMedicine={updateMedicine} navigate={navigate} />;
}

function EditForm({
  medicine,
  updateMedicine,
  navigate,
}: {
  medicine: Medicine;
  updateMedicine: (id: string, payload: Partial<Medicine>) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { register, watch, getValues, setValue } = useForm<FormValues>({
    defaultValues: {
      name: medicine.name,
      genericName: medicine.genericName,
      dosage: medicine.dosage,
      quantity: medicine.quantity,
      remaining: medicine.remaining,
      frequency: medicine.frequency,
      reminderTime: medicine.reminderTime,
      doctor: medicine.doctor,
      notes: medicine.notes,
    },
  });

  const values = watch();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const historyRef = useRef<FormValues[]>([getValues()]);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Autosave draft locally a moment after the person stops typing.
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      historyRef.current.push(getValues());
      setSavedAt(new Date().toLocaleTimeString());
    }, 900);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  const undo = () => {
    if (historyRef.current.length > 1) {
      historyRef.current.pop();
      const prev = historyRef.current[historyRef.current.length - 1];
      (Object.keys(prev) as (keyof FormValues)[]).forEach((k) => setValue(k, prev[k] as any));
      notifyInfo("Change undone");
    }
  };

  const save = () => {
    updateMedicine(medicine.id, getValues());
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
    notifySuccess("Medicine updated", `${getValues("name")} was saved successfully.`);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-bold text-2xl text-slate-800">Edit {medicine.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{savedAt ? `Draft autosaved at ${savedAt}` : "Editing…"}</p>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton icon={Undo2} onClick={undo}>
            Undo
          </GhostButton>
          <PrimaryButton icon={Save} onClick={save}>
            Save changes
          </PrimaryButton>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-4 py-3 mt-4">
          <CheckCircle2 size={17} /> Changes saved successfully
        </div>
      )}

      <Card className="p-8 mt-5 grid md:grid-cols-2 gap-5" hover={false}>
        <FieldInput label="Medicine name" register={register("name")} />
        <FieldInput label="Generic name" register={register("genericName")} />
        <FieldInput label="Dosage" register={register("dosage")} />
        <FieldInput label="Quantity" type="number" register={register("quantity")} />
        <FieldInput label="Remaining quantity" type="number" register={register("remaining")} />
        <FieldInput label="Frequency" register={register("frequency")} />
        <FieldInput label="Reminder time" register={register("reminderTime")} />
        <FieldInput label="Doctor" register={register("doctor")} />
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Notes</label>
          <textarea
            {...register("notes")}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </Card>
      <GhostButton className="mt-4" onClick={() => navigate(`/medicines/${medicine.id}`)}>
        Cancel and go back
      </GhostButton>
    </div>
  );
}

function FieldInput({ label, register, type = "text" }: { label: string; register: any; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        {...register}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
    </div>
  );
}
