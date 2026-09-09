import { useNavigate } from "react-router-dom";
import { PillBottle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/Button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-slate-50">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
        <PillBottle size={36} className="text-blue-500" />
      </div>
      <h1 className="font-bold text-4xl text-slate-800">404</h1>
      <p className="text-slate-500 mt-2 mb-6">This page doesn't exist — it might have been moved or removed.</p>
      <PrimaryButton onClick={() => navigate("/")}>Back to dashboard</PrimaryButton>
    </div>
  );
}
