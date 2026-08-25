import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate, formatMonth } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  computeInstallmentStatus,
  isInCurrentMonth,
  isToday,
} from "@/lib/loan-status";
import { INSTALLMENT_STATUS_LABEL } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

  const [borrowers, loans, installments, payments] = await Promise.all([
    prisma.borrower.findMany({
      orderBy: { createdAt: "desc" },
    }),
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
      include: { installment: { include: { loan: { include: { borrower: true } } } } },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  // Compute effective installment statuses based on current date.
  const installmentStatus = new Map<string, ReturnType<typeof computeInstallmentStatus>>();
  for (const inst of installments) {
    installmentStatus.set(inst.id, computeInstallmentStatus(inst, now));
  }

  // --- KPI computations ---
  const totalBorrowers = borrowers.length;
  const activeLoans = loans.filter((l) => {
    const effective = l.installments.every((i) => i.paidAt)
      ? "LUNAS"
      : l.status === "DIBATALKAN"
        ? "DIBATALKAN"
        : l.status;
    return effective === "AKTIF";
  });

  const totalPrincipal = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((sum, l) => sum + l.principalAmount, 0);

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  const totalInterest = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((sum, l) => sum + l.interestAmount, 0);

  // Piutang berjalan: remaining unpaid installments of active loans.
  const outstanding = installments
    .filter((i) => !i.paidAt && i.loan.status !== "DIBATALKAN")
    .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

  const paidOffLoans = loans.filter(
    (l) => l.installments.length > 0 && l.installments.every((i) => i.paidAt)
  ).length;

  const lateInstallments = installments.filter(
    (i) => installmentStatus.get(i.id) === "TERLAMBAT"
  );
  const lateLoans = new Set(lateInstallments.map((i) => i.loanId)).size;

  // --- Monthly payment monitoring ---
  const currentMonthDue = installments.filter(
    (i) => isInCurrentMonth(i.dueDate, now)
  );
  const currentMonthPaid = currentMonthDue.filter(
    (i) => installmentStatus.get(i.id) === "LUNAS"
  );
  const currentMonthUnpaid = currentMonthDue.filter(
    (i) => installmentStatus.get(i.id) !== "LUNAS"
  );
  const currentMonthPaidAmount = currentMonthPaid.reduce((s, i) => s + i.amount, 0);
  const currentMonthUnpaidAmount = currentMonthUnpaid.reduce((s, i) => s + i.amount, 0);

  const todayDue = installments.filter(
    (i) => isToday(i.dueDate, now) && installmentStatus.get(i.id) !== "LUNAS"
  );

  // Last 6 months cash flow
  const months: { key: string; label: string; total: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: formatMonth(d),
      total: 0,
    });
  }
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${p.paidAt.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.total += p.amount;
  }
  const maxMonthAmount = Math.max(...months.map((m) => m.total), 1);

  // Loan distribution
  const distAktif = activeLoans.length;
  const distLunas = paidOffLoans;
  const distTerlambat = lateLoans;

  // Total interest earned = sum of interest from paid installments proportion
  // For simplicity: interest earned from fully paid loans proportionally by paid ratio.
  const interestEarned = loans
    .filter((l) => l.status !== "DIBATALKAN")
    .reduce((sum, l) => {
      const totalInstallments = l.installments.reduce((s, i) => s + i.amount, 0);
      if (totalInstallments === 0) return sum;
      const paidAmount = l.installments.reduce((s, i) => s + (i.paidAt ? i.amount : 0), 0);
      return sum + (l.interestAmount * paidAmount) / totalInstallments;
    }, 0);

  // Static KPI icon helpers
  const iconBorrowers = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
  const iconLoan = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
  const iconMoney = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan kondisi bisnis Anda per ${formatDate(now)}`}
        action={
          <Link
            href="/loans/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buat Pinjaman
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Peminjam"
          value={String(totalBorrowers)}
          icon={iconBorrowers}
        />
        <StatCard
          label="Pinjaman Aktif"
          value={String(activeLoans.length)}
          sublabel={`${paidOffLoans} lunas · ${lateLoans} terlambat`}
          icon={iconLoan}
        />
        <StatCard
          label="Total Dipinjamkan"
          value={formatRupiah(totalPrincipal)}
          sublabel="Nilai pokok semua pinjaman"
          icon={iconMoney}
        />
        <StatCard
          label="Pembayaran Diterima"
          value={formatRupiah(totalReceived)}
          sublabel={`Bunga diperoleh ${formatRupiah(Math.round(interestEarned))}`}
          icon={iconMoney}
          accent="positive"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Bunga"
          value={formatRupiah(totalInterest)}
          sublabel="Bunga seluruh pinjaman"
        />
        <StatCard
          label="Piutang Berjalan"
          value={formatRupiah(outstanding)}
          sublabel="Sisa yang belum dibayar"
          accent="warning"
        />
        <StatCard
          label="Pinjaman Lunas"
          value={String(paidOffLoans)}
          accent="positive"
        />
        <StatCard
          label="Pinjaman Terlambat"
          value={String(lateLoans)}
          sublabel={`${lateInstallments.length} cicilan terlambat`}
          accent="negative"
        />
      </div>

      {/* Monthly payment monitoring */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Pembayaran Bulan Ini"
            subtitle={formatMonth(now)}
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Link
              href="/payments?filter=paid"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 transition-colors hover:bg-emerald-100"
            >
              <p className="text-sm font-medium text-emerald-800">Sudah Bayar</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">
                {formatRupiah(currentMonthPaidAmount)}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                {currentMonthPaid.length} cicilan
              </p>
            </Link>
            <Link
              href="/payments?filter=unpaid"
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
            >
              <p className="text-sm font-medium text-amber-800">Belum Bayar</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">
                {formatRupiah(currentMonthUnpaidAmount)}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                {currentMonthUnpaid.length} cicilan
              </p>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Jatuh Tempo Hari Ini" subtitle="Belum dibayar" />
          <div className="p-5">
            {todayDue.length === 0 ? (
              <p className="text-sm text-slate-500">
                Tidak ada cicilan yang jatuh tempo hari ini.
              </p>
            ) : (
              <ul className="space-y-3">
                {todayDue.slice(0, 5).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {i.loan.borrower.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cicilan ke-{i.installmentNumber} · {formatRupiah(i.amount)}
                      </p>
                    </div>
                    <Link
                      href={`/loans/${i.loanId}`}
                      className="shrink-0 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Bayar
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Cash Flow */}
        <Card>
          <CardHeader title="Cash Flow" subtitle="Total pembayaran per bulan (6 bulan terakhir)" />
          <div className="p-5">
            <div className="flex h-48 items-end justify-between gap-2">
              {months.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">
                    {formatRupiah(m.total)}
                  </span>
                  <div
                    className="w-full rounded-t bg-indigo-500"
                    style={{
                      height: `${(m.total / maxMonthAmount) * 100}%`,
                      minHeight: m.total > 0 ? "4px" : "2px",
                    }}
                  />
                  <span className="truncate text-[10px] text-slate-500">
                    {m.label.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Loan Distribution */}
        <Card>
          <CardHeader title="Distribusi Pinjaman" subtitle="Aktif vs lunas vs terlambat" />
          <div className="p-5">
            <div className="flex h-48 items-center justify-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-full bg-indigo-50 ring-8 ring-indigo-100">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-slate-900">
                    {activeLoans.length + paidOffLoans}
                  </p>
                  <p className="text-xs text-slate-500">Total Pinjaman</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold text-blue-700">{distAktif}</p>
                <p className="text-xs text-slate-500">Aktif</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-700">{distLunas}</p>
                <p className="text-xs text-slate-500">Lunas</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-700">{distTerlambat}</p>
                <p className="text-xs text-slate-500">Terlambat</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent late installments */}
      <Card>
        <CardHeader
          title="Cicilan Terlambat"
          subtitle="Perlu perhatian segera"
          action={
            <Link href="/payments?filter=late" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              Lihat semua
            </Link>
          }
        />
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peminjam</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jatuh Tempo</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lateInstallments
                .filter((i) => i.loan.status !== "DIBATALKAN")
                .slice(0, 10)
                .map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                      {i.loan.borrower.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {i.loan.loanNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      ke-{i.installmentNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {formatDate(i.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                      {formatRupiah(i.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge className="bg-red-50 text-red-700 ring-red-600/20">
                        {INSTALLMENT_STATUS_LABEL.TERLAMBAT}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Link
                        href={`/loans/${i.loanId}`}
                        className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Bayar
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}