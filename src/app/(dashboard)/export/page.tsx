import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { ExportForm } from "@/components/export/ExportForm";
import { EXPORT_TYPES, REPORT_CONFIG } from "@/lib/export/config";
import { tenorUnitLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const [borrowers, loanTerms, loans] = await Promise.all([
    prisma.borrower.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.loanTerm.findMany({
      select: { id: true, name: true, months: true, period: true },
      orderBy: [{ period: "asc" }, { months: "asc" }],
    }),
    prisma.loan.findMany({
      select: { id: true, loanNumber: true },
      orderBy: { loanNumber: "asc" },
    }),
  ]);

  const terms = loanTerms.map((t) => ({
    value: t.id,
    label: `${t.name} (${t.months} ${tenorUnitLabel(t.period)})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Data"
        description="Pilih jenis laporan dan filter, lalu unduh dalam format Excel, CSV, atau PDF"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <div className="p-6">
              <ExportForm
                reportTypes={EXPORT_TYPES.map((t) => ({
                  value: t,
                  label: REPORT_CONFIG[t].label,
                }))}
                borrowers={borrowers}
                terms={terms}
                loans={loans}
              />
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Jenis Laporan" />
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Peminjam</p>
              <p className="text-xs text-slate-500">
                Data lengkap peminjam beserta ringkasan pinjaman, pembayaran,
                dan sisa pinjaman.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Pinjaman</p>
              <p className="text-xs text-slate-500">
                Ringkasan setiap pinjaman termasuk status, progres angsuran,
                dan sisa pinjaman.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Angsuran / Cicilan</p>
              <p className="text-xs text-slate-500">
                Setiap jadwal angsuran dengan status, keterlambatan, dan nomor
                pokok angsuran.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Pembayaran</p>
              <p className="text-xs text-slate-500">
                Transaksi pembayaran satu per satu dari seluruh histori.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Piutang / Terlambat</p>
              <p className="text-xs text-slate-500">
                Pinjaman yang memiliki angsuran jatuh tempo terlambat belum
                dibayar.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}