import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { SupplierCariPanel } from "./supplier-cari-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierCariPage({ params }: PageProps) {
  const { id } = await params;

  const access = await getServerAccess();
  const canWrite = access?.can("suppliers:write") ?? false;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      ledgerEntries: {
        include: {
          workOrder: {
            select: {
              id: true,
              ticketNo: true,
              title: true,
              status: true,
              insuranceCompany: { select: { name: true, shortCode: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      workOrders: {
        select: {
          id: true,
          ticketNo: true,
          title: true,
          status: true,
          supplierCost: true,
          completedAt: true,
          insuranceCompany: { select: { name: true, shortCode: true } },
        },
        orderBy: { reportedAt: "desc" },
      },
    },
  });

  if (!supplier) notFound();

  return (
    <SupplierCariPanel
      supplier={{
        id: supplier.id,
        firstName: supplier.firstName,
        lastName: supplier.lastName,
        iban: supplier.iban,
        city: supplier.city,
        district: supplier.district,
        phone: supplier.phone,
        notes: supplier.notes,
        balance: supplier.balance,
        ledgerEntries: supplier.ledgerEntries.map((e) => ({
          id: e.id,
          type: e.type,
          amount: e.amount,
          description: e.description,
          createdAt: e.createdAt.toISOString(),
          workOrder: e.workOrder,
        })),
        workOrders: supplier.workOrders.map((o) => ({
          id: o.id,
          ticketNo: o.ticketNo,
          title: o.title,
          status: o.status,
          supplierCost: o.supplierCost,
          completedAt: o.completedAt?.toISOString() ?? null,
          insuranceCompany: o.insuranceCompany,
        })),
      }}
      canWrite={canWrite}
    />
  );
}
