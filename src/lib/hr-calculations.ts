const MS_PER_DAY = 86400000;

export type LeaveType = "YILLIK" | "UCRETSIZ" | "RAPOR";

export const LEAVE_TYPES: LeaveType[] = ["YILLIK", "UCRETSIZ", "RAPOR"];

export function deductsFromAnnualLeaveBalance(type: string): boolean {
  return type === "YILLIK";
}

export function leaveRequiresAttachment(type: string): boolean {
  return type === "YILLIK" || type === "RAPOR";
}

export interface AnnualLeaveUsageEntry {
  id: string;
  startDate: Date;
  endDate: Date;
  days: number;
  note: string | null;
  attachmentFileName: string | null;
}

export interface LeaveSummary {
  serviceYears: number;
  annualEntitlementDays: number;
  totalAccruedDays: number;
  usedDays: number;
  remainingDays: number;
  annualLeaveUsage: AnnualLeaveUsageEntry[];
}

export function diffDays(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / MS_PER_DAY));
}

export function countBusinessDays(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  if (e < s) return 0;

  let count = 0;
  const cursor = new Date(s);
  while (cursor <= e) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function getServiceDuration(hireDate: Date, terminationDate: Date | null, asOf = new Date()) {
  const end = terminationDate ?? asOf;
  const totalDays = diffDays(hireDate, end);
  const fullYears = Math.floor(totalDays / 365.25);
  const remainderDays = totalDays - fullYears * 365.25;
  const remainderMonths = Math.floor(remainderDays / 30.44);
  return { totalDays, fullYears, remainderMonths, endDate: end };
}

export function getAnnualLeaveEntitlement(serviceYears: number): number {
  if (serviceYears < 1) return 0;
  if (serviceYears < 5) return 14;
  if (serviceYears < 15) return 20;
  return 26;
}

export function getLeaveSummary(
  hireDate: Date,
  terminationDate: Date | null,
  leaveRecords: {
    id: string;
    startDate: Date;
    endDate: Date;
    days: number;
    type: string;
    note?: string | null;
    attachmentFileName?: string | null;
  }[],
  asOf = new Date()
): LeaveSummary {
  const end = terminationDate && terminationDate < asOf ? terminationDate : asOf;
  const { fullYears } = getServiceDuration(hireDate, end, asOf);

  let totalAccruedDays = 0;
  for (let year = 1; year <= fullYears; year += 1) {
    totalAccruedDays += getAnnualLeaveEntitlement(year);
  }

  const annualLeaveUsage = leaveRecords
    .filter((record) => deductsFromAnnualLeaveBalance(record.type))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .map((record) => ({
      id: record.id,
      startDate: new Date(record.startDate),
      endDate: new Date(record.endDate),
      days: record.days,
      note: record.note ?? null,
      attachmentFileName: record.attachmentFileName ?? null,
    }));

  const usedDays = annualLeaveUsage.reduce((sum, record) => sum + record.days, 0);

  const annualEntitlementDays = fullYears >= 1 ? getAnnualLeaveEntitlement(fullYears) : 0;

  return {
    serviceYears: fullYears,
    annualEntitlementDays,
    totalAccruedDays,
    usedDays,
    remainingDays: Math.max(0, totalAccruedDays - usedDays),
    annualLeaveUsage,
  };
}

export function serializeLeaveSummary(summary: LeaveSummary) {
  return {
    ...summary,
    annualLeaveUsage: summary.annualLeaveUsage.map((entry) => ({
      ...entry,
      startDate: entry.startDate.toISOString(),
      endDate: entry.endDate.toISOString(),
    })),
  };
}
