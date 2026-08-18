import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../lib/session.js";
import { canAccessTab, sessionHasPermission } from "@asistcrm/lib/app-tabs";

export const searchRouter = Router();

searchRouter.use(authenticate);

searchRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const user = req.user!;
  const canSearchOrders =
    sessionHasPermission(user.role, user.allowedTabs, "orders:read") &&
    canAccessTab(user.role, user.allowedTabs, "work-orders");
  const canSearchCompanies =
    sessionHasPermission(user.role, user.allowedTabs, "insurance-companies:read") &&
    canAccessTab(user.role, user.allowedTabs, "insurance-companies");

  const [workOrders, companies] = await Promise.all([
    canSearchOrders
      ? prisma.workOrder.findMany({
          where: {
            OR: [
              { ticketNo: { contains: q } },
              { title: { contains: q } },
              { description: { contains: q } },
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

  res.json({
    results: [
      ...workOrders.map((order) => ({
        type: "work-order" as const,
        id: order.id,
        label: order.ticketNo,
        title: order.title,
        subtitle: order.insuranceCompany.shortCode
          ? `${order.insuranceCompany.shortCode} — ${order.insuranceCompany.name}`
          : order.insuranceCompany.name,
        href: `/work-orders/${order.id}`,
      })),
      ...companies.map((company) => ({
        type: "insurance-company" as const,
        id: company.id,
        label: company.shortCode ?? "Sigorta şirketi",
        title: company.name,
        subtitle: [company.city, company.address].filter(Boolean).join(" · ") || "—",
        href: `/sigorta-sirketleri?q=${encodeURIComponent(q)}`,
      })),
    ],
  });
});
