import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { LoanStatusBadge, InstallmentPeriodBadge } from "@/components/StatusBadges";
import { computeLoanStatus } from "@/lib/loan-status";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

interface LoansPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const statusFilter =
    status === "AKTIF" ||
      status === "LUNAS" ||
      status === "DIBATALKAN" ||
      status === "DRAFT"
      ? (status as "AKTIF" | "LUNAS" | "DIBATALKAN" | "DRAFT")
      : undefined;

  const where = {
    ...(q
      ? {
        OR: [
          { loanNumber: { contains: q } },
          { borrower: { name: { contains: q } } },
        ],
      }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [total, loans] = await Promise.all([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      include: {
        borrower: true,
        installments: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queryString = new URLSearchParams();
  if (q) queryString.set("q", q);
  if (status) queryString.set("status", status);
  const baseQuery = queryString.toString();
  const basePath = `/loans${baseQuery ? `?${baseQuery}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pinjaman"
        description="Kelola seluruh pinjaman kredit"
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

      <Card>
        {/* Search & filter */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <form className="flex flex-1 gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nomor pinjaman atau nama peminjam..."
              className="block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            />
            <select
              name="status"
              defaultValue={status}
              className="block rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            >
              <option value="">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="LUNAS">Lunas</option>
              <option value="DIBATALKAN">Dibatalkan</option>
              <option value="DRAFT">Draft</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
            >
              Cari
            </button>
          </form>
        </div>

        {loans.length === 0 ? (
          <EmptyState
            title="Belum ada data pinjaman"
            description="Buat pinjaman baru untuk mulai mengelola kredit."
            action={
              <Link
                href="/loans/new"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                Buat Pinjaman
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No. Pinjaman</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Peminjam</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Pokok</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cicilan</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pencairan</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loans.map((loan) => {
                    const effStatus = computeLoanStatus(loan, loan.installments);
                    const paidCount = loan.installments.filter((i) => i.paidAt).length;
                    const progress = loan.installments.length
                      ? Math.round((paidCount / loan.installments.length) * 100)
                      : 0;
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-indigo-600">
                          <Link href={`/loans/${loan.id}`}>{loan.loanNumber}</Link>
                          <div className="mt-1">
                            <InstallmentPeriodBadge period={loan.period} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-900">
                          {loan.borrower.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-slate-900">
                          {formatRupiah(loan.principalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-slate-600">
                          {formatRupiah(loan.monthlyInstallment)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <ProgressBar value={progress} className="w-20" />
                            <span className="text-xs text-slate-500">{progress}%</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <LoanStatusBadge status={effStatus} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {formatDate(loan.disbursementDate)}
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
            <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
          </>
        )}
      </Card>
    </div>
  );
}