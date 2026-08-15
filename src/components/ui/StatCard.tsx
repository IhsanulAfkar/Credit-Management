import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  accent?: "default" | "positive" | "negative" | "warning";
}

const accentValue: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-red-600",
  warning: "text-amber-600",
};

const accentIcon: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-slate-100 text-slate-500",
  positive: "bg-emerald-50 text-emerald-600",
  negative: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
};

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = "default",
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className={`mt-2 truncate text-xl font-semibold ${accentValue[accent]}`}>
            {value}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${accentIcon[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}