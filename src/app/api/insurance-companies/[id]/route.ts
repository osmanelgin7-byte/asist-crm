import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { domainLabels } from "@/lib/domain";
import { formValuesToInsuranceCompanyPayload } from "@/lib/insurance-company";

function normalizeBody(body: Record<string, unknown>) {
  return formValuesToInsuranceCompanyPayload({
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
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("insurance-companies:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const data = normalizeBody(body);

  if (!data.name) {
    return NextResponse.json(
      { error: `${domainLabels.insuranceCompany.one} adı gerekli` },
      { status: 400 }
    );
  }

  const existing = await prisma.insuranceCompany.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: `${domainLabels.insuranceCompany.one} bulunamadı` },
      { status: 404 }
    );
  }

  const company = await prisma.insuranceCompany.update({
    where: { id },
    data,
  });

  logActivity({
    userId: user!.id,
    action: "update",
    entityType: "insurance_company",
    entityId: company.id,
    entityLabel: company.name,
  });

  return NextResponse.json(company);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("insurance-companies:write");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.insuranceCompany.findUnique({
    where: { id },
    include: { _count: { select: { workOrders: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: `${domainLabels.insuranceCompany.one} bulunamadı` },
      { status: 404 }
    );
  }

  if (existing._count.workOrders > 0) {
    return NextResponse.json(
      {
        error: `Bu ${domainLabels.insuranceCompany.one.toLowerCase()}ye bağlı ${existing._count.workOrders} asistans dosyası var. Önce dosyaları başka bir şirkete taşıyın veya silin.`,
      },
      { status: 409 }
    );
  }

  await prisma.insuranceCompany.delete({ where: { id } });

  logActivity({
    userId: user!.id,
    action: "delete",
    entityType: "insurance_company",
    entityId: existing.id,
    entityLabel: existing.name,
  });

  return NextResponse.json({ success: true });
}
