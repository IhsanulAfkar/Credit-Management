import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return notFound()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Informasi aplikasi dan data sistem"
      />
      {/* 
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Data" value={String(borrowerCount + loanCount + installmentCount + paymentCount + termCount)} />
        <StatCard label="Peminjam" value={String(borrowerCount)} />
        <StatCard label="Pinjaman" value={String(loanCount)} />
        <StatCard label="Cicilan" value={String(installmentCount)} />
      </div> */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Informasi Aplikasi" />
          <div className="divide-y divide-slate-100 p-5">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Nama Aplikasi</span>
              <span className="text-sm font-medium text-slate-900">KreditKu</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Deskripsi</span>
              <span className="text-sm text-slate-900">Manajemen Usaha Kredit</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Versi</span>
              <span className="text-sm font-mono text-slate-900">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Framework</span>
              <span className="text-sm text-slate-900">Next.js </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Data Konfigurasi" />
          <div className="divide-y divide-slate-100 p-5">

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Tanggal Sistem</span>
              <span className="text-sm text-slate-900">{formatDate(new Date())}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Rencana Pengembangan" />
          <ul className="space-y-2 p-5 text-sm text-slate-600">
            <li>• Integrasi WhatsApp untuk pengingat jatuh tempo</li>
            <li>• Cetak kwitansi dan kontrak pinjaman</li>
            <li>• Export data Excel / PDF</li>
            <li>• Multi-user dengan hak akses</li>
            <li>• Audit log lengkap</li>
            <li>• Denda keterlambatan</li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Dokumentasi" />
          <ul className="space-y-2 p-5 text-sm text-slate-600">
            <li>• Skema bunga: <strong>Flat</strong> (pembayaran tetap per bulan)</li>
            <li>• Status cicilan dihitung otomatis dari tanggal</li>
            <li>• Pinjaman otomatis lunas saat semua cicilan dibayar</li>
            <li>• Perubahan tenor tidak mengubah pinjaman lama</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}