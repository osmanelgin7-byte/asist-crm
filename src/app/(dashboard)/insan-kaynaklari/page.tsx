import { redirect } from "next/navigation";
import { getServerAccess } from "@/lib/session-access";
import { canAccessTab } from "@/lib/app-tabs";
import type { AppTabId } from "@/lib/app-tabs";
import { HrPanel } from "./hr-panel";

export const dynamic = "force-dynamic";

export default async function HumanResourcesPage() {
  const access = await getServerAccess();
  if (!access) redirect("/login");

  const allowedTabs = (access.allowedTabs as AppTabId[] | null) ?? null;
  if (!canAccessTab(access.role, allowedTabs, "hr") || !access.can("hr:read")) {
    redirect("/");
  }

  return <HrPanel canWrite={access.can("hr:write")} canManageLeaves={access.can("hr:leave:manage")} />;
}
