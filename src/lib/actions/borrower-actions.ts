"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import type { BorrowerStatus } from "@/generated/prisma/enums";

export interface BorrowerFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createBorrower(
  _prevState: BorrowerFormState,
  formData: FormData
): Promise<BorrowerFormState> {
  try {
    await requireAuth();
  } catch {
    return { error: "Anda harus masuk untuk melakukan tindakan ini." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const identityNumber = String(formData.get("identityNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Nama wajib diisi.";
  if (!phone) fieldErrors.phone = "Nomor HP wajib diisi.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await prisma.borrower.create({
      data: {
        name,
        phone,
        identityNumber: identityNumber || null,
        address: address || null,
        occupation: occupation || null,
        businessName: businessName || null,
        notes: notes || null,
      },
    });
  } catch {
    return { error: "Gagal menyimpan peminjam. Silakan coba lagi." };
  }

  revalidatePath("/borrowers");
  redirect("/borrowers");
}

export async function updateBorrower(
  id: string,
  _prevState: BorrowerFormState,
  formData: FormData
): Promise<BorrowerFormState> {
  try {
    await requireAuth();
  } catch {
    return { error: "Anda harus masuk untuk melakukan tindakan ini." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const identityNumber = String(formData.get("identityNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Nama wajib diisi.";
  if (!phone) fieldErrors.phone = "Nomor HP wajib diisi.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await prisma.borrower.update({
      where: { id },
      data: {
        name,
        phone,
        identityNumber: identityNumber || null,
        address: address || null,
        occupation: occupation || null,
        businessName: businessName || null,
        notes: notes || null,
      },
    });
  } catch {
    return { error: "Gagal memperbarui peminjam. Silakan coba lagi." };
  }

  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${id}`);
  redirect(`/borrowers/${id}`);
}

export async function setBorrowerStatus(id: string, status: BorrowerStatus) {
  await requireAuth();
  await prisma.borrower.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${id}`);
}

export async function deleteBorrower(id: string) {
  await requireAuth();
  // Soft-delete: set status to TIDAK_AKTIF instead of hard delete.
  await prisma.borrower.update({
    where: { id },
    data: { status: "TIDAK_AKTIF" },
  });
  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${id}`);
}