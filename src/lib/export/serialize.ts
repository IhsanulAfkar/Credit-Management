import {
  BORROWER_STATUS_LABEL,
  INSTALLMENT_PERIOD_LABEL,
  INSTALLMENT_STATUS_LABEL,
  LOAN_STATUS_LABEL,
} from "@/lib/status";
import {
  computeInstallmentStatus,
  computeLoanStatus,
} from "@/lib/loan-status";
import { tenorUnitLabel } from "@/lib/format";
import {
  formatDateOnly,
  startOfToday,
  wholeDaysBetween,
} from "./shared";
import type {
  BorrowerExportRecord,
  ExportData,
  InstallmentExportRecord,
  LoanExportRecord,
  PaymentExportRecord,
} from "./queries";
import type { CellValue, ExportType } from "./types";

export interface SerializedReport {
  headers: string[];
  rows: CellValue[][];
}

/* ------------------------------------------------------------------ */
/* Installments                                                       */
/* ------------------------------------------------------------------ */

function serializeInstallments(
  rows: InstallmentExportRecord[]
): SerializedReport {
  const headers = [
    "No. Pinjaman",
    "Nama Peminjam",
    "No. HP",
    "Angsuran Ke-",
    "Jatuh Tempo",
    "Nominal Angsuran",
    "Nominal Dibayar",
    "Sisa Angsuran",
    "Status",
    "Tanggal Dibayar",
    "Hari Terlambat",
    "Catatan",
  ];

  const data = rows.map((inst) => {
    const effStatus = computeInstallmentStatus(inst, new Date());
    const daysLate = inst.paidAt
      ? Math.max(0, wholeDaysBetween(inst.dueDate, inst.paidAt))
      : Math.max(0, wholeDaysBetween(inst.dueDate, new Date()));

    return [
      inst.loan.loanNumber,
      inst.loan.borrower.name,
      inst.loan.borrower.phone,
      inst.installmentNumber,
      formatDateOnly(inst.dueDate),
      inst.amount,
      inst.paidAmount,
      inst.amount - inst.paidAmount,
      INSTALLMENT_STATUS_LABEL[effStatus],
      inst.paidAt ? formatDateOnly(inst.paidAt) : "",
      daysLate,
      inst.notes ?? "",
    ];
  });

  return { headers, rows: data };
}

/* ------------------------------------------------------------------ */
/* Outstanding / overdue                                              */
/* ------------------------------------------------------------------ */

