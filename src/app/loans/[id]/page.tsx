import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate, formatPercent, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/States";
import { StatCard } from "@/components/ui/StatCard";
import {
  LoanStatusBadge,
  InstallmentStatusBadge,
} from "@/components/StatusBadges";
import { LoanCancelButton } from "@/components/loan/LoanCancelButton";
import { InstallmentActions } from "@/components/loan/InstallmentActions";
import { computeLoanStatus, computeInstallmentStatus } from "@/lib/loan-status";

export const dynamic = "force-dynamic";

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params;
  const now = new Date();

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      loanTerm: true,
      installments: {
        include: { payments: true },
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  if (!loan) {
    notFound();
  }

  const effStatus = computeLoanStatus(loan, loan.installments);
  const paidCount = loan.installments.filter((i) => i.paidAt).length;
  const unpaidCount = loan.installments.length - paidCount;
  const progress = loan.installments.length
    ? Math.round((paidCount / loan.installments.length) * 100)
    : 0;

  const totalPaid = loan.installments
    .filter((i) => i.paidAt)
    .reduce((s, i) => s + i.amount, 0);
  const totalRemaining = loan.installments
    .filter((i) => !i.paidAt)
    .reduce((s, i) => s + i.amount, 0);

  const payments = loan.installments
    .flatMap((inst) =>
      inst.payments.map((p) => ({ ...p, installment: inst }))
    )
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

  const summaryRows = [
    { label: "Pokok Pinjaman", value: formatRupiah(loan.principalAmount) },
    { label: "Bunga", value: formatPercent(loan.interestRate) },
    { label: "Total Bunga", value: formatRupiah(loan.interestAmount) },
    { label: "Total Pembayaran", value: formatRupiah(loan.totalAmount) },
    {
      label: "Cicilan / Bulan",
      value: formatRupiah(loan.monthlyInstallment),
      highlight: true,
    },
    { label: "Tenor", value: `${loan.termMonths} bulan` },
    {
      label: "Tanggal Pencairan",
      value: formatDate(loan.disbursementDate),
    },
    {
      label: "Jatuh Tempo Pertama",
      value: formatDate(loan.firstDueDate),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{loan.loanNumber}</span>
            <LoanStatusBadge status={effStatus} />
          </span>
        }
        description={loan.borrower.name}
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/loans"
              className="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Kembali
            </Link>
            {effStatus === "AKTIF" && <LoanCancelButton loanId={loan.id} />}
          </div>
        }
      />

      {/* Loan header */}
      <Card>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Pinjaman{" "}
              <Link href={`/borrowers/${loan.borrower.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {loan.borrower.name}
              </Link>
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {formatRupiah(loan.principalAmount)}
            </p>
            {loan.purpose && (
              <p className="mt-1 text-sm text-slate-500">{loan.purpose}</p>
            )}
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                Progress: {progress}%
              </span>
              <ProgressBar value={progress} className="w-40" />
            </div>
            <div className="mt-2 flex items-center justify-end gap-4 text-xs text-slate-500">
              <span>
                Total Cicilan: <strong className="text-slate-900">{loan.installments.length}</strong>
              </span>
              <span>
                Sudah Dibayar: <strong className="text-emerald-600">{paidCount}</strong>
              </span>
              <span>
                Belum Dibayar: <strong className="text-amber-600">{unpaidCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Sudah Dibayar"
          value={formatRupiah(totalPaid)}
          accent="positive"
        />
        <StatCard
          label="Sisa Pembayaran"
          value={formatRupiah(totalRemaining)}
          accent="warning"
        />
        <StatCard
          label="Total Bunga"
          value={formatRupiah(loan.interestAmount)}
        />
        <StatCard
          label="Cicilan / Bulan"
          value={formatRupiah(loan.monthlyInstallment)}
        />
      </div>

      {/* Loan summary */}
      <Card>
        <CardHeader title="Ringkasan Pinjaman" />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {summaryRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {row.label}
              </dt>
              <dd
                className={`mt-1 text-sm ${row.highlight ? "text-lg font-semibold text-indigo-700" : "font-medium text-slate-900"}`}
              >
                {row.value}
              </dd>
            </div>
          ))}
          {loan.notes && (
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catatan
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{loan.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Installment schedule */}
      <Card>
        <CardHeader
          title="Jadwal Cicilan"
          subtitle={`${loan.installments.length} cicilan · ${paidCount} lunas · ${unpaidCount} belum`}
        />
        {loan.installments.length === 0 ? (
          <EmptyState
            title="Belum ada cicilan"
            description="Jadwal cicilan akan otomatis dibuat saat pinjaman disetujui."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jatuh Tempo</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Dibayar</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Bayar</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loan.installments.map((inst) => {
                  const status = computeInstallmentStatus(inst, now);
                  const isPaid = !!inst.paidAt;
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                        Cicilan ke-{inst.installmentNumber}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {formatDate(inst.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                        {formatRupiah(inst.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-slate-600">
                        {isPaid ? formatRupiah(inst.paidAmount) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {inst.paidAt ? formatDateTime(inst.paidAt) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <InstallmentStatusBadge status={status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {loan.status !== "DIBATALKAN" && (
                          <InstallmentActions
                            installmentId={inst.id}
                            isPaid={isPaid}
                          />
                        )}
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
        <CardHeader
          title="Histori Pembayaran"
          subtitle="Setiap pembayaran tercatat dan tidak dapat dihapus"
        />
        {payments.length === 0 ? (
          <EmptyState
            title="Belum ada pembayaran"
            description="Pembayaran akan tercatat saat cicilan ditandai sudah dibayar."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {formatDateTime(p.paidAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-900">
                      Cicilan ke-{p.installment.installmentNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                        Dibayar
                      </Badge>
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