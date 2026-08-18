import type { Prisma } from "@prisma/client";

export const workOrderStatusFlow = [
  "YENI_IS",
  "ISLEMDE",
  "SERVIS_BEDELI_ILE_TAMAMLANDI",
  "TAMAMLANDI",
  "IPTAL",
] as const;

export type WorkOrderStatusValue = (typeof workOrderStatusFlow)[number];

export const closedWorkOrderStatuses = [
  "TAMAMLANDI",
  "SERVIS_BEDELI_ILE_TAMAMLANDI",
  "IPTAL",
] as const;

export function getNextWorkOrderStatus(current: string): WorkOrderStatusValue | null {
  const index = workOrderStatusFlow.indexOf(current as WorkOrderStatusValue);
  if (index === -1 || index >= workOrderStatusFlow.length - 1) return null;
  return workOrderStatusFlow[index + 1];
}

export function getPrevWorkOrderStatus(current: string): WorkOrderStatusValue | null {
  const index = workOrderStatusFlow.indexOf(current as WorkOrderStatusValue);
  if (index <= 0) return null;
  return workOrderStatusFlow[index - 1];
}

export function isWorkOrderCompleted(status: string) {
  return status === "TAMAMLANDI" || status === "SERVIS_BEDELI_ILE_TAMAMLANDI";
}

export function isWorkOrderCancelled(status: string) {
  return status === "IPTAL";
}

export function isWorkOrderClosed(status: string) {
  return (closedWorkOrderStatuses as readonly string[]).includes(status);
}

export function isWorkOrderOpen(status: string) {
  return !isWorkOrderClosed(status);
}

export const openWorkOrderFilter: Prisma.WorkOrderWhereInput = {
  status: { notIn: ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI", "IPTAL"] },
};

export const closedWorkOrderFilter: Prisma.WorkOrderWhereInput = {
  status: { in: ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI", "IPTAL"] },
};

/** Tamamlanan sekmesi — faturaya aktarılmış kayıtlar hariç */
export const completedWorkOrderListFilter: Prisma.WorkOrderWhereInput = {
  ...closedWorkOrderFilter,
  firmInvoiceItem: null,
};
