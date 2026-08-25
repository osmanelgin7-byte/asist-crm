export interface InvoiceFirmGroupOrder {
  id: string;
  invoiceAmount: number;
  insuranceCompany: {
    id: string;
    name: string;
    shortCode: string | null;
  };
}

export interface InvoiceFirmGroup<T extends InvoiceFirmGroupOrder> {
  firmKey: string;
  label: string;
  orders: T[];
}

export function groupOrdersByFirm<T extends InvoiceFirmGroupOrder>(orders: T[]): InvoiceFirmGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const order of orders) {
    const firmKey = order.insuranceCompany.shortCode || order.insuranceCompany.id;
    const existing = map.get(firmKey);
    if (existing) existing.push(order);
    else map.set(firmKey, [order]);
  }

  return [...map.entries()]
    .map(([firmKey, firmOrders]) => ({
      firmKey,
      label: firmOrders[0]?.insuranceCompany.shortCode
        ? `${firmOrders[0].insuranceCompany.shortCode} — ${firmOrders[0].insuranceCompany.name}`
        : firmOrders[0]?.insuranceCompany.name ?? firmKey,
      orders: firmOrders,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

export interface InvoiceJobGroupOrder {
  id: string;
  jobType: string;
  invoiceAmount: number;
}

export interface InvoiceJobGroup<T extends InvoiceJobGroupOrder> {
  jobType: string;
  label: string;
  orders: T[];
  total: number;
}

export function groupOrdersByJobType<T extends InvoiceJobGroupOrder>(
  orders: T[],
  jobTypeLabelMap: Record<string, string>
): InvoiceJobGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const order of orders) {
    const existing = map.get(order.jobType);
    if (existing) existing.push(order);
    else map.set(order.jobType, [order]);
  }

  return [...map.entries()]
    .map(([jobType, groupOrders]) => ({
      jobType,
      label: jobTypeLabelMap[jobType] ?? jobType,
      orders: groupOrders,
      total: groupOrders.reduce((sum, o) => sum + o.invoiceAmount, 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
}
