import { auth } from "@/auth";
import { sessionHasPermission } from "@/lib/app-tabs";
import type { AppTabId } from "@/lib/app-tabs";
import type { Permission, Role } from "@/lib/permissions";

export async function getServerAccess() {
  const session = await auth();
  if (!session?.user?.role) return null;

  const role = session.user.role as Role;
  const allowedTabs = (session.user.allowedTabs as AppTabId[] | null) ?? null;

  return {
    role,
    allowedTabs,
    can(permission: Permission) {
      return sessionHasPermission(role, allowedTabs, permission);
    },
  };
}
