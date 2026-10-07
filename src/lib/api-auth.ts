import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./auth";
import { User } from "better-auth";

export type TAuthUser = {
  user: User
}
export function withAuth<TParams = {}>(
  handler: (
    req: NextRequest,
    auth: TAuthUser,
    context: { params?: TParams }
  ) => Promise<NextResponse | void | Response> | NextResponse | Response
) {
  return async (req: NextRequest, context: { params: Promise<TParams> }) => {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await context.params

    return handler(req, auth, {
      ...context,
      params: resolvedParams,
    })
  };
}