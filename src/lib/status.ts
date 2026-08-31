import type { BorrowerStatus, InstallmentPeriod, InstallmentStatus, LoanStatus } from "@/generated/prisma/enums";

export const BORROWER_STATUS_LABEL: Record<BorrowerStatus, string> = {
  AKTIF: "Aktif",
  TIDAK_AKTIF: "Tidak Aktif",
};

export const INSTALLMENT_PERIOD_LABEL: Record<InstallmentPeriod, string> = {
  BULANAN: "Bulanan",
  MINGGUAN: "Mingguan",
};

export const INSTALLMENT_PERIOD_STYLE: Record<InstallmentPeriod, string> = {
  BULANAN: "bg-slate-100 text-slate-700 ring-slate-500/20",
  MINGGUAN: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  DRAFT: "Draft",
  AKTIF: "Aktif",
  LUNAS: "Lunas",
  DIBATALKAN: "Dibatalkan",
};

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  BELUM_JATUH_TEMPO: "Belum Jatuh Tempo",
  JATUH_TEMPO: "Jatuh Tempo",
  TERLAMBAT: "Terlambat",
  LUNAS: "Lunas",
};

/** Tailwind classes for borrower status badges */
export const BORROWER_STATUS_STYLE: Record<BorrowerStatus, string> = {
  AKTIF: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  TIDAK_AKTIF: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

/** Tailwind classes for loan status badges */
export const LOAN_STATUS_STYLE: Record<LoanStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  AKTIF: "bg-blue-50 text-blue-700 ring-blue-600/20",
  LUNAS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DIBATALKAN: "bg-red-50 text-red-700 ring-red-600/20",
};

/** Tailwind classes for installment status badges */
export const INSTALLMENT_STATUS_STYLE: Record<InstallmentStatus, string> = {
  BELUM_JATUH_TEMPO: "bg-slate-100 text-slate-600 ring-slate-500/20",
  JATUH_TEMPO: "bg-amber-50 text-amber-700 ring-amber-600/20",
  TERLAMBAT: "bg-red-50 text-red-700 ring-red-600/20",
  LUNAS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};