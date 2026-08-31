import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { countExportData } from "@/lib/export/queries";
import {
  ExportValidationError,
  normalizeFilters,
} from "@/lib/export/shared";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/count?type=...&...
 *
 * Returns the number of records matching the current filters so the form can
 * show a live preview before downloading.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Anda harus masuk untuk melakukan tindakan ini." },
      { status: 401 }
    );
  }

  const params = request.nextUrl.searchParams;
  const raw: Record<string, string | boolean> = {};
  params.forEach((value, key) => {
    if (key === "overdueOnly") {
      raw[key] = value === "true";
    } else {
      raw[key] = value;
    }
  });

  let filters;
  try {
    filters = normalizeFilters(raw as never);
  } catch (e) {
    if (e instanceof ExportValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Parameter export tidak valid." },
      { status: 400 }
    );
  }

  try {
    const count = await countExportData(filters.type, filters);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("[export/count] gagal menghitung data:", e);
    return NextResponse.json(
      { error: "Gagal menghitung data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}