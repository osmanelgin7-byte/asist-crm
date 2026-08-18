"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Truck,
  Receipt,
  Shield,
  Users,
  LogOut,
  Bell,
  Calculator,
  BarChart3,
  CalendarDays,
  StickyNote,
  Mail,
  Settings2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { roleLabels, type Role } from "@/lib/permissions";
import { APP_TABS, resolveUserTabs, type AppTabId } from "@/lib/app-tabs";
import { GlobalSearch } from "@/components/global-search";
import { useMailSyncOptional } from "@/components/mail-sync-provider";
import { useSidebar } from "@/components/sidebar-provider";

const menuIcons: Record<AppTabId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  "work-orders": Wrench,
  invoices: Receipt,
  "insurance-companies": Building2,
  suppliers: Truck,
  hr: Users,
  calculations: Calculator,
  reporting: BarChart3,
  planner: CalendarDays,
  "team-notes": StickyNote,
  mail: Mail,
  users: Shield,
  settings: Settings2,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { open } = useSidebar();
  const role = session?.user?.role as Role | undefined;
  const allowedTabs = role ? resolveUserTabs(role, session?.user?.allowedTabs ?? null) : [];
  const visibleTabs = APP_TABS.filter((tab) => allowedTabs.includes(tab.id));
  const mainTabs = visibleTabs.filter((tab) => tab.id !== "users" && tab.id !== "settings");
  const adminTabs = visibleTabs.filter((tab) => tab.id === "users" || tab.id === "settings");
  const mailSync = useMailSyncOptional();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur-2xl transition-all duration-200 ease-out",
        open ? "w-[260px]" : "w-[4.5rem]"
      )}
    >
      <div
        className={cn(
          "flex h-[72px] items-center border-b border-zinc-100/80",
          open ? "gap-3 px-5" : "justify-center px-2"
        )}
      >
        {open ? (
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-80">
            <BrandLogo width={148} height={44} priority />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-zinc-900">{APP_NAME}</p>
            </div>
          </Link>
        ) : (
          <Link href="/" className="rounded-xl transition-opacity hover:opacity-80" title="Ana sayfa">
            <BrandLogo width={36} height={36} priority />
          </Link>
        )}
      </div>

      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-2", open ? "px-3" : "px-2")}>
        {open && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Menü
          </p>
        )}
        {mainTabs.map(({ id, href, label }) => {
          const Icon = menuIcons[id];
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isNew = id === "reporting" && session?.user?.isFirstLogin;
          const mailUnread = id === "mail" ? (mailSync?.unreadCount ?? 0) : 0;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative flex items-center rounded-xl text-[13px] font-semibold transition-all duration-200",
                open ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                active
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
                  : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
              )}
            >
              <Icon
                className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-600")}
                strokeWidth={active ? 2 : 1.75}
              />
              {open ? (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate">{label}</span>
                  {mailUnread > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                        active ? "bg-white/20 text-white" : "bg-indigo-600 text-white"
                      )}
                    >
                      {mailUnread > 99 ? "99+" : mailUnread}
                    </span>
                  )}
                </span>
              ) : null}
              {!open && mailUnread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {mailUnread > 9 ? "9+" : mailUnread}
                </span>
              )}
              {open && isNew && mailUnread === 0 && (
                <span className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                )}>
                  Yeni
                </span>
              )}
              {!open && isNew && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
              )}
            </Link>
          );
        })}

        {adminTabs.length > 0 && (
          <>
            {open && (
              <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                Yönetim
              </p>
            )}
            {!open && <div className="my-2 border-t border-zinc-100" />}
            {adminTabs.map(({ href, label, id }) => {
              const Icon = menuIcons[id];
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "group flex items-center rounded-xl text-[13px] font-semibold transition-all",
                    open ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                    active
                      ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20"
                      : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-zinc-400")} strokeWidth={1.75} />
                  {open && label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {session?.user && (
        <div className={cn("border-t border-zinc-100", open ? "p-3" : "p-2")}>
          <div
            className={cn(
              "flex items-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100",
              open ? "gap-3 p-3" : "flex-col gap-2 p-2"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
              {session.user.name?.charAt(0)}
            </div>
            {open && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{session.user.name}</p>
                <p className="truncate text-xs text-zinc-400">{role ? roleLabels[role] : ""}</p>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white hover:text-zinc-700 hover:shadow-sm",
                !open && "w-full"
              )}
              title="Çıkış"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();

  return (
    <div
      className={cn(
        "app-main min-h-screen transition-[margin-left] duration-200 ease-out",
        open ? "ml-[260px]" : "ml-[4.5rem]"
      )}
    >
      {children}
    </div>
  );
}

export function AppHeader() {
  const mailSync = useMailSyncOptional();
  const { open, toggle } = useSidebar();
  const unread = mailSync?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-2xl border border-zinc-200/80 bg-white/70 p-2.5 text-zinc-500 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
          title={open ? "Menüyü daralt (simgeler)" : "Menüyü genişlet"}
          aria-label={open ? "Menüyü daralt" : "Menüyü genişlet"}
        >
          {open ? (
            <PanelLeftClose className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/eposta"
          className="relative rounded-2xl border border-zinc-200/80 bg-white/70 p-2.5 text-zinc-500 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
          title="E-posta bildirimleri"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
