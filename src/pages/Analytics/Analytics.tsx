import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import { Layers, Activity, AlertTriangle, Package } from "lucide-react";
import { Card } from "@/components/ui/Primitives";
import { StatCard } from "@/pages/Dashboard/StatCard";
import { useMedicines } from "@/hooks/useMedicines";
import { CATEGORIES, CATEGORY_COLORS } from "@/constants";

const USAGE_TREND = [
  { m: "Mar", u: 42 },
  { m: "Apr", u: 48 },
  { m: "May", u: 51 },
  { m: "Jun", u: 47 },
  { m: "Jul", u: 55 },
  { m: "Aug", u: 50 },
];

export default function Analytics() {
  const { medicines } = useMedicines();
  const active = medicines.filter((m) => !m.deleted);

  const categoryData = CATEGORIES.map((c) => ({
    name: c,
    value: active.filter((m) => m.category === c).length,
  })).filter((d) => d.value > 0);

  const diseaseData = Object.entries(
    active.reduce<Record<string, number>>((acc, m) => {
      acc[m.disease] = (acc[m.disease] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const refillTrend = active.map((m) => ({ name: m.name, remaining: m.remaining, quantity: m.quantity }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-slate-800">Medicine analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Trends and patterns across your medication history.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total medicines" value={active.length} change={4.2} tone="blue" trend={[30, 32, 33, 35, 36, 38, active.length]} />
        <StatCard icon={Activity} label="Avg. adherence" value="88%" change={2.4} tone="green" trend={[80, 82, 85, 86, 87, 88, 88]} />
        <StatCard
          icon={AlertTriangle}
          label="Low stock alerts"
          value={active.filter((m) => m.remaining <= m.quantity * 0.2).length}
          change={6.1}
          tone="amber"
          trend={[1, 2, 2, 3, 3, 3, 4]}
        />
        <StatCard icon={Package} label="Refills this month" value={6} change={-3.2} tone="purple" trend={[8, 7, 7, 6, 6, 6, 6]} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Medicine categories</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Disease distribution</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={diseaseData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Consumption trend</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={USAGE_TREND}>
                <defs>
                  <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="u" stroke="#2563EB" strokeWidth={3} fill="url(#usageGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <h3 className="font-semibold text-slate-800 mb-4">Refill trends — stock remaining</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={refillTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="remaining" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
