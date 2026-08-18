import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { contentDispositionHeader } from "@/lib/security";
import { domainLabels } from "@/lib/domain";
import { workOrdersToXlsx } from "@/lib/export-work-orders";
import { listJobTypeDefinitions, buildJobTypeLabelMap } from "@/lib/job-types";
import { openWorkOrderFilter, completedWorkOrderListFilter } from "@/lib/work-order-status";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";

  let where = {};
  let filename = "asistans-genel-durum";
  let sheetName: string = domainLabels.workOrder.many;

  if (type === "open") {
    where = openWorkOrderFilter;
    filename = "acik-dosyalar";
    sheetName = domainLabels.workOrder.open;
  } else if (type === "completed") {
    where = completedWorkOrderListFilter;
    filename = "kapanan-dosyalar";
    sheetName = domainLabels.workOrder.completed;
  }

  const [orders, jobTypeDefinitions] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: {
        insuranceCompany: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ reportedAt: "desc" }],
    }),
    listJobTypeDefinitions(prisma),
  ]);

  const xlsx = await workOrdersToXlsx(orders, buildJobTypeLabelMap(jobTypeDefinitions), sheetName);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionHeader(`${filename}-${date}.xlsx`),
    },
  });
}
