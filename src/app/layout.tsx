import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KreditKu - Manajemen Kredit",
  description: "Aplikasi manajemen usaha kredit dan pinjaman uang",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col lg:flex-row">
          {!user && (
            <header className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
              <p className="text-sm font-semibold text-slate-900">KreditKu</p>
            </header>
          )}
          {user && <Sidebar user={{ name: user.name, email: user.email }} />}
          <main className={`flex-1 ${user ? "px-4 py-6 sm:px-6 lg:px-8 lg:py-8" : "p-0"}`}>
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}