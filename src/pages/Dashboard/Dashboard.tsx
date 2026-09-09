import { useNavigate } from "react-router-dom";
import {
  Layers,
  CheckCircle2,
  Check,
  Calendar,
  XCircle,
  Ban,
  AlertTriangle,
  Package,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { PrimaryButton } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Primitives";
import { useMedicines } from "@/hooks/useMedicines";
import { StatCard } from "./StatCard";
import { HISTORY_LOG } from "@/utils/dummyData";

const CONSUMPTION_TREND = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
  day,
  doses: [18, 20, 19, 22, 17, 21, 23][i],
}));

export default function Dashboard() {
  const navigate = useNavigate();
  const { medicines } = useMedicines();

  const active = medicines.filter((m) => m.status === "active" && !m.deleted);
  const completed = medicines.filter((m) => m.status === "completed" && !m.deleted);
  const expired = medicines.filter((m) => m.status === "expired" && !m.deleted);
  const lowStock = medicines.filter((m) => !m.deleted && m.remaining > 0 && m.remaining <= m.quantity * 0.2);
  const outOfStock = medicines.filter((m) => !m.deleted && m.remaining === 0 && m.status === "active");
  const missedToday = HISTORY_LOG.filter((h) => h.status === "Missed" && h.date === HISTORY_LOG[0].date);

  const stats = [
    {
      icon: Layers,
      label: "Total medicines",
      value: medicines.filter((m) => !m.deleted).length,
      change: 4.2,
      tone: "blue" as const,
      trend: [30, 34, 33, 36, 38, 40, medicines.filter((m) => !m.deleted).length],
    },
    { icon: CheckCircle2, label: "Active medicines", value: active.length, change: 2.1, tone: "green" as const, trend: [5, 6, 6, 7, 7, 8, active.length] },
    { icon: Check, label: "Completed medicines", value: completed.length, change: 1.4, tone: "purple" as const, trend: [1, 1, 2, 2, 2, 2, completed.length] },
    { icon: Calendar, label: "Today's medicines", value: 8, change: 3.0, tone: "cyan" as const, trend: [6, 7, 6, 8, 7, 8, 8] },
    { icon: XCircle, label: "Missed medicines", value: missedToday.length || 1, change: -8.5, tone: "red" as const, trend: [3, 2, 2, 1, 2, 1, 1] },
    { icon: Ban, label: "Expired medicines", value: expired.length, change: -2.0, tone: "gray" as const, trend: [2, 2, 1, 1, 1, 1, expired.length] },
    { icon: AlertTriangle, label: "Low stock medicines", value: lowStock.length, change: 12.5, tone: "amber" as const, trend: [1, 1, 2, 2, 3, 3, lowStock.length] },
    { icon: Package, label: "Upcoming refills", value: lowStock.length + outOfStock.length, change: 5.6, tone: "pink" as const, trend: [1, 2, 2, 3, 3, 4, lowStock.length + outOfStock.length] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl text-slate-800">Medicine dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Overview of every medicine across your regimen.</p>
        </div>
        <PrimaryButton icon={Plus} onClick={() => navigate("/medicines/add")}>
          Add medicine
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Consumption trend (7 days)</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={CONSUMPTION_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="doses" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: "#2563EB" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Low stock watchlist</h3>
          <div className="space-y-3">
            {lowStock.length === 0 && <p className="text-sm text-slate-400">Nothing running low right now.</p>}
            {lowStock.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{m.name}</p>
                  <p className="text-xs text-slate-400">
                    {m.remaining} of {m.quantity} left
                  </p>
                </div>
                <Badge tone="red">Refill</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