function serializeOutstanding(rows: LoanExportRecord[]): SerializedReport {
  const headers = [
    "No. Pinjaman",
    "Nama Peminjam",
    "No. HP",
    "Alamat",
    "Nama Usaha",
    "Pokok Pinjaman",
    "Total Pinjaman",
    "Total Dibayar",
    "Sisa Pinjaman",
    "Jatuh Tempo Berikutnya",
    "Angsuran Berikutnya",
    "Jumlah Angsuran Terlambat",
    "Total Keterlambatan",
    "Hari Terlambat",
    "Tanggal Pembayaran Terakhir",
    "Status",
  ];

  const today = startOfToday();

  const data = rows.map((loan) => {
    const overdue = loan.installments.filter(
      (i) => !i.paidAt && wholeDaysBetween(i.dueDate, today) > 0
    );
    const unpaid = loan.installments
      .filter((i) => !i.paidAt)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const next = unpaid[0] ?? null;

    const allPayments = loan.installments.flatMap((i) => i.payments);
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    const totalOverdue = overdue.reduce(
      (s, i) => s + (i.amount - i.paidAmount),
      0
    );
    const daysOverdue = overdue.length
      ? Math.max(...overdue.map((i) => wholeDaysBetween(i.dueDate, today)))
      : 0;
    const lastPaymentAt = allPayments.length
      ? allPayments.reduce(
          (max, p) => (p.paidAt > max ? p.paidAt : max),
          allPayments[0].paidAt
        )
      : null;
    const effectiveStatus = computeLoanStatus(loan, loan.installments);

    return [
      loan.loanNumber,
      loan.borrower.name,
      loan.borrower.phone,
      loan.borrower.address ?? "",
      loan.borrower.businessName ?? "",
      loan.principalAmount,
      loan.totalAmount,
      totalPaid,
      loan.totalAmount - totalPaid,
      next ? formatDateOnly(next.dueDate) : "",
      next ? next.amount : "",
      overdue.length,
      totalOverdue,
      daysOverdue,
      lastPaymentAt ? formatDateOnly(lastPaymentAt) : "",
      LOAN_STATUS_LABEL[effectiveStatus],
    ];
  });

  return { headers, rows: data };
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                         */
/* ------------------------------------------------------------------ */

export function serializeReport(
  type: ExportType,
  data: ExportData
): SerializedReport {
  switch (type) {
    case "borrowers":
      return serializeBorrowers(data as BorrowerExportRecord[]);
    case "loans":
      return serializeLoans(data as LoanExportRecord[]);
    case "installments":
      return serializeInstallments(data as InstallmentExportRecord[]);
    case "payments":
      return serializePayments(data as PaymentExportRecord[]);
    case "outstanding":
      return serializeOutstanding(data as LoanExportRecord[]);
  }
}

function serializePayments(rows: PaymentExportRecord[]): SerializedReport {
  const headers = [
    "ID Pembayaran",
    "No. Pinjaman",
    "Nama Peminjam",
    "No. HP",
    "Angsuran Ke-",
    "Jatuh Tempo",
    "Tanggal Pembayaran",
    "Nominal Dibayar",
    "Nominal Angsuran",
    "Sisa Angsuran",
    "Catatan",
    "Referensi Bukti",
    "Tanggal Dibuat",
  ];

  const data = rows.map((p) => {
    return [
      p.id,
      p.installment.loan.loanNumber,
      p.installment.loan.borrower.name,
      p.installment.loan.borrower.phone,
      p.installment.installmentNumber,
      formatDateOnly(p.installment.dueDate),
      formatDateOnly(p.paidAt),
      p.amount,
      p.installment.amount,
      p.installment.amount - p.installment.paidAmount,
      p.notes ?? "",
      p.receipt ?? "",
      formatDateOnly(p.createdAt),
    ];
  });

  return { headers, rows: data };
}

function serializeLoans(rows: LoanExportRecord[]): SerializedReport {
  const headers = [
    "No. Pinjaman",
    "Nama Peminjam",
    "No. HP",
    "No. Identitas",
    "Pokok Pinjaman",
    "Bunga (%)",
    "Total Bunga",
    "Total Pinjaman",
    "Angsuran",
    "Jumlah Angsuran",
    "Periode Angsuran",
    "Tenor",
    "Tanggal Pencairan",
    "Jatuh Tempo Pertama",
    "Tujuan",
    "Status",
    "Total Dibayar",
    "Sisa Pinjaman",
    "Angsuran Lunas",
    "Angsuran Belum Lunas",
    "Angsuran Terlambat",
    "Tanggal Pembayaran Terakhir",
    "Tanggal Dibuat",
  ];

  const today = startOfToday();

  const data = rows.map((loan) => {
    const effectiveStatus = computeLoanStatus(loan, loan.installments);
    const allPayments = loan.installments.flatMap((i) => i.payments);
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    const outstanding = loan.totalAmount - totalPaid;
    const paidCount = loan.installments.filter((i) => i.paidAt).length;
    const lateCount = loan.installments.filter(
      (i) => !i.paidAt && wholeDaysBetween(i.dueDate, today) > 0
    ).length;
    const lastPaymentAt = allPayments.length
      ? allPayments.reduce(
          (max, p) => (p.paidAt > max ? p.paidAt : max),
          allPayments[0].paidAt
        )
      : null;
    const termName =
      loan.loanTerm?.name ??
      `${loan.termMonths} ${tenorUnitLabel(loan.period)}`;

    return [
      loan.loanNumber,
      loan.borrower.name,
      loan.borrower.phone,
      loan.borrower.identityNumber ?? "",
      loan.principalAmount,
      loan.interestRate,
      loan.interestAmount,
      loan.totalAmount,
      loan.monthlyInstallment,
      loan.termMonths,
      INSTALLMENT_PERIOD_LABEL[loan.period],
      termName,
      formatDateOnly(loan.disbursementDate),
      formatDateOnly(loan.firstDueDate),
      loan.purpose ?? "",
      LOAN_STATUS_LABEL[effectiveStatus],
      totalPaid,
      outstanding,
      paidCount,
      loan.installments.length - paidCount,
      lateCount,
      lastPaymentAt ? formatDateOnly(lastPaymentAt) : "",
      formatDateOnly(loan.createdAt),
    ];
  });

  return { headers, rows: data };
}

function serializeBorrowers(rows: BorrowerExportRecord[]): SerializedReport {
  const headers = [
    "ID Peminjam",
    "Nama",
    "No. HP",
    "No. Identitas",
    "Alamat",
    "Pekerjaan",
    "Nama Usaha",
    "Status",
    "Catatan",
    "Tanggal Pendaftaran",
    "Jumlah Pinjaman",
    "Total Dipinjam",
    "Total Dibayar",
    "Sisa Pinjaman",
  ];

  const data = rows.map((b) => {
    let totalBorrowed = 0;
    let totalPaid = 0;
    let outstanding = 0;
    for (const loan of b.loans) {
      totalBorrowed += loan.principalAmount;
      for (const inst of loan.installments) {
        for (const p of inst.payments) totalPaid += p.amount;
        outstanding += inst.amount - inst.paidAmount;
      }
    }
    return [
      b.id,
      b.name,
      b.phone,
      b.identityNumber ?? "",
      b.address ?? "",
      b.occupation ?? "",
      b.businessName ?? "",
      BORROWER_STATUS_LABEL[b.status],
      b.notes ?? "",
      formatDateOnly(b.createdAt),
      b.loans.length,
      totalBorrowed,
      totalPaid,
      outstanding,
    ];
  });

  return { headers, rows: data };
}