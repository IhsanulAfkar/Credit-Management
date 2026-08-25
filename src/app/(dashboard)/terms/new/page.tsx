import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TermForm } from "@/components/forms/TermForm";

export default function NewTermPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Tenor"
        description="Tambahkan konfigurasi tenor dan bunga baru"
      />
      <Card>
        <div className="p-6">
          <TermForm />
        </div>
      </Card>
    </div>
  );
}