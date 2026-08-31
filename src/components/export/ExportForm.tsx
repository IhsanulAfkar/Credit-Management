"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INSTALLMENT_PERIOD_LABEL,
  INSTALLMENT_STATUS_LABEL,
  LOAN_STATUS_LABEL,
} from "@/lib/status";
import {
  INSTALLMENT_STATUS_OPTIONS,
  LOAN_STATUS_OPTIONS,
  PERIOD_OPTIONS,
  REPORT_CONFIG,
} from "@/lib/export/config";
import type { ExportType } from "@/lib/export/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";

interface Option {
  value: string;
  label: string;
}

interface ExportFormProps {
  reportTypes: Option[];
  borrowers: { id: string; name: string; phone: string }[];
  terms: Option[];
  loans: { id: string; loanNumber: string }[];
}

const FORMAT_OPTIONS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
  { value: "pdf", label: "PDF (.pdf)" },
];

export function ExportForm({
  reportTypes,
  borrowers,
  terms,
  loans,
}: ExportFormProps) {
  const [type, setType] = useState<ExportType>("loans");
  const [format, setFormat] = useState("xlsx");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [borrowerId, setBorrowerId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [installmentStatus, setInstallmentStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [termId, setTermId] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [preview, setPreview] = useState<{
    loading: boolean;
    count?: number;
    error?: string;
  }>({ loading: false });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = REPORT_CONFIG[type];
  const filters = config.filters;
  const show = (key: string) => filters.includes(key as never);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("format", format);
    if (dateStart) params.set("dateStart", dateStart);
    if (dateEnd) params.set("dateEnd", dateEnd);
    if (borrowerId) params.set("borrowerId", borrowerId);
    if (loanId) params.set("loanId", loanId);
    if (loanStatus) params.set("loanStatus", loanStatus);
    if (installmentStatus) params.set("installmentStatus", installmentStatus);
    if (period) params.set("period", period);
    if (termId) params.set("termId", termId);
    if (payStatus) params.set("payStatus", payStatus);
    if (overdueOnly) params.set("overdueOnly", "true");
    return params;
  }, [
    type,
    format,
    dateStart,
    dateEnd,
    borrowerId,
    loanId,
    loanStatus,
    installmentStatus,
    period,
    termId,
    payStatus,
    overdueOnly,
  ]);

  // Fetch a live preview count (debounced).
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      setPreview((p) => ({ ...p, loading: true, error: undefined }));
      try {
        const res = await fetch(`/api/export/count?${buildQuery().toString()}`);
        const json = await res.json();
        if (!res.ok) {
          setPreview({ loading: false, error: json.error ?? "Terjadi kesalahan." });
        } else {
          setPreview({ loading: false, count: json.count });
        }
      } catch {
        setPreview({ loading: false, error: "Gagal memuat jumlah data." });
      }
    }, 350);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [buildQuery]);

  const handleTypeChange = (value: ExportType) => {
    setType(value);
    setExportError("");
  };

  const handleExport = async () => {
    setExportError("");
    setExporting(true);
    try {
      const res = await fetch(`/api/export?${buildQuery().toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setExportError(
          json?.error ?? "Gagal membuat file export. Silakan coba lagi."
        );
        return;
      }
      const blob = await res.blob();
      const disposition =
        res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename =
        match?.[1] ??
        `export-${type}-${format}.${format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "pdf"}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Gagal membuat file export. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };
const dateFieldLabel = config.dateFieldLabel;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleExport();
      }}
      className="space-y-6"
    >
      {exportError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </div>
      )}

      {/* Report type */}
      <Field label="Jenis Laporan" htmlFor="type" required>
        <Select
          id="type"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as ExportType)}
        >
          {reportTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Date range */}
      {show("dateRange") && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={`${dateFieldLabel} (Mulai)`} htmlFor="dateStart">
            <Input
              id="dateStart"
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </Field>
          <Field label={`${dateFieldLabel} (Sampai)`} htmlFor="dateEnd">
            <Input
              id="dateEnd"
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Borrower */}
      {show("borrower") && (
        <Field label="Peminjam" htmlFor="borrowerId">
          <Select
            id="borrowerId"
            value={borrowerId}
            onChange={(e) => setBorrowerId(e.target.value)}
          >
            <option value="">Semua Peminjam</option>
            {borrowers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.phone}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Specific loan */}
      {show("loanId") && (
        <Field label="Pinjaman" htmlFor="loanId">
          <Select
            id="loanId"
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
          >
            <option value="">Semua Pinjaman</option>
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.loanNumber}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Loan status */}
      {show("loanStatus") && (
        <Field label="Status Pinjaman" htmlFor="loanStatus">
          <Select
            id="loanStatus"
            value={loanStatus}
            onChange={(e) => setLoanStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            {LOAN_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {LOAN_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Installment status */}
      {show("installmentStatus") && (
        <Field label="Status Angsuran" htmlFor="installmentStatus">
          <Select
            id="installmentStatus"
            value={installmentStatus}
            onChange={(e) => setInstallmentStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            {INSTALLMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {INSTALLMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Installment period */}
      {show("period") && (
        <Field label="Periode Angsuran" htmlFor="period">
          <Select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="">Semua Periode</option>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {INSTALLMENT_PERIOD_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Loan term */}
      {show("term") && (
        <Field label="Tenor" htmlFor="termId">
          <Select
            id="termId"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <option value="">Semua Tenor</option>
            {terms.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Paid / unpaid */}
      {show("payStatus") && (
        <Field label="Pembayaran" htmlFor="payStatus">
          <Select
            id="payStatus"
            value={payStatus}
            onChange={(e) => setPayStatus(e.target.value)}
          >
            <option value="">Lunas & Belum Lunas</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Belum Lunas</option>
          </Select>
        </Field>
      )}

      {/* Overdue only */}
      {show("overdueOnly") && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
          />
          Hanya angsuran terlambat
        </label>
      )}

      {/* Format */}
      <Field label="Format" htmlFor="format" required>
        <Select
          id="format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Preview */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {preview.loading ? (
          <span className="text-slate-400">Menghitung jumlah data...</span>
        ) : preview.error ? (
          <span className="text-red-600">{preview.error}</span>
        ) : preview.count !== undefined ? (
          <>
            <strong className="text-slate-900">{preview.count}</strong>{" "}
            data akan diekspor
            {preview.count === 0 && (
              <span className="ml-1 text-red-600">
                — tidak ada data untuk filter ini
              </span>
            )}
          </>
        ) : (
          "Pilih jenis laporan untuk melihat perkiraan jumlah data."
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="submit"
          disabled={exporting || preview.loading}
        >
          {exporting ? "Mengekspor..." : "Export"}
        </Button>
      </div>
    </form>
  );
}