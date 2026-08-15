"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

interface UserMenuProps {
  email?: string;
  name?: string;
}

export function UserMenu({ email, name }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = (name || email || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {name || "Admin"}
          </p>
          {email && (
            <p className="truncate text-xs text-slate-500">{email}</p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          title="Keluar"
        >
          {loading ? "..." : "Keluar"}
        </button>
      </div>
    </div>
  );
}