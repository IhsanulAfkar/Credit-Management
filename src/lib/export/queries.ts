import type { BorrowerStatus, InstallmentPeriod, InstallmentStatus, LoanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { startOfToday, startOfTomorrow } from "./shared";
import type { ExportType, NormalizedFilters } from "./types";

/* ------------------------------------------------------------------ */
/* Record shapes expected by the serializers                          */
/* ------------------------------------------------------------------ */

export interface BorrowerExportRecord {
  id: string;
  name: string;
  phone: string;
  identityNumber: string | null;
  address: string | null;
  occupation: string | null;
  businessName: string | null;
  notes: string | null;
  status: BorrowerStatus;
  createdAt: Date;
  loans: Array<{
    principalAmount: number;
    installments: Array<{
      amount: number;
      paidAmount: number;
      payments: Array<{ amount: number }>;
    }>;
  }>;
}

export interface LoanExportRecord {
  id: string;
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  totalAmount: number;
  monthlyInstallment: number;
  termMonths: number;
  period: InstallmentPeriod;
  status: LoanStatus;
  disbursementDate: Date;
  firstDueDate: Date;
  purpose: string | null;
  createdAt: Date;
  loanTerm: { name: string } | null;
  borrower: {
    name: string;
    phone: string;
    identityNumber: string | null;
    address: string | null;
    businessName: string | null;
  };
  installments: Array<{
    installmentNumber: number;
    amount: number;
    paidAmount: number;
    paidAt: Date | null;
    dueDate: Date;
    payments: Array<{ amount: number; paidAt: Date }>;
  }>;
}

export interface InstallmentExportRecord {
  id: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  paidAt: Date | null;
  status: InstallmentStatus;
  notes: string | null;
  loan: {
    loanNumber: string;
    status: LoanStatus;
    borrower: { name: string; phone: string };
  };
}

export interface PaymentExportRecord {
  id: string;
  amount: number;
  paidAt: Date;
  notes: string | null;
  receipt: string | null;
  createdAt: Date;
  installment: {
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    status: InstallmentStatus;
    loan: {
      loanNumber: string;
      borrower: { name: string; phone: string };
    };
  };
}

export type ExportData =
  | BorrowerExportRecord[]
  | LoanExportRecord[]
  | InstallmentExportRecord[]
  | PaymentExportRecord[];

/* ------------------------------------------------------------------ */
/* Shared where-clause helpers                                        */
/* ------------------------------------------------------------------ */

function dateRangeWhere(start?: Date, end?: Date) {
  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {}),
  };
}

function loanWhereExtra(filters: NormalizedFilters) {
  return {
    ...(filters.borrowerId ? { borrowerId: filters.borrowerId } : {}),
    ...(filters.loanId ? { id: filters.loanId } : {}),
    ...(filters.loanStatus ? { status: filters.loanStatus as LoanStatus } : {}),
    ...(filters.period ? { period: filters.period as InstallmentPeriod } : {}),
    ...(filters.termId ? { loanTermId: filters.termId } : {}),
  };
}

/** Build a Prisma where for an effective installment status, derived from
 *  due dates & payment state rather than trusting a possibly-stale column. */
function installmentStatusWhere(status: string) {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  switch (status) {
    case "LUNAS":
      return { paidAt: { not: null } };
    case "TERLAMBAT":
      return { paidAt: null, dueDate: { lt: today } };
    case "JATUH_TEMPO":
      return { paidAt: null, dueDate: { gte: today, lt: tomorrow } };
    case "BELUM_JATUH_TEMPO":
      return { paidAt: null, dueDate: { gte: tomorrow } };
    default:
      return {};
  }
}

/* ------------------------------------------------------------------ */
/* Where builders per report type                                     */
/* ------------------------------------------------------------------ */

function buildBorrowersWhere(filters: NormalizedFilters) {
  return {
    ...((filters.dateStart || filters.dateEnd)
      ? { createdAt: dateRangeWhere(filters.dateStart, filters.dateEnd) }
      : {}),
  };
}

function buildLoansWhere(filters: NormalizedFilters) {
  return {
    ...((filters.dateStart || filters.dateEnd)
      ? {
          disbursementDate: dateRangeWhere(
            filters.dateStart,
            filters.dateEnd
          ),
        }
      : {}),
    ...loanWhereExtra(filters),
  };
}

function buildInstallmentsWhere(filters: NormalizedFilters) {
  // Status filters take precedence to avoid contradictory where clauses.
  let statusFilter = {};
  if (filters.installmentStatus) {
    statusFilter = installmentStatusWhere(filters.installmentStatus);
  } else if (filters.overdueOnly) {
    statusFilter = { paidAt: null, dueDate: { lt: startOfToday() } };
  } else if (filters.payStatus === "paid") {
    statusFilter = { paidAt: { not: null } };
  } else if (filters.payStatus === "unpaid") {
    statusFilter = { paidAt: null };
  }

  return {
    ...((filters.dateStart || filters.dateEnd)
      ? { dueDate: dateRangeWhere(filters.dateStart, filters.dateEnd) }
      : {}),
    ...statusFilter,
    loan: loanWhereExtra(filters),
  };
}

