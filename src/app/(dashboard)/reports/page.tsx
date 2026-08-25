import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate, formatMonth } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { computeInstallmentStatus } from "@/lib/loan-status";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();

  const [loans, installments, payments] = await Promise.all([
    prisma.loan.findMany({
      include: {
        borrower: true,
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.installment.findMany({
      include: { loan: { include: { borrower: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      include: {
        installment: {
          include: { loan: { include: { borrower: true } } },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  // Compute KPIs
  const activeLoans = loans.filter((l) => {
    if (l.status === "DIBATALKAN") return false;
    return !(l.installments.length > 0 && l.installments.every((i) => i.paidAt));
  });

  const totalPrincipal = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((s, l) => s + l.principalAmount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalInterest = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((s, l) => s + l.interestAmount, 0);

  const outstanding = installments
    .filter((i) => !i.paidAt && i.loan.status !== "DIBATALKAN")
    .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const lateInstallments = installments.filter(
    (i) => computeInstallmentStatus(i, now) === "TERLAMBAT"
  );
  const lateLoans = new Set(lateInstallments.map((i) => i.loanId)).size;

  // Interest earned proportionally on paid installments
  const interestEarned = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((sum, l) => {
      const totalInstallments = l.installments.reduce((s, i) => s + i.amount, 0);
      if (totalInstallments === 0) return sum;
      const paidAmount = l.installments.reduce((s, i) => s + (i.paidAt ? i.amount : 0), 0);
      return sum + (l.interestAmount * paidAmount) / totalInstallments;
    }, 0);

  // Monthly payment summary for current year
  const yearPayments = payments.filter(
    (p) => p.paidAt.getFullYear() === now.getFullYear()
  );
  const monthBuckets: { label: string; total: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(now.getFullYear(), m, 1);
    monthBuckets.push({ label: formatMonth(d), total: 0 });
  }
  for (const p of yearPayments) {
    const bucket = monthBuckets[p.paidAt.getMonth()];
    if (bucket) bucket.total += p.amount;
  }

  // Payments this month
  const monthPaid = payments.filter(
    (p) =>
      p.paidAt.getFullYear() === now.getFullYear() &&
      p.paidAt.getMonth() === now.getMonth()
  );
  const monthPaidAmount = monthPaid.reduce((s, p) => s + p.amount, 0);

  // Late loan list
  const lateLoanIds = new Set(lateInstallments.map((i) => i.loanId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description="Ringkasan kondisi keuangan bisnis kredit"
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Pinjaman" value={formatRupiah(totalPrincipal)} />
        <StatCard label="Total Pembayaran" value={formatRupiah(totalPayments)} accent="positive" />
        <StatCard label="Total Bunga" value={formatRupiah(totalInterest)} />
        <StatCard label="Outstanding" value={formatRupiah(outstanding)} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pinjaman Terlambat" value={String(lateLoans)} accent="negative" />
        <StatCard
          label="Terima Bulan Ini"
          value={formatRupiah(monthPaidAmount)}
          sublabel={`${monthPaid.length} pembayaran`}
          accent="positive"
        />
        <StatCard
          label="Bunga Diperoleh"
          value={formatRupiah(Math.round(interestEarned))}
          sublabel="Dari pembayaran yang diterima"
        />
        <StatCard label="Pinjaman Aktif" value={String(activeLoans.length)} />
      </div>

      {/* Yearly cash flow */}
      <Card>
        <CardHeader
          title={`Cash Flow ${now.getFullYear()}`}
          subtitle="Total pembayaran yang diterima per bulan"
        />
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bulan</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pembayaran</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {monthBuckets.map((mb) => {
                const count = yearPayments.filter(
                  (p) => p.paidAt.getMonth() === new Date(`${mb.label} 1, ${now.getFullYear()}`).getMonth()
                ).length;
                return (
                  <tr key={mb.label} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                      {mb.label}
                      {mb.label === formatMonth(now) && (
                        <span className="ml-2 text-xs text-slate-400">(bulan ini)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                      {formatRupiah(mb.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                      {count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Late loans detail */}
      <Card>
        <CardHeader
          title="Pinjaman Terlambat"
          subtitle="Daftar pinjaman dengan cicilan melewati jatuh tempo"
        />
        {lateLoans === 0 ? (
          <EmptyState
            title="Tidak ada pinjaman terlambat"
            description="Semua pembayaran berjalan lancar."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peminjam</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan Terlambat</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Terlambat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loans
                  .filter((l) => lateLoanIds.has(l.id))
                  .map((loan) => {
                    const late = lateInstallments.filter(
                      (i) => i.loanId === loan.id && i.loan.status !== "DIBATALKAN"
                    );
                    const totalLate = late.reduce((s, i) => s + i.amount, 0);
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                          {loan.borrower.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          <Link href={`/loans/${loan.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                          {late.length}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-red-600">
                          {formatRupiah(totalLate)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent payments */}
      <Card>
        <CardHeader
          title="Transaksi Terbaru"
          subtitle="Pembayaran paling baru"
        />
        {payments.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Transaksi pembayaran akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peminjam</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.slice(0, 20).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                      {p.installment.loan.borrower.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      <Link href={`/loans/${p.installment.loanId}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                        {p.installment.loan.loanNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                      ke-{p.installment.installmentNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                      {formatRupiah(p.amount)}
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