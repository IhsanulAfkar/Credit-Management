"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export interface TermFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createLoanTerm(
  _prevState: TermFormState,
  formData: FormData
): Promise<TermFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const monthsRaw = String(formData.get("months") ?? "").trim();
  const periodRaw = String(formData.get("period") ?? "BULANAN").trim();
  const interestRaw = String(formData.get("interestRate") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Nama tenor wajib diisi.";
  if (!monthsRaw) fieldErrors.months = "Jumlah periode wajib diisi.";

  const months = Number(monthsRaw);
  if (monthsRaw && (!Number.isFinite(months) || months <= 0)) {
    fieldErrors.months = "Jumlah periode harus lebih dari 0.";
  }

  const period: "BULANAN" | "MINGGUAN" =
    periodRaw === "MINGGUAN" ? "MINGGUAN" : "BULANAN";

  const interestRate = Number(interestRaw);
  if (interestRaw && (!Number.isFinite(interestRate) || interestRate < 0)) {
    fieldErrors.interestRate = "Bunga tidak boleh negatif.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await prisma.loanTerm.create({
      data: {
        name,
        months,
        period,
        interestRate,
        isActive: true,
      },
    });
  } catch {
    return { error: "Gagal menyimpan tenor. Silakan coba lagi." };
  }

  revalidatePath("/terms");
  redirect("/terms");
}

export async function updateLoanTerm(
  id: string,
  _prevState: TermFormState,
  formData: FormData
): Promise<TermFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const monthsRaw = String(formData.get("months") ?? "").trim();
  const periodRaw = String(formData.get("period") ?? "BULANAN").trim();
  const interestRaw = String(formData.get("interestRate") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Nama tenor wajib diisi.";
  if (!monthsRaw) fieldErrors.months = "Jumlah periode wajib diisi.";

  const months = Number(monthsRaw);
  if (monthsRaw && (!Number.isFinite(months) || months <= 0)) {
    fieldErrors.months = "Jumlah periode harus lebih dari 0.";
  }

  const period: "BULANAN" | "MINGGUAN" =
    periodRaw === "MINGGUAN" ? "MINGGUAN" : "BULANAN";

  const interestRate = Number(interestRaw);
  if (interestRaw && (!Number.isFinite(interestRate) || interestRate < 0)) {
    fieldErrors.interestRate = "Bunga tidak boleh negatif.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await prisma.loanTerm.update({
      where: { id },
      data: { name, months, period, interestRate },
    });
  } catch {
    return { error: "Gagal memperbarui tenor. Silakan coba lagi." };
  }

  revalidatePath("/terms");
  redirect("/terms");
}

export async function toggleLoanTermActive(id: string, isActive: boolean) {
  await prisma.loanTerm.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/terms");
}

export async function deleteLoanTerm(id: string) {
  await prisma.loanTerm.delete({ where: { id } });
  revalidatePath("/terms");
}