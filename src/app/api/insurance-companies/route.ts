import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { domainLabels } from "@/lib/domain";
import { formValuesToInsuranceCompanyPayload } from "@/lib/insurance-company";

export async function GET() {
  const { error } = await requirePermission("insurance-companies:read");
  if (error) return error;

  const companies = await prisma.insuranceCompany.findMany({
    include: { _count: { select: { workOrders: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const { user, error } = await requirePermission("insurance-companies:write");
  if (error) return error;

  const body = await request.json();
  const data = formValuesToInsuranceCompanyPayload({
    name: typeof body.name === "string" ? body.name : "",
    shortCode: typeof body.shortCode === "string" ? body.shortCode : "",
    city: typeof body.city === "string" ? body.city : "",
    address: typeof body.address === "string" ? body.address : "",
    contactPerson: typeof body.contactPerson === "string" ? body.contactPerson : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
    assistanceContactName:
      typeof body.assistanceContactName === "string" ? body.assistanceContactName : "",
    assistancePhone: typeof body.assistancePhone === "string" ? body.assistancePhone : "",
    accountManagerName: typeof body.accountManagerName === "string" ? body.accountManagerName : "",
    accountManagerPhone: typeof body.accountManagerPhone === "string" ? body.accountManagerPhone : "",
  });

  if (!data.name) {
    return NextResponse.json(
      { error: `${domainLabels.insuranceCompany.one} adı gerekli` },
      { status: 400 }
    );
  }

  const company = await prisma.insuranceCompany.create({ data });

  logActivity({
    userId: user!.id,
    action: "create",
    entityType: "insurance_company",
    entityId: company.id,
    entityLabel: company.name,
  });

  return NextResponse.json(company, { status: 201 });
}
