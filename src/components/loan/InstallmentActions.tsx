"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markInstallmentPaid,
  undoPayment,
} from "@/lib/actions/payment-actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface InstallmentActionsProps {
  installmentId: string;
  isPaid: boolean;
}

export function InstallmentActions({
  installmentId,
  isPaid,
}: InstallmentActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [undoOpen, setUndoOpen] = useState(false);

  const handleMarkPaid = () => {
    startTransition(async () => {
      try {
        await markInstallmentPaid({ installmentId });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Gagal menandai pembayaran.");
      }
    });
  };

  const handleUndo = () => {
    setUndoOpen(false);
    startTransition(async () => {
      try {
        await undoPayment(installmentId);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Gagal membatalkan pembayaran.");
      }
    });
  };

  if (isPaid) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setUndoOpen(true)} disabled={pending}>
          Batalkan
        </Button>
        <ConfirmDialog
          open={undoOpen}
          title="Batalkan Pembayaran"
          description="Pembayaran akan dibatalkan dan cicilan dikembalikan ke status belum dibayar. Histori pembayaran akan dihapus."
          confirmLabel="Batalkan Pembayaran"
          onConfirm={handleUndo}
          onCancel={() => setUndoOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Button variant="default" size="sm" onClick={handleMarkPaid} disabled={pending}>
        {pending ? "Memproses..." : "Tandai Sudah Bayar"}
      </Button>

    </>
  );
}