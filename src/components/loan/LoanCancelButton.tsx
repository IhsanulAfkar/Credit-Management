"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelLoan } from "@/lib/actions/loan-actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function LoanCancelButton({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleCancel = () => {
    setOpen(false);
    startTransition(async () => {
      await cancelLoan(loanId);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="destructive" size={'sm'} onClick={() => setOpen(true)} disabled={pending}>
        Batalkan Pinjaman
      </Button>
      <ConfirmDialog
        open={open}
        title="Batalkan Pinjaman"
        description="Pinjaman dan seluruh jadwal cicilannya akan ditandai sebagai dibatalkan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Batalkan Pinjaman"
        onConfirm={handleCancel}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}