import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { listJobTypeDefinitions } from "@/lib/job-types";
import { JobTypesPanel } from "./job-types-panel";

export const dynamic = "force-dynamic";

export default async function JobTypesPage() {
  const access = await getServerAccess();
  const canManage =
    (access?.can("settings:manage") || access?.can("orders:write")) ?? false;

  const definitions = await listJobTypeDefinitions(prisma);
  const usageCounts = await prisma.workOrder.groupBy({
    by: ["jobType"],
    _count: { _all: true },
  });
  const countByCode = Object.fromEntries(usageCounts.map((row) => [row.jobType, row._count._all]));

  const jobTypes = definitions.map((item) => ({
    code: item.code,
    label: item.label,
    sortOrder: item.sortOrder,
    active: item.active,
    usageCount: countByCode[item.code] ?? 0,
  }));

  return <JobTypesPanel jobTypes={jobTypes} canManage={canManage} />;
}
