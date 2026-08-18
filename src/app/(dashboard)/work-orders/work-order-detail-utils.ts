import type { InsuranceCompanyContactData } from "@/lib/insurance-company";

export interface WorkOrderRepairItem {
  id: string;
  description: string;
  amount: number;
}

export interface WorkOrderRepairImage {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface WorkOrderDetailData {
  id: string;
  ticketNo: string;
  title: string;
  asistansDosyaNo: string | null;
  insuredFirstName: string | null;
  insuredLastName: string | null;
  insuredPhone: string | null;
  insuredAddress: string | null;
  insuredCity: string | null;
  insuredDistrict: string | null;
  description: string | null;
  jobType: string;
  status: string;
  priority: string;
  reportedAt: string;
  appointmentAt: string | null;
  completedAt: string | null;
  invoiceAmount: number;
  supplierCost: number;
  supplierId: string | null;
  supplier: { id: string; firstName: string; lastName: string; iban: string; phone: string | null; balance: number } | null;
  repairItems: WorkOrderRepairItem[];
  repairImages: WorkOrderRepairImage[];
  insuranceCompany: InsuranceCompanyContactData & { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  operatorNotes: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }[];
  hasFirmInvoice: boolean;
  firmInvoiceNo: string | null;
}

export function getEffectiveRepairItems(order: WorkOrderDetailData) {
  return order.repairItems;
}
