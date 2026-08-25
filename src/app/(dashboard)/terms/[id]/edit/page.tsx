import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TermForm } from "@/components/forms/TermForm";

interface EditTermPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTermPage({ params }: EditTermPageProps) {
  const { id } = await params;
  const loanTerm = await prisma.loanTerm.findUnique({ where: { id } });

  if (!loanTerm) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Tenor"
        description={`Perbarui konfigurasi ${loanTerm.name}`}
      />
      <Card>
        <div className="p-6">
          <TermForm loanTerm={loanTerm} />
        </div>
      </Card>
    </div>
  );
}