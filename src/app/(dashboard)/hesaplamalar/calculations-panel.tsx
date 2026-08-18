"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/form-fields";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CurrencyInput } from "@/components/currency-input";
import { formatCurrency, parseCurrencyInput, cn } from "@/lib/utils";

const VAT_RATES = [
  { value: "1", label: "%1" },
  { value: "10", label: "%10" },
  { value: "20", label: "%20" },
];

function parseNumber(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatArea(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)} m²`;
}

function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)} m³`;
}

function formatQuantity(value: number, unit: string): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
      <span className="text-sm text-zinc-600">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", highlight ? "text-indigo-700" : "text-zinc-900")}>
        {value}
      </span>
    </div>
  );
}

export function CalculationsPanel() {
  const [areaWidth, setAreaWidth] = useState("");
  const [areaLength, setAreaLength] = useState("");
  const [areaCount, setAreaCount] = useState("1");

  const [volumeWidth, setVolumeWidth] = useState("");
  const [volumeLength, setVolumeLength] = useState("");
  const [volumeHeight, setVolumeHeight] = useState("");

  const [vatMode, setVatMode] = useState<"net-to-gross" | "gross-to-net">("net-to-gross");
  const [vatAmount, setVatAmount] = useState("");
  const [vatRate, setVatRate] = useState("20");

  const [unitCostTotal, setUnitCostTotal] = useState("");
  const [unitCostArea, setUnitCostArea] = useState("");

  const [consumptionArea, setConsumptionArea] = useState("");
  const [consumptionRate, setConsumptionRate] = useState("");
  const [consumptionUnit, setConsumptionUnit] = useState("kg");

  const areaResult = useMemo(() => {
    const width = parseNumber(areaWidth);
    const length = parseNumber(areaLength);
    const count = Math.max(1, parseNumber(areaCount));
    if (width <= 0 || length <= 0) return null;
    const single = width * length;
    return { single, total: single * count, count };
  }, [areaWidth, areaLength, areaCount]);

  const volumeResult = useMemo(() => {
    const width = parseNumber(volumeWidth);
    const length = parseNumber(volumeLength);
    const height = parseNumber(volumeHeight);
    if (width <= 0 || length <= 0 || height <= 0) return null;
    return width * length * height;
  }, [volumeWidth, volumeLength, volumeHeight]);

  const vatResult = useMemo(() => {
    const amount = parseCurrencyInput(vatAmount);
    const rate = parseNumber(vatRate) / 100;
    if (amount <= 0 || rate <= 0) return null;

    if (vatMode === "net-to-gross") {
      const net = amount;
      const vat = net * rate;
      return { net, vat, gross: net + vat, rate: rate * 100 };
    }

    const gross = amount;
    const net = gross / (1 + rate);
    const vat = gross - net;
    return { net, vat, gross, rate: rate * 100 };
  }, [vatAmount, vatMode, vatRate]);

  const unitCostResult = useMemo(() => {
    const total = parseCurrencyInput(unitCostTotal);
    const area = parseNumber(unitCostArea);
    if (total <= 0 || area <= 0) return null;
    return total / area;
  }, [unitCostTotal, unitCostArea]);

  const consumptionResult = useMemo(() => {
    const area = parseNumber(consumptionArea);
    const rate = parseNumber(consumptionRate);
    if (area <= 0 || rate <= 0) return null;
    return area * rate;
  }, [consumptionArea, consumptionRate]);

  return (
    <div>
      <PageHeader
        title="Hesaplamalar"
        description="Alan, hacim, KDV ve birim maliyet hesapları"
        breadcrumb={["Ana Sayfa", "Hesaplamalar"]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Alan (m²)" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="En (m)" value={areaWidth} onChange={(e) => setAreaWidth(e.target.value)} placeholder="0" inputMode="decimal" />
              <Input label="Boy (m)" value={areaLength} onChange={(e) => setAreaLength(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
            <Input label="Adet (aynı ölçü)" value={areaCount} onChange={(e) => setAreaCount(e.target.value)} placeholder="1" inputMode="numeric" />
            <div className="space-y-2">
              <ResultRow label="Tek alan" value={areaResult ? formatArea(areaResult.single) : "—"} />
              <ResultRow
                label={areaResult && areaResult.count > 1 ? `Toplam (${areaResult.count} adet)` : "Toplam alan"}
                value={areaResult ? formatArea(areaResult.total) : "—"}
                highlight
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Hacim (m³)" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="En (m)" value={volumeWidth} onChange={(e) => setVolumeWidth(e.target.value)} placeholder="0" inputMode="decimal" />
              <Input label="Boy (m)" value={volumeLength} onChange={(e) => setVolumeLength(e.target.value)} placeholder="0" inputMode="decimal" />
              <Input label="Yükseklik (m)" value={volumeHeight} onChange={(e) => setVolumeHeight(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
            <ResultRow label="Hacim" value={volumeResult ? formatVolume(volumeResult) : "—"} highlight />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="KDV Hesabı" />
          <CardBody className="space-y-4">
            <Select
              label="Hesaplama yönü"
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as "net-to-gross" | "gross-to-net")}
              options={[
                { value: "net-to-gross", label: "Matrah → KDV → Toplam" },
                { value: "gross-to-net", label: "Toplam → Matrah ayır" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput
                label={vatMode === "net-to-gross" ? "Matrah (₺)" : "Toplam (₺)"}
                value={vatAmount}
                onChange={setVatAmount}
              />
              <Select label="KDV oranı" value={vatRate} onChange={(e) => setVatRate(e.target.value)} options={VAT_RATES} />
            </div>
            <div className="space-y-2">
              <ResultRow label="Matrah" value={vatResult ? formatCurrency(vatResult.net) : "—"} />
              <ResultRow label={`KDV (%${vatRate})`} value={vatResult ? formatCurrency(vatResult.vat) : "—"} />
              <ResultRow label="Toplam" value={vatResult ? formatCurrency(vatResult.gross) : "—"} highlight />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Birim Maliyet (₺/m²)" />
          <CardBody className="space-y-4">
            <CurrencyInput label="Toplam tutar (₺)" value={unitCostTotal} onChange={setUnitCostTotal} />
            <Input label="Alan (m²)" value={unitCostArea} onChange={(e) => setUnitCostArea(e.target.value)} placeholder="0" inputMode="decimal" />
            <ResultRow
              label="Birim maliyet"
              value={unitCostResult ? `${formatCurrency(unitCostResult)}/m²` : "—"}
              highlight
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Malzeme Sarfiyatı" />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Alan (m²)" value={consumptionArea} onChange={(e) => setConsumptionArea(e.target.value)} placeholder="0" inputMode="decimal" />
              <Input
                label="Birim sarfiyat"
                value={consumptionRate}
                onChange={(e) => setConsumptionRate(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
              <Select
                label="Birim"
                value={consumptionUnit}
                onChange={(e) => setConsumptionUnit(e.target.value)}
                options={[
                  { value: "kg", label: "kg/m²" },
                  { value: "L", label: "L/m²" },
                  { value: "adet", label: "adet/m²" },
                  { value: "m", label: "m/m²" },
                ]}
              />
            </div>
            <ResultRow
              label="Gerekli miktar"
              value={consumptionResult ? formatQuantity(consumptionResult, consumptionUnit) : "—"}
              highlight
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
