import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoanForm } from "@/components/forms/LoanForm";

interface NewLoanPageProps {
  searchParams: Promise<{ borrower?: string }>;
}

export default async function NewLoanPage({ searchParams }: NewLoanPageProps) {
  const params = await searchParams;

  const [borrowers, loanTerms] = await Promise.all([
    prisma.borrower.findMany({
      where: { status: "AKTIF" },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.loanTerm.findMany({
      where: { isActive: true },
      orderBy: { months: "asc" },
    }),
  ]);

  const selectedBorrowerId = params.borrower;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Pinjaman"
        description="Buat pinjaman baru dan sistem akan otomatis membuat jadwal cicilan"
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="p-6">
            <LoanForm
              borrowers={borrowers}
              loanTerms={loanTerms}
              selectedBorrowerId={selectedBorrowerId}
            />
          </div>
        </Card>
        <div className="xl:col-span-2">
          {/* Info sidebar */}
          <Card>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Informasi
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-slate-400">•</span>
                  <span>
                    Sistem menghitung bunga secara <strong>flat</strong> berdasarkan tenor dan persentase bunga yang dipilih.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-slate-400">•</span>
                  <span>
                    Jadwal cicilan otomatis dibuat sebanyak tenor pinjaman.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-slate-400">•</span>
                  <span>
                    Perubahan tenor atau bunga di masa depan tidak akan mengubah pinjaman yang sudah dibuat.
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}