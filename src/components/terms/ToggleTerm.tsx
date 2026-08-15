"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLoanTermActive } from "@/lib/actions/term-actions";
import { Button } from "@/components/ui/Button";

export function ToggleTerm({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleLoanTermActive(id, !isActive);
      router.refresh();
    });
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      disabled={pending}
    >
      {isActive ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}