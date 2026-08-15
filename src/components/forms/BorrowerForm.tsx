"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createBorrower, updateBorrower } from "@/lib/actions/borrower-actions";
import type { BorrowerModel } from "@/generated/prisma/models";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";

interface BorrowerFormProps {
  borrower?: BorrowerModel;
}

export function BorrowerForm({ borrower }: BorrowerFormProps) {
  const action = borrower
    ? updateBorrower.bind(null, borrower.id)
    : createBorrower;

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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nama Lengkap" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={borrower?.name ?? ""}
            error={!!state.fieldErrors?.name}
            placeholder="Nama lengkap peminjam"
          />
        </Field>

        <Field label="Nomor HP" htmlFor="phone" required error={state.fieldErrors?.phone}>
          <Input
            id="phone"
            name="phone"
            defaultValue={borrower?.phone ?? ""}
            error={!!state.fieldErrors?.phone}
            placeholder="081234567890"
          />
        </Field>

        <Field label="NIK / Nomor Identitas" htmlFor="identityNumber">
          <Input
            id="identityNumber"
            name="identityNumber"
            defaultValue={borrower?.identityNumber ?? ""}
            placeholder="Nomor NIK/KTP"
          />
        </Field>

        <Field label="Pekerjaan" htmlFor="occupation">
          <Input
            id="occupation"
            name="occupation"
            defaultValue={borrower?.occupation ?? ""}
            placeholder="Contoh: Pedagang"
          />
        </Field>

        <Field label="Nama Usaha / Perusahaan" htmlFor="businessName">
          <Input
            id="businessName"
            name="businessName"
            defaultValue={borrower?.businessName ?? ""}
            placeholder="Jika ada"
          />
        </Field>

        <Field label="Alamat" htmlFor="address">
          <Input
            id="address"
            name="address"
            defaultValue={borrower?.address ?? ""}
            placeholder="Alamat lengkap"
          />
        </Field>
      </div>

      <Field label="Catatan" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={borrower?.notes ?? ""}
          placeholder="Catatan tambahan tentang peminjam"
        />
      </Field>

      {borrower && (
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={borrower.status}
            disabled
          >
            <option value="AKTIF">Aktif</option>
            <option value="TIDAK_AKTIF">Tidak Aktif</option>
          </Select>
        </Field>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={borrower ? `/borrowers/${borrower.id}` : "/borrowers"}
          className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Batal
        </Link>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Menyimpan..."
            : borrower
              ? "Simpan Perubahan"
              : "Tambah Peminjam"}
        </Button>
      </div>
    </form>
  );
}