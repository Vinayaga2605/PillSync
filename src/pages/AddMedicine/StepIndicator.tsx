import { Check } from "lucide-react";
import { STEP_LABELS } from "@/constants";
import { cx } from "@/utils/helpers";

export function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={cx(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                  ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? <Check size={16} /> : i + 1}
            </div>
            <span className={cx("text-[11px] mt-1.5 hidden sm:block", i === step ? "text-blue-600 font-semibold" : "text-slate-400")}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={cx("flex-1 h-0.5 mx-2 transition-colors", i < step ? "bg-emerald-400" : "bg-slate-100")} />
          )}
        </div>
      ))}
    </div>
  );
}
