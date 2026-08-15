import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { BorrowerActions } from "@/components/borrower/BorrowerActions";
import {
  LoanStatusBadge,
  InstallmentStatusBadge,
  BorrowerStatusBadge,
} from "@/components/StatusBadges";
import { computeLoanStatus } from "@/lib/loan-status";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const dynamic = "force-dynamic";

interface BorrowerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BorrowerDetailPage({
  params,
}: BorrowerDetailPageProps) {
  const { id } = await params;

  const borrower = await prisma.borrower.findUnique({
    where: { id },
    include: {
      loans: {
        include: {
          installments: {
            include: { payments: true },
            orderBy: { installmentNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!borrower) {
    notFound();
  }

  // Compute totals across all loans
  let totalLoanAmount = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  for (const loan of borrower.loans) {
    if (loan.status === "DIBATALKAN") continue;
    totalLoanAmount += loan.totalAmount;
    for (const inst of loan.installments) {
      if (inst.paidAt) {
        totalPaid += inst.amount;
      } else {
        totalRemaining += inst.amount;
      }
    }
  }

  // All payment history across all loans
  const allPayments = borrower.loans
    .flatMap((loan) =>
      loan.installments.flatMap((inst) =>
        inst.payments.map((p) => ({
          ...p,
          loan,
          installment: inst,
        }))
      )
    )
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title={borrower.name}
        description={`Peminjam sejak ${formatDate(borrower.createdAt)}`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/borrowers"
              className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Kembali
            </Link>
            <Link
              href={`/borrowers/${borrower.id}/edit`}
              className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Edit
            </Link>
            <BorrowerActions borrowerId={borrower.id} status={borrower.status} />
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pinjaman"
          value={formatRupiah(totalLoanAmount)}
          accent="default"
        />
        <StatCard
          label="Total Dibayar"
          value={formatRupiah(totalPaid)}
          accent="positive"
        />
        <StatCard
          label="Sisa Pembayaran"
          value={formatRupiah(totalRemaining)}
          accent="warning"
        />
        <StatCard
          label="Jumlah Pinjaman"
          value={String(borrower.loans.length)}
        />
      </div>

      {/* Personal info */}
      <Card>
        <CardHeader title="Informasi Pribadi" />
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nomor HP</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{borrower.phone}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">NIK / Identitas</p>
            <p className="mt-1 text-sm text-slate-900">{borrower.identityNumber || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pekerjaan</p>
            <p className="mt-1 text-sm text-slate-900">{borrower.occupation || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Usaha / Perusahaan</p>
            <p className="mt-1 text-sm text-slate-900">{borrower.businessName || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Alamat</p>
            <p className="mt-1 text-sm text-slate-900">{borrower.address || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
            <div className="mt-1">
              <BorrowerStatusBadge status={borrower.status} />
            </div>
          </div>
          {borrower.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Catatan</p>
              <p className="mt-1 text-sm text-slate-900">{borrower.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Loans */}
      <Card>
        <CardHeader
          title="Semua Pinjaman"
          subtitle={`${borrower.loans.length} pinjaman`}
          action={
            <Link
              href={`/loans/new?borrower=${borrower.id}`}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Buat Pinjaman
            </Link>
          }
        />
        {borrower.loans.length === 0 ? (
          <EmptyState
            title="Belum ada pinjaman"
            description="Buat pinjaman pertama untuk peminjam ini."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nomor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Pokok</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan/Bulan</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {borrower.loans.map((loan) => {
                  const effStatus = computeLoanStatus(loan, loan.installments);
                  const paidCount = loan.installments.filter((i) => i.paidAt).length;
                  const progress = loan.installments.length
                    ? Math.round((paidCount / loan.installments.length) * 100)
                    : 0;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-indigo-600">
                        <Link href={`/loans/${loan.id}`}>{loan.loanNumber}</Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {formatDate(loan.disbursementDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-slate-900">
                        {formatRupiah(loan.principalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-slate-600">
                        {formatRupiah(loan.monthlyInstallment)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={progress} className="w-24" />
                          <span className="text-xs text-slate-500">{progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <LoanStatusBadge status={effStatus} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Link
                          href={`/loans/${loan.id}`}
                          className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader title="Histori Pembayaran" subtitle="Semua pembayaran yang pernah dilakukan" />
        {allPayments.length === 0 ? (
          <EmptyState
            title="Belum ada pembayaran"
            description="Pembayaran akan muncul setelah admin menandai cicilan sebagai sudah dibayar."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {allPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-900">
                      <Link href={`/loans/${p.loan.id}`} className="text-indigo-600 hover:text-indigo-500">
                        {p.loan.loanNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                      ke-{p.installment.installmentNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <InstallmentStatusBadge status="LUNAS" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}