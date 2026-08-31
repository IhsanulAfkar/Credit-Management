"use client";

import { useMemo } from "react";
import { calculateLoan } from "@/lib/loan-calculator";
import { formatRupiah, formatPercent, formatNumber, tenorUnitLabel, installmentPeriodLabel } from "@/lib/format";

interface LoanCalculationPreviewProps {
  principal: number;
  interestRate: number;
  period: "BULANAN" | "MINGGUAN";
  tenorPeriods: number;
}

export function LoanCalculationPreview({
  principal,
  interestRate,
  period,
  tenorPeriods,
}: LoanCalculationPreviewProps) {
  const calc = useMemo(() => {
    if (principal <= 0 || tenorPeriods <= 0 || interestRate < 0) return null;
    try {
      return calculateLoan(principal, interestRate, period, tenorPeriods);
    } catch {
      return null;
    }
  }, [principal, interestRate, period, tenorPeriods]);

  if (!calc) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Masukkan jumlah pinjaman dan pilih tenor untuk melihat preview perhitungan.
      </div>
    );
  }

  const rows = [
    { label: "Jumlah Pinjaman", value: formatRupiah(calc.principal) },
    { label: "Tenor", value: `${formatNumber(calc.tenorPeriods)} ${tenorUnitLabel(calc.period)}` },
    { label: "Bunga", value: formatPercent(calc.interestRate) },
    { label: "Total Bunga", value: formatRupiah(calc.interestAmount) },
    { label: "Total Pembayaran", value: formatRupiah(calc.totalAmount) },
    {
      label: `Cicilan / ${installmentPeriodLabel(calc.period)}`,
      value: formatRupiah(calc.installmentAmount),
      highlight: true,
    },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-indigo-200 bg-indigo-50/50">
      <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-indigo-900">
          Preview Perhitungan
        </h3>
        <p className="mt-0.5 text-xs text-indigo-600">
          Hitungan ini mengikuti skema bunga flat
        </p>
      </div>
      <dl className="divide-y divide-indigo-100/60">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-4 py-2.5 ${row.highlight ? "bg-indigo-100/70" : ""
              }`}
          >
            <dt className="text-sm text-indigo-900/70">{row.label}</dt>
            <dd
              className={`text-sm font-semibold ${row.highlight ? "text-lg text-indigo-900" : "text-indigo-900"
                }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}