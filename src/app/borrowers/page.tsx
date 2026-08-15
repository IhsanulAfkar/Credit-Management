import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Pagination } from "@/components/ui/Pagination";
import { BorrowerStatusBadge } from "@/components/StatusBadges";
import { formatDate } from "@/lib/format";
import type { BorrowerStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

interface BorrowersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function BorrowersPage({ searchParams }: BorrowersPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const statusFilter =
    status === "AKTIF" || status === "TIDAK_AKTIF"
      ? (status as BorrowerStatus)
      : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    ...(q
      ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [total, borrowers] = await Promise.all([
    prisma.borrower.count({ where }),
    prisma.borrower.findMany({
      where,
      include: {
        _count: { select: { loans: true } },
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
  const basePath = `/borrowers${baseQuery ? `?${baseQuery}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peminjam"
        description="Kelola data peminjam kredit"
        action={
          <Link
            href="/borrowers/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Peminjam
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
              placeholder="Cari nama atau nomor HP..."
              className="block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            />
            <select
              name="status"
              defaultValue={status}
              className="block rounded-md border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            >
              <option value="">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="TIDAK_AKTIF">Tidak Aktif</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
            >
              Cari
            </button>
          </form>
        </div>

        {borrowers.length === 0 ? (
          <EmptyState
            title="Belum ada data peminjam"
            description="Tambahkan peminjam untuk mulai membuat pinjaman."
            action={
              <Link
                href="/borrowers/new"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                Tambah Peminjam
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No. HP</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pekerjaan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usaha</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Pinjaman</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuat</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {borrowers.map((b) => {
                    const typed = b as unknown as { _count?: { loans?: number } };
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                          {b.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{b.phone}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {b.occupation || "-"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {b.businessName || "-"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                          {typed._count?.loans ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <BorrowerStatusBadge status={b.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {formatDate(b.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <Link
                            href={`/borrowers/${b.id}`}
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