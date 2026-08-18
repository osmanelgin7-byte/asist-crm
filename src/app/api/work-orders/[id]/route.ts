import { domainLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { syncSupplierLedger } from "@/lib/supplier-ledger";
import { syncRepairItems, type RepairItemInput } from "@/lib/repair-items";
import { workOrderStatusFlow } from "@/lib/work-order-status";
import { resolveResponsibleId } from "@/lib/responsibles";
import { resolveJobTypeCode } from "@/lib/job-types";
import {
  resolveWorkOrderNumbers,
  validateRequiredWorkOrderNumbers,
} from "@/lib/work-order-numbers";
import { parseAppointmentAt, syncWorkOrderPlannerEvent } from "@/lib/work-order-planner";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("orders:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const {
    title,
    asistansDosyaNo,
    insuredFirstName,
    insuredLastName,
    insuredPhone,
    insuredAddress,
    insuredCity,
    insuredDistrict,
    description,
    status,
    priority,
    assignedToId,
    notes,
    jobType,
    invoiceAmount,
    supplierCost,
    supplierId,
    repairItems,
    insuranceCompanyId,
    appointmentAt,
  } = body;

  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (title !== undefined || asistansDosyaNo !== undefined) {
    const resolvedNumbers = resolveWorkOrderNumbers(existing, { title, asistansDosyaNo });
    const numberError = validateRequiredWorkOrderNumbers(
      resolvedNumbers.dosyaNo,
      resolvedNumbers.asistansDosyaNo
    );
    if (numberError) {
      return NextResponse.json({ error: numberError }, { status: 400 });
    }
    if (title !== undefined) data.title = resolvedNumbers.dosyaNo;
    if (asistansDosyaNo !== undefined) {
      if (resolvedNumbers.asistansDosyaNo !== existing.asistansDosyaNo) {
        const duplicate = await prisma.workOrder.findUnique({
          where: { asistansDosyaNo: resolvedNumbers.asistansDosyaNo },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: "Bu asistans dosya no ile başka bir kayıt zaten mevcut." },
            { status: 409 }
          );
        }
      }
      data.asistansDosyaNo = resolvedNumbers.asistansDosyaNo;
    }
  }
  if (insuredFirstName !== undefined) data.insuredFirstName = String(insuredFirstName).trim() || null;
  if (insuredLastName !== undefined) data.insuredLastName = String(insuredLastName).trim() || null;
  if (insuredPhone !== undefined) data.insuredPhone = String(insuredPhone).trim() || null;
  if (insuredAddress !== undefined) data.insuredAddress = String(insuredAddress).trim() || null;
  if (insuredCity !== undefined) data.insuredCity = String(insuredCity).trim() || null;
  if (insuredDistrict !== undefined) data.insuredDistrict = String(insuredDistrict).trim() || null;
  if (description !== undefined) data.description = description;
  if (status) {
    if (!workOrderStatusFlow.includes(status as (typeof workOrderStatusFlow)[number])) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }
    data.status = status;
    if (status === "TAMAMLANDI" || status === "SERVIS_BEDELI_ILE_TAMAMLANDI") {
      data.completedAt = existing.completedAt ?? new Date();
    } else if (status === "IPTAL") {
      data.completedAt = null;
    } else {
      data.completedAt = null;
    }
  }
  if (priority) data.priority = priority;
  if (assignedToId !== undefined) {
    const resolved = await resolveResponsibleId(assignedToId);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    data.assignedToId = resolved.id;
  }
  if (notes !== undefined) data.notes = notes;
  if (jobType !== undefined) {
    const resolvedJobType = await resolveJobTypeCode(prisma, String(jobType));
    if ("error" in resolvedJobType) {
      return NextResponse.json({ error: resolvedJobType.error }, { status: 400 });
    }
    data.jobType = resolvedJobType.code;
  }
  if (appointmentAt !== undefined) {
    data.appointmentAt = parseAppointmentAt(appointmentAt);
  }
  if (invoiceAmount !== undefined && repairItems === undefined) {
    data.invoiceAmount = Number(invoiceAmount) || 0;
  }
  if (supplierCost !== undefined) data.supplierCost = Number(supplierCost) || 0;
  if (supplierId !== undefined) data.supplierId = supplierId || null;
  if (insuranceCompanyId !== undefined) {
    const companyId = String(insuranceCompanyId).trim();
    if (!companyId) {
      return NextResponse.json({ error: `${domainLabels.insuranceCompany.one} seçilmelidir` }, { status: 400 });
    }
    const company = await prisma.insuranceCompany.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: `${domainLabels.insuranceCompany.one} bulunamadı` }, { status: 400 });
    }
    data.insuranceCompanyId = companyId;
  }

  if (repairItems !== undefined) {
    await syncRepairItems(id, repairItems as RepairItemInput[]);
  }

  const newSupplierId = supplierId !== undefined ? (supplierId || null) : existing.supplierId;
  const newCost = supplierCost !== undefined ? (Number(supplierCost) || 0) : existing.supplierCost;

  if (supplierId !== undefined || supplierCost !== undefined) {
    await syncSupplierLedger(id, existing.ticketNo, newSupplierId, newCost);
  }

  const order = await prisma.workOrder.update({
    where: { id },
    data,
    include: {
      insuranceCompany: true,
      assignedTo: { select: { id: true, name: true } },
      supplier: { select: { id: true, firstName: true, lastName: true, iban: true, balance: true } },
      repairItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  await syncWorkOrderPlannerEvent(prisma, order.id);

  logActivity({
    userId: user!.id,
    action: status && status !== existing.status ? "status_change" : "update",
    entityType: "work_order",
    entityId: order.id,
    entityLabel: order.ticketNo,
    details: status && status !== existing.status ? `Durum: ${status}` : order.title,
  });

  return NextResponse.json(order);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("orders:write");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (existing?.supplierId && existing.supplierCost > 0) {
    await syncSupplierLedger(id, existing.ticketNo, null, 0);
  }

  if (existing) {
    logActivity({
      userId: user!.id,
      action: "delete",
      entityType: "work_order",
      entityId: existing.id,
      entityLabel: existing.ticketNo,
    });
  }

  await prisma.workOrder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
