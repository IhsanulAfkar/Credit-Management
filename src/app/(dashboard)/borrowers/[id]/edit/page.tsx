import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { BorrowerForm } from "@/components/forms/BorrowerForm";

interface EditBorrowerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBorrowerPage({ params }: EditBorrowerPageProps) {
  const { id } = await params;
  const borrower = await prisma.borrower.findUnique({ where: { id } });

  if (!borrower) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Peminjam"
        description={`Perbarui data ${borrower.name}`}
      />
      <Card>
        <div className="p-6">
          <BorrowerForm borrower={borrower} />
        </div>
      </Card>
    </div>
  );
}