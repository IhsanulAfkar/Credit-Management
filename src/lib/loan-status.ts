import type { InstallmentModel, LoanModel } from "@/generated/prisma/models";
import type { InstallmentStatus, LoanStatus } from "@/generated/prisma/enums";

/**
 * Compute the effective installment status based on the current date.
 * A paid installment is always LUNAS. Otherwise, the status depends on
 * whether the due date has passed.
 */
export function computeInstallmentStatus(
  installment: Pick<InstallmentModel, "paidAt" | "dueDate">,
  now: Date = new Date()
): InstallmentStatus {
  if (installment.paidAt) return "LUNAS";

  const today = startOfDay(now);
  const due = startOfDay(installment.dueDate);

  if (due < today) return "TERLAMBAT";
  if (due.getTime() === today.getTime()) return "JATUH_TEMPO";
  return "BELUM_JATUH_TEMPO";
}

/**
 * Compute the effective loan status. A loan is LUNAS when all installments
 * are paid. Otherwise it keeps its stored status.
 */
export function computeLoanStatus(
  loan: Pick<LoanModel, "status">,
  installments: Pick<InstallmentModel, "paidAt">[]
): LoanStatus {
  if (loan.status === "DIBATALKAN" || loan.status === "DRAFT") {
    return loan.status;
  }
  if (installments.length > 0 && installments.every((i) => i.paidAt)) {
    return "LUNAS";
  }
  return "AKTIF";
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Check if a date is within the current month. */
export function isInCurrentMonth(date: Date, now: Date = new Date()): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

/** Check if a date is today. */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return startOfDay(date).getTime() === startOfDay(now).getTime();
}