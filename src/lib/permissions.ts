export type Role = "ADMIN" | "PLANLAMA";

export type Permission =
  | "insurance-companies:read"
  | "insurance-companies:write"
  | "orders:read"
  | "orders:write"
  | "suppliers:read"
  | "suppliers:write"
  | "hr:read"
  | "hr:write"
  | "hr:leave:manage"
  | "users:manage"
  | "settings:manage"
  | "mail:read"
  | "mail:write";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "insurance-companies:read", "insurance-companies:write",
    "orders:read", "orders:write",
    "suppliers:read", "suppliers:write",
    "hr:read", "hr:write", "hr:leave:manage",
    "users:manage",
    "settings:manage",
    "mail:read", "mail:write",
  ],
  PLANLAMA: [
    "insurance-companies:read", "insurance-companies:write",
    "orders:read", "orders:write",
    "suppliers:read", "suppliers:write",
    "mail:read", "mail:write",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Yönetici",
  PLANLAMA: "Koordinatör",
};

export const roleColors: Record<Role, string> = {
  ADMIN: "bg-purple-50 text-purple-700 ring-purple-200/60",
  PLANLAMA: "bg-blue-50 text-blue-700 ring-blue-200/60",
};

export const workOrderStatusLabels: Record<string, string> = {
  YENI_IS: "Yeni İş",
  ISLEMDE: "İşlemde",
  TEKLIF_VERILDI: "Onay Bekleniyor",
  SERVIS_BEDELI_ILE_TAMAMLANDI: "Servis Bedeli ile Tamamlandı",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
  YENI: "Yeni İş",
  INCELEMEDE: "İşlemde",
  TEKLIF_BEKLIYOR: "İşlemde",
  ONAYLANDI: "Onay Bekleniyor",
};

export const workOrderStatusColors: Record<string, string> = {
  YENI_IS: "bg-zinc-100 text-zinc-700 ring-zinc-200/60",
  ISLEMDE: "bg-orange-50 text-orange-700 ring-orange-200/60",
  TEKLIF_VERILDI: "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
  SERVIS_BEDELI_ILE_TAMAMLANDI: "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
  TAMAMLANDI: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  IPTAL: "bg-red-50 text-red-700 ring-red-200/60",
  YENI: "bg-zinc-100 text-zinc-700 ring-zinc-200/60",
  INCELEMEDE: "bg-orange-50 text-orange-700 ring-orange-200/60",
  TEKLIF_BEKLIYOR: "bg-orange-50 text-orange-700 ring-orange-200/60",
  ONAYLANDI: "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
};

export const priorityLabels: Record<string, string> = {
  DUSUK: "Düşük",
  NORMAL: "Normal",
  YUKSEK: "Yüksek",
  ACIL: "Acil",
};

export const priorityColors: Record<string, string> = {
  DUSUK: "text-slate-500",
  NORMAL: "text-blue-600",
  YUKSEK: "text-amber-600",
  ACIL: "text-red-600 font-semibold",
};
