export type ExportType =
  | "borrowers"
  | "loans"
  | "installments"
  | "payments"
  | "outstanding";

export type ExportFormat = "xlsx" | "csv" | "pdf";

/** Raw filter payload coming from the export form (query strings / JSON). */
export interface ExportFilters {
  type: ExportType;
  format?: ExportFormat;
  /** Inclusive YYYY-MM-DD string. */
  dateStart?: string;
  /** Inclusive YYYY-MM-DD string. */
  dateEnd?: string;
  borrowerId?: string;
  loanId?: string;
  loanStatus?: string;
  installmentStatus?: string;
  period?: string;
  termId?: string;
  /** "paid" | "unpaid" — applies to installment exports. */
  payStatus?: string;
  /** Only include overdue/unpaid-past-due records (installments / outstanding). */
  overdueOnly?: boolean;
}

/** Normalized, validated filters with resolved date range. */
export interface NormalizedFilters {
  type: ExportType;
  format: ExportFormat;
  dateStart?: Date;
  dateEnd?: Date;
  borrowerId?: string;
  loanId?: string;
  loanStatus?: string;
  installmentStatus?: string;
  period?: string;
  termId?: string;
  payStatus?: "paid" | "unpaid";
  overdueOnly: boolean;
}

/** A single cell value used in every export format. */
export type CellValue = string | number | null;