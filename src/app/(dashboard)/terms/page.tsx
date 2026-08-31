import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToggleTerm } from "@/components/terms/ToggleTerm";
import { DeleteTerm } from "@/components/terms/DeleteTerm";
import { formatPercent } from "@/lib/format";
import { InstallmentPeriodBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const terms = await prisma.loanTerm.findMany({
    include: { _count: { select: { loans: true } } },
    orderBy: { months: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenor & Bunga"
        description="Konfigurasi pilihan tenor dan persentase bunga pinjaman"
        action={
          <Link
            href="/terms/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Tenor
          </Link>
        }
      />

      <Card>
        <CardHeader title="Daftar Tenor" subtitle="Tenor yang tersedia saat membuat pinjaman" />
        {terms.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-500">Belum ada konfigurasi tenor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Tipe</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Bunga</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Digunakan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {terms.map((term) => {
                  const typed = term as unknown as { _count?: { loans?: number } };
                  return (
                    <tr key={term.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                        {term.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center">
                        <InstallmentPeriodBadge period={term.period} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                        {term.months}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatPercent(term.interestRate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center text-sm text-slate-600">
                        {typed._count?.loans ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {term.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ToggleTerm id={term.id} isActive={term.isActive} />
                          <Link
                            href={`/terms/${term.id}/edit`}
                            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <DeleteTerm id={term.id} hasLoans={(typed._count?.loans ?? 0) > 0} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}