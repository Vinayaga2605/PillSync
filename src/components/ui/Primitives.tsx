import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/utils/helpers";

type Tone = "blue" | "green" | "amber" | "red" | "purple" | "gray";

export function Badge({ tone = "blue", children }: { tone?: Tone; children: React.ReactNode }) {
  const tones: Record<Tone, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    gray: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cx("px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = true }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -3, boxShadow: "0 18px 40px rgba(37,99,235,0.14)" } : undefined}
      transition={{ duration: 0.25 }}
      className={cx(
        "glass rounded-[20px] border border-white/60 shadow-[0_6px_24px_rgba(15,23,42,0.06)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function ProgressBar({ pct, tone = "blue" }: { pct: number; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = { blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cx("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function ProgressCircle({
  percent,
  color = "#2563EB",
  size = 96,
  label,
}: {
  percent: number;
  color?: string;
  size?: number;
  label?: string;
}) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
        <text x="50%" y="52%" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">
          {percent}%
        </text>
      </svg>
      {label && <p className="text-xs text-slate-500 mt-1">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Icon size={28} className="text-blue-500" />
      </div>
      <h4 className="font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{subtitle}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-lg", className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
