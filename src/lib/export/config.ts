import type { ExportType } from "./types";

/** Filter identifiers available in the export form. */
export type ExportFilterKey =
  | "dateRange"
  | "borrower"
  | "loanId"
  | "loanStatus"
  | "installmentStatus"
  | "period"
  | "term"
  | "payStatus"
  | "overdueOnly";

export interface ReportConfig {
  /** Indonesian label shown in the report type selector. */
  label: string;
  /** Which date field the date range filter applies to (for the UI hint). */
  dateFieldLabel: string;
  /** Filters that are relevant to this report type. */
  filters: ExportFilterKey[];
  /** Worksheet title for XLSX / document title for PDF. */
  sheetName: string;
}

export const EXPORT_TYPES: ExportType[] = [
  "borrowers",
  "loans",
  "installments",
  "payments",
  "outstanding",
];

export const REPORT_CONFIG: Record<ExportType, ReportConfig> = {
  borrowers: {
    label: "Peminjam",
    dateFieldLabel: "Tanggal Pendaftaran",
    filters: ["dateRange"],
    sheetName: "Peminjam",
  },
  loans: {
    label: "Pinjaman",
    dateFieldLabel: "Tanggal Pencairan",
    filters: ["dateRange", "borrower", "loanStatus", "period", "term"],
    sheetName: "Pinjaman",
  },
  installments: {
    label: "Angsuran / Cicilan",
    dateFieldLabel: "Tanggal Jatuh Tempo",
    filters: [
      "dateRange",
      "borrower",
      "loanId",
      "loanStatus",
      "installmentStatus",
      "period",
      "term",
      "payStatus",
      "overdueOnly",
    ],
    sheetName: "Angsuran",
  },
  payments: {
    label: "Pembayaran",
    dateFieldLabel: "Tanggal Pembayaran",
    filters: ["dateRange", "borrower", "loanId", "loanStatus", "period", "term"],
    sheetName: "Pembayaran",
  },
  outstanding: {
    label: "Piutang / Terlambat",
    dateFieldLabel: "Tanggal Pencairan",
    filters: ["dateRange", "borrower", "loanId", "loanStatus", "period", "term"],
    sheetName: "Piutang Terlambat",
  },
};

/** Filter option lists used by the client form (labels come from @/lib/status). */
export const LOAN_STATUS_OPTIONS = ["AKTIF", "LUNAS", "DIBATALKAN", "DRAFT"] as const;
export const INSTALLMENT_STATUS_OPTIONS = [
  "BELUM_JATUH_TEMPO",
  "JATUH_TEMPO",
  "TERLAMBAT",
  "LUNAS",
] as const;
export const PERIOD_OPTIONS = ["BULANAN", "MINGGUAN"] as const;