import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission } from "../lib/session.js";
import { logActivity } from "../lib/activity-log.js";
import { paramString } from "../lib/params.js";
import { formValuesToInsuranceCompanyPayload } from "@asistcrm/lib/insurance-company";

export const insuranceCompaniesRouter = Router();

insuranceCompaniesRouter.use(authenticate);

insuranceCompaniesRouter.get("/", requirePermission("insurance-companies:read"), async (_req, res) => {
  const companies = await prisma.insuranceCompany.findMany({
    include: { _count: { select: { workOrders: true } } },
    orderBy: { name: "asc" },
  });
  res.json(companies);
});

insuranceCompaniesRouter.post("/", requirePermission("insurance-companies:write"), async (req, res) => {
  const body = req.body ?? {};
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
    res.status(400).json({ error: "Sigorta şirketi adı gerekli" });
    return;
  }

  const company = await prisma.insuranceCompany.create({ data });

  logActivity({
    userId: req.user!.id,
    action: "create",
    entityType: "insurance_company",
    entityId: company.id,
    entityLabel: company.name,
  });

  res.status(201).json(company);
});

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

insuranceCompaniesRouter.patch("/:id", requirePermission("insurance-companies:write"), async (req, res) => {
  const id = paramString(req.params.id);
  const data = normalizeBody(req.body ?? {});

  if (!data.name) {
    res.status(400).json({ error: "Sigorta şirketi adı gerekli" });
    return;
  }

  const existing = await prisma.insuranceCompany.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Sigorta şirketi bulunamadı" });
    return;
  }

  const company = await prisma.insuranceCompany.update({ where: { id }, data });

  logActivity({
    userId: req.user!.id,
    action: "update",
    entityType: "insurance_company",
    entityId: company.id,
    entityLabel: company.name,
  });

  res.json(company);
});
