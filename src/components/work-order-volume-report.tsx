import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/card";
import type { WorkOrderVolumeSummary } from "@/lib/work-order-reporting";

export function WorkOrderVolumeReportCard({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: WorkOrderVolumeSummary[];
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody flush>
        {description && (
          <p className="border-b border-zinc-100 px-6 py-3 text-sm text-zinc-500">{description}</p>
        )}
        <DataTable>
          <DataTableHead>
            <DataTableHeader>Dönem</DataTableHeader>
            <DataTableHeader>Açılan Dosya</DataTableHeader>
            <DataTableHeader>Kapatılan Dosya</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {rows.map((row) => (
              <DataTableRow key={row.period}>
                <DataTableCell className="font-medium text-zinc-900">{row.label}</DataTableCell>
                <DataTableCell className="font-semibold text-indigo-700">{row.opened}</DataTableCell>
                <DataTableCell className="font-semibold text-emerald-700">{row.closed}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </CardBody>
    </Card>
  );
}
