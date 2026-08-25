import { hasPermission, type Permission, type Role } from "@/lib/permissions";
import { domainLabels } from "@/lib/domain";

export type AppTabId =
  | "dashboard"
  | "work-orders"
  | "invoices"
  | "insurance-companies"
  | "suppliers"
  | "hr"
  | "calculations"
  | "reporting"
  | "planner"
  | "team-notes"
  | "mail"
  | "users"
  | "settings";

export interface AppTab {
  id: AppTabId;
  href: string;
  label: string;
  permissions: Permission[];
}

export const APP_TABS: AppTab[] = [
  { id: "dashboard", href: "/", label: "Ana Sayfa", permissions: [] },
  { id: "work-orders", href: "/work-orders", label: domainLabels.workOrder.many, permissions: ["orders:read", "orders:write"] },
  {
    id: "insurance-companies",
    href: "/sigorta-sirketleri",
    label: domainLabels.insuranceCompany.many,
    permissions: ["insurance-companies:read", "insurance-companies:write"],
  },
  { id: "suppliers", href: "/suppliers", label: domainLabels.supplier.many, permissions: ["suppliers:read", "suppliers:write"] },
  { id: "planner", href: "/planlayici", label: "Takvim", permissions: [] },
  { id: "team-notes", href: "/ortak-not", label: "Toplantı Masası", permissions: [] },
  { id: "mail", href: "/eposta", label: "E-posta", permissions: ["mail:read", "mail:write"] },
  { id: "hr", href: "/insan-kaynaklari", label: "İnsan Kaynakları", permissions: ["hr:read", "hr:write", "hr:leave:manage"] },
  { id: "calculations", href: "/hesaplamalar", label: "Hesaplamalar", permissions: [] },
  { id: "invoices", href: "/faturalar", label: domainLabels.invoice.many, permissions: ["orders:read", "orders:write"] },
  { id: "reporting", href: "/raporlama", label: "Raporlama", permissions: [] },
  { id: "users", href: "/users", label: "Kullanıcılar", permissions: ["users:manage"] },
  { id: "settings", href: "/ayarlar", label: "Ayarlar", permissions: ["settings:manage"] },
];

export const PLANLAMA_RESTRICTED_TABS: AppTabId[] = ["invoices", "reporting", "users", "hr"];

const LEGACY_TAB_ALIASES: Record<string, AppTabId | null> = {
  stores: "insurance-companies",
  quotes: null,
  tespitler: null,
};

export function isTabRestrictedForRole(role: Role, tabId: AppTabId): boolean {
  if (role === "PLANLAMA") return PLANLAMA_RESTRICTED_TABS.includes(tabId);
  if (tabId === "users" || tabId === "settings") return role !== "ADMIN";
  return false;
}

function applyRoleTabRestrictions(role: Role, tabs: AppTabId[]): AppTabId[] {
  return tabs.filter((tabId) => !isTabRestrictedForRole(role, tabId));
}

export const CONFIGURABLE_TAB_IDS: AppTabId[] = [
  "work-orders",
  "insurance-companies",
  "suppliers",
  "planner",
  "team-notes",
  "mail",
  "hr",
  "calculations",
  "invoices",
  "reporting",
];

export function isAppTabId(value: string): value is AppTabId {
  return APP_TABS.some((tab) => tab.id === value);
}

function normalizeLegacyTabId(value: string): AppTabId | null {
  if (isAppTabId(value)) return value;
  if (value in LEGACY_TAB_ALIASES) return LEGACY_TAB_ALIASES[value];
  return null;
}

export function parseAllowedTabs(raw: string | null | undefined): AppTabId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((value) => (typeof value === "string" ? normalizeLegacyTabId(value) : null))
      .filter((value): value is AppTabId => value !== null);
  } catch {
    return null;
  }
}

export function serializeAllowedTabs(tabs: AppTabId[] | null | undefined): string | null {
  if (!tabs?.length) return null;
  const filtered = tabs.filter((id) => CONFIGURABLE_TAB_IDS.includes(id));
  if (filtered.length === 0) return null;
  return JSON.stringify(filtered);
}

export function getDefaultTabsForRole(role: Role): AppTabId[] {
  const tabs = APP_TABS.filter((tab) => {
    if (tab.id === "dashboard") return true;
    if (isTabRestrictedForRole(role, tab.id)) return false;
    if (tab.permissions.length === 0) return true;
    return tab.permissions.some((permission) => hasPermission(role, permission));
  }).map((tab) => tab.id);

  return applyRoleTabRestrictions(role, tabs);
}

function sortTabsByAppOrder(tabIds: AppTabId[]): AppTabId[] {
  const order = new Map(APP_TABS.map((tab, index) => [tab.id, index]));
  return [...tabIds].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function resolveUserTabs(role: Role, customTabs: AppTabId[] | null): AppTabId[] {
  const tabs =
    customTabs && customTabs.length > 0
      ? (["dashboard", ...customTabs.filter((id) => id !== "dashboard" && id !== "users" && id !== "settings")] as AppTabId[])
      : getDefaultTabsForRole(role);

  const unique = applyRoleTabRestrictions(role, [...new Set(tabs)]);
  if (role === "ADMIN" && !unique.includes("users")) unique.push("users");
  if (role === "ADMIN" && !unique.includes("settings")) unique.push("settings");
  if (!unique.includes("dashboard")) unique.unshift("dashboard");
  return sortTabsByAppOrder(unique);
}

export function tabForPath(pathname: string): AppTabId {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/ayarlar")) return "settings";
  if (pathname.startsWith("/work-orders")) return "work-orders";
  if (pathname.startsWith("/faturalar")) return "invoices";
  if (pathname.startsWith("/sigorta-sirketleri") || pathname.startsWith("/stores")) return "insurance-companies";
  if (pathname.startsWith("/suppliers")) return "suppliers";
  if (pathname.startsWith("/insan-kaynaklari")) return "hr";
  if (pathname.startsWith("/hesaplamalar")) return "calculations";
  if (pathname.startsWith("/raporlama")) return "reporting";
  if (pathname.startsWith("/planlayici")) return "planner";
  if (pathname.startsWith("/ortak-not")) return "team-notes";
  if (pathname.startsWith("/eposta")) return "mail";
  return "dashboard";
}

export function canAccessTab(role: Role, customTabs: AppTabId[] | null, tabId: AppTabId): boolean {
  return resolveUserTabs(role, customTabs).includes(tabId);
}

export function canAccessPath(pathname: string, role: Role, customTabs: AppTabId[] | null): boolean {
  if (pathname === "/ayarlar/is-turleri" || pathname.startsWith("/ayarlar/is-turleri/")) {
    return (
      sessionHasPermission(role, customTabs, "settings:manage") ||
      sessionHasPermission(role, customTabs, "orders:write")
    );
  }

  return canAccessTab(role, customTabs, tabForPath(pathname));
}

export function sessionHasPermission(
  role: Role,
  customTabs: AppTabId[] | null,
  permission: Permission
): boolean {
  if (!hasPermission(role, permission)) return false;
  if (!customTabs || customTabs.length === 0) return true;

  const allowedTabs = resolveUserTabs(role, customTabs);
  return APP_TABS.some(
    (tab) => allowedTabs.includes(tab.id) && tab.permissions.includes(permission)
  );
}

export function getTabLabel(tabId: AppTabId): string {
  return APP_TABS.find((tab) => tab.id === tabId)?.label ?? tabId;
}
