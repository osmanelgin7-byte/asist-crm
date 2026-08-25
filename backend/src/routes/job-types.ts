import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission } from "../lib/session.js";
import { logActivity } from "../lib/activity-log.js";
import { paramString } from "../lib/params.js";
import {
  listJobTypeDefinitions,
  slugifyJobTypeCode,
} from "@asistcrm/lib/job-types";

export const jobTypesRouter = Router();

jobTypesRouter.use(authenticate);

jobTypesRouter.get("/", async (req, res) => {
  const activeOnly = req.query.active === "true";
  const permission = activeOnly ? "orders:read" : "settings:manage";

  if (!req.user) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }

  const { sessionHasPermission } = await import("@asistcrm/lib/app-tabs");
  if (!sessionHasPermission(req.user.role, req.user.allowedTabs, permission)) {
    res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    return;
  }

  const definitions = await listJobTypeDefinitions(prisma, activeOnly);
  const usageCounts = await prisma.workOrder.groupBy({
    by: ["jobType"],
    _count: { _all: true },
  });
  const countByCode = Object.fromEntries(usageCounts.map((row) => [row.jobType, row._count._all]));

  res.json(
    definitions.map((item) => ({
      ...item,
      usageCount: countByCode[item.code] ?? 0,
    }))
  );
});

jobTypesRouter.post("/", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const { sessionHasPermission } = await import("@asistcrm/lib/app-tabs");
  if (
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "settings:manage") &&
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "orders:write")
  ) {
    res.status(403).json({ error: "İş türü yönetimi için yetkiniz yok" });
    return;
  }
  const body = req.body ?? {};
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : undefined;

  if (!label) {
    res.status(400).json({ error: "İş türü adı gerekli" });
    return;
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
    userId: req.user!.id,
    action: "create",
    entityType: "job_type",
    entityId: created.code,
    entityLabel: created.label,
  });

  res.status(201).json({ ...created, usageCount: 0 });
});

jobTypesRouter.patch("/:code", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const { sessionHasPermission } = await import("@asistcrm/lib/app-tabs");
  if (
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "settings:manage") &&
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "orders:write")
  ) {
    res.status(403).json({ error: "İş türü yönetimi için yetkiniz yok" });
    return;
  }
  const code = paramString(req.params.code);
  const existing = await prisma.jobTypeDefinition.findUnique({ where: { code } });
  if (!existing) {
    res.status(404).json({ error: "İş türü bulunamadı" });
    return;
  }

  const body = req.body ?? {};
  const data: { label?: string; sortOrder?: number; active?: boolean } = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) {
      res.status(400).json({ error: "İş türü adı boş olamaz" });
      return;
    }
    data.label = label;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      res.status(400).json({ error: "Geçersiz sıra numarası" });
      return;
    }
    data.sortOrder = sortOrder;
  }

  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  const updated = await prisma.jobTypeDefinition.update({ where: { code }, data });
  const usageCount = await prisma.workOrder.count({ where: { jobType: code } });

  logActivity({
    userId: req.user!.id,
    action: "update",
    entityType: "job_type",
    entityId: updated.code,
    entityLabel: updated.label,
  });

  res.json({ ...updated, usageCount });
});

jobTypesRouter.delete("/:code", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Oturum gerekli" });
    return;
  }
  const { sessionHasPermission } = await import("@asistcrm/lib/app-tabs");
  if (
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "settings:manage") &&
    !sessionHasPermission(req.user.role, req.user.allowedTabs, "orders:write")
  ) {
    res.status(403).json({ error: "İş türü yönetimi için yetkiniz yok" });
    return;
  }
  const code = paramString(req.params.code);
  const existing = await prisma.jobTypeDefinition.findUnique({ where: { code } });
  if (!existing) {
    res.status(404).json({ error: "İş türü bulunamadı" });
    return;
  }

  await prisma.jobTypeDefinition.delete({ where: { code } });

  logActivity({
    userId: req.user!.id,
    action: "delete",
    entityType: "job_type",
    entityId: code,
    entityLabel: existing.label,
  });

  res.json({ ok: true });
});
