"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInstallmentPaid } from "@/lib/actions/payment-actions";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function QuickPayButton({ installmentId }: { installmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openMarkPay, setOpenMarkPay] = useState(false)
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      try {
        console.log(installmentId)
        await markInstallmentPaid({
          installmentId,
          paymentFile
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menandai pembayaran.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        onClick={() => setOpenMarkPay(true)}
        disabled={pending}
      >
        {pending ? "Memproses..." : "Tandai Bayar"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {openMarkPay && <Dialog open={openMarkPay} onOpenChange={setOpenMarkPay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bukti Bayar</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setPaymentFile(file)
                }}
              />
            </div>
            <Button className='w-full' onClick={handlePay}>Tandai Bayar</Button>
          </div>
        </DialogContent>
      </Dialog>}
    </div>
  );
}