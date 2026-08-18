import type { PrismaClient } from "@prisma/client";
import { listJobTypeDefinitions } from "@/lib/job-types";

function parseAppointmentAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export { parseAppointmentAt };

function insuredName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export async function syncWorkOrderPlannerEvent(prisma: PrismaClient, workOrderId: string) {
  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { plannerEvent: true },
  });

  if (!order) return;

  if (!order.appointmentAt || !order.assignedToId) {
    if (order.plannerEvent) {
      await prisma.plannerEvent.delete({ where: { id: order.plannerEvent.id } });
    }
    return;
  }

  const jobTypes = await listJobTypeDefinitions(prisma, false);
  const jobLabel = jobTypes.find((item) => item.code === order.jobType)?.label ?? order.jobType;
  const name = insuredName(order.insuredFirstName, order.insuredLastName);
  const location = [order.insuredCity, order.insuredDistrict].filter(Boolean).join(" / ");

  const title = name ? `${order.title} — ${name}` : order.title;
  const description = [
    `Hizmet: ${jobLabel}`,
    location ? `Konum: ${location}` : null,
    order.insuredPhone ? `Tel: ${order.insuredPhone}` : null,
    order.asistansDosyaNo ? `Asistans No: ${order.asistansDosyaNo}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const startAt = order.appointmentAt;
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  const eventData = {
    userId: order.assignedToId,
    title,
    description,
    startAt,
    endAt,
    allDay: false,
    color: "amber",
  };

  if (order.plannerEvent) {
    await prisma.plannerEvent.update({
      where: { id: order.plannerEvent.id },
      data: eventData,
    });
    return;
  }

  await prisma.plannerEvent.create({
    data: {
      ...eventData,
      workOrderId: order.id,
    },
  });
}
