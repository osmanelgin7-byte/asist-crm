import type { PrismaClient } from "@prisma/client";

export const REPORT_TIMEZONE = "Europe/Istanbul";

const COMPLETED_STATUSES = ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI"] as const;

export type ReportPeriod = "day" | "week" | "month";

export interface WorkOrderVolumeSummary {
  period: ReportPeriod;
  label: string;
  opened: number;
  closed: number;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function getIstanbulCalendarParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

export function getReportIntervalBounds(period: ReportPeriod, reference = new Date()) {
  const { year, month, day, weekday } = getIstanbulCalendarParts(reference);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  let start: Date;

  if (period === "day") {
    start = new Date(`${year}-${pad2(month)}-${pad2(day)}T00:00:00+03:00`);
  } else if (period === "month") {
    start = new Date(`${year}-${pad2(month)}-01T00:00:00+03:00`);
  } else {
    const dayStart = new Date(`${year}-${pad2(month)}-${pad2(day)}T00:00:00+03:00`);
    const dow = weekdayMap[weekday.slice(0, 3)] ?? 1;
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    start = new Date(dayStart.getTime() - daysFromMonday * 86_400_000);
  }

  let end: Date;
  if (period === "day") {
    end = new Date(start.getTime() + 86_400_000);
  } else if (period === "week") {
    end = new Date(start.getTime() + 7 * 86_400_000);
  } else {
    const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    end = new Date(`${nextMonth.year}-${pad2(nextMonth.month)}-01T00:00:00+03:00`);
  }

  return { start, end };
}

export async function countOpenedWorkOrders(
  prisma: PrismaClient,
  start: Date,
  end: Date
): Promise<number> {
  return prisma.workOrder.count({
    where: {
      createdAt: { gte: start, lt: end },
    },
  });
}

export async function countClosedWorkOrders(
  prisma: PrismaClient,
  start: Date,
  end: Date
): Promise<number> {
  return prisma.workOrder.count({
    where: {
      completedAt: { gte: start, lt: end },
      status: { in: [...COMPLETED_STATUSES] },
    },
  });
}

export async function getWorkOrderVolumeSummary(
  prisma: PrismaClient,
  reference = new Date()
): Promise<WorkOrderVolumeSummary[]> {
  const periods: { period: ReportPeriod; label: string }[] = [
    { period: "day", label: "Bugün" },
    { period: "week", label: "Bu Hafta" },
    { period: "month", label: "Bu Ay" },
  ];

  return Promise.all(
    periods.map(async ({ period, label }) => {
      const { start, end } = getReportIntervalBounds(period, reference);
      const [opened, closed] = await Promise.all([
        countOpenedWorkOrders(prisma, start, end),
        countClosedWorkOrders(prisma, start, end),
      ]);
      return { period, label, opened, closed };
    })
  );
}
