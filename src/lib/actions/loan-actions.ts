"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { calculateLoan, generateDueDates } from "@/lib/loan-calculator";

export interface LoanFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createLoan(
  _prevState: LoanFormState,
  formData: FormData
): Promise<LoanFormState> {
  try {
    await requireAuth();
  } catch {
    return { error: "Anda harus masuk untuk melakukan tindakan ini." };
  }
  const borrowerId = String(formData.get("borrowerId") ?? "").trim();
  const loanTermId = String(formData.get("loanTermId") ?? "").trim();
  const principalRaw = String(formData.get("principalAmount") ?? "").trim();
  const disbursementRaw = String(formData.get("disbursementDate") ?? "").trim();
  const firstDueRaw = String(formData.get("firstDueDate") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!borrowerId) fieldErrors.borrowerId = "Pilih peminjam.";
  if (!loanTermId) fieldErrors.loanTermId = "Pilih tenor.";
  if (!principalRaw) {
    fieldErrors.principalAmount = "Jumlah pinjaman wajib diisi.";
  }
  if (!disbursementRaw) {
    fieldErrors.disbursementDate = "Tanggal pencairan wajib diisi.";
  }
  if (!firstDueRaw) {
    fieldErrors.firstDueDate = "Tanggal jatuh tempo pertama wajib diisi.";
  }

  const principal = Number(principalRaw);
  if (principalRaw && (!Number.isFinite(principal) || principal <= 0)) {
    fieldErrors.principalAmount = "Jumlah pinjaman harus lebih dari 0.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    // Validate the term exists and is active.
    const term = await prisma.loanTerm.findUnique({
      where: { id: loanTermId },
    });
    if (!term) {
      return { error: "Tenor tidak ditemukan." };
    }
    if (!term.isActive) {
      return { error: "Tenor yang dipilih sudah dinonaktifkan." };
    }

    // Validate borrower exists and is active.
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    });
    if (!borrower) {
      return { error: "Peminjam tidak ditemukan." };
    }
    if (borrower.status === "TIDAK_AKTIF") {
      return { error: "Peminjam tidak aktif. Aktifkan terlebih dahulu." };
    }

    const disbursementDate = new Date(disbursementRaw);
    const firstDueDate = new Date(firstDueRaw);
    if (Number.isNaN(disbursementDate.getTime())) {
      return { error: "Tanggal pencairan tidak valid." };
    }
    if (Number.isNaN(firstDueDate.getTime())) {
      return { error: "Tanggal jatuh tempo tidak valid." };
    }

    // Centralized calculation.
    const calc = calculateLoan(principal, term.interestRate, term.months);
    const dueDates = generateDueDates(firstDueDate, term.months);

    const loanCount = await prisma.loan.count();
    const loanNumber = `LN-${String(loanCount + 1).padStart(6, "0")}`;

    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          loanNumber,
          borrowerId,
          loanTermId: term.id,
          principalAmount: calc.principal,
          interestRate: calc.interestRate,
          interestAmount: calc.interestAmount,
          totalAmount: calc.totalAmount,
          monthlyInstallment: calc.monthlyInstallment,
          termMonths: calc.tenorMonths,
          disbursementDate,
          firstDueDate,
          purpose: purpose || null,
          notes: notes || null,
          status: "AKTIF",
        },
      });

      for (let i = 0; i < calc.tenorMonths; i++) {
        await tx.installment.create({
          data: {
            loanId: loan.id,
            installmentNumber: i + 1,
            dueDate: dueDates[i],
            amount: calc.installmentAmounts[i],
            paidAmount: 0,
            status: "BELUM_JATUH_TEMPO",
          },
        });
      }
    });
  } catch (e) {
    console.error(e);
    return { error: "Gagal membuat pinjaman. Silakan coba lagi." };
  }

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans");
}

export async function cancelLoan(id: string) {
  await requireAuth();
  await prisma.loan.update({
    where: { id },
    data: { status: "DIBATALKAN" },
  });
  revalidatePath("/loans");
  revalidatePath(`/loans/${id}`);
}