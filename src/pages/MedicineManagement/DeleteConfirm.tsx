import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Medicine } from "@/types/medicine";
import { Card } from "@/components/ui/Primitives";
import { GhostButton, PrimaryButton } from "@/components/ui/Button";

interface Props {
  medicine: Medicine | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirm({ medicine, onCancel, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {medicine && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
          >
            <Card className="p-7 max-w-sm w-full" hover={false}>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Delete {medicine.name}?</h3>
              <p className="text-sm text-slate-500 mb-6">
                This moves the medicine to Trash. You can restore it anytime within 30 days.
              </p>
              <div className="flex gap-3">
                <GhostButton className="flex-1 justify-center" onClick={onCancel}>
                  Cancel
                </GhostButton>
                <PrimaryButton
                  className="flex-1 justify-center !bg-gradient-to-r !from-red-600 !to-rose-500"
                  onClick={onConfirm}
                >
                  Delete
                </PrimaryButton>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
