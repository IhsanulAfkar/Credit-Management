"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBorrowerStatus } from "@/lib/actions/borrower-actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { BorrowerStatus } from "@/generated/prisma/enums";

interface BorrowerActionsProps {
  borrowerId: string;
  status: BorrowerStatus;
}

export function BorrowerActions({ borrowerId, status }: BorrowerActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isActive = status === "AKTIF";

  const handleToggleStatus = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      await setBorrowerStatus(borrowerId, isActive ? "TIDAK_AKTIF" : "AKTIF");
      router.refresh();
    });
  };

  return (
    <>
      {isActive ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          Nonaktifkan
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleToggleStatus}
          disabled={pending}
        >
          Aktifkan
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Nonaktifkan Peminjam"
        description="Peminjam akan ditandai sebagai tidak aktif. Pinjaman yang sudah ada tidak akan terpengaruh."
        confirmLabel="Nonaktifkan"
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}