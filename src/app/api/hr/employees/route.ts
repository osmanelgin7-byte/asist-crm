import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { getLeaveSummary, serializeLeaveSummary } from "@/lib/hr-calculations";

function serializeEmployee(profile: {
  id: string;
  userId: string;
  nationalId: string | null;
  birthDate: Date | null;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  department: string | null;
  jobTitle: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  monthlyGrossWage: number | null;
  notes: string | null;
  leaveRecords: {
    id: string;
    startDate: Date;
    endDate: Date;
    days: number;
    type: string;
    note: string | null;
    attachmentFileName: string | null;
    attachmentMimeType: string | null;
    attachmentPath: string | null;
    createdAt: Date;
  }[];
  user: { id: string; name: string; email: string; role: string; active: boolean };
}) {
  const leaveRecords = profile.leaveRecords.map((record) => ({
    ...record,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
  }));

  const leaveSummary = serializeLeaveSummary(
    getLeaveSummary(profile.hireDate, profile.terminationDate, profile.leaveRecords)
  );

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
    leaveRecords,
    leaveSummary,
  };
}

export async function GET() {
  const { error } = await requirePermission("hr:read");
  if (error) return error;

  const [profiles, usersWithoutProfile] = await Promise.all([
    prisma.employeeProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
        leaveRecords: { orderBy: { startDate: "desc" } },
      },
      orderBy: { hireDate: "asc" },
    }),
    prisma.user.findMany({
      where: { employeeProfile: null, active: true },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    employees: profiles.map((profile) => serializeEmployee(profile)),
    unlinkedUsers: usersWithoutProfile,
  });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("hr:write");
  if (error) return error;

  const body = await request.json();
  const {
    userId,
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

  if (!userId || !hireDate) {
    return NextResponse.json({ error: "Kullanıcı ve işe giriş tarihi gerekli" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const existing = await prisma.employeeProfile.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: "Bu kullanıcı için profil zaten var" }, { status: 400 });
  }

  const profile = await prisma.employeeProfile.create({
    data: {
      userId,
      nationalId: nationalId?.trim() || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      emergencyContact: emergencyContact?.trim() || null,
      emergencyPhone: emergencyPhone?.trim() || null,
      department: department?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      hireDate: new Date(hireDate),
      terminationDate: terminationDate ? new Date(terminationDate) : null,
      monthlyGrossWage: monthlyGrossWage ? Number(monthlyGrossWage) : null,
      notes: notes?.trim() || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
      leaveRecords: true,
    },
  });

  return NextResponse.json(serializeEmployee(profile), { status: 201 });
}
