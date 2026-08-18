"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  EmptyState,
} from "@/components/ui/card";
import { Badge } from "@/components/badge";
import {
  workOrderStatusLabels,
  workOrderStatusColors,
  priorityLabels,
  priorityColors,
} from "@/lib/permissions";
import { domainLabels } from "@/lib/domain";

interface DashboardOrder {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  priority: string;
  insuranceCompany: { name: string; shortCode: string | null };
  assignedTo: { id: string; name: string } | null;
}

export function DashboardWorkOrders({ orders }: { orders: DashboardOrder[] }) {
  return (
    <Card>
      <CardHeader
        title={domainLabels.workOrder.open}
        action={
          <Link
            href="/work-orders"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            Tümü <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <CardBody flush>
        {orders.length === 0 ? (
          <EmptyState message="Açık Asistans Dosyası yok" />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeader>Kayıt</DataTableHeader>
              <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
              <DataTableHeader>Talep</DataTableHeader>
              <DataTableHeader>{domainLabels.planner.one}</DataTableHeader>
              <DataTableHeader>Öncelik</DataTableHeader>
              <DataTableHeader>Durum</DataTableHeader>
            </DataTableHead>
            <DataTableBody>
              {orders.map((o) => (
                <DataTableRow key={o.id}>
                  <DataTableCell>
                    <span className="font-mono text-xs font-medium text-zinc-900">{o.ticketNo}</span>
                  </DataTableCell>
                  <DataTableCell>
                    {o.insuranceCompany.shortCode ? `${o.insuranceCompany.shortCode} — ` : ""}
                    {o.insuranceCompany.name}
                  </DataTableCell>
                  <DataTableCell>{o.title}</DataTableCell>
                  <DataTableCell>
                    {o.assignedTo ? (
                      <span className="font-medium text-indigo-700">{o.assignedTo.name}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <span className={priorityColors[o.priority]}>{priorityLabels[o.priority]}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge className={workOrderStatusColors[o.status]}>
                      {workOrderStatusLabels[o.status]}
                    </Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </CardBody>
    </Card>
  );
}
