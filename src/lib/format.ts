import type { InstallmentPeriod } from "@/generated/prisma/enums";

/**
 * Formatting helpers for Indonesian business UI.
 */

/** Capitalized installment period unit for labels, e.g. "Cicilan / Bulan". */
export function installmentPeriodLabel(period: InstallmentPeriod): string {
  return period === "MINGGUAN" ? "Minggu" : "Bulan";
}

/** Lowercase unit for tenor text, e.g. "12 bulan" or "8 minggu". */
export function tenorUnitLabel(period: InstallmentPeriod): string {
  return period === "MINGGUAN" ? "minggu" : "bulan";
}

/** Format a number as Indonesian Rupiah, e.g. Rp10.000.000 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number with Indonesian thousands separators, e.g. 10.000.000 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

/** Format a percentage, e.g. 20% */
export function formatPercent(rate: number): string {
  return `${formatNumber(rate)}%`;
}

/** Format a date in Indonesian long format, e.g. 10 Januari 2026 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Format a date in Indonesian short format, e.g. 10/01/2026 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Format a date-time in Indonesian, e.g. 10 Jan 2026, 14:30 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Format a month name in Indonesian, e.g. "Januari 2026" */
export function formatMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Convert a Date to an ISO date string (yyyy-mm-dd) for input[type=date] */
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}