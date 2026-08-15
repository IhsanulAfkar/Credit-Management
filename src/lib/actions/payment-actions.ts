"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveFile } from "../file";

/**
 * Mark an installment as paid. Creates a Payment record for audit history
 * and updates the installment status. If all installments of the loan are
 * paid, the loan status becomes LUNAS.
 */
export async function markInstallmentPaid({ installmentId, paidAt, paymentFile }: {
  installmentId: string,
  paidAt?: string,
  paymentFile?: File
}) {
  const paymentDate = paidAt ? new Date(paidAt) : new Date();

  await prisma.$transaction(async (tx) => {
    const installment = await tx.installment.findUnique({
      where: { id: installmentId },
      include: { loan: { include: { installments: true } } },
    });

    if (!installment) {
      throw new Error("Cicilan tidak ditemukan.");
    }
    if (installment.paidAt) {
      throw new Error("Cicilan ini sudah dibayar.");
    }
    let filePath: string | null = null
    if (paymentFile) {
      filePath = await saveFile(paymentFile, 'installment')
    }
    // Create payment history record.
    await tx.payment.create({
      data: {
        installmentId,
        amount: installment.amount,
        paidAt: paymentDate,
        notes: "Pembayaran cicilan",
        receipt: filePath
      },
    });

    // Update installment.
    await tx.installment.update({
      where: { id: installmentId },
      data: {
        paidAmount: installment.amount,
        paidAt: paymentDate,
        status: "LUNAS",
      },
    });

    // If all installments are now paid, mark the loan as LUNAS.
    const allPaid = installment.loan.installments.every(
      (i) => i.id === installmentId || i.paidAt
    );
    if (allPaid) {
      await tx.loan.update({
        where: { id: installment.loanId },
        data: { status: "LUNAS" },
      });
    }
  });

  revalidatePath("/payments");
  revalidatePath("/loans");
  revalidatePath("/dashboard");
}

/**
 * Undo a payment: remove the payment record and reset the installment
 * to unpaid. The loan status is recalculated.
 */
export async function undoPayment(installmentId: string) {
  await prisma.$transaction(async (tx) => {
    const installment = await tx.installment.findUnique({
      where: { id: installmentId },
      include: { loan: { include: { installments: true } } },
    });

    if (!installment) {
      throw new Error("Cicilan tidak ditemukan.");
    }
    if (!installment.paidAt) {
      throw new Error("Cicilan ini belum dibayar.");
    }

    // Remove the payment history record.
    await tx.payment.deleteMany({
      where: { installmentId },
    });

    // Reset installment to unpaid.
    await tx.installment.update({
      where: { id: installmentId },
      data: {
        paidAmount: 0,
        paidAt: null,
        status: "BELUM_JATUH_TEMPO",
      },
    });

    // Recalculate loan status: if not all paid, set back to AKTIF.
    const allPaid = installment.loan.installments.every(
      (i) => i.id === installmentId || i.paidAt
    );
    if (!allPaid && installment.loan.status === "LUNAS") {
      await tx.loan.update({
        where: { id: installment.loanId },
        data: { status: "AKTIF" },
      });
    }
  });

  revalidatePath("/payments");
  revalidatePath("/loans");
  revalidatePath("/dashboard");
}