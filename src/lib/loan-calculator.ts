/**
 * Centralized loan calculation service.
 *
 * All financial calculations use integer math (whole Rupiah) to avoid
 * floating point errors. This is the single source of truth for loan
 * calculations used across the entire application.
 */

export type InstallmentPeriod = "BULANAN" | "MINGGUAN";

export interface LoanCalculation {
  principal: number;
  interestRate: number; // percentage, e.g. 20 for 20%
  period: InstallmentPeriod;
  tenorPeriods: number; // number of installments (periods)
  interestAmount: number;
  totalAmount: number;
  installmentAmount: number; // base per-period installment
  /** Per-installment amounts. Sum of all amounts === totalAmount. */
  installmentAmounts: number[];
}

/**
 * Calculate a flat-rate loan.
 *
 * interestAmount = principal * interestRate / 100
 * totalAmount    = principal + interestAmount
 * installment    = totalAmount / periods
 *
 * If totalAmount is not evenly divisible by the number of periods, the
 * remainder is distributed by adding 1 Rupiah to the earliest installments so
 * that sum(installments) === totalAmount exactly.
 */
export function calculateLoan(
  principal: number,
  interestRate: number,
  period: InstallmentPeriod,
  tenorPeriods: number
): LoanCalculation {
  if (principal <= 0) {
    throw new Error("Jumlah pinjaman harus lebih dari 0.");
  }
  if (tenorPeriods <= 0) {
    throw new Error("Tenor harus lebih dari 0 periode.");
  }
  if (interestRate < 0) {
    throw new Error("Bunga tidak boleh negatif.");
  }

  const principalInt = Math.round(principal);
  const interestAmount = Math.round((principalInt * interestRate) / 100);
  const totalAmount = principalInt + interestAmount;

  const baseInstallment = Math.floor(totalAmount / tenorPeriods);
  const remainder = totalAmount - baseInstallment * tenorPeriods;

  const installmentAmounts: number[] = [];
  for (let i = 0; i < tenorPeriods; i++) {
    // Distribute the remainder across the earliest installments.
    installmentAmounts.push(i < remainder ? baseInstallment + 1 : baseInstallment);
  }

  return {
    principal: principalInt,
    interestRate,
    period,
    tenorPeriods,
    interestAmount,
    totalAmount,
    installmentAmount: baseInstallment,
    installmentAmounts,
  };
}

/**
 * Generate installment due dates starting from firstDueDate.
 * - BULANAN  : one installment per month (first due on firstDueDate).
 * - MINGGUAN : one installment per week (7 days), first due on firstDueDate.
 */
export function generateDueDates(
  firstDueDate: Date,
  period: InstallmentPeriod,
  tenorPeriods: number
): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < tenorPeriods; i++) {
    const d = new Date(firstDueDate);
    if (period === "MINGGUAN") {
      d.setDate(d.getDate() + i * 7);
    } else {
      d.setMonth(d.getMonth() + i);
    }
    dates.push(d);
  }
  return dates;
}