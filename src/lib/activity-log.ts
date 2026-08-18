import { prisma } from "@/lib/prisma";

export type ActivityAction = "create" | "update" | "delete" | "login" | "status_change";

export type ActivityEntityType =
  | "work_order"
  | "insurance_company"
  | "user"
  | "supplier"
  | "firm_invoice"
  | "hr_employee"
  | "leave"
  | "session"
  | "job_type";

const ENTITY_LABELS: Record<ActivityEntityType, string> = {
  work_order: "Asistans Dosyası",
  insurance_company: "Sigorta Şirketi",
  user: "Kullanıcı",
  supplier: "Hizmet Sağlayıcı",
  firm_invoice: "Sigorta faturası",
  hr_employee: "Personel",
  leave: "İzin kaydı",
  session: "Oturum",
  job_type: "Hizmet türü",
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  create: "oluşturdu",
  update: "güncelledi",
  delete: "sildi",
  login: "giriş yaptı",
  status_change: "durumunu değiştirdi",
};

export interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityLabel?: string;
  details?: string;
}

export function logActivity(input: LogActivityInput) {
  prisma.activityLog
    .create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        details: input.details ?? null,
      },
    })
    .catch((error) => {
      console.error("Activity log failed:", error);
    });
}

export function describeActivity(log: {
  action: string;
  entityType: string;
  entityLabel: string | null;
  details: string | null;
}): string {
  const entity =
    log.entityLabel ||
    ENTITY_LABELS[log.entityType as ActivityEntityType] ||
    (log.entityType === "finding" ? "Ekspertiz" : log.entityType) ||
    log.entityType;
  const action = ACTION_LABELS[log.action as ActivityAction] || log.action;

  if (log.action === "login") return "Sisteme giriş yaptı";
  if (log.details) return `${entity} — ${log.details}`;
  return `${entity} ${action}`;
}

export { ENTITY_LABELS, ACTION_LABELS };
