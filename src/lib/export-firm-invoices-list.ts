import { formatDate, formatDateTime } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import {
  addReportBanner,
  applyColumnWidths,
  applyCurrencyFormat,
  createFlowCrmWorkbook,
  finalizeSheet,
  formatExportSubtitle,
  highlightPaymentCell,
  writeDataRow,
  writeHeaderRow,
  writeSummaryRow,
  workbookToBuffer,
} from "@/lib/export-xlsx-style";

export interface SavedInvoiceListRow {
  invoiceNo: string;
  brand: string;
  issuedAt: Date;
  dueDate: Date | null;
  isPaid: boolean;
  itemCount: number;
  totalAmount: number;
}

const HEADERS = [
  "Fatura No",
  "Firma",
  "Fatura Tarihi",
  "Vade Tarihi",
  "Ödeme Durumu",
  "İş Sayısı",
  "Tutar (₺)",
];

const COLUMN_WIDTHS = [20, 16, 20, 14, 14, 10, 14];
const PAYMENT_COLUMN = 5;
const COUNT_COLUMN = 6;
const CURRENCY_COLUMN = 7;
const SUMMARY_LABEL_COLUMN = 5;

function rowToCells(row: SavedInvoiceListRow) {
  return [
    row.invoiceNo,
    row.brand,
    formatDateTime(row.issuedAt),
    row.dueDate ? formatDate(row.dueDate) : "",
    row.isPaid ? "Ödendi" : "Ödenmedi",
    row.itemCount,
    row.totalAmount,
  ];
}

export async function firmInvoicesListToXlsx(rows: SavedInvoiceListRow[]): Promise<Buffer> {
  const workbook = createFlowCrmWorkbook();
  const sheet = workbook.addWorksheet("Kayıtlı Faturalar", {
    properties: { defaultRowHeight: 18 },
  });

  const headerRow = addReportBanner(
    sheet,
    `${APP_NAME} — Kayıtlı Faturalar`,
    formatExportSubtitle(rows.length),
    HEADERS.length
  );

  writeHeaderRow(sheet, headerRow, HEADERS);
  applyColumnWidths(sheet, COLUMN_WIDTHS);

  let rowNumber = headerRow + 1;
  rows.forEach((row, index) => {
    writeDataRow(sheet, rowNumber, rowToCells(row), index);
    highlightPaymentCell(sheet.getRow(rowNumber), PAYMENT_COLUMN, row.isPaid);
    applyCurrencyFormat(sheet.getRow(rowNumber), [CURRENCY_COLUMN]);
    rowNumber += 1;
  });

  const total = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const itemTotal = rows.reduce((sum, row) => sum + row.itemCount, 0);
  const summaryValues: (string | number)[] = Array(HEADERS.length).fill("");
  summaryValues[SUMMARY_LABEL_COLUMN - 1] = "GENEL TOPLAM";
  summaryValues[COUNT_COLUMN - 1] = itemTotal;
  summaryValues[CURRENCY_COLUMN - 1] = total;
  writeSummaryRow(sheet, rowNumber, summaryValues, SUMMARY_LABEL_COLUMN);
  applyCurrencyFormat(sheet.getRow(rowNumber), [CURRENCY_COLUMN]);

  finalizeSheet(sheet, headerRow, HEADERS.length, rowNumber);
  return workbookToBuffer(workbook);
}
