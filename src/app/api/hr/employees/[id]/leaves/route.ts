import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { countBusinessDays, deductsFromAnnualLeaveBalance, getLeaveSummary, leaveRequiresAttachment, LEAVE_TYPES, serializeLeaveSummary, type LeaveType } from "@/lib/hr-calculations";
import { deleteLeaveAttachment, saveLeaveAttachment } from "@/lib/hr-leave-files";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("hr:leave:manage");
  if (error) return error;

  const { id } = await params;
  const formData = await request.formData();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const daysRaw = formData.get("days");
  const typeRaw = String(formData.get("type") ?? "YILLIK");
  const note = String(formData.get("note") ?? "");
  const file = formData.get("file");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Başlangıç ve bitiş tarihi gerekli" }, { status: 400 });
  }

  if (!LEAVE_TYPES.includes(typeRaw as LeaveType)) {
    return NextResponse.json({ error: "Geçersiz izin türü" }, { status: 400 });
  }

  const leaveType = typeRaw as LeaveType;

  if (leaveRequiresAttachment(leaveType) && (!(file instanceof File) || file.size === 0)) {
    return NextResponse.json({ error: "Yıllık izin veya rapor için belge yükleyin" }, { status: 400 });
  }

  const employee = await prisma.employeeProfile.findUnique({
    where: { id },
    include: { leaveRecords: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Personel kaydı bulunamadı" }, { status: 404 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) {
    return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz" }, { status: 400 });
  }

  const leaveDays = daysRaw ? Number(daysRaw) : countBusinessDays(start, end);

  if (leaveDays <= 0 || !Number.isFinite(leaveDays)) {
    return NextResponse.json({ error: "Geçerli izin günü girin" }, { status: 400 });
  }

  if (deductsFromAnnualLeaveBalance(leaveType)) {
    const summary = getLeaveSummary(employee.hireDate, employee.terminationDate, employee.leaveRecords);
    if (leaveDays > summary.remainingDays) {
      return NextResponse.json(
        { error: `Kalan yıllık izin yetersiz. Kalan: ${summary.remainingDays} gün` },
        { status: 400 }
      );
    }
  }

  const record = await prisma.leaveRecord.create({
    data: {
      employeeId: id,
      startDate: start,
      endDate: end,
      days: leaveDays,
      type: leaveType,
      note: note.trim() || null,
    },
  });

  try {
    if (file instanceof File && file.size > 0) {
      const attachment = await saveLeaveAttachment(record.id, file);
      await prisma.leaveRecord.update({
        where: { id: record.id },
        data: attachment,
      });
    }
  } catch (uploadError) {
    await prisma.leaveRecord.delete({ where: { id: record.id } });
    const message = uploadError instanceof Error ? uploadError.message : "Dosya yüklenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const profile = await prisma.employeeProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
      leaveRecords: { orderBy: { startDate: "desc" } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Personel kaydı bulunamadı" }, { status: 404 });
  }

  const saved = profile.leaveRecords.find((item) => item.id === record.id)!;

  return NextResponse.json({
    record: {
      ...saved,
      startDate: saved.startDate.toISOString(),
      endDate: saved.endDate.toISOString(),
      createdAt: saved.createdAt.toISOString(),
    },
    employee: {
      id: profile.id,
      leaveRecords: profile.leaveRecords.map((item) => ({
        ...item,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      leaveSummary: serializeLeaveSummary(
        getLeaveSummary(profile.hireDate, profile.terminationDate, profile.leaveRecords)
      ),
    },
  });
}
