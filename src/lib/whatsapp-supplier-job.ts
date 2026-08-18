import { domainLabels } from "@/lib/domain";

export type SupplierJobWhatsAppOrder = {
  ticketNo: string;
  insuredFirstName: string | null;
  insuredLastName: string | null;
  insuredPhone: string | null;
  insuredAddress: string | null;
  insuredCity: string | null;
  insuredDistrict: string | null;
};

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function formatInsuredFullName(order: SupplierJobWhatsAppOrder): string {
  return [order.insuredFirstName, order.insuredLastName].filter(Boolean).join(" ").trim();
}

export function formatInsuredAddressLine(order: SupplierJobWhatsAppOrder): string {
  const location = [order.insuredCity, order.insuredDistrict].filter(Boolean).join(" / ");
  return [order.insuredAddress, location].filter(Boolean).join(", ").trim();
}

export function buildSupplierJobWhatsAppMessage(order: SupplierJobWhatsAppOrder): string {
  const name = formatInsuredFullName(order);
  const phone = order.insuredPhone?.trim() ?? "";
  const address = formatInsuredAddressLine(order);

  return [`Sigortalı: ${name}`, `Telefon: ${phone}`, `Adres: ${address}`].join("\n");
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function validateSupplierWhatsAppSend(
  order: SupplierJobWhatsAppOrder,
  supplierPhone: string | null | undefined
): { ok: true; phone: string; message: string; url: string } | { ok: false; error: string } {
  const name = formatInsuredFullName(order);
  if (!name) {
    return { ok: false, error: "Sigortalı adı ve soyadı eksik." };
  }
  if (!order.insuredPhone?.trim()) {
    return { ok: false, error: "Sigortalı telefonu eksik." };
  }
  if (!formatInsuredAddressLine(order)) {
    return { ok: false, error: "Sigortalı adresi eksik." };
  }

  const phone = normalizeWhatsAppPhone(supplierPhone);
  if (!phone) {
    return { ok: false, error: `${domainLabels.supplier.one} carisinde geçerli bir telefon numarası yok.` };
  }

  const message = buildSupplierJobWhatsAppMessage(order);
  return { ok: true, phone, message, url: buildWhatsAppUrl(phone, message) };
}
