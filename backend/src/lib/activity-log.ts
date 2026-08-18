import { prisma } from "./prisma.js";

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
