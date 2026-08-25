import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { canAccessTab } from "@/lib/app-tabs";
import { domainLabels } from "@/lib/domain";

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const canSearchOrders =
    user!.can("orders:read") && canAccessTab(user!.role, user!.allowedTabs, "work-orders");
  const canSearchCompanies =
    user!.can("insurance-companies:read") &&
    canAccessTab(user!.role, user!.allowedTabs, "insurance-companies");

  const [workOrders, companies] = await Promise.all([
    canSearchOrders
      ? prisma.workOrder.findMany({
          where: {
            OR: [
              { ticketNo: { contains: q } },
              { title: { contains: q } },
              { asistansDosyaNo: { contains: q } },
              { description: { contains: q } },
              { insuredFirstName: { contains: q } },
              { insuredLastName: { contains: q } },
              { insuredPhone: { contains: q } },
              { insuranceCompany: { name: { contains: q } } },
              { insuranceCompany: { shortCode: { contains: q } } },
              { insuranceCompany: { city: { contains: q } } },
            ],
          },
          include: { insuranceCompany: { select: { name: true, shortCode: true } } },
          orderBy: { reportedAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
    canSearchCompanies
      ? prisma.insuranceCompany.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { shortCode: { contains: q } },
              { city: { contains: q } },
              { address: { contains: q } },
            ],
          },
          orderBy: [{ shortCode: "asc" }, { name: "asc" }],
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...workOrders.map((order) => ({
      type: "work-order" as const,
      id: order.id,
      label: order.asistansDosyaNo ?? order.ticketNo,
      title: order.title,
      subtitle: [
        order.asistansDosyaNo ? `Asistans: ${order.asistansDosyaNo}` : null,
        order.insuranceCompany.shortCode
          ? `${order.insuranceCompany.shortCode} — ${order.insuranceCompany.name}`
          : order.insuranceCompany.name,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/work-orders/${order.id}`,
    })),
    ...companies.map((company) => ({
      type: "insurance-company" as const,
      id: company.id,
      label: company.shortCode ?? domainLabels.insuranceCompany.one,
      title: company.name,
      subtitle: [company.city, company.address].filter(Boolean).join(" · ") || "—",
      href: `/sigorta-sirketleri?q=${encodeURIComponent(q)}`,
    })),
  ];

  return NextResponse.json({ results });
}
