"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createLoan } from "@/lib/actions/loan-actions";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { LoanCalculationPreview } from "./LoanCalculationPreview";

type InstallmentPeriod = "BULANAN" | "MINGGUAN";

interface LoanTermOption {
  id: string;
  name: string;
  months: number;
  period: InstallmentPeriod;
  interestRate: number;
}

interface BorrowerOption {
  id: string;
  name: string;
  phone: string;
}

interface LoanFormProps {
  borrowers: BorrowerOption[];
  loanTerms: LoanTermOption[];
  selectedBorrowerId?: string;
}

export function LoanForm({
  borrowers,
  loanTerms,
  selectedBorrowerId,
}: LoanFormProps) {
  const [state, formAction, pending] = useActionState(createLoan, {
    error: "",
    fieldErrors: {},
  });

  const [principal, setPrincipal] = useState("");
  const [period, setPeriod] = useState<InstallmentPeriod>("BULANAN");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [disbursementDate, setDisbursementDate] = useState(
    toDateInputValue(new Date())
  );
  const [firstDueDate, setFirstDueDate] = useState("");

  // Only offer terms matching the selected installment period.
  const availableTerms = loanTerms.filter((t) => t.period === period);
  const principalNumber = Number(principal);

  const handlePeriodChange = (value: InstallmentPeriod) => {
    setPeriod(value);
    // Reset tenor if the current one belongs to another period.
    if (
      selectedTermId &&
      !loanTerms.some((t) => t.id === selectedTermId && t.period === value)
    ) {
      setSelectedTermId("");
    }
    setFirstDueDate("");
  };

  const handleDisbursementChange = (value: string) => {
    setDisbursementDate(value);
    if (!value) {
      setFirstDueDate("");
      return;
    }
    const d = new Date(value);
    if (period === "MINGGUAN") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 30);
    }
    setFirstDueDate(toDateInputValue(d));
  };

  const dueHint =
    period === "MINGGUAN"
      ? "Otomatis 7 hari setelah pencairan, dapat diubah"
      : "Otomatis 30 hari setelah pencairan, dapat diubah";

  const preview = useMemo(() => {
    const term = loanTerms.find(
      (t) => t.id === selectedTermId && t.period === period
    );
    if (!term || !principalNumber || principalNumber <= 0) {
      return null;
    }
    return (
      <LoanCalculationPreview
        principal={principalNumber}
        interestRate={term.interestRate}
        period={term.period}
        tenorPeriods={term.months}
      />
    );
  }, [principalNumber, selectedTermId, period, loanTerms]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Field label="Peminjam" htmlFor="borrowerId" required error={state.fieldErrors?.borrowerId}>
        <Select
          id="borrowerId"
          name="borrowerId"
          defaultValue={selectedBorrowerId ?? ""}
          error={!!state.fieldErrors?.borrowerId}
        >
          <option value="">Pilih peminjam...</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.phone}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Jumlah Pinjaman (Rp)"
          htmlFor="principalAmount"
          required
          error={state.fieldErrors?.principalAmount}
        >
          <Input
            id="principalAmount"
            name="principalAmount"
            type="number"
            min="1"
            step="1000"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            error={!!state.fieldErrors?.principalAmount}
            placeholder="10000000"
          />
        </Field>

        <Field label="Jenis Cicilan" htmlFor="period" required>
          <Select
            id="period"
            name="period"
            value={period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as InstallmentPeriod)
            }
          >
            <option value="BULANAN">Bulanan</option>
            <option value="MINGGUAN">Mingguan</option>
          </Select>
        </Field>

        <Field label="Tenor" htmlFor="loanTermId" required error={state.fieldErrors?.loanTermId}>
          <Select
            id="loanTermId"
            name="loanTermId"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            error={!!state.fieldErrors?.loanTermId}
          >
            <option value="">Pilih tenor...</option>
            {availableTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.interestRate}%
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Tanggal Pencairan"
          htmlFor="disbursementDate"
          required
          error={state.fieldErrors?.disbursementDate}
        >
          <Input
            id="disbursementDate"
            name="disbursementDate"
            type="date"
            value={disbursementDate}
            onChange={(e) => handleDisbursementChange(e.target.value)}
            error={!!state.fieldErrors?.disbursementDate}
          />
        </Field>

        <Field
          label="Jatuh Tempo Pertama"
          htmlFor="firstDueDate"
          required
          error={state.fieldErrors?.firstDueDate}
          hint={dueHint}
        >
          <Input
            id="firstDueDate"
            name="firstDueDate"
            type="date"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
            error={!!state.fieldErrors?.firstDueDate}
          />
        </Field>
      </div>

      <Field label="Tujuan Penggunaan" htmlFor="purpose">
        <Input
          id="purpose"
          name="purpose"
          placeholder="Contoh: Modal usaha"
        />
      </Field>

      <Field label="Catatan Tambahan" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Catatan tambahan tentang pinjaman"
        />
      </Field>

      {preview && <div>{preview}</div>}

      {!preview && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Masukkan jumlah pinjaman dan pilih tenor untuk melihat preview perhitungan.
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/loans"
          className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Batal
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Membuat..." : "Buat Pinjaman"}
        </Button>
      </div>
    </form>
  );
}