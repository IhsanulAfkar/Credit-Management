import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Requires an authenticated session. Throws an error if not logged in.
 * Server actions call this at the start to prevent unauthenticated access.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Anda harus masuk untuk melakukan tindakan ini.");
  }

  return session;
}