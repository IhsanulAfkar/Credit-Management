import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { BorrowerForm } from "@/components/forms/BorrowerForm";

export default function NewBorrowerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Peminjam"
        description="Lengkapi data peminjam baru"
      />
      <Card>
        <div className="p-6">
          <BorrowerForm />
        </div>
      </Card>
    </div>
  );
}