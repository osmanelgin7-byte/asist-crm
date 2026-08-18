import ExcelJS from "exceljs";
import { APP_NAME } from "@/lib/brand";

export const BRAND_COLORS = {
  primary: "FF4F46E5",
  primarySoft: "FFEEF2FF",
  headerText: "FFFFFFFF",
  zebra: "FFF8FAFC",
  border: "FFE2E8F0",
  muted: "FF64748B",
  summaryBg: "FFE2E8F0",
  summaryText: "FF1E293B",
  danger: "FFDC2626",
  success: "FF059669",
};

export const CURRENCY_NUM_FMT = '#,##0.00" ₺"';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BRAND_COLORS.border } },
  left: { style: "thin", color: { argb: BRAND_COLORS.border } },
  bottom: { style: "thin", color: { argb: BRAND_COLORS.border } },
  right: { style: "thin", color: { argb: BRAND_COLORS.border } },
};

export function createFlowCrmWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  workbook.created = new Date();
  workbook.company = APP_NAME;
  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function addReportBanner(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  columnCount: number
): number {
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND_COLORS.primary } };
  titleCell.alignment = { vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND_COLORS.primarySoft },
  };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 10, color: { argb: BRAND_COLORS.muted } };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 20;

  return 3;
}

export function writeHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, headers: string[]) {
  const row = sheet.getRow(rowNumber);
  row.height = 26;
  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_COLORS.primary },
    };
    cell.font = { bold: true, color: { argb: BRAND_COLORS.headerText }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
}

export function writeDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: ExcelJS.CellValue[],
  stripeIndex: number
) {
  const row = sheet.getRow(rowNumber);
  const bg = stripeIndex % 2 === 0 ? BRAND_COLORS.zebra : "FFFFFFFF";
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bg },
    };
    cell.border = thinBorder;
    cell.alignment = { vertical: "top", wrapText: true };
  });
}

export function writeSummaryRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: ExcelJS.CellValue[],
  labelColumn: number
) {
  const row = sheet.getRow(rowNumber);
  row.height = 24;
  values.forEach((value, index) => {
    const cell = row.getCell(index + 1);
    cell.value = value;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_COLORS.summaryBg },
    };
    cell.font = {
      bold: index + 1 >= labelColumn,
      color: { argb: BRAND_COLORS.summaryText },
      size: 11,
    };
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle" };
  });
}

export function applyCurrencyFormat(row: ExcelJS.Row, columnNumbers: number[]) {
  for (const col of columnNumbers) {
    const cell = row.getCell(col);
    if (typeof cell.value === "number") {
      cell.numFmt = CURRENCY_NUM_FMT;
      cell.alignment = { vertical: "top", horizontal: "right" };
    }
  }
}

export function applyColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.columns = widths.map((width) => ({ width }));
}

export function finalizeSheet(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columnCount: number,
  lastRow: number
) {
  sheet.views = [{ state: "frozen", ySplit: headerRow, activeCell: "A4" }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: columnCount },
  };
  sheet.pageSetup = {
    fitToPage: true,
    fitToWidth: 1,
    orientation: "landscape",
  };
}

export function formatExportSubtitle(recordCount: number): string {
  const date = new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Oluşturulma: ${date}  ·  ${recordCount} kayıt`;
}

export function highlightPriorityCell(row: ExcelJS.Row, priorityColumn: number, priority: string) {
  if (priority !== "ACIL") return;
  const cell = row.getCell(priorityColumn);
  cell.font = { ...(cell.font ?? {}), bold: true, color: { argb: BRAND_COLORS.danger } };
}

export function highlightPaymentCell(row: ExcelJS.Row, paymentColumn: number, isPaid: boolean) {
  const cell = row.getCell(paymentColumn);
  cell.font = {
    bold: true,
    color: { argb: isPaid ? BRAND_COLORS.success : BRAND_COLORS.danger },
  };
}
