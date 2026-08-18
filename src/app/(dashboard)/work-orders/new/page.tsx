import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { getActiveResponsibles } from "@/lib/responsibles";
import { listJobTypeDefinitions, toJobTypeOptions } from "@/lib/job-types";
import { WorkOrderCreatePanel } from "./work-order-create-panel";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  const access = await getServerAccess();
  const canWrite = access?.can("orders:write") ?? false;

  if (!canWrite) {
    redirect("/work-orders");
  }

  const [insuranceCompanies, responsibles, jobTypeDefinitions] = await Promise.all([
    prisma.insuranceCompany.findMany({ orderBy: [{ shortCode: "asc" }, { name: "asc" }] }),
    getActiveResponsibles(),
    listJobTypeDefinitions(prisma, true),
  ]);

  return (
    <WorkOrderCreatePanel
      insuranceCompanies={insuranceCompanies}
      responsibles={responsibles}
      jobTypeOptions={toJobTypeOptions(jobTypeDefinitions)}
    />
  );
}
