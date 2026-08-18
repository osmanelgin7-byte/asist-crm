export const billableWorkOrderStatuses = ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI"] as const;

export type BillableWorkOrderStatus = (typeof billableWorkOrderStatuses)[number];

export function isBillableWorkOrderStatus(status: string): status is BillableWorkOrderStatus {
  return (billableWorkOrderStatuses as readonly string[]).includes(status);
}

export function isPendingFirmInvoice(order: {
  status: string;
  hasFirmInvoice?: boolean;
}): boolean {
  return isBillableWorkOrderStatus(order.status) && !order.hasFirmInvoice;
}

export function isMissingInvoicePrice(invoiceAmount: number): boolean {
  return invoiceAmount <= 0;
}

export function shouldHighlightMissingInvoicePrice(order: {
  status: string;
  invoiceAmount: number;
  hasFirmInvoice?: boolean;
}): boolean {
  return isPendingFirmInvoice(order) && isMissingInvoicePrice(order.invoiceAmount);
}
