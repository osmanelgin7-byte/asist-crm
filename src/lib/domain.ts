/** Sigorta asistans operasyonu — UI etiketleri ve numara önekleri */

export const TICKET_NO_PREFIX = "DOS";

export const domainLabels = {
  insuranceCompany: {
    one: "Sigorta Şirketi",
    many: "Sigorta Şirketleri",
    shortCode: "Kısa kod",
    contact: "Operasyon yetkilisi",
    assistanceContact: "Asistans hattı yetkilisi",
    accountManager: "Hesap yöneticisi",
  },
  workOrder: {
    one: "Asistans Dosyası",
    many: "Asistans Dosyaları",
    ticket: "Dosya No",
    assistanceFileNo: "Asistans Dosya No",
    recordNo: "Dosya No",
    open: "Açık dosyalar",
    completed: "Kapanan dosyalar",
  },
  supplier: {
    one: "Hizmet Sağlayıcı",
    many: "Hizmet Sağlayıcılar",
  },
  invoice: {
    one: "Sigorta faturası",
    many: "Sigorta faturaları",
  },
  planner: {
    one: "Dosya koordinatörü",
    many: "Koordinatörler",
  },
  jobType: {
    one: "Hizmet türü",
    many: "Hizmet türleri",
  },
} as const;

export function formatTicketNo(seq: number, year = new Date().getFullYear()) {
  return `${TICKET_NO_PREFIX}-${year}-${String(seq).padStart(4, "0")}`;
}
