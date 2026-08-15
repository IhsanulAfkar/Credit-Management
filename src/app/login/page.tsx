import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-xl font-bold text-white">
            K
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">KreditKu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manajemen Usaha Kredit & Pinjaman
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}