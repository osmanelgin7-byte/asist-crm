import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { getActiveResponsibles } from "@/lib/responsibles";
import { listJobTypeDefinitions, toJobTypeOptions } from "@/lib/job-types";
import { WorkOrderDetailPanel } from "./work-order-detail-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getServerAccess();
  const canWrite = access?.can("orders:write") ?? false;

  const [order, repairImages, suppliers, responsibles, jobTypeDefinitions, insuranceCompanies] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        insuranceCompany: true,
        assignedTo: { select: { id: true, name: true } },
        supplier: { select: { id: true, firstName: true, lastName: true, iban: true, phone: true, balance: true } },
        repairItems: { orderBy: { sortOrder: "asc" } },
        firmInvoiceItem: {
          select: { firmInvoice: { select: { invoiceNo: true } } },
        },
        operatorNotes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.workOrderRepairImage.findMany({
      where: { workOrderId: id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.supplier.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    getActiveResponsibles(),
    listJobTypeDefinitions(prisma),
    prisma.insuranceCompany.findMany({ orderBy: [{ shortCode: "asc" }, { name: "asc" }] }),
  ]);

  if (!order) notFound();

  const jobTypeLabel =
    jobTypeDefinitions.find((item) => item.code === order.jobType)?.label ?? order.jobType;
  const jobTypeOptions = toJobTypeOptions(jobTypeDefinitions);
  if (!jobTypeOptions.some((item) => item.value === order.jobType)) {
    jobTypeOptions.unshift({ value: order.jobType, label: jobTypeLabel });
  }

  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Yükleniyor…</div>}>
      <WorkOrderDetailPanel
        order={{
          id: order.id,
          ticketNo: order.ticketNo,
          title: order.title,
          asistansDosyaNo: order.asistansDosyaNo,
          insuredFirstName: order.insuredFirstName,
          insuredLastName: order.insuredLastName,
          insuredPhone: order.insuredPhone,
          insuredAddress: order.insuredAddress,
          insuredCity: order.insuredCity,
          insuredDistrict: order.insuredDistrict,
          description: order.description,
          jobType: order.jobType,
          status: order.status,
          priority: order.priority,
          reportedAt: order.reportedAt.toISOString(),
          appointmentAt: order.appointmentAt?.toISOString() ?? null,
          completedAt: order.completedAt?.toISOString() ?? null,
          invoiceAmount: order.invoiceAmount,
          supplierCost: order.supplierCost,
          supplierId: order.supplierId,
          supplier: order.supplier,
          repairItems: order.repairItems,
          repairImages: repairImages.map((image) => ({
            id: image.id,
            fileName: image.fileName,
            mimeType: image.mimeType,
            createdAt: image.createdAt.toISOString(),
          })),
          insuranceCompany: order.insuranceCompany,
          assignedTo: order.assignedTo,
          operatorNotes: order.operatorNotes.map((note) => ({
            id: note.id,
            content: note.content,
            createdAt: note.createdAt.toISOString(),
            author: note.author,
          })),
          hasFirmInvoice: order.firmInvoiceItem != null,
          firmInvoiceNo: order.firmInvoiceItem?.firmInvoice.invoiceNo ?? null,
        }}
        insuranceCompanies={insuranceCompanies}
        suppliers={suppliers}
        responsibles={responsibles}
        jobTypeOptions={jobTypeOptions}
        jobTypeLabel={jobTypeLabel}
        canWrite={canWrite}
      />
    </Suspense>
  );
}
