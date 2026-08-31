import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import type { CellValue, ExportFormat } from "./types";
import type { SerializedReport } from "./serialize";
import { REPORT_CONFIG } from "./config";
import type { ExportType } from "./types";

/* ------------------------------------------------------------------ */
/* XLSX (Excel) — primary/default format                             */
/* ------------------------------------------------------------------ */

export async function buildXlsx(
  type: ExportType,
  report: SerializedReport
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KreditKu";

  const sheet = workbook.addWorksheet(REPORT_CONFIG[type].sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = report.headers.map((header) => ({
    header,
    width: Math.min(40, Math.max(12, header.length + 4)),
  }));

  for (const row of report.rows) {
    sheet.addRow(row);
  }

  // Style the header row.
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  // Right-align numeric columns for readability.
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber > 1 && typeof cell.value === "number") {
        cell.alignment = { horizontal: "right" };
      }
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/* ------------------------------------------------------------------ */
/* CSV — UTF-8 with BOM, `;` separator so Excel (id-ID) opens it      */
/* ------------------------------------------------------------------ */

function escapeCsv(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(report: SerializedReport): Buffer {
  const lines = [
    report.headers.map(escapeCsv).join(";"),
    ...report.rows.map((row) => row.map(escapeCsv).join(";")),
  ];
  const content = "\uFEFF" + lines.join("\r\n");
  return Buffer.from(content, "utf8");
}

/* ------------------------------------------------------------------ */
/* PDF — landscape paginated table                                    */
/* ------------------------------------------------------------------ */

export function buildPdf(
  type: ExportType,
  report: SerializedReport
): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const rowHeight = 5;
  const headerHeight = 6;

  // Column widths proportional to content length.
  const rawWidths = report.headers.map((h) =>
    Math.max(h.length + 2, 6)
  );
  const totalRaw = rawWidths.reduce((s, w) => s + w, 0);
  const colWidths = rawWidths.map((w) => (w / totalRaw) * usableWidth);

  const title = `Export ${REPORT_CONFIG[type].label}`;
  const generatedAt = `Dibuat: ${new Date().toLocaleString("id-ID")}`;
  const rowCount = `Total: ${report.rows.length} data`;

  let y = margin;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin, y + 3);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${generatedAt}  |  ${rowCount}`, margin, y + 5);
    y += 12;

    // Table header
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let x = margin;
    report.headers.forEach((header, i) => {
      doc.rect(x, y, colWidths[i], headerHeight, "F");
      doc.text(header.slice(0, 20), x + 1, y + headerHeight - 1.5, {
        maxWidth: colWidths[i] - 2,
      });
      x += colWidths[i];
    });
    doc.setTextColor(0, 0, 0);
    y += headerHeight;
  };

  drawHeader();

  const drawRow = (row: CellValue[], rowNumber: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let x = margin;
    const isZebra = rowNumber % 2 === 1;
    row.forEach((cell, i) => {
      const text = cell === null || cell === undefined ? "" : String(cell);
      // Zebra striping
      if (isZebra) {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y, colWidths[i], rowHeight, "F");
      }
      doc.text(text.slice(0, 26), x + 1, y + rowHeight - 1.5, {
        maxWidth: colWidths[i] - 2,
      });
      x += colWidths[i];
    });
    y += rowHeight;
  };

  for (let i = 0; i < report.rows.length; i++) {
    const row = report.rows[i];
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    drawRow(row, i + 1);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function buildExportBuffer(
  type: ExportType,
  format: ExportFormat,
  report: SerializedReport
): Promise<Buffer> {
  switch (format) {
    case "xlsx":
      return buildXlsx(type, report);
    case "csv":
      return buildCsv(report);
    case "pdf":
      return buildPdf(type, report);
  }
}