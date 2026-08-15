"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLoanTerm, updateLoanTerm } from "@/lib/actions/term-actions";
import type { LoanTermModel } from "@/generated/prisma/models";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";

interface TermFormProps {
  loanTerm?: LoanTermModel;
}

export function TermForm({ loanTerm }: TermFormProps) {
  const action = loanTerm
    ? updateLoanTerm.bind(null, loanTerm.id)
    : createLoanTerm;

  const [state, formAction, pending] = useActionState(action, {
    error: "",
    fieldErrors: {},
  });

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Nama Tenor" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={loanTerm?.name ?? ""}
            error={!!state.fieldErrors?.name}
            placeholder="Contoh: 6 Bulan"
          />
        </Field>

        <Field label="Jumlah Bulan" htmlFor="months" required error={state.fieldErrors?.months}>
          <Input
            id="months"
            name="months"
            type="number"
            min="1"
            defaultValue={loanTerm?.months ?? ""}
            error={!!state.fieldErrors?.months}
            placeholder="6"
          />
        </Field>

        <Field label="Bunga (%)" htmlFor="interestRate" required error={state.fieldErrors?.interestRate}>
          <Input
            id="interestRate"
            name="interestRate"
            type="number"
            min="0"
            step="0.1"
            defaultValue={loanTerm?.interestRate ?? ""}
            error={!!state.fieldErrors?.interestRate}
            placeholder="15"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/terms"
          className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Batal
        </Link>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Menyimpan..."
            : loanTerm
              ? "Simpan Perubahan"
              : "Tambah Tenor"}
        </Button>
      </div>
    </form>
  );
}