import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { getLeaveSummary, serializeLeaveSummary } from "@/lib/hr-calculations";

async function serializeProfile(id: string) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
      leaveRecords: { orderBy: { startDate: "desc" } },
    },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    nationalId: profile.nationalId,
    birthDate: profile.birthDate?.toISOString() ?? null,
    phone: profile.phone,
    address: profile.address,
    emergencyContact: profile.emergencyContact,
    emergencyPhone: profile.emergencyPhone,
    department: profile.department,
    jobTitle: profile.jobTitle,
    hireDate: profile.hireDate.toISOString(),
    terminationDate: profile.terminationDate?.toISOString() ?? null,
    monthlyGrossWage: profile.monthlyGrossWage,
    notes: profile.notes,
    user: profile.user,
    leaveRecords: profile.leaveRecords.map((record) => ({
      ...record,
      startDate: record.startDate.toISOString(),
      endDate: record.endDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
    })),
    leaveSummary: serializeLeaveSummary(
      getLeaveSummary(profile.hireDate, profile.terminationDate, profile.leaveRecords)
    ),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("hr:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.employeeProfile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Personel kaydı bulunamadı" }, { status: 404 });
  }

  const {
    nationalId,
    birthDate,
    phone,
    address,
    emergencyContact,
    emergencyPhone,
    department,
    jobTitle,
    hireDate,
    terminationDate,
    monthlyGrossWage,
    notes,
  } = body;

  await prisma.employeeProfile.update({
    where: { id },
    data: {
      ...(nationalId !== undefined && { nationalId: nationalId?.trim() || null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(emergencyContact !== undefined && { emergencyContact: emergencyContact?.trim() || null }),
      ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone?.trim() || null }),
      ...(department !== undefined && { department: department?.trim() || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || null }),
      ...(hireDate !== undefined && { hireDate: new Date(hireDate) }),
      ...(terminationDate !== undefined && { terminationDate: terminationDate ? new Date(terminationDate) : null }),
      ...(monthlyGrossWage !== undefined && { monthlyGrossWage: monthlyGrossWage ? Number(monthlyGrossWage) : null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  });

  const serialized = await serializeProfile(id);
  return NextResponse.json(serialized);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("hr:write");
  if (error) return error;

  const { id } = await params;
  await prisma.employeeProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
