import { workOrderStatusLabels } from "@/lib/permissions";
import { formatDateTime, formatDate } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import {
  addReportBanner,
  applyColumnWidths,
  applyCurrencyFormat,
  createFlowCrmWorkbook,
  finalizeSheet,
  formatExportSubtitle,
  writeDataRow,
  writeHeaderRow,
  writeSummaryRow,
  workbookToBuffer,
} from "@/lib/export-xlsx-style";

export interface ExportFirmInvoiceMeta {
  issuedAt: Date;
  dueDate: Date | null;
  isPaid: boolean;
}

export interface ExportFirmInvoiceRow {
  invoiceNo: string;
  brand: string;
  companyName: string;
  companyCity: string | null;
  companyAddress: string | null;
  asistansDosyaNo: string | null;
  title: string;
  status: string;
  completedAt: Date | null;
  reportedAt: Date;
  repairSummary: string;
  invoiceAmount: number;
}

const HEADERS = [
  "Fatura No",
  "Firma",
  "Sigorta Şirketi",
  "Şehir",
  "Adres",
  "Asistans Dosya No",
  "İş Başlığı",
  "Durum",
  "Tamamlanma / Bildirim",
  "Onarım Kalemleri",
  "Tutar (₺)",
];

const COLUMN_WIDTHS = [18, 14, 22, 12, 28, 18, 28, 22, 20, 36, 14];
const CURRENCY_COLUMN = 11;
const SUMMARY_LABEL_COLUMN = 10;

function rowToCells(invoiceNo: string, brand: string, r: ExportFirmInvoiceRow) {
  return [
    invoiceNo,
    brand,
    r.companyName,
    r.companyCity ?? "",
    r.companyAddress ?? "",
    r.asistansDosyaNo ?? "",
    r.title,
    workOrderStatusLabels[r.status] ?? r.status,
    r.completedAt ? formatDateTime(r.completedAt) : formatDateTime(r.reportedAt),
    r.repairSummary,
    r.invoiceAmount ?? 0,
  ];
}

export async function firmInvoiceToXlsx(
  invoiceNo: string,
  brand: string,
  rows: ExportFirmInvoiceRow[],
  meta?: ExportFirmInvoiceMeta
): Promise<Buffer> {
  const workbook = createFlowCrmWorkbook();
  const sheet = workbook.addWorksheet("Fatura", {
    properties: { defaultRowHeight: 18 },
  });

  const metaLine = meta
    ? `Firma: ${brand}  ·  Fatura Tarihi: ${formatDateTime(meta.issuedAt)}  ·  Vade: ${meta.dueDate ? formatDate(meta.dueDate) : "—"}  ·  ${meta.isPaid ? "Ödendi" : "Ödenmedi"}`
    : formatExportSubtitle(rows.length);

  const headerRow = addReportBanner(
    sheet,
    `${APP_NAME} — Fatura ${invoiceNo}`,
    metaLine,
    HEADERS.length
  );

  writeHeaderRow(sheet, headerRow, HEADERS);
  applyColumnWidths(sheet, COLUMN_WIDTHS);

  let rowNumber = headerRow + 1;
  rows.forEach((row, index) => {
    writeDataRow(sheet, rowNumber, rowToCells(invoiceNo, brand, row), index);
    applyCurrencyFormat(sheet.getRow(rowNumber), [CURRENCY_COLUMN]);
    rowNumber += 1;
  });

  const total = rows.reduce((sum, r) => sum + r.invoiceAmount, 0);
  const summaryValues: (string | number)[] = Array(HEADERS.length).fill("");
  summaryValues[SUMMARY_LABEL_COLUMN - 1] = "GENEL TOPLAM";
  summaryValues[CURRENCY_COLUMN - 1] = total;
  writeSummaryRow(sheet, rowNumber, summaryValues, SUMMARY_LABEL_COLUMN);
  applyCurrencyFormat(sheet.getRow(rowNumber), [CURRENCY_COLUMN]);

  finalizeSheet(sheet, headerRow, HEADERS.length, rowNumber);
  return workbookToBuffer(workbook);
}
