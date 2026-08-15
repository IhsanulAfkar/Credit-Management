"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLoanTerm } from "@/lib/actions/term-actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteTerm({ id, hasLoans }: { id: string; hasLoans: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setOpen(false);
    startTransition(async () => {
      await deleteLoanTerm(id);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending || hasLoans}
        title={hasLoans ? "Tidak dapat dihapus karena sudah digunakan oleh pinjaman" : "Hapus tenor"}
      >
        Hapus
      </Button>
      <ConfirmDialog
        open={open}
        title="Hapus Tenor"
        description="Konfigurasi tenor dan bunga akan dihapus. Pinjaman yang sudah dibuat tidak akan terpengaruh."
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}