function buildPaymentsWhere(filters: NormalizedFilters) {
  return {
    ...((filters.dateStart || filters.dateEnd)
      ? { paidAt: dateRangeWhere(filters.dateStart, filters.dateEnd) }
      : {}),
    installment: {
      loan: loanWhereExtra(filters),
    },
  };
}

function buildOutstandingWhere(filters: NormalizedFilters) {
  return {
    ...((filters.dateStart || filters.dateEnd)
      ? {
          disbursementDate: dateRangeWhere(
            filters.dateStart,
            filters.dateEnd
          ),
        }
      : {}),
    // By default exclude cancelled loans from an overdue report.
    ...(filters.loanStatus
      ? { status: filters.loanStatus as LoanStatus }
      : {
          status: {
            notIn: ["DIBATALKAN", "DRAFT"] as LoanStatus[],
          },
        }),
    ...loanWhereExtra(filters),
    installments: {
      some: { paidAt: null, dueDate: { lt: startOfToday() } },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Fetching                                                           */
/* ------------------------------------------------------------------ */

const loanSelect = {
  id: true,
  loanNumber: true,
  principalAmount: true,
  interestRate: true,
  interestAmount: true,
  totalAmount: true,
  monthlyInstallment: true,
  termMonths: true,
  period: true,
  status: true,
  disbursementDate: true,
  firstDueDate: true,
  purpose: true,
  createdAt: true,
  loanTerm: { select: { name: true } },
  borrower: {
    select: {
      name: true,
      phone: true,
      identityNumber: true,
      address: true,
      businessName: true,
    },
  },
  installments: {
    select: {
      installmentNumber: true,
      amount: true,
      paidAmount: true,
      paidAt: true,
      dueDate: true,
      payments: { select: { amount: true, paidAt: true } },
    },
  },
} as const;

async function fetchBorrowers(
  filters: NormalizedFilters
): Promise<BorrowerExportRecord[]> {
  const rows = await prisma.borrower.findMany({
    where: buildBorrowersWhere(filters),
    select: {
      id: true,
      name: true,
      phone: true,
      identityNumber: true,
      address: true,
      occupation: true,
      businessName: true,
      notes: true,
      status: true,
      createdAt: true,
      loans: {
        where: { status: { not: "DIBATALKAN" } },
        select: {
          principalAmount: true,
          installments: {
            select: {
              amount: true,
              paidAmount: true,
              payments: { select: { amount: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows as unknown as BorrowerExportRecord[];
}

async function fetchLoans(
  filters: NormalizedFilters
): Promise<LoanExportRecord[]> {
  const rows = await prisma.loan.findMany({
    where: buildLoansWhere(filters),
    select: loanSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows as unknown as LoanExportRecord[];
}

async function fetchInstallments(
  filters: NormalizedFilters
): Promise<InstallmentExportRecord[]> {
  const rows = await prisma.installment.findMany({
    where: buildInstallmentsWhere(filters),
    select: {
      id: true,
      installmentNumber: true,
      dueDate: true,
      amount: true,
      paidAmount: true,
      paidAt: true,
      status: true,
      notes: true,
      loan: {
        select: {
          loanNumber: true,
          status: true,
          borrower: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { dueDate: "desc" },
  });
  return rows as unknown as InstallmentExportRecord[];
}

async function fetchPayments(
  filters: NormalizedFilters
): Promise<PaymentExportRecord[]> {
  const rows = await prisma.payment.findMany({
    where: buildPaymentsWhere(filters),
    select: {
      id: true,
      amount: true,
      paidAt: true,
      notes: true,
      receipt: true,
      createdAt: true,
      installment: {
        select: {
          installmentNumber: true,
          dueDate: true,
          amount: true,
          paidAmount: true,
          status: true,
          loan: {
            select: {
              loanNumber: true,
              borrower: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });
  return rows as unknown as PaymentExportRecord[];
}

async function fetchOutstanding(
  filters: NormalizedFilters
): Promise<LoanExportRecord[]> {
  const rows = await prisma.loan.findMany({
    where: buildOutstandingWhere(filters),
    select: loanSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows as unknown as LoanExportRecord[];
}

export async function fetchExportData(
  type: ExportType,
  filters: NormalizedFilters
): Promise<ExportData> {
  switch (type) {
    case "borrowers":
      return fetchBorrowers(filters);
    case "loans":
      return fetchLoans(filters);
    case "installments":
      return fetchInstallments(filters);
    case "payments":
      return fetchPayments(filters);
    case "outstanding":
      return fetchOutstanding(filters);
  }
}

/* ------------------------------------------------------------------ */
/* Counting (record preview)                                          */
/* ------------------------------------------------------------------ */

export async function countExportData(
  type: ExportType,
  filters: NormalizedFilters
): Promise<number> {
  switch (type) {
    case "borrowers":
      return prisma.borrower.count({ where: buildBorrowersWhere(filters) });
    case "loans":
      return prisma.loan.count({ where: buildLoansWhere(filters) });
    case "installments":
      return prisma.installment.count({ where: buildInstallmentsWhere(filters) });
    case "payments":
      return prisma.payment.count({ where: buildPaymentsWhere(filters) });
    case "outstanding":
      return prisma.loan.count({ where: buildOutstandingWhere(filters) });
  }
}