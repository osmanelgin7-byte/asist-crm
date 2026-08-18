import { AppSidebar, AppHeader, AppMain } from "@/components/app-shell";
import { MailSyncProvider } from "@/components/mail-sync-provider";
import { SidebarProvider } from "@/components/sidebar-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <MailSyncProvider>
        <div className="app-shell">
          <AppSidebar />
          <AppMain>
            <AppHeader />
            <main className="app-content animate-fade-in">{children}</main>
          </AppMain>
        </div>
      </MailSyncProvider>
    </SidebarProvider>
  );
}
