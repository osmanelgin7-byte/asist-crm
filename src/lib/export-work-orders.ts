import {
  workOrderStatusLabels,
  priorityLabels,
} from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { domainLabels } from "@/lib/domain";
import {
  addReportBanner,
  applyColumnWidths,
  applyCurrencyFormat,
  createFlowCrmWorkbook,
  finalizeSheet,
  formatExportSubtitle,
  highlightPriorityCell,
  writeDataRow,
  writeHeaderRow,
  workbookToBuffer,
} from "@/lib/export-xlsx-style";

export interface ExportOrder {
  ticketNo: string;
  title: string;
  description: string | null;
  jobType: string;
  status: string;
  priority: string;
  reportedAt: Date;
  completedAt: Date | null;
  invoiceAmount: number;
  supplierCost: number;
  insuranceCompany: {
    shortCode: string | null;
    name: string;
    city: string | null;
    address: string | null;
    contactPerson: string | null;
    phone: string | null;
    assistanceContactName: string | null;
    assistancePhone: string | null;
    accountManagerName: string | null;
    accountManagerPhone: string | null;
  };
  assignedTo: { name: string } | null;
}

const HEADERS = [
  domainLabels.workOrder.ticket,
  domainLabels.insuranceCompany.shortCode,
  domainLabels.insuranceCompany.one,
  "Şehir",
  "Adres",
  domainLabels.insuranceCompany.contact,
  "Telefon",
  domainLabels.insuranceCompany.assistanceContact,
  "Asistans telefon",
  domainLabels.insuranceCompany.accountManager,
  "Hesap yöneticisi telefon",
  "Hizmet türü",
  "Sistem No",
  "Açıklama",
  "Öncelik",
  "Durum",
  domainLabels.planner.one,
  "Bildirim Tarihi",
  "Tamamlanma Tarihi",
  "Sigortaya Fatura (₺)",
  `${domainLabels.supplier.one} Maliyeti (₺)`,
  "Kâr (₺)",
];

const COLUMN_WIDTHS = [12, 14, 22, 12, 28, 18, 14, 18, 14, 18, 16, 16, 28, 32, 10, 22, 16, 18, 18, 16, 16, 12];
const CURRENCY_COLUMNS = [20, 21, 22];
const PRIORITY_COLUMN = 15;

function orderToRow(o: ExportOrder, jobTypeLabelMap: Record<string, string>) {
  const c = o.insuranceCompany;
  return [
    o.title,
    c.shortCode ?? "",
    c.name,
    c.city ?? "",
    c.address ?? "",
    c.contactPerson ?? "",
    c.phone ?? "",
    c.assistanceContactName ?? "",
    c.assistancePhone ?? "",
    c.accountManagerName ?? "",
    c.accountManagerPhone ?? "",
    jobTypeLabelMap[o.jobType] ?? o.jobType,
    o.ticketNo,
    o.description ?? "",
    priorityLabels[o.priority] ?? o.priority,
    workOrderStatusLabels[o.status] ?? o.status,
    o.assignedTo?.name ?? "",
    formatDateTime(o.reportedAt),
    o.completedAt ? formatDateTime(o.completedAt) : "",
    o.invoiceAmount ?? 0,
    o.supplierCost ?? 0,
    (o.invoiceAmount ?? 0) - (o.supplierCost ?? 0),
  ];
}

export async function workOrdersToXlsx(
  orders: ExportOrder[],
  jobTypeLabelMap: Record<string, string> = {},
  sheetName: string = domainLabels.workOrder.many
): Promise<Buffer> {
  const workbook = createFlowCrmWorkbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    properties: { defaultRowHeight: 18 },
  });

  const headerRow = addReportBanner(
    sheet,
    `${APP_NAME} — ${sheetName}`,
    formatExportSubtitle(orders.length),
    HEADERS.length
  );

  writeHeaderRow(sheet, headerRow, HEADERS);
  applyColumnWidths(sheet, COLUMN_WIDTHS);

  let rowNumber = headerRow + 1;
  orders.forEach((order, index) => {
    writeDataRow(sheet, rowNumber, orderToRow(order, jobTypeLabelMap), index);
    const row = sheet.getRow(rowNumber);
    applyCurrencyFormat(row, CURRENCY_COLUMNS);
    highlightPriorityCell(row, PRIORITY_COLUMN, order.priority);
    rowNumber += 1;
  });

  finalizeSheet(sheet, headerRow, HEADERS.length, rowNumber - 1);
  return workbookToBuffer(workbook);
}
