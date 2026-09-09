import React, { ButtonHTMLAttributes, useRef } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/utils/helpers";

interface BaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
}

function useRipple() {
  const ref = useRef<HTMLButtonElement>(null);
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const span = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      span.className = "ripple-span";
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      el.appendChild(span);
      setTimeout(() => span.remove(), 600);
    }
  };
  return { ref, onClick };
}

export function PrimaryButton({ icon: Icon, className, children, onClick, ...rest }: BaseProps) {
  const ripple = useRipple();
  return (
    <motion.button
      ref={ripple.ref}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.98 }}
      onClick={(e) => {
        ripple.onClick(e);
        onClick?.(e);
      }}
      className={cx(
        "relative overflow-hidden inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white text-sm",
        "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/25 hover:shadow-xl transition-shadow",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...(rest as any)}
    >
      {Icon && <Icon size={17} />}
      {children}
    </motion.button>
  );
}

export function GhostButton({ icon: Icon, className, children, onClick, ...rest }: BaseProps) {
  const ripple = useRipple();
  return (
    <motion.button
      ref={ripple.ref}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0, scale: 0.98 }}
      onClick={(e) => {
        ripple.onClick(e);
        onClick?.(e);
      }}
      className={cx(
        "relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm",
        "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700 transition-colors",
        className
      )}
      {...(rest as any)}
    >
      {Icon && <Icon size={16} />}
      {children}
    </motion.button>
  );
}

interface IconBtnProps {
  icon: LucideIcon;
  tone?: "gray" | "blue" | "red" | "green";
  onClick?: () => void;
  title?: string;
}

export function IconBtn({ icon: Icon, tone = "gray", onClick, title }: IconBtnProps) {
  const tones = {
    gray: "bg-slate-50 text-slate-500 hover:bg-slate-100",
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    red: "bg-red-50 text-red-500 hover:bg-red-100",
    green: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  };
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cx("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", tones[tone])}
    >
      <Icon size={16} />
    </button>
  );
}
