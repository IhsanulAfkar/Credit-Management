import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { fetchExportData } from "@/lib/export/queries";
import { serializeReport } from "@/lib/export/serialize";
import { buildExportBuffer } from "@/lib/export/builders";
import {
  buildFilename,
  ExportValidationError,
  normalizeFilters,
} from "@/lib/export/shared";

export const dynamic = "force-dynamic";

/** Content-type per export format. */
const CONTENT_TYPES: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/export?type=...&format=...
 *
 * Generates and streams back the requested export file. Requires an
 * authenticated session (same guard used by server actions).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return errorResponse("Anda harus masuk untuk melakukan tindakan ini.", 401);
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
      return errorResponse(e.message);
    }
    return errorResponse("Parameter export tidak valid.", 400);
  }

  try {
    const data = await fetchExportData(filters.type, filters);
    if (data.length === 0) {
      return errorResponse(
        "Tidak ada data yang cocok dengan filter yang dipilih.",
        404
      );
    }

    const report = serializeReport(filters.type, data);
    const buffer = await buildExportBuffer(filters.type, filters.format, report);
    const filename = buildFilename(
      filters.type,
      filters.format,
      filters.dateStart,
      filters.dateEnd
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[filters.format],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (e) {
    console.error("[export] gagal membuat file:", e);
    return errorResponse(
      "Gagal membuat file export. Silakan coba lagi.",
      500
    );
  }
}