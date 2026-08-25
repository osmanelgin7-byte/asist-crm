import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireJobTypeManage, requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import {
  listJobTypeDefinitions,
  slugifyJobTypeCode,
} from "@/lib/job-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  if (activeOnly) {
    const readCheck = await requirePermission("orders:read");
    if (readCheck.error) return readCheck.error;
  } else {
    const manageCheck = await requireJobTypeManage();
    if (manageCheck.error) return manageCheck.error;
  }

  const definitions = await listJobTypeDefinitions(prisma, activeOnly);
  const usageCounts = await prisma.workOrder.groupBy({
    by: ["jobType"],
    _count: { _all: true },
  });
  const countByCode = Object.fromEntries(usageCounts.map((row) => [row.jobType, row._count._all]));

  return NextResponse.json(
    definitions.map((item) => ({
      ...item,
      usageCount: countByCode[item.code] ?? 0,
    }))
  );
}

export async function POST(request: Request) {
  const { user, error } = await requireJobTypeManage();
  if (error) return error;

  const body = await request.json();
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : undefined;

  if (!label) {
    return NextResponse.json({ error: "İş türü adı gerekli" }, { status: 400 });
  }

  let code = slugifyJobTypeCode(label);
  const existingCodes = new Set(
    (await prisma.jobTypeDefinition.findMany({ select: { code: true } })).map((item) => item.code)
  );

  if (existingCodes.has(code)) {
    let suffix = 2;
    while (existingCodes.has(`${code}_${suffix}`)) suffix += 1;
    code = `${code}_${suffix}`;
  }

  const maxSort = await prisma.jobTypeDefinition.aggregate({ _max: { sortOrder: true } });

  const created = await prisma.jobTypeDefinition.create({
    data: {
      code,
      label,
      sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      active: true,
    },
  });

  logActivity({
    userId: user!.id,
    action: "create",
    entityType: "job_type",
    entityId: created.code,
    entityLabel: created.label,
  });

  return NextResponse.json({ ...created, usageCount: 0 }, { status: 201 });
}
