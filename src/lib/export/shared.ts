import { EXPORT_TYPES } from "./config";
import type {
  ExportFilters,
  ExportFormat,
  ExportType,
  NormalizedFilters,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPORT_FORMATS: ExportFormat[] = ["xlsx", "csv", "pdf"];

/** Error carrying a user-friendly Indonesian message. */
export class ExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportValidationError";
  }
}

/**
 * Parse a YYYY-MM-DD value into a local-timezone Date at 00:00:00.
 * Uses the local-time constructor to match the application's existing date
 * handling (see the payments page month-range logic). Rejects impossible
 * dates such as 2026-02-31.
 */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new ExportValidationError("Format tanggal tidak valid.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new ExportValidationError(`Tanggal ${value} tidak valid.`);
  }
  return date;
}

/**
 * Resolve an inclusive date range. The end date is extended to 23:59:59.999
 * local time so records on the entire end day are included.
 */
export function resolveDateRange(
  startRaw?: string,
  endRaw?: string
): { start?: Date; end?: Date } {
  let start: Date | undefined;
  let end: Date | undefined;
  if (startRaw) start = parseDateOnly(startRaw);
  if (endRaw) end = new Date(parseDateOnly(endRaw).getTime() + MS_PER_DAY - 1);

  if (start && end && start.getTime() > end.getTime()) {
    throw new ExportValidationError(
      "Tanggal mulai tidak boleh lebih besar dari tanggal akhir."
    );
  }
  return { start, end };
}

/** Start of today (local midnight). */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Start of tomorrow (local midnight). */
export function startOfTomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

const LOAN_STATUSES = ["DRAFT", "AKTIF", "LUNAS", "DIBATALKAN"] as const;
const INSTALLMENT_STATUSES = [
  "BELUM_JATUH_TEMPO",
  "JATUH_TEMPO",
  "TERLAMBAT",
  "LUNAS",
] as const;

/**
 * Validate and normalize the raw filter payload coming from the export form.
 * Throws ExportValidationError for invalid input.
 */
export function normalizeFilters(raw: ExportFilters): NormalizedFilters {
  if (!raw || typeof raw !== "object") {
    throw new ExportValidationError("Parameter export tidak valid.");
  }

  const type = raw.type;
  if (!EXPORT_TYPES.includes(type)) {
    throw new ExportValidationError("Jenis laporan tidak dikenal.");
  }

  const format: ExportFormat = raw.format ?? "xlsx";
  if (!EXPORT_FORMATS.includes(format)) {
    throw new ExportValidationError("Format export tidak didukung.");
  }

  const { start, end } = resolveDateRange(raw.dateStart, raw.dateEnd);

  if (raw.loanStatus && !(LOAN_STATUSES as readonly string[]).includes(raw.loanStatus)) {
    throw new ExportValidationError("Status pinjaman tidak valid.");
  }
  if (
    raw.installmentStatus &&
    !(INSTALLMENT_STATUSES as readonly string[]).includes(raw.installmentStatus)
  ) {
    throw new ExportValidationError("Status angsuran tidak valid.");
  }
  if (raw.period && raw.period !== "BULANAN" && raw.period !== "MINGGUAN") {
    throw new ExportValidationError("Periode angsuran tidak valid.");
  }
  if (
    raw.payStatus &&
    raw.payStatus !== "paid" &&
    raw.payStatus !== "unpaid"
  ) {
    throw new ExportValidationError("Filter pembayaran tidak valid.");
  }

  const exists = (v: string | undefined) => typeof v === "string" && v.length > 0;

  return {
    type,
    format,
    dateStart: start,
    dateEnd: end,
    borrowerId: exists(raw.borrowerId) ? raw.borrowerId : undefined,
    loanId: exists(raw.loanId) ? raw.loanId : undefined,
    loanStatus: exists(raw.loanStatus) ? raw.loanStatus : undefined,
    installmentStatus: exists(raw.installmentStatus)
      ? raw.installmentStatus
      : undefined,
    period: exists(raw.period) ? raw.period : undefined,
    termId: exists(raw.termId) ? raw.termId : undefined,
    payStatus: raw.payStatus === "paid" || raw.payStatus === "unpaid"
      ? raw.payStatus
      : undefined,
    overdueOnly: raw.overdueOnly === true,
  };
}

/** Format a Date as YYYY-MM-DD in local time (for dates exported as text). */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole calendar days between two dates (negative if b < a). */
export function wholeDaysBetween(a: Date, b: Date): number {
  const x = new Date(a);
  x.setHours(0, 0, 0, 0);
  const y = new Date(b);
  y.setHours(0, 0, 0, 0);
  return Math.round((y.getTime() - x.getTime()) / MS_PER_DAY);
}

/**
 * Build the download filename, e.g.
 *   loans-2026-08-01-to-2026-08-30.xlsx        (date range selected)
 *   loans-export-2026-08-30.xlsx               (no date range)
 */
export function buildFilename(
  type: ExportType,
  format: ExportFormat,
  start?: Date,
  end?: Date
): string {
  const ext = format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "pdf";
  const date = new Date();
  if (start || end) {
    const s = start ? formatDateOnly(start) : "awal";
    const e = end ? formatDateOnly(end) : "akhir";
    return `${type}-${s}-to-${e}.${ext}`;
  }
  return `${type}-export-${formatDateOnly(date)}.${ext}`;
}