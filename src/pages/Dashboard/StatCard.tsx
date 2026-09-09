import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { Sparkline } from "@/components/ui/Sparkline";

type Tone = "blue" | "green" | "red" | "amber" | "purple" | "cyan" | "gray" | "pink";

const GRADIENTS: Record<Tone, string> = {
  blue: "from-blue-600 to-blue-500",
  green: "from-emerald-500 to-emerald-400",
  red: "from-red-500 to-rose-400",
  amber: "from-amber-500 to-orange-400",
  purple: "from-violet-500 to-purple-400",
  cyan: "from-cyan-500 to-sky-400",
  gray: "from-slate-500 to-slate-400",
  pink: "from-pink-500 to-rose-400",
};

const SPARK_COLORS: Record<Tone, string> = {
  blue: "#2563EB",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  gray: "#64748B",
  pink: "#EC4899",
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  change: number;
  tone: Tone;
  trend: number[];
}

export function StatCard({ icon: Icon, label, value, change, tone, trend }: StatCardProps) {
  const up = change >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shrink-0 ${GRADIENTS[tone]}`}
        >
          <Icon size={19} />
        </div>
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className="font-bold text-2xl text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      <div className="mt-2 -mx-1">
        <Sparkline data={trend} color={SPARK_COLORS[tone]} />
      </div>
    </Card>
  );
}
