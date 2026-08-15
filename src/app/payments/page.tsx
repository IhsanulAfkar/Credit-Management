import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate, formatMonth } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { InstallmentStatusBadge } from "@/components/StatusBadges";
import { QuickPayButton } from "@/components/payment/QuickPayButton";
import {
  computeInstallmentStatus,
  isInCurrentMonth,
  isToday,
} from "@/lib/loan-status";
import { formatStoragePath } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PaymentsPageProps {
  searchParams: Promise<{
    filter?: string;
    month?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const filter = params.filter ?? "";
  const month = params.month ?? "";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const now = new Date();

  // Build month range filter
  let monthStart: Date | undefined;
  let monthEnd: Date | undefined;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m) {
      monthStart = new Date(y, m - 1, 1);
      monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    }
  }

  const installments = await prisma.installment.findMany({
    include: {
      loan: { include: { borrower: true } },
      payments: true
    },
    orderBy: { dueDate: "asc" },
  });

  // Apply computed status + filters in memory
  const withStatus = installments.map((i) => ({
    ...i,
    computedStatus: computeInstallmentStatus(i, now),
  }));

  let filtered = withStatus;

  // Filter by status category
  if (filter === "late") {
    filtered = filtered.filter((i) => i.computedStatus === "TERLAMBAT");
  } else if (filter === "dueToday") {
    filtered = filtered.filter(
      (i) => isToday(i.dueDate, now) && i.computedStatus !== "LUNAS"
    );
  } else if (filter === "dueMonth") {
    filtered = filtered.filter(
      (i) => isInCurrentMonth(i.dueDate, now)
    );
  } else if (filter === "paid") {
    filtered = filtered.filter(
      (i) =>
        isInCurrentMonth(i.dueDate, now) && i.computedStatus === "LUNAS"
    );
  } else if (filter === "unpaid") {
    filtered = filtered.filter(
      (i) =>
        isInCurrentMonth(i.dueDate, now) && i.computedStatus !== "LUNAS"
    );
  } else if (filter === "allPaid") {
    filtered = filtered.filter((i) => i.computedStatus === "LUNAS");
  }

  // Month range filter
  if (monthStart && monthEnd) {
    filtered = filtered.filter(
      (i) => i.dueDate >= monthStart && i.dueDate <= monthEnd
    );
  }

  // Search by borrower name or phone
  if (q) {
    const lowerQ = q.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.loan.borrower.name.toLowerCase().includes(lowerQ) ||
        i.loan.borrower.phone.toLowerCase().includes(lowerQ) ||
        i.loan.loanNumber.toLowerCase().includes(lowerQ)
    );
  }

  // Stats for the top cards
  const monthDue = installments.filter(
    (i) => isInCurrentMonth(i.dueDate, now)
  );
  const monthPaid = monthDue.filter(
    (i) => computeInstallmentStatus(i, now) === "LUNAS"
  );
  const monthUnpaid = monthDue.filter(
    (i) => computeInstallmentStatus(i, now) !== "LUNAS"
  );
  const monthPaidAmount = monthPaid.reduce((s, i) => s + i.amount, 0);
  const monthUnpaidAmount = monthUnpaid.reduce((s, i) => s + i.amount, 0);
  const todayDue = installments.filter(
    (i) => isToday(i.dueDate, now) && computeInstallmentStatus(i, now) !== "LUNAS"
  );
  const lateCount = installments.filter(
    (i) => computeInstallmentStatus(i, now) === "TERLAMBAT"
  ).length;

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const queryString = new URLSearchParams();
  if (filter) queryString.set("filter", filter);
  if (month) queryString.set("month", month);
  if (q) queryString.set("q", q);
  const baseQuery = queryString.toString();
  const basePath = `/payments${baseQuery ? `?${baseQuery}` : ""}`;

  // Filter tabs
  const tabs = [
    { key: "", label: "Semua" },
    { key: "dueToday", label: "Jatuh Tempo Hari Ini" },
    { key: "dueMonth", label: "Bulan Ini" },
    { key: "late", label: "Terlambat" },
    { key: "paid", label: "Sudah Bayar" },
    { key: "unpaid", label: "Belum Bayar" },
  ];

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran"
        description="Monitoring seluruh pembayaran cicilan"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jatuh Tempo Hari Ini"
          value={String(todayDue.length)}
          sublabel={`${formatRupiah(todayDue.reduce((s, i) => s + i.amount, 0))} belum dibayar`}
          accent="warning"
        />
        <StatCard
          label={`Sudah Bayar ${formatMonth(now)}`}
          value={formatRupiah(monthPaidAmount)}
          sublabel={`${monthPaid.length} cicilan`}
          accent="positive"
        />
        <StatCard
          label={`Belum Bayar ${formatMonth(now)}`}
          value={formatRupiah(monthUnpaidAmount)}
          sublabel={`${monthUnpaid.length} cicilan`}
          accent="negative"
        />
        <StatCard
          label="Cicilan Terlambat"
          value={String(lateCount)}
          accent="negative"
        />
      </div>

      <Card>
        <CardHeader title="Daftar Cicilan" />

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
          {tabs.map((tab) => {
            const href = `/payments?filter=${tab.key}`;
            const active = filter === tab.key;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search & month filter */}
        <form className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari nama, nomor HP, atau nomor pinjaman..."
            className="block w-full flex-1 rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
          <input
            type="month"
            name="month"
            defaultValue={month || currentMonth}
            className="block rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            Terapkan
          </button>
        </form>

        {paged.length === 0 ? (
          <EmptyState
            title="Tidak ada cicilan"
            description="Tidak ada cicilan yang cocok dengan filter yang dipilih."
          />
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peminjam</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No. HP</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jatuh Tempo</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paged.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                        <Link href={`/borrowers/${inst.loan.borrower.id}`} className="hover:text-indigo-600">
                          {inst.loan.borrower.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {inst.loan.borrower.phone}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        <Link href={`/loans/${inst.loanId}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                          {inst.loan.loanNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        ke-{inst.installmentNumber}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {formatDate(inst.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-slate-900">
                        {formatRupiah(inst.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <InstallmentStatusBadge status={inst.computedStatus} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {inst.computedStatus !== "LUNAS" && (
                          <QuickPayButton installmentId={inst.id} />
                        )}
                        {inst.computedStatus === 'LUNAS' && inst.payments.filter(p => p.receipt).map(p => <Link target="_blank" className="text-sm text-slate-900 hover:text-blue-500 hover:underline" key={p.id} href={formatStoragePath(p.receipt!)}>Lihat bukti</Link>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
          </>
        )}
      </Card>
    </div>
  );
}