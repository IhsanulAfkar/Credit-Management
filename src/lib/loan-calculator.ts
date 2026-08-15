/**
 * Centralized loan calculation service.
 *
 * All financial calculations use integer math (whole Rupiah) to avoid
 * floating point errors. This is the single source of truth for loan
 * calculations used across the entire application.
 */

export interface LoanCalculation {
  principal: number;
  interestRate: number; // percentage, e.g. 20 for 20%
  tenorMonths: number;
  interestAmount: number;
  totalAmount: number;
  monthlyInstallment: number;
  /** Per-installment amounts. Sum of all amounts === totalAmount. */
  installmentAmounts: number[];
}

/**
 * Calculate a flat-rate loan.
 *
 * interestAmount = principal * interestRate / 100
 * totalAmount    = principal + interestAmount
 * monthlyInstall = totalAmount / tenor
 *
 * If totalAmount is not evenly divisible by tenor, the remainder is
 * distributed by adding 1 Rupiah to the earliest installments so that
 * sum(installments) === totalAmount exactly.
 */
export function calculateLoan(
  principal: number,
  interestRate: number,
  tenorMonths: number
): LoanCalculation {
  if (principal <= 0) {
    throw new Error("Jumlah pinjaman harus lebih dari 0.");
  }
  if (tenorMonths <= 0) {
    throw new Error("Tenor harus lebih dari 0 bulan.");
  }
  if (interestRate < 0) {
    throw new Error("Bunga tidak boleh negatif.");
  }

  const principalInt = Math.round(principal);
  const interestAmount = Math.round((principalInt * interestRate) / 100);
  const totalAmount = principalInt + interestAmount;

  const baseInstallment = Math.floor(totalAmount / tenorMonths);
  const remainder = totalAmount - baseInstallment * tenorMonths;

  const installmentAmounts: number[] = [];
  for (let i = 0; i < tenorMonths; i++) {
    // Distribute the remainder across the earliest installments.
    installmentAmounts.push(i < remainder ? baseInstallment + 1 : baseInstallment);
  }

  return {
    principal: principalInt,
    interestRate,
    tenorMonths,
    interestAmount,
    totalAmount,
    monthlyInstallment: baseInstallment,
    installmentAmounts,
  };
}

/**
 * Generate installment due dates starting from firstDueDate, one per month.
 * The first installment is due on firstDueDate.
 */
export function generateDueDates(
  firstDueDate: Date,
  tenorMonths: number
): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < tenorMonths; i++) {
    const d = new Date(firstDueDate);
    d.setMonth(d.getMonth() + i);
    dates.push(d);
  }
  return dates;
